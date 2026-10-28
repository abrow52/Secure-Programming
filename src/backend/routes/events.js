//Track leaving and entering galleries and rooms

const express = require("express");
const db = require("../database");
const { requireRole } = require("./auth");

const router = express.Router();

const allowedRoles = ["admin", "employee", "guest"];

const crypto = require("crypto");

async function withLockedOccupancy(userId, operation) {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // make sure a row exists to lock.
        await connection.query(
            `INSERT IGNORE INTO UserOccupancy
                (user_id, gallery_id, room_id)
             VALUES (?, NULL, NULL)`,
            [userId]
        );

        const [rows] = await connection.query(
            `SELECT gallery_id, room_id
             FROM UserOccupancy
             WHERE user_id = ?
             FOR UPDATE`,
            [userId]
        );

        if (rows.length !== 1) {
            throw new Error("Unable to lock occupancy");
        }

        const occupancy = {
            galleryId: rows[0].gallery_id == null ? null : Number(rows[0].gallery_id),
            roomId: rows[0].room_id == null ? null : Number(rows[0].room_id)
        };

        const result = await operation(connection, occupancy);

        await connection.commit();
        return result;
    } catch (err) {
        try {
            await connection.rollback();
        } catch (rollbackErr) {
            console.error("Transaction rollback failed:", rollbackErr);
        }
        throw err;
    } finally {
        connection.release();
    }
}

//edited writeEvent
async function recordTransition(connection, req, table, idColumn, targetId, type, resourceType, newGalleryId, newRoomId) {
    const userId = req.session.user.user_id;

    await connection.query(
        `INSERT INTO ${table} (user_id, ${idColumn}, type)
         VALUES (?, ?, ?)`,
        [userId, targetId, type]
    );

    await connection.query(
        `INSERT INTO AuditLogs
            (user_id, action, resource_type, resource_id, ip_address)
         VALUES (?, ?, ?, ?, ?)`,
        [
            userId,
            `${type}_${resourceType}`,
            resourceType,
            targetId,
            req.ip
        ]
    );

    await setOccupancy(
        connection,
        userId,
        newGalleryId,
        newRoomId
    );
}

function parseId(value){ // check valid value (is pos int)
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
        return null;
    }

    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

async function getOccupancy(userId) {
    const [rows] = await db.query(
        `SELECT gallery_id, room_id
         FROM UserOccupancy
         WHERE user_id = ?`,
        [userId]
    );

    return rows[0] || {gallery_id: null, room_id: null};
}

async function setOccupancy(connection, userId, galleryId, roomId) {
    await connection.query(
        `INSERT INTO UserOccupancy (user_id, gallery_id, room_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
             gallery_id = VALUES(gallery_id),
             room_id = VALUES(room_id)`,
        [userId, galleryId, roomId]
    );
}

function sendError(res, err, message) {
    console.error(message, err);
    return res.status(500).send(message);
}

router.post("/galleries/:galleryId/enter", requireRole(...allowedRoles), async (req, res) => {
        const galleryId = parseId(req.params.galleryId);
        if (!galleryId) {
            return res.status(400).send("Invalid gallery ID");
        }

        try {
            await withLockedOccupancy(
                req.session.user.user_id,
                async (connection, current) => {
                    if (current.galleryId !== null) {
                        const err = new Error("Already in a gallery or room");
                        err.status = 409;
                        throw err;
                    }

                    const [rows] = await connection.query(
                        "SELECT gallery_id FROM Galleries WHERE gallery_id = ?",
                        [galleryId]
                    );

                    if (!rows.length) {
                        const err = new Error("Gallery not found");
                        err.status = 404;
                        throw err;
                    }

                    await recordTransition(
                        connection, req,
                        "GalleryEvents", "gallery_id",
                        galleryId, "ENTER", "GALLERY",
                        galleryId, null
                    );
                }
            );

            const marker = crypto.randomBytes(32).toString("hex");

            req.session.galleryHistoryGrants ??= {};
            req.session.galleryHistoryGrants[marker] = {
                userId: req.session.user.user_id,
                galleryId: Number(galleryId)
            };

            if (req.accepts("json")) {
                return res.json({
                    ok: true,
                    marker,
                    galleryId: Number(galleryId),
                    redirect: `/galleries/${galleryId}`
                });
            }

            return res.redirect(`/galleries/${galleryId}`);
        } catch (err) {
            if (err.status) return res.status(err.status).send(err.message);
            return sendError(res, err, "Unable to record gallery entry");
        }
    }
);

router.post("/galleries/:galleryId/leave", requireRole(...allowedRoles), async (req, res) => {
        const galleryId = parseId(req.params.galleryId);
        if (!galleryId) {
            return res.status(400).send("Invalid gallery ID");
        }

        try {
            await withLockedOccupancy(
                req.session.user.user_id,
                async (connection, current) => {
                    if (current.galleryId !== galleryId || current.roomId !== null) {
                        const err = new Error("Cannot leave this gallery");
                        err.status = 403;
                        throw err;
                    }

                    await recordTransition(
                        connection, req,
                        "GalleryEvents", "gallery_id",
                        galleryId, "LEAVE", "GALLERY",
                        null, null
                    );
                }
            );

            return res.redirect("/");
        } catch (err) {
            if (err.status) return res.status(err.status).send(err.message);
            return sendError(res, err, "Unable to record gallery exit");
        }
    }
);

router.post("/rooms/:roomId/enter", requireRole(...allowedRoles), async (req, res) => {
        const roomId = parseId(req.params.roomId);
        if (!roomId) {
            return res.status(400).send("Invalid room ID");
        }

        try {
            const result = await withLockedOccupancy(
                req.session.user.user_id,
                async (connection, current) => {
                    if (current.galleryId === null || current.roomId !== null) {
                        const err = new Error(
                            "Enter a gallery before entering a room."
                        );
                        err.status = 403;
                        throw err;
                    }

                    const [rooms] = await connection.query(
                        `SELECT room_id, gallery_id
                         FROM Rooms
                         WHERE room_id = ?`,
                        [roomId]
                    );

                    if (!rooms.length) {
                        const err = new Error("Room not found");
                        err.status = 404;
                        throw err;
                    }

                    const galleryId = Number(rooms[0].gallery_id);

                    if (galleryId !== current.galleryId) {
                        const err = new Error(
                            "This room is not in your current gallery"
                        );
                        err.status = 403;
                        throw err;
                    }

                    await recordTransition(
                        connection, req,
                        "RoomEvents", "room_id",
                        roomId, "ENTER", "ROOM",
                        galleryId, roomId
                    );

                    return { galleryId, roomId };
                }
            );

            const token = crypto.randomBytes(32).toString("hex");

            req.session.roomHistoryGrants ||= {};
            req.session.roomHistoryGrants[token] = {
                roomId: result.roomId,
                galleryId: result.galleryId,
                userId: req.session.user.user_id
            };

            req.session.save((err) => {
                if (err) {
                    console.error("Unable to save history grant:", err);
                    return res.status(500).send("Unable to save room navigation");
                }

                if (req.accepts("json")) {
                    return res.json({
                        roomId: result.roomId,
                        galleryId: result.galleryId,
                        marker: token
                    });
                }

                return res.redirect(`/rooms/${result.roomId}`);
            });
        } catch (err) {
            if (err.status) return res.status(err.status).send(err.message);
            return sendError(res, err, "Unable to record room entry");
        }
    }
);

router.post("/rooms/:roomId/leave", requireRole(...allowedRoles), async (req, res) => {
        const roomId = parseId(req.params.roomId);
        if (!roomId) {
            return res.status(400).send("Invalid room ID");
        }

        try {
            const galleryId = await withLockedOccupancy(
                req.session.user.user_id,
                async (connection, current) => {
                    if (current.roomId !== roomId || current.galleryId === null) {
                        const err = new Error("Cannot leave a room you are not in");
                        err.status = 403;
                        throw err;
                    }

                    await recordTransition(
                        connection, req,
                        "RoomEvents", "room_id",
                        roomId, "LEAVE", "ROOM",
                        current.galleryId, null
                    );

                    return current.galleryId;
                }
            );

            return res.redirect(`/galleries/${galleryId}`);
        } catch (err) {
            if (err.status) return res.status(err.status).send(err.message);
            return sendError(res, err, "Unable to record room exit");
        }
    }
);


router.post("/history/reconcile", requireRole(...allowedRoles), async (req, res) => {
    const { marker, destination } = req.body;

    if (typeof marker !== "string" || !/^[a-f0-9]{64}$/.test(marker) ||
        typeof destination !== "string" || destination.length > 200) {
        return res.status(400).json({ error: "Invalid history request" });
    }

    const grant =
        req.session.roomHistoryGrants?.[marker] ||
        req.session.galleryHistoryGrants?.[marker];

    if (!grant || Number(grant.userId) !== Number(req.session.user.user_id)) {
        return res.status(403).json({ error: "Invalid history grant" });
    }

    const roomPath = grant.roomId != null ? `/rooms/${grant.roomId}`: null;
    const galleryPath = `/galleries/${grant.galleryId}`;

    const isRoomGrant = Boolean(roomPath);
    const allowedDestinations = isRoomGrant ? [roomPath, galleryPath, "/"] : [galleryPath, "/"];

    if (!allowedDestinations.includes(destination)) {
        return res.status(403).json({ error: "Invalid history destination" });
    }

    try {
        await withLockedOccupancy(
            req.session.user.user_id,
            async (connection, current) => {

                // gallery -> home
                if (destination === "/") {
                    if (current.galleryId === Number(grant.galleryId) && current.roomId === null) {
                        await recordTransition(
                            connection,
                            req,
                            "GalleryEvents",
                            "gallery_id",
                            current.galleryId,
                            "LEAVE",
                            "GALLERY",
                            null,
                            null
                        );
                    } else if (current.galleryId === null && current.roomId === null) {
                        // don't make event if already outside
                    } else {
                        const err = new Error(
                            "History transition is not allowed"
                        );
                        err.status = 403;
                        throw err;
                    }

                    return;
                }

                if (!isRoomGrant) {
                    const err = new Error("Invalid room history grant");
                    err.status = 403;
                    throw err;
                }

                const [rooms] = await connection.query(
                    `SELECT room_id, gallery_id
                     FROM Rooms
                     WHERE room_id = ? AND gallery_id = ?`,
                    [grant.roomId, grant.galleryId]
                );

                if (!rooms.length) {
                    const err = new Error(
                        "History grant is no longer valid"
                    );
                    err.status = 403;
                    throw err;
                }

                if (destination === galleryPath &&
                    current.galleryId === Number(grant.galleryId) &&
                    current.roomId === Number(grant.roomId)
                ) {
                    // room -> parent gallery.
                    await recordTransition(
                        connection,
                        req,
                        "RoomEvents",
                        "room_id",
                        grant.roomId,
                        "LEAVE",
                        "ROOM",
                        grant.galleryId,
                        null
                    );
                } else if (
                    destination === roomPath &&
                    current.galleryId === Number(grant.galleryId) &&
                    current.roomId === null
                ) {
                    // gallery -> previously entered room.
                    await recordTransition(
                        connection,
                        req,
                        "RoomEvents",
                        "room_id",
                        grant.roomId,
                        "ENTER",
                        "ROOM",
                        grant.galleryId,
                        grant.roomId
                    );
                } else if (
                    destination === galleryPath &&
                    current.galleryId === Number(grant.galleryId) &&
                    current.roomId === null
                ) {
                    // don't make a duplicate leave event
                } else if (
                    destination === roomPath &&
                    current.galleryId === Number(grant.galleryId) &&
                    current.roomId === Number(grant.roomId)
                ) {
                    // don't make a duplicate enter event
                } else {
                    const err = new Error("History transition is not allowed");
                    err.status = 403;
                    throw err;
                }
            }
        );

        return res.json({ ok: true });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }

        console.error("History reconciliation failed:", err);
        return res.status(500).json({
            error: "Unable to reconcile location"
        });
    }
});

module.exports = {
    router,
    getOccupancy,
    setOccupancy
};