const express = require("express");
const session = require("express-session");
const path = require("path");

const db = require("./database");

//setup routes
const userRoutes = require("./routes/users");
const eventRoutes = require("./routes/events");
const { router: authRoutes, requireRole } = require("./routes/auth");

const app = express();

//set session
app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 // 1 hour
    }
}));

//confgiure path to ejs files
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "frontend", "views"));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

//static path to images
app.use(express.static(path.join(__dirname, "..", "images")));


// Home page
//Render the home page and display galleries from db (make it so you need access to see)
app.get("/", async (req, res) => {
    try {
        const [galleries] = await db.query(`
            SELECT
                gallery_id,
                name,
                capacity,
                description,
                image_url
            FROM Galleries
            ORDER BY gallery_id
        `);
        res.render("index", {
            galleries: galleries
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(
            "Unable to load galleries"
        );
    }

});


// Login Page
app.get("/login", (req, res) => {

    res.render("login");
});


// Room page
//load gallery and its respective rooms
//require user to be logged in (posses a role) to access page
app.get("/galleries/:galleryId", requireRole("admin", "employee", "guest"), async (req, res) => {
    try {
        const galleryId = Number(req.params.galleryId);

        //validate gallery id
        if (!Number.isInteger(galleryId)) {
            return res.status(400).send(
                "Invalid gallery ID"
            );
        }
        //get gallery from db
        const [galleries] = await db.query(
            `
            SELECT
                gallery_id,
                name,
                capacity,
                description,
                image_url
            FROM Galleries
            WHERE gallery_id = ?
            `,
            [galleryId]
        );

        if (galleries.length === 0) {
            return res.status(404).send(
                "Gallery not found"
            );
        }

        const gallery = galleries[0];

        //get rooms from db
        const [rooms] = await db.query(
            `
            SELECT
                room_id,
                gallery_id,
                name,
                capacity,
                description,
                image_url
            FROM Rooms
            WHERE gallery_id = ?
            ORDER BY room_id
            `,
            [galleryId]
        );

        res.render("rooms", {
            gallery,
            rooms
        });

    } catch (err) {
        console.error(err);
        res.status(500).send(
            "Unable to load gallery"
        );
    }
});


// Exhibit Page
//loads the images in a room
app.get("/rooms/:roomId", requireRole("admin", "employee", "guest"), async (req, res) => {
    try {
        const roomId = Number(req.params.roomId);

        //validate room id
        if (!Number.isInteger(roomId)) {
            return res.status(400).send(
                "Invalid room ID"
            );
        }
        //get room from db
        const [rooms] = await db.query(
            `
            SELECT
                room_id,
                gallery_id,
                name,
                capacity,
                description,
                image_url
            FROM Rooms
            WHERE room_id = ?
            `,
            [roomId]
        );

        if (rooms.length === 0) {
            return res.status(404).send(
                "Room not found"
            );
        }

        const room = rooms[0];

        //get paintings from db
        const [paintings] = await db.query(
            `
            SELECT
                painting_id,
                room_id,
                name,
                image_url
            FROM Paintings
            WHERE room_id = ?
            ORDER BY painting_id
            `,
            [roomId]
        );

        res.render("exhibit", {
            room,
            paintings
        });

    } catch (err) {
        console.error(err);
        res.status(500).send(
            "Unable to load room"
        );
    }

});


// Users Page
//lists users in the db
app.get("/users", requireRole("admin"), async (req, res) => {
    try {
        const [users] = await db.query(
            "SELECT user_id, username, role FROM Users"
        );

        res.render("users", {
            Users: users
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Database error");
    }
});


// Events Page
//displays the list people who have entered/left galleries/rooms
app.get("/events", requireRole("admin", "employee"), async (req, res) => {
    res.render("events");
});


app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/auth", authRoutes);

//start server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});