require("dotenv").config();

const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const  pool  = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// MIDDLEWARE
// =========================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// =========================
// CLOUDINARY CONFIGURATION
// =========================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


// =========================
// MULTER CONFIGURATION
// =========================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});


function uploadToCloudinary(buffer, mimetype) {
return new Promise((resolve, reject) => {
const resourceType = mimetype.startsWith("image/")
? "image"
: mimetype.startsWith("video/")
? "video"
: "raw";

    const stream = cloudinary.uploader.upload_stream(
        {
            folder: "silent-sos/evidence",
            resource_type: resourceType
        },
        (error, result) => {
            if (error) {
                return reject(error);
            }

            resolve(result);
        }
    );

    stream.end(buffer);
});

}

// =========================
// NODEMAILER EMAIL CONFIGURATION
// =========================

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
});

transporter.verify()
    .then(() => {
        console.log("Gmail SMTP connection successful!");
    })
    .catch((error) => {
        console.error("Gmail SMTP verification failed:", {
            code: error.code,
            message: error.message,
            command: error.command
        });
    });


// =========================
// HELPER: SEND EMAIL
// =========================

async function sendEmail(to, subject, text) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("Gmail environment variables are missing.");
        return false;
    }

    if (!to) {
        console.error("Recipient email is missing.");
        return false;
    }

    try {
        const info = await transporter.sendMail({
            from: `"Silent SOS" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
        });

        console.log("Email accepted by SMTP server:", info.messageId);
        return true;
    } catch (error) {
        console.error("Nodemailer error:", error.code, error.message);
        return false;
    }
}

// =========================
// TEST DATABASE CONNECTION
// =========================

app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT NOW() AS current_time"
        );

        res.json({
            success: true,
            message: "PostgreSQL connected successfully.",
            time: result.rows[0].current_time,
        });
    } catch (error) {
        console.error("Database error:", error);

        res.status(500).json({
            success: false,
            message: "PostgreSQL connection failed.",
        });
    }
});

// =========================
// TEST CLOUDINARY
// =========================

app.get("/api/test-cloudinary", async (req, res) => {
    try {
        if (
            !process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET
        ) {
            return res.status(500).json({
                success: false,
                message: "Cloudinary environment variables are missing.",
            });
        }

        const result = await cloudinary.api.ping();

        res.json({
            success: true,
            message: "Cloudinary connected successfully.",
            result,
        });
    } catch (error) {
        console.error("Cloudinary error:", error.message);

        res.status(500).json({
            success: false,
            message: "Cloudinary connection failed.",
            error: error.message,
        });
    }
});

// =========================
// REGISTER
// =========================

app.post("/api/register", async (req, res) => {
    try {
        const { name, email, mobile, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required.",
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already registered.",
            });
        }

        const hashedPassword = await bcrypt.hash(
            String(password),
            10
        );

        const result = await pool.query(
            `INSERT INTO users (name, email, mobile, password)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, mobile, created_at`,
            [
                String(name).trim(),
                normalizedEmail,
                mobile || null,
                hashedPassword,
            ]
        );

        res.status(201).json({
            success: true,
            message: "Registration successful.",
            user: result.rows[0],
        });
    } catch (error) {
        console.error("Registration error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Email already registered.",
            });
        }

        res.status(500).json({
            success: false,
            message: "Registration failed.",
        });
    }
});

// =========================
// LOGIN
// =========================

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required.",
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const result = await pool.query(
            `SELECT id, name, email, mobile, password, created_at
             FROM users
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const user = result.rows[0];

        const passwordMatches = await bcrypt.compare(
            String(password),
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const { password: savedPassword, ...safeUser } = user;

        res.json({
            success: true,
            message: "Login successful.",
            user: safeUser,
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed.",
        });
    }
});

// =========================
// GET EMERGENCY CONTACTS
// =========================

app.get("/api/contacts/:userId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID.",
            });
        }

        const result = await pool.query(
            `SELECT id, user_id, name, mobile, email,
                    relationship, include_in_sos, created_at
             FROM contacts
             WHERE user_id = $1
             ORDER BY id DESC`,
            [userId]
        );

        res.json({
            success: true,
            contacts: result.rows,
        });
    } catch (error) {
        console.error("Get contacts error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch contacts.",
        });
    }
});

// =========================
// ADD EMERGENCY CONTACT
// =========================

app.post("/api/contacts", async (req, res) => {
    try {
        const {
            user_id,
            name,
            mobile,
            email,
            relationship,
            include_in_sos,
        } = req.body;

        const userId = Number(user_id);

        if (!Number.isInteger(userId) || userId <= 0 || !name) {
            return res.status(400).json({
                success: false,
                message: "Valid user ID and contact name are required.",
            });
        }

        const userResult = await pool.query(
            "SELECT id FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const result = await pool.query(
            `INSERT INTO contacts
                (user_id, name, mobile, email, relationship, include_in_sos)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                userId,
                String(name).trim(),
                mobile || null,
                email || null,
                relationship || null,
                include_in_sos === undefined
                    ? true
                    : Boolean(include_in_sos),
            ]
        );

        res.status(201).json({
            success: true,
            message: "Emergency contact added successfully.",
            contact: result.rows[0],
        });
    } catch (error) {
        console.error("Add contact error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to add contact.",
        });
    }
});

// =========================
// UPDATE EMERGENCY CONTACT
// =========================

app.put("/api/contacts/:id", async (req, res) => {
    try {
        const contactId = Number(req.params.id);

        if (!Number.isInteger(contactId) || contactId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID.",
            });
        }

        const {
            user_id,
            name,
            mobile,
            email,
            relationship,
            include_in_sos,
        } = req.body;

        if (!user_id || !name) {
            return res.status(400).json({
                success: false,
                message: "User ID and contact name are required.",
            });
        }

        const result = await pool.query(
            `UPDATE contacts
             SET name = $1,
                 mobile = $2,
                 email = $3,
                 relationship = $4,
                 include_in_sos = $5
             WHERE id = $6 AND user_id = $7
             RETURNING *`,
            [
                String(name).trim(),
                mobile || null,
                email || null,
                relationship || null,
                include_in_sos === undefined
                    ? true
                    : Boolean(include_in_sos),
                contactId,
                Number(user_id),
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Contact not found.",
            });
        }

        res.json({
            success: true,
            message: "Contact updated successfully.",
            contact: result.rows[0],
        });
    } catch (error) {
        console.error("Update contact error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update contact.",
        });
    }
});

// =========================
// DELETE EMERGENCY CONTACT
// =========================

app.delete("/api/contacts/:id", async (req, res) => {
    try {
        const contactId = Number(req.params.id);
        const userId = Number(req.body.user_id || req.query.user_id);

        if (
            !Number.isInteger(contactId) ||
            contactId <= 0 ||
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid contact ID and user ID are required.",
            });
        }

        const result = await pool.query(
            `DELETE FROM contacts
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [contactId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Contact not found.",
            });
        }

        res.json({
            success: true,
            message: "Contact deleted successfully.",
        });
    } catch (error) {
        console.error("Delete contact error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete contact.",
        });
    }
});

// =========================
// UPLOAD EVIDENCE
// =========================

app.post(
    "/api/evidence/upload",
    upload.single("file"),
    async (req, res) => {
        try {
            const { user_id, alert_id, evidence_type } = req.body;

            const userId = Number(user_id);
            const alertId = alert_id ? Number(alert_id) : null;

            if (
                !Number.isInteger(userId) ||
                userId <= 0 ||
                !req.file
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid user ID and a file are required.",
                });
            }

            const userResult = await pool.query(
                "SELECT id FROM users WHERE id = $1",
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found.",
                });
            }

            if (alertId !== null) {
                if (!Number.isInteger(alertId) || alertId <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid alert ID.",
                    });
                }

                const alertResult = await pool.query(
                    "SELECT id FROM sos_alerts WHERE id = $1 AND user_id = $2",
                    [alertId, userId]
                );

                if (alertResult.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "SOS alert not found for this user.",
                    });
                }
            }

            const cloudResult = await uploadToCloudinary(
                req.file.buffer,
                req.file.mimetype
            );

            const type = evidence_type ||
                (req.file.mimetype.startsWith("image/")
                    ? "photo"
                    : 
                req.file.mimetype.startsWith("video/")
                        ? "video"
                        : 
                req.file.mimetype.startsWith("audio/")
                             ? "video"
                             : "file");

            
                const result = await pool.query(
                `INSERT INTO evidence
                    (user_id, alert_id, evidence_type, file_path)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [
                    userId,
                    alertId,
                    type,
                    cloudResult.secure_url,
                ]
            );

            res.status(201).json({
                success: true,
                message: "Evidence uploaded successfully.",
                evidence: result.rows[0],
            });
        } catch (error) {
            console.error("Evidence upload error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to upload evidence.",
                error: error.message,
            });
        }
    }
);

// =========================
// GET EVIDENCE FOR A USER
// =========================

app.get("/api/evidence/:userId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID.",
            });
        }

        const result = await pool.query(
            `SELECT e.id, e.user_id, e.alert_id,
                    e.evidence_type, e.file_path, e.created_at
             FROM evidence e
             WHERE e.user_id = $1
             ORDER BY e.id DESC`,
            [userId]
        );

        res.json({
            success: true,
            evidence: result.rows,
        });
    } catch (error) {
        console.error("Get evidence error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch evidence.",
        });
    }
});

// =========================
// DELETE EVIDENCE
// =========================

app.delete("/api/evidence/:id", async (req, res) => {
    try {
        const evidenceId = Number(req.params.id);
        const userId = Number(req.body.user_id || req.query.user_id);

        if (
            !Number.isInteger(evidenceId) ||
            evidenceId <= 0 ||
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid evidence ID and user ID are required.",
            });
        }

        const result = await pool.query(
            `DELETE FROM evidence
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [evidenceId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Evidence not found.",
            });
        }

        res.json({
            success: true,
            message: "Evidence deleted successfully.",
        });
    } catch (error) {
        console.error("Delete evidence error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete evidence.",
        });
    }
});

// =========================
// ACTIVATE SOS
// =========================

app.post("/api/sos/activate", async (req, res) => {
    try {
        const { user_id, latitude, longitude, accuracy } = req.body;
        const userId = Number(user_id);

        if (
            !Number.isInteger(userId) ||
            userId <= 0 ||
            latitude === undefined ||
            longitude === undefined ||
            !Number.isFinite(Number(latitude)) ||
            !Number.isFinite(Number(longitude))
        ) {
            return res.status(400).json({
                success: false,
                message: "User ID, latitude and longitude are required.",
            });
        }

        const userResult = await pool.query(
            "SELECT id, name, email, mobile FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const user = userResult.rows[0];

        const alertResult = await pool.query(
            `INSERT INTO sos_alerts
                (user_id, latitude, longitude, accuracy, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                userId,
                Number(latitude),
                Number(longitude),
                accuracy == null ? null : Number(accuracy),
                "active",
            ]
        );

        const alert = alertResult.rows[0];

        // Save initial location in location_updates.
        await pool.query(
            `INSERT INTO location_updates
                (user_id, alert_id, latitude, longitude, accuracy)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                userId,
                alert.id,
                Number(latitude),
                Number(longitude),
                accuracy == null ? null : Number(accuracy),
            ]
        );

        // Get emergency contacts selected for SOS.
        const contactsResult = await pool.query(
            `SELECT name, email, mobile
             FROM contacts
             WHERE user_id = $1 AND include_in_sos = TRUE`,
            [userId]
        );

        const locationUrl =
            `https://www.google.com/maps?q=${latitude},${longitude}`;

        const emailText =
            `EMERGENCY SOS ALERT\n\n` +
            `User: ${user.name}\n` +
            `Mobile: ${user.mobile || "Not provided"}\n` +
            `Alert ID: ${alert.id}\n` +
            `Location: ${locationUrl}\n` +
            `Latitude: ${latitude}\n` +
            `Longitude: ${longitude}\n\n` +
            `Please contact the person and seek help if needed.`;

        const emailPromises = contactsResult.rows
            .filter((contact) => contact.email)
            .map((contact) =>
                sendEmail(
                    contact.email,
                    "EMERGENCY SOS ALERT",
                    `Hello ${contact.name || "Emergency Contact"},\n\n${emailText}`
                )
            );

        await Promise.all(emailPromises);

        res.status(201).json({
            success: true,
            message: "SOS activated successfully.",
            alertId: alert.id,
            alert: alert,
            contacts_notified: contactsResult.rows.length,
            location_url: locationUrl,
        });
    } catch (error) {
        console.error("SOS activation error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to activate SOS.",
        });
    }
});

// =========================
// UPDATE LIVE SOS LOCATION
// =========================

app.post("/api/sos/:id/location", async (req, res) => {
    try {
        const alertId = Number(req.params.id);
        const { user_id, latitude, longitude, accuracy } = req.body;
        const userId = Number(user_id);

        if (
            !Number.isInteger(alertId) ||
            alertId <= 0 ||
            !Number.isInteger(userId) ||
            userId <= 0 ||
            latitude === undefined ||
            longitude === undefined ||
            !Number.isFinite(Number(latitude)) ||
            !Number.isFinite(Number(longitude))
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid alert ID, user ID and coordinates are required.",
            });
        }

        const alertResult = await pool.query(
            `SELECT id, user_id, status
             FROM sos_alerts
             WHERE id = $1 AND user_id = $2`,
            [alertId, userId]
        );

        if (alertResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "SOS alert not found.",
            });
        }

        if (alertResult.rows[0].status === "resolved") {
            return res.status(400).json({
                success: false,
                message: "This SOS alert has already been resolved.",
            });
        }

        const lat = Number(latitude);
        const lon = Number(longitude);
        const acc = accuracy == null ? null : Number(accuracy);

        await pool.query(
            `INSERT INTO location_updates
                (user_id, alert_id, latitude, longitude, accuracy)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, alertId, lat, lon, acc]
        );

        const updatedAlert = await pool.query(
            `UPDATE sos_alerts
             SET latitude = $1,
                 longitude = $2,
                 accuracy = $3
             WHERE id = $4 AND user_id = $5
             RETURNING *`,
            [lat, lon, acc, alertId, userId]
        );

        res.json({
            success: true,
            message: "Location updated successfully.",
            alert: updatedAlert.rows[0],
        });
    } catch (error) {
        console.error("SOS location update error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update SOS location.",
        });
    }
});
// =========================
// RESOLVE SOS
// =========================

app.post("/api/sos/:id/resolve", async (req, res) => {
    try {
        const alertId = Number(req.params.id);
        const userId = Number(
            req.body?.user_id || req.query?.user_id
        );

        console.log("Resolve SOS request:", {
            alertId,
            userId
        });

        if (
            !Number.isInteger(alertId) ||
            alertId <= 0 ||
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid alert ID and user ID are required."
            });
        }

        const result = await pool.query(
            `UPDATE sos_alerts
             SET status = 'resolved',
                 resolved_at = COALESCE(
                     resolved_at,
                     CURRENT_TIMESTAMP
                 )
             WHERE id = $1
               AND user_id = $2
             RETURNING *`,
            [alertId, userId]
        );

        if (result.rows.length === 0) {
            console.log("SOS alert not found:", {
                alertId,
                userId
            });

            return res.status(404).json({
                success: false,
                message: "SOS alert not found for this user."
            });
        }

        console.log("SOS successfully resolved:", {
            alertId,
            status: result.rows[0].status
        });
const resolvedAlert = result.rows[0];

// Fetch user details
const userResult = await pool.query(
    `SELECT name, email, mobile
     FROM users
     WHERE id = $1`,
    [userId]
);

const resolvedUser = userResult.rows[0];

// Fetch emergency contacts selected for SOS
const contactsResult = await pool.query(
    `SELECT name, email
     FROM contacts
     WHERE user_id = $1
       AND include_in_sos = TRUE
       AND email IS NOT NULL
       AND email <> ''`,
    [userId]
);

const resolvedAt = resolvedAlert.resolved_at
    ? new Date(resolvedAlert.resolved_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    })
    : new Date().toLocaleString("en-IN");

// Send resolution email to emergency contacts
const resolutionEmailPromises = contactsResult.rows.map(contact => {
    const subject = "SOS RESOLVED - Person Is Safe";

    const emailText =
        `Hello ${contact.name || "Emergency Contact"},\n\n` +
        `This is an update regarding the previous SOS emergency alert.\n\n` +
        `The SOS alert has now been marked as RESOLVED.\n\n` +
        `Person: ${resolvedUser?.name || "User"}\n` +
        `Mobile: ${resolvedUser?.mobile || "Not provided"}\n` +
        `Alert ID: ${resolvedAlert.id}\n` +
        `Status: RESOLVED\n` +
        `Resolved At: ${resolvedAt}\n\n` +
        `The person has marked themselves as safe through the Silent SOS application.\n\n` +
        `This is an automated notification from Silent SOS.`;

    return sendEmail(contact.email, subject, emailText);
});

await Promise.all(resolutionEmailPromises);

console.log(
    `SOS resolved email notifications processed for ${contactsResult.rows.length} contact(s).`
);

return res.json({
    success: true,
    message: "SOS resolved successfully.",
    alert: resolvedAlert
});

    } catch (error) {
        console.error("SOS resolve error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to resolve SOS.",
            error: error.message
        });
    }
});

// =========================
// SAVE TRACKING LOCATION
// =========================

app.post("/api/tracking/location", async (req, res) => {
    try {
        const {
            user_id,
            alert_id,
            latitude,
            longitude,
            accuracy,
        } = req.body;

        const userId = Number(user_id);
        const alertId = alert_id ? Number(alert_id) : null;

        if (
            !Number.isInteger(userId) ||
            userId <= 0 ||
            latitude === undefined ||
            longitude === undefined ||
            !Number.isFinite(Number(latitude)) ||
            !Number.isFinite(Number(longitude))
        ) {
            return res.status(400).json({
                success: false,
                message: "User ID, latitude and longitude are required.",
            });
        }

        const userResult = await pool.query(
            "SELECT id FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (alertId !== null) {
            if (!Number.isInteger(alertId) || alertId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid alert ID.",
                });
            }

            const alertResult = await pool.query(
                `SELECT id FROM sos_alerts
                 WHERE id = $1 AND user_id = $2`,
                [alertId, userId]
            );

            if (alertResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "SOS alert not found for this user.",
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO location_updates
                (user_id, alert_id, latitude, longitude, accuracy)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                userId,
                alertId,
                Number(latitude),
                Number(longitude),
                accuracy == null ? null : Number(accuracy),
            ]
        );

        res.status(201).json({
            success: true,
            message: "Location saved successfully.",
            location: result.rows[0],
        });
    } catch (error) {
        console.error("Tracking location error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to save location.",
        });
    }
});

// =========================
// GET TRACKING HISTORY
// =========================

app.get("/api/tracking/:userId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID.",
            });
        }

        const result = await pool.query(
            `SELECT *
             FROM location_updates
             WHERE user_id = $1
             ORDER BY id DESC
             LIMIT 500`,
            [userId]
        );

        res.json({
            success: true,
            locations: result.rows,
        });
    } catch (error) {
        console.error("Tracking history error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch tracking history.",
        });
    }
});

// =========================
// GET SOS ALERTS FOR A USER
// =========================

app.get("/api/sos/user/:userId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID.",
            });
        }

        const result = await pool.query(
            `SELECT *
             FROM sos_alerts
             WHERE user_id = $1
             ORDER BY id DESC`,
            [userId]
        );

        res.json({
            success: true,
            alerts: result.rows,
        });
    } catch (error) {
        console.error("Get SOS alerts error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch SOS alerts.",
        });
    }
});

// =========================
// DEFAULT ROUTE
// =========================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =========================
// ERROR HANDLER
// =========================

app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err);

    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    res.status(500).json({
        success: false,
        message: "Internal server error.",
    });
});

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {
    console.log(`Silent SOS server running on port ${PORT}`);
});