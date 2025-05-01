const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const cors = require('cors')({origin: true});

// Firebase Admin başlatma
initializeApp();

exports.deleteAccount = onRequest({
    cors: true,
    maxInstances: 10
}, async (request, response) => {
    try {
        // Sadece POST isteklerini kabul et
        if (request.method !== 'POST') {
            return response.status(405).json({
                success: false,
                error: 'Method not allowed. Only POST requests are accepted.'
            });
        }

        // İstek gövdesinden kullanıcı ID'sini ve token'ı al
        const { userId, idToken } = request.body;

        if (!userId || !idToken) {
            return response.status(400).json({
                success: false,
                error: 'User ID and ID Token are required.'
            });
        }

        // ID Token'ı doğrula
        const decodedToken = await getAuth().verifyIdToken(idToken);

        // Token'daki kullanıcı ID'si ile gönderilen ID'nin eşleştiğini kontrol et
        if (decodedToken.uid !== userId) {
            return response.status(403).json({
                success: false,
                error: 'Unauthorized. Token does not match the user ID.'
            });
        }

        // Firestore'dan kullanıcı verilerini sil
        const db = getFirestore();
        await db.collection('users').doc(userId).delete();

        // Firebase Auth'dan kullanıcıyı sil
        await getAuth().deleteUser(userId);

        return response.status(200).json({
            success: true,
            message: 'Account successfully deleted.'
        });

    } catch (error) {
        console.error('Error deleting account:', error);
        
        return response.status(500).json({
            success: false,
            error: 'An error occurred while deleting the account.',
            details: error.message
        });
    }
}); 