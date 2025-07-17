import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/layout";
import { toast } from "react-hot-toast";
import { FaBell, FaSave, FaImage, FaClock, FaExternalLinkAlt, FaTrash, FaEdit, FaSmile, FaUpload } from "react-icons/fa";
import { db } from "../../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import EmojiPicker from 'emoji-picker-react';

const NotificationsPage = () => {
    const [notification, setNotification] = useState({
        title: "",
        subtitle: "",
        message: "",
        imageUrl: "",
        redirectUrl: "",
        sentTime: "",
        status: "sent" // sent, scheduled, draft
    });

    const [isLoading, setIsLoading] = useState(false);
    const [savedNotifications, setSavedNotifications] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(null); // 'title' veya 'message'
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef(null);

    const handleEmojiClick = (emojiData) => {
        if (showEmojiPicker === 'title') {
            setNotification(prev => ({
                ...prev,
                title: prev.title + emojiData.emoji
            }));
        } else if (showEmojiPicker === 'subtitle') {
            setNotification(prev => ({
                ...prev,
                subtitle: prev.subtitle + emojiData.emoji
            }));
        } else if (showEmojiPicker === 'message') {
            setNotification(prev => ({
                ...prev,
                message: prev.message + emojiData.emoji
            }));
        }
        setShowEmojiPicker(null);
    };

    // Component mount olduğunda kayıtlı bildirimleri yükle
    useEffect(() => {
        loadSavedNotifications();
    }, []);

    const loadSavedNotifications = async () => {
        try {
            const notificationsRef = collection(db, "notifications");
            const q = query(notificationsRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setSavedNotifications(notifications);
        } catch (error) {
            console.error('Bildirimler yüklenirken hata:', error);
            toast.error('Bildirimler yüklenirken hata oluştu');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNotification(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveNotification = async () => {
        if (!notification.title.trim() || !notification.message.trim()) {
            toast.error('Başlık ve mesaj alanları zorunludur');
            return;
        }

        setIsLoading(true);
        try {
            // Gönderim zamanını belirle
            let finalSentTime;
            if (notification.status === "sent") {
                // Şimdi gönder seçilmişse o anki tarihi kullan
                finalSentTime = new Date().toISOString();
            } else if (notification.status === "scheduled") {
                // Zamanla seçilmişse belirlenen tarihi kullan
                finalSentTime = notification.sentTime || new Date().toISOString();
            } else {
                // Diğer durumlar için o anki tarihi kullan
                finalSentTime = new Date().toISOString();
            }

            const notificationData = {
                ...notification,
                sentTime: finalSentTime,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                // Güncelleme
                const notificationRef = doc(db, "notifications", editingId);
                await updateDoc(notificationRef, {
                    ...notificationData,
                    updatedAt: serverTimestamp()
                });
                toast.success('Bildirim başarıyla güncellendi!');
                setEditingId(null);
            } else {
                // Yeni kayıt
                await addDoc(collection(db, "notifications"), notificationData);
                toast.success('Bildirim başarıyla kaydedildi!');
            }

            // Formu temizle
            setNotification({
                title: "",
                subtitle: "",
                message: "",
                imageUrl: "",
                redirectUrl: "",
                sentTime: "",
                status: "sent"
            });

            // Listeyi yenile
            loadSavedNotifications();
        } catch (error) {
            console.error('Bildirim kaydedilirken hata:', error);
            toast.error('Bildirim kaydedilirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (notif) => {
        setNotification({
            title: notif.title,
            subtitle: notif.subtitle || "",
            message: notif.message,
            imageUrl: notif.imageUrl || "",
            redirectUrl: notif.redirectUrl || "",
            sentTime: notif.sentTime,
            status: notif.status
        });
        setEditingId(notif.id);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu bildirimi silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, "notifications", id));
            toast.success('Bildirim silindi');
            loadSavedNotifications();
        } catch (error) {
            console.error('Bildirim silinirken hata:', error);
            toast.error('Bildirim silinirken hata oluştu');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setNotification({
            title: "",
            subtitle: "",
            message: "",
            imageUrl: "",
            redirectUrl: "",
            sentTime: "",
            status: "sent"
        });
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Dosya boyutu kontrolü (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
            return;
        }

        // Dosya türü kontrolü
        if (!file.type.startsWith('image/')) {
            toast.error('Sadece resim dosyaları yüklenebilir');
            return;
        }

        setUploadingImage(true);
        try {
            const storage = getStorage();
            const fileName = `notifications/${Date.now()}_${file.name}`;
            const imageRef = storageRef(storage, fileName);
            
            // Dosyayı yükle
            await uploadBytes(imageRef, file);
            
            // Download URL'ini al
            const downloadURL = await getDownloadURL(imageRef);
            
            // State'i güncelle
            setNotification(prev => ({
                ...prev,
                imageUrl: downloadURL
            }));
            
            toast.success('Resim başarıyla yüklendi!');
        } catch (error) {
            console.error('Resim yükleme hatası:', error);
            toast.error('Resim yüklenirken hata oluştu');
        } finally {
            setUploadingImage(false);
            // Input'u temizle
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-3">
                        <FaBell className="text-blue-600" />
                        Bildirim Yönetimi
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        OneSignal Dashboard'dan bildirim gönderdikten sonra, aynı bildirim bilgilerini burada kaydedin
                    </p>
                    <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <FaExternalLinkAlt className="text-yellow-600 mt-1" />
                            <div className="text-left">
                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                    Kullanım Talimatları:
                                </p>
                                <ol className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
                                    <li>1. OneSignal Dashboard'a gidin</li>
                                    <li>2. Bildiriminizi oluşturun ve gönderin</li>
                                    <li>3. Gönderdiğiniz bildirim bilgilerini aşağıdaki forma girin</li>
                                    <li>4. "Bildirim Kaydet" butonuna basın</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Bildirim Gönderme Formu */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <FaSave className="text-green-600" />
                            Yeni Bildirim Kaydet
                        </h2>

                        <div className="space-y-6">
                            {/* Başlık */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Bildirim Başlığı
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        name="title"
                                        value={notification.title}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Bildirim başlığını girin..."
                                    />
                                    <button
                                        onClick={() => setShowEmojiPicker('title')}
                                        className="ml-2 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                        title="Emoji Ekle"
                                    >
                                        <FaSmile />
                                    </button>
                                </div>
                            </div>

                            {/* Alt Başlık */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Bildirim Alt Başlığı (Opsiyonel)
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        name="subtitle"
                                        value={notification.subtitle}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Bildirim alt başlığını girin..."
                                    />
                                    <button
                                        onClick={() => setShowEmojiPicker('subtitle')}
                                        className="ml-2 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                        title="Emoji Ekle"
                                    >
                                        <FaSmile />
                                    </button>
                                </div>
                            </div>

                            {/* Mesaj */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Bildirim Mesajı
                                </label>
                                <div className="flex items-center">
                                    <textarea
                                        name="message"
                                        value={notification.message}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Bildirim mesajını girin..."
                                    />
                                    <button
                                        onClick={() => setShowEmojiPicker('message')}
                                        className="ml-2 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                        title="Emoji Ekle"
                                    >
                                        <FaSmile />
                                    </button>
                                </div>
                            </div>

                            {/* Resim URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <FaImage className="inline mr-1" />
                                    Resim URL (Opsiyonel)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="url"
                                        name="imageUrl"
                                        value={notification.imageUrl}
                                        onChange={handleInputChange}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingImage}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        {uploadingImage ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Yükleniyor...
                                            </>
                                        ) : (
                                            <>
                                                <FaUpload />
                                                Resim Yükle
                                            </>
                                        )}
                                    </button>
                                </div>
                                {notification.imageUrl && (
                                    <div className="mt-2">
                                        <img 
                                            src={notification.imageUrl} 
                                            alt="Bildirim resmi" 
                                            className="w-32 h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Yönlendirme URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Yönlendirme URL (Opsiyonel)
                                </label>
                                <input
                                    type="url"
                                    name="redirectUrl"
                                    value={notification.redirectUrl}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="https://example.com"
                                />
                            </div>

                            {/* Zamanlama */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <FaClock className="inline mr-1" />
                                    Gönderim Zamanı
                                </label>
                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="sent"
                                            checked={notification.status === "sent"}
                                            onChange={handleInputChange}
                                            className="mr-2"
                                        />
                                        Şimdi Gönder
                                    </label>
                                    
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="scheduled"
                                            checked={notification.status === "scheduled"}
                                            onChange={handleInputChange}
                                            className="mr-2"
                                        />
                                        Zamanla
                                    </label>
                                </div>
                            </div>

                            {/* Zamanlama Detayları */}
                            {notification.status === "scheduled" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Gönderim Tarihi ve Saati
                                    </label>
                                    <input
                                        type="datetime-local"
                                        name="sentTime"
                                        value={notification.sentTime}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            )}

                            {/* Kaydet Butonu */}
                            <button
                                onClick={handleSaveNotification}
                                disabled={isLoading || !notification.title.trim() || !notification.message.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Kaydediliyor...
                                    </>
                                ) : (
                                    <>
                                        <FaSave />
                                        Bildirim Kaydet
                                    </>
                                )}
                            </button>

                            {/* İptal Butonu */}
                            {editingId && (
                                <button
                                    onClick={cancelEdit}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <FaExternalLinkAlt />
                                    İptal
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bildirim Geçmişi */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <FaClock className="text-blue-600" />
                            Bildirim Geçmişi
                        </h2>

                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {savedNotifications.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                    Henüz bildirim kaydedilmedi.
                                </p>
                            ) : (
                                savedNotifications.map((notif, index) => (
                                    <div key={notif.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900 dark:text-white">
                                                {notif.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {notif.subtitle && <span>{notif.subtitle} - </span>} {notif.message}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <span>
                                                    {new Date(notif.sentTime || notif.createdAt).toLocaleString('tr-TR')}
                                                </span>
                                                <span>
                                                    {notif.status === 'sent' ? 'Gönderildi' : notif.status === 'scheduled' ? 'Zamanlandı' : 'Taslak'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FaEdit className="text-blue-500 text-sm cursor-pointer" onClick={() => handleEdit(notif)} />
                                            <FaTrash className="text-red-500 text-sm cursor-pointer" onClick={() => handleDelete(notif.id)} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50"
                        onClick={() => setShowEmojiPicker(null)}
                    ></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Emoji Seçin
                            </h3>
                            <button
                                onClick={() => setShowEmojiPicker(null)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
                            >
                                ✕
                            </button>
                        </div>
                        <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            theme="auto"
                            width={350}
                            height={400}
                            searchDisabled={false}
                            emojiSize={24}
                            emojiTooltip={true}
                            previewConfig={{ showPreview: false }}
                            skinTonePickerLocation="SEARCH"
                            customEmojis={[]}
                        />
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default NotificationsPage; 