//Authorize login's and access

const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../database");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,                 // Maximum 5 requests per window per IP
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
    handler: (req, res) => {
        return res
            .status(429)
            .send("Too many login attempts. Please try again in 15 minutes.");
    }
});

const { csrfSync } = require("csrf-sync");

const {
    generateToken,
    csrfSynchronisedProtection
} = csrfSync({
    getTokenFromRequest: (req) => req.body?._csrf
});

const csrfProtection = (req, res, next) => {
    csrfSynchronisedProtection(req, res, (err) => {
        if (err) {
            return res.status(403).send("Invalid or missing CSRF token");
        }

        next();
    });
};

router.get("/login", (req, res) => {
    const csrfToken = generateToken(req);

    res.render("login", {
        csrfToken
    });
});

//login
router.post("/login", loginLimiter, csrfProtection, async (req, res) => {
    const { username, password } = req.body;

    if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        username.length === 0 ||
        username.length > 50 ||
        password.length === 0 ||
        password.length > 72
    ) {
        return res.status(400).send("Invalid login input");
    }

    try {
        // Look for user in the database
        const [users] = await db.query(
            "SELECT * FROM Users WHERE username = ?",
            [username]
        );

        if (users.length === 0) {
            return res.status(401).send("Invalid username or password");
        }

        const user = users[0];

        // check if entered password matches encrypted password in db
        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).send("Invalid username or password");
        }

        req.session.regenerate(async (err) => {
            if (err) {
                console.error("Session regeneration failed:", err);
                return res.status(500).send("Login error");
            }

            req.session.user = {
                user_id: user.user_id,
                username: user.username,
                role: user.role
            };

            try {
                await db.query(
                    `UPDATE UserOccupancy
                     SET gallery_id = NULL,
                         room_id = NULL
                     WHERE user_id = ?`,
                    [user.user_id]
                );
                await db.query(
                    `INSERT INTO AuditLogs
                    (user_id, action, resource_type, resource_id, ip_address)
                    VALUES (?, ?, ?, ?, ?)`,
                    [user.user_id, "LOGIN", "PAGE", null, req.ip]
                );
                
                // save session before redirecting
                req.session.save((saveErr) => {
                    if (saveErr) {
                        console.error("Session save failed:", saveErr);
                        return res.status(500).send("Login error");
                    }

                    return res.redirect("/");
                });
            } catch (err) {
                console.error("Login audit log failed:", err);
                return res.status(500).send("Login error");
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).send("Login error");
    }
});

// Logout
router.post("/logout", csrfProtection, async (req, res) => {
    const user = req.session?.user;

    if (!req.session) {
        return res.redirect("/login");
    }

    try {
        if (user) {
            await db.query(
                `UPDATE UserOccupancy
                 SET gallery_id = NULL,
                     room_id = NULL
                 WHERE user_id = ?`,
                [user.user_id]
            );
            await db.query(
                `INSERT INTO AuditLogs
                 (user_id, action, resource_type, resource_id, ip_address)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    user.user_id,
                    "LOGOUT",
                    "PAGE",
                    null,
                    req.ip
                ]
            );
        }
    } catch (err) {
        console.error("Logout audit logging failed:", err);
    }

    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).send("Unable to log out");
        }

        res.clearCookie("connect.sid");
        return res.redirect("/login");
    });
});

//check the role of the user
function requireRole(...allowedRoles) {
    return async (req, res, next) => {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        if (!allowedRoles.includes(req.session.user.role)) {
            try {
                await db.query(
                    `INSERT INTO AuditLogs
                     (user_id, action, resource_type, resource_id, ip_address)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        req.session.user.user_id,
                        `ACCESS_DENIED: ${req.method} ${req.path}`,
                        "PAGE",
                        null,
                        req.ip
                    ]
                );
            } catch (err) {
                console.error(
                    "Failed to log login denied access:",
                    err
                );
            }

            return res.status(403).send("You do not have permission to access this page.");
        }

        next();
    };
}

// block url acces to other pages if inside galler or room
async function requireOutsideGallery(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    try {
        const [rows] = await db.query(
            `SELECT gallery_id, room_id
             FROM UserOccupancy
             WHERE user_id = ?
             LIMIT 1`,
            [req.session.user.user_id]
        );

        const occupancy = rows[0];

        if (occupancy && (occupancy.gallery_id != null || occupancy.room_id != null)
        ) {
            return res.status(403).send("Access denied. Leave your current room and gallery first.");
        }

        return next();
    } catch (err) {
        console.error("Occupancy check failed:", err);

        return res.status(500).send(
            "Unable to verify your current location."
        );
    }
}


module.exports = {
    router,
    requireRole, requireOutsideGallery, generateToken
};
