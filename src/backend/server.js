const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const cors = require("cors");

// Firebase Admin SDK'yı başlatma
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Bildirim Gönderme Endpoint'i
app.post("/send-notification", async (req, res) => {
    const { title, body, topic } = req.body;

    if (!title || !body || !topic) {
        return res.status(400).send("Gerekli parametreler eksik.");
    }

    const message = {
        notification: {
            title: title,
            body: body,
        },
        topic: topic,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log("Bildirim gönderildi:", response);
        res.status(200).send("Bildirim başarıyla gönderildi.");
    } catch (error) {
        console.error("Bildirim gönderim hatası:", error);
        res.status(500).send("Bildirim gönderim hatası.");
    }
});

// Sunucuyu Başlatma
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
