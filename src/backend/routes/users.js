//Allows admins to edit,delete, and create users in the database

const express = require("express");
const db = require("../database");
const { requireRole } = require("./auth");

const router = express.Router();

//edit user roles
router.post("/:id/role", requireRole("admin"), async (req, res) => {
    const userId = Number(req.params.id);
    const { role } = req.body;
    const sessionUserID = Number(req.session.user.user_id);

    const roles = ["guest", "employee", "admin"];

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid user ID"
        });
    }

    //users can't change their own role
    if (userId === sessionUserID) {
        return res.status(403).json({
            message: "You can't change your own role"
        });
    }

    if (!roles.includes(role)) {
        return res.status(400).json({
            message: "Invalid role"
        });
    }

    try {
        const [result] = await db.query(
            "UPDATE Users SET role = ? WHERE user_id = ?",
            [role, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send("User not found");
        }
        await db.query(
            `INSERT INTO AuditLogs
             (user_id, action, resource_type, resource_id, ip_address)
             VALUES (?, ?, ?, ?, ?)`,
            [
                sessionUserID,
                `ROLE_CHANGE: ` + Number(req.params.id),
                "USER",
                null,
                req.ip
            ]
        );

        return res.status(200).json({message: "User role updated successfully"});
    } catch (err) {
        console.error("Failed to update user role:", err);
        return res.status(500).json({
            message: "Couldn't update user role"
        });
    }
});

// add new users
const bcrypt = require("bcrypt");

router.post("/", requireRole("admin"), async (req, res) => {
    const {username, password, role} = req.body;

    const roles = ["guest", "employee", "admin"];

    //input validation
    if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        typeof role !== "string" ||
        !username.trim() ||
        !password ||
        !roles.includes(role)
    ) {
        return res.status(400).json({message: "Invalid user details"});
    }

    if (username.trim().length > 50 || password.length < 8) {
        return res.status(400).json({
            message: "Username must be less than 50 characters and password at least 8 characters"
        });
    }

    try {
        // hash the password before saving in the db
        const hashedPassword = await bcrypt.hash(password, 12);
        const sessionUserID = Number(req.session.user.user_id);

        const [result] = await db.query(
            `INSERT INTO Users (username, password_hash, role, created_by)
             VALUES (?, ?, ?, ?)`,
            [username.trim(), hashedPassword, role, sessionUserID]
        );

        await db.query(
            `INSERT INTO AuditLogs
             (user_id, action, resource_type, resource_id, ip_address)
             VALUES (?, ?, ?, ?, ?)`,
            [
                sessionUserID,
                `ADD_USER: ` + req.body.username,
                "PAGE",
                null,
                req.ip
            ]
        );
        return res.status(201).json({message: "User created successfully"});
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({message: "Username already exists"});
        }
        console.error("Failed to create user:", err);
        return res.status(500).json({message: "Couldn't create user"});
    }
});

//delete users
router.post("/:id/delete", requireRole("admin"), async (req, res) => {
    const userId = Number(req.params.id);
    const sessionUserID = Number(req.session.user.user_id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({message: "Invalid user ID"});
    }

    // admins can't delete their own account
    if (userId === sessionUserID) {
        return res.status(403).json({message: "You can't delete your own account"});
    }

    try {
        const [result] = await db.query(
            "DELETE FROM Users WHERE user_id = ?",
            [userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({message: "User not found"});
        }

        await db.query(
            `INSERT INTO AuditLogs
             (user_id, action, resource_type, resource_id, ip_address)
             VALUES (?, ?, ?, ?, ?)`,
            [
                sessionUserID,
                `DELETE_USER: ` + Number(req.params.id),
                "PAGE",
                null,
                req.ip
            ]
        );

        return res.json({message: "User deleted successfully"});
    } catch (err) {
        console.error("Failed to delete user:", err);
        return res.status(500).json({message: "Couldn't delete user."});
    }
});


module.exports = router;