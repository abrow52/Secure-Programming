//Track leaving and entering galleries and rooms

const express = require("express");
const db = require("../database");
const { requireRole } = require("./auth");

const router = express.Router();

//temporary get
/*
router.get("/", (req, res) => {
    res.json({
        message: "Galleries route works"
    });
});
*/

const allowedRoles = ["admin", "employee", "guest"];

function parseId(value){ // check valid value (is pos int)
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

async function writeEvent(req, table, idColumn, targetId, type, resourceType){
    const connection = await db.getConnection();
    
    try{
        await connection.beginTransaction();
        await connection.query( // write to event log
            `INSERT INTO ${table} (user_id, ${idColumn}, type) VALUES (?, ?, ?)`,
            [req.session.user.user_id, targetId, type]
        );
        await connection.query( // write to audit log 
            `INSERT INTO AuditLogs
                (user_id, action, resource_type, resource_id, ip_address)
             VALUES (?, ?, ?, ?, ?)`,
            [
                req.session.user.user_id,
                `${type}_${resourceType}`,
                resourceType,
                targetId,
                req.ip
            ]
        );
        await connection.commit();
    } catch (err) { 
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("Unable to roll back event transaction:", rollbackError);
        }
        throw err;
    } finally {
        connection.release();
    }
}

function sendError(res, err, message) {
    console.error(message, err);
    return res.status(500).send(message);
}

router.post("/galleries/:galleryId/enter", requireRole(...allowedRoles), async (req, res) => { // Enter Gallery
    const galleryId = parseId(req.params.galleryId);
    if (!galleryId) {
        return res.status(400).send("Invalid gallery ID");
    }

    if (req.session.galleryLocation) {
        return res.status(409).send("Already in another room or gallery");
    }

    try {
        const [galleries] = await db.query(
            "SELECT gallery_id FROM Galleries WHERE gallery_id = ?",
            [galleryId]
        );
        if (galleries.length === 0) {
            return res.status(404).send("Gallery not found");
        }

        await writeEvent(req, "GalleryEvents", "gallery_id", galleryId, "ENTER", "GALLERY");
        req.session.galleryLocation = { galleryId, roomId: null };
        return res.redirect(`/galleries/${galleryId}`);
    } catch (err) {
        return sendError(res, err, "Unable to record gallery entry");
    }
});

router.post("/galleries/:galleryId/leave", requireRole(...allowedRoles), async (req, res) => { // Leave Gallery
    const galleryId = parseId(req.params.galleryId);
    if (!galleryId) {
        return res.status(400).send("Invalid gallery ID");
    }

    const location = req.session.galleryLocation;
    if (!location || location.galleryId !== galleryId || location.roomId !== null) {
        return res.status(403).send("Cannot leave a gallery you are not in");
    }

    try {
        await writeEvent(req, "GalleryEvents", "gallery_id", galleryId, "LEAVE", "GALLERY");
        delete req.session.galleryLocation;
        return res.redirect("/");
    } catch (err) {
        return sendError(res, err, "Unable to record gallery exit");
    }
});

router.post("/rooms/:roomId/enter", requireRole(...allowedRoles), async (req, res) => { // Enter Room
    const roomId = parseId(req.params.roomId);
    if (!roomId) {
        return res.status(400).send("Invalid room ID");
    }

    const location = req.session.galleryLocation;
    if (!location || location.roomId !== null) {
        return res.status(403).send("Enter a gallery before entering a room");
    }

    try {
        const [rooms] = await db.query(
            "SELECT room_id, gallery_id FROM Rooms WHERE room_id = ?",
            [roomId]
        );
        if (rooms.length === 0) {
            return res.status(404).send("Room not found");
        }
        if (rooms[0].gallery_id !== location.galleryId) {
            return res.status(403).send("This room is not in your current gallery");
        }

        await writeEvent(req, "RoomEvents", "room_id", roomId, "ENTER", "ROOM");
        location.roomId = roomId;
        return res.redirect(`/rooms/${roomId}`);
    } catch (err) {
        return sendError(res, err, "Unable to record room entry");
    }
});

router.post("/rooms/:roomId/leave", requireRole(...allowedRoles), async (req, res) => { // Leave Room
    const roomId = parseId(req.params.roomId);
    if (!roomId) {
        return res.status(400).send("Invalid room ID");
    }

    const location = req.session.galleryLocation;
    if (!location || location.roomId !== roomId) {
        return res.status(403).send("Cannot leave a room you are not in");
    }

    try {
        await writeEvent(req, "RoomEvents", "room_id", roomId, "LEAVE", "ROOM");
        location.roomId = null;
        return res.redirect(`/galleries/${location.galleryId}`);
    } catch (err) {
        return sendError(res, err, "Unable to record room exit");
    }
});

module.exports = router;