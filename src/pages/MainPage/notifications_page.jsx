import React, { useState } from 'react';
import Layout from '../../components/layout';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaBell, FaHistory } from 'react-icons/fa';

const NotificationsPage = () => {
    const [notification, setNotification] = useState({
        title: '',
        message: '',
        topic: 'all_users',
        imageUrl: '' // Opsiyonel bildirim resmi
    });

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Firebase project ID güncellendi
            const functionUrl = 'https://us-central1-bilbakalim-28281.cloudfunctions.net/sendNotification';

            // Cloud Function'a istek at
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    notification: {
                        title: notification.title,
                        body: notification.message,
                        imageUrl: notification.imageUrl || null
                    },
                    topic: notification.topic
                })
            });

            if (!response.ok) {
                throw new Error('Bildirim gönderilirken bir hata oluştu');
            }

            // Bildirimi Firestore'a kaydet
            await addDoc(collection(db, 'notifications'), {
                ...notification,
                createdAt: serverTimestamp(),
                status: 'sent'
            });

            toast.success('Bildirim başarıyla gönderildi');
            
            // Formu temizle
            setNotification({
                title: '',
                message: '',
                topic: 'all_users',
                imageUrl: ''
            });
        } catch (error) {
            console.error('Error sending notification:', error);
            toast.error('Bildirim gönderilirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
                        <FaBell className="text-indigo-600" />
                        Push Bildirim Gönder
                    </h1>

                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Bildirim Başlığı
                                </label>
                                <input
                                    type="text"
                                    value={notification.title}
                                    onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Bildirim başlığını girin..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Bildirim Mesajı
                                </label>
                                <textarea
                                    value={notification.message}
                                    onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Bildirim mesajını girin..."
                                    rows="4"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Bildirim Resmi URL (Opsiyonel)
                                </label>
                                <input
                                    type="url"
                                    value={notification.imageUrl}
                                    onChange={(e) => setNotification({ ...notification, imageUrl: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Hedef Kitle
                                </label>
                                <select
                                    value={notification.topic}
                                    onChange={(e) => setNotification({ ...notification, topic: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                >
                                    <option value="all_users">Tüm Kullanıcılar</option>
                                    <option value="premium_users">Premium Kullanıcılar</option>
                                    <option value="free_users">Ücretsiz Kullanıcılar</option>
                                </select>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`px-6 py-3 bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-2
                                        ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                                >
                                    <FaBell />
                                    {loading ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default NotificationsPage; 