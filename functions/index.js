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
        const { email } = data;
        
        if (!email) {
            throw new functions.https.HttpsError('invalid-argument', 'Email adresi gerekli.');
        }

        const db = admin.firestore();
        
        // Users koleksiyonundaki tüm dokümanları al
        const usersSnapshot = await db.collection('users').get();
        let userToDelete = null;

        // Her bir kullanıcı dokümanını kontrol et
        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            if (userData.email === email) {
                userToDelete = doc;
                break;
            }
        }

        if (!userToDelete) {
            throw new functions.https.HttpsError('not-found', 'Bu email adresine sahip kullanıcı bulunamadı.');
        }

        // Kullanıcı dokümanını sil
        await userToDelete.ref.delete();

        return { success: true, message: 'Kullanıcı başarıyla silindi.' };
    } catch (error) {
        console.error('Kullanıcı silme hatası:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Kullanıcı silinirken bir hata oluştu: ' + error.message);
    }
}); 