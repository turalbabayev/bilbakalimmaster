import React, { useState } from 'react';
import Layout from '../../components/layout';
import { db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaBell } from 'react-icons/fa';

const NotificationsPage = () => {
    const [notification, setNotification] = useState({
        title: '',
        message: '',
        topic: 'all' // Varsayılan olarak tüm kullanıcılara
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            // Bildirimi Firestore'a kaydet
            await addDoc(collection(db, 'notifications'), {
                ...notification,
                createdAt: new Date(),
                status: 'pending' // Gönderilmeyi bekliyor
            });

            toast.success('Bildirim başarıyla oluşturuldu');
            
            // Formu temizle
            setNotification({
                title: '',
                message: '',
                topic: 'all'
            });
        } catch (error) {
            console.error('Error sending notification:', error);
            toast.error('Bildirim gönderilirken bir hata oluştu');
        }
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800 mb-8">
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
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Bildirim mesajını girin..."
                                    rows="4"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Hedef Kitle
                                </label>
                                <select
                                    value={notification.topic}
                                    onChange={(e) => setNotification({ ...notification, topic: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="all">Tüm Kullanıcılar</option>
                                    <option value="premium">Premium Kullanıcılar</option>
                                    <option value="free">Ücretsiz Kullanıcılar</option>
                                </select>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    <FaBell />
                                    Bildirimi Gönder
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