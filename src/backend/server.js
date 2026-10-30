const express = require("express");
const session = require("express-session");
const path = require("path");

const db = require("./database");

//setup routes
const userRoutes = require("./routes/users");
const {router: eventRoutes, getOccupancy} = require("./routes/events");
const { router: authRoutes, requireRole, requireOutsideGallery, generateToken } = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

//start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

//set session
if (process.env.NODE_ENV === 'production') {app.set('trust proxy', 1);}
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60
    }
}));

app.use((req, res, next) => {
    res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
        "Expires": "0"
    });

    next();
});

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
//Render the home page and display galleries from db
app.get("/", async (req, res) => {
    const csrfToken = generateToken(req);
    try {
        const [galleries] = await db.query(`
            SELECT
                g.gallery_id,
                g.name,
                g.description,
                g.image_url,
                COUNT(uo.user_id) AS occupantCount
            FROM Galleries g
            LEFT JOIN UserOccupancy uo
                ON uo.gallery_id = g.gallery_id
            GROUP BY
                g.gallery_id,
                g.name,
                g.description,
                g.image_url
            ORDER BY g.gallery_id
        `);
        let occupancy = {
            gallery_id: null,
            room_id: null
        };
        if (req.session.user) {
            occupancy = await getOccupancy(
                req.session.user.user_id
            );
        }

        res.set("Cache-Control", "no-store");

        res.render("index", {
            user: req.session.user || null,
            galleries: galleries,
            occupancy, csrfToken
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
    const csrfToken = generateToken(req);
    res.render("login", { csrfToken });
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
        const occupancy = await getOccupancy(
            req.session.user.user_id
        );
        
        if (Number(occupancy.gallery_id) !== galleryId ) { // prevent user from accessing gallery through url
            return res.status(403).send("Enter this gallery before viewing it");
        }

        //get gallery from db
        const [galleries] = await db.query(
            `
            SELECT
                gallery_id,
                name,
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
                r.room_id,
                r.gallery_id,
                r.name,
                r.description,
                r.image_url,
                COUNT(uo.user_id) AS occupantCount
            FROM Rooms r
            LEFT JOIN UserOccupancy uo
                ON uo.room_id = r.room_id
            WHERE r.gallery_id = ?
            GROUP BY
                r.room_id,
                r.gallery_id,
                r.name,
                r.description,
                r.image_url
            ORDER BY r.room_id
            `,
            [galleryId]
        );

        const [countRows] = await db.query(
            `SELECT COUNT(*) AS occupant_count
             FROM UserOccupancy
             WHERE gallery_id = ?`,
            [galleryId]
        );
        
        const occupantCount = countRows[0].occupant_count;
        
        res.set("Cache-Control", "no-store");

        res.render("rooms", {
            gallery,
            rooms,
            occupancy,
            occupantCount
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
        const occupancy = await getOccupancy(req.session.user.user_id); 

        //get room from db
        const [rooms] = await db.query(
            `
            SELECT
                room_id,
                gallery_id,
                name,
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
        if (Number(occupancy.room_id) !== roomId || Number(occupancy.gallery_id) !== Number(room.gallery_id)) { // prevent user from accessing room through url
            return res.status(403).send( "Leave your current room or gallery first.");
        }

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

        const [countRows] = await db.query(
            `SELECT COUNT(*) AS occupant_count
             FROM UserOccupancy
             WHERE room_id = ?`,
            [roomId]
        );
        
        const occupantCount = countRows[0].occupant_count;
        
        res.set("Cache-Control", "no-store");

        res.render("exhibit", {
            room,
            paintings,
            occupancy,
            occupantCount
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
app.get("/users", requireRole("admin"), requireOutsideGallery, async (req, res) => {
    const csrfToken = generateToken(req);
    try {
        const [users] = await db.query(
            "SELECT user_id, username, role FROM Users"
        );

        res.render("users", {
            user: req.session.user || null,
            Users: users, csrfToken
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Database error");
    }
});


// Events Page
//displays the list people who have entered/left galleries/rooms
app.get("/events", requireRole("admin", "employee"), requireOutsideGallery, async (req, res) => {
    const csrfToken = generateToken(req);
    try {
        const [galleryEvents] = await db.query(`
            SELECT ge.event_id, u.username, g.name AS gallery_name,
                   ge.type, ge.occurred_at
            FROM GalleryEvents ge
            JOIN Users u ON u.user_id = ge.user_id
            JOIN Galleries g ON g.gallery_id = ge.gallery_id
            ORDER BY ge.occurred_at DESC, ge.event_id DESC
            LIMIT 100
        `);
        const [roomEvents] = await db.query(`
            SELECT re.event_id, u.username, r.name AS room_name,
                   g.name AS gallery_name, re.type, re.occurred_at
            FROM RoomEvents re
            JOIN Users u ON u.user_id = re.user_id
            JOIN Rooms r ON r.room_id = re.room_id
            JOIN Galleries g ON g.gallery_id = r.gallery_id
            ORDER BY re.occurred_at DESC, re.event_id DESC
            LIMIT 100
        `);
        return res.render("events", { galleryEvents, roomEvents, csrfToken });
    } catch (err) {
        console.error("Unable to load event history:", err);
        return res.status(500).send("Unable to load event history");
    }
});

app.get("/audit", requireRole("admin"), requireOutsideGallery, async (req, res) => {
        const csrfToken = generateToken(req);
        // get filter values
        const getFilter = (value) => {
            if (value === undefined) return "";

            if (typeof value !== "string" || value.length > 100) {
                return null;
            }

            return value.trim();
        };

        const filters = {
            user: getFilter(req.query.user),
            action: getFilter(req.query.action),
            ip: getFilter(req.query.ip)
        };

        if (Object.values(filters).some(v => v === null)) {
            return res.status(400).send("Invalid filter parameters");
        }

    try {
        let sql = `
            SELECT al.log_id, u.username, al.action, al.resource_type,
                   al.resource_id, al.ip_address, al.occurred_at
            FROM AuditLogs al
            LEFT JOIN Users u ON u.user_id = al.user_id
            WHERE 1 = 1
        `;

        const params = [];

        // filter by username
        if (filters.user) {
            sql += " AND u.username LIKE ?";
            params.push(`%${filters.user}%`);
        }

        // filter by action
        if (filters.action) {
            sql += " AND al.action LIKE ?";
            params.push(`%${filters.action}%`);
        }

        // filter by IP address
        if (filters.ip) {
            sql += " AND al.ip_address LIKE ?";
            params.push(`%${filters.ip}%`);
        }

        // show logs newest to oldest
        sql += " ORDER BY al.occurred_at DESC, al.log_id DESC LIMIT 100";

        const [auditLogs] = await db.query(sql, params);

        return res.render("audit", {
            auditLogs,
            filters,
            user: req.session.user, 
            csrfToken
        });
    } catch (err) {
        console.error("Unable to load audit log:", err);
        return res.status(500).send("Unable to load audit log");
    }
});


app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/auth", authRoutes);