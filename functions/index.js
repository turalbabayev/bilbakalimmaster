const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendNotification = functions.https.onRequest(async (req, res) => {
    try {
        // CORS headers
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');

        // OPTIONS request için erken dönüş
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        // POST metodu kontrolü
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const { notification, topic } = req.body;

        if (!notification || !notification.title || !notification.body) {
            res.status(400).send('Invalid notification data');
            return;
        }

        // Bildirim mesajını oluştur
        const message = {
            notification: {
                title: notification.title,
                body: notification.body,
            },
            android: {
                notification: {
                    icon: 'notification_icon',
                    color: '#4CAF50',
                    sound: 'default'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default'
                    }
                }
            }
        };

        // Eğer bildirim resmi varsa ekle
        if (notification.imageUrl) {
            message.notification.imageUrl = notification.imageUrl;
        }

        // Topic'e göre bildirimi gönder
        if (topic === 'all') {
            await admin.messaging().sendToTopic('all_users', message);
        } else if (topic === 'premium') {
            await admin.messaging().sendToTopic('premium_users', message);
        } else if (topic === 'free') {
            await admin.messaging().sendToTopic('free_users', message);
        }

        res.status(200).send({ success: true, message: 'Notification sent successfully' });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).send({ error: 'Failed to send notification' });
    }
});

exports.deleteAccount = functions.https.onCall(async (data, context) => {
    try {
        // Token'ı doğrula
        const decodedToken = await admin.auth().verifyIdToken(data.idToken);
        const uid = decodedToken.uid;

        // Firestore batch işlemi başlat
        const batch = admin.firestore().batch();
        const db = admin.firestore();

        // Kullanıcı profilini sil
        const userDoc = db.collection('users').doc(uid);
        batch.delete(userDoc);

        // Batch işlemini uygula
        await batch.commit();

        // Firebase Authentication'dan kullanıcıyı sil
        await admin.auth().deleteUser(uid);

        return { success: true, message: 'Hesap başarıyla silindi.' };
    } catch (error) {
        console.error('Hesap silme hatası:', error);
        throw new functions.https.HttpsError('internal', 'Hesap silinirken bir hata oluştu: ' + error.message);
    }
}); 