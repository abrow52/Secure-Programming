//configure databse

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    // host: process.env.DB_HOST,
    // user: process.env.DB_USER,
    // password: process.env.DB_PASSWORD,
    // database: process.env.DB_NAME,
    host: "localhost",
    user: "root",
    password: "",
    database: "art_gallery"
});

module.exports = pool;