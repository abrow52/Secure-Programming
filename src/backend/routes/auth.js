//Authorize login's and access

const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../database");

const router = express.Router();

router.get("/login", (req, res) => {
    res.render("login");
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        //look for user in the db
        const [users] = await db.query(
            "SELECT * FROM Users WHERE username = ?",
            [username]
        );
        //if user not found
        if (users.length === 0) {
            return res.status(401).send("Invalid username or password");
        }

        const user = users[0];

        //check if entered password matches encyrpted password in db
        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).send("Invalid username or password");
        }

        //store logged in user in session
        req.session.user = {
            user_id: user.user_id,
            username: user.username,
            role: user.role
        };
        console.log(`User ${user.username} logged in`);
        res.redirect("/");

    } catch (err) {
        console.error(err);
        res.status(500).send("Login error");
    }
});

//check the role of the user
function requireRole(...allowedRoles)  {
    return (req, res, next) => {

        if (!req.session.user) {
            return res.redirect("/login");
        }

        if (!allowedRoles.includes(req.session.user.role)) {
            return res.status(403).send("Access denied");
        }
        next();
    };
}

module.exports = {
    router,
    requireRole
};