//Allows admins to edit,delete, and create users in the database

const express = require("express");

const router = express.Router();

//temporary get
router.get("/", (req, res) => {
    res.json({
        message: "Galleries route works"
    });
});

module.exports = router;