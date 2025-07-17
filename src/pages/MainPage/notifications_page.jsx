import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { toast } from "react-hot-toast";
import { FaBell, FaUsers, FaPaperPlane, FaImage, FaClock, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import oneSignalService from "../../services/oneSignalService";

const NotificationsPage = () => {
    const [notification, setNotification] = useState({
        title: "",
        message: "",
        imageUrl: "",
        redirectUrl: "",
        targetAudience: "all", // all, segments, players
        segments: [],
        playerIds: [],
        scheduleType: "now", // now, later
        scheduleTime: ""
    });

    const [isLoading, setIsLoading] = useState(false);
    const [sentNotifications, setSentNotifications] = useState([]);
    const [segments, setSegments] = useState([]);
    const [appStats, setAppStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);

    // Component mount olduğunda verileri yükle
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        await Promise.all([
            loadSegments(),
            loadAppStats(),
            loadNotificationHistory()
        ]);
        setLoadingStats(false);
    };

    const loadSegments = async () => {
        try {
            const response = await oneSignalService.getSegments();
            setSegments(response.segments || []);
        } catch (error) {
            console.error('Segments yüklenemedi:', error);
        }
    };

    const loadAppStats = async () => {
        try {
            const stats = await oneSignalService.getAppStats();
            setAppStats(stats);
        } catch (error) {
            console.error('App stats yüklenemedi:', error);
        }
    };

    const loadNotificationHistory = async () => {
        try {
            const history = await oneSignalService.getNotificationHistory();
            setSentNotifications(history.notifications || []);
        } catch (error) {
            console.error('Bildirim geçmişi yüklenemedi:', error);
        }
    };

    const loadSamplePlayerIds = async () => {
        try {
            const samplePlayers = await oneSignalService.getSamplePlayerIds();
            const playerIds = samplePlayers.map(player => player.id).filter(id => id);
            setNotification(prev => ({
                ...prev,
                playerIds: playerIds
            }));
            toast.success(`Örnek Player ID'leri yüklendi. (${playerIds.length} adet)`);
        } catch (error) {
            console.error('Örnek Player ID yüklenemedi:', error);
            toast.error('Örnek Player ID yüklenemedi.');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNotification(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSegmentChange = (segmentId) => {
        setNotification(prev => ({
            ...prev,
            segments: prev.segments.includes(segmentId)
                ? prev.segments.filter(id => id !== segmentId)
                : [...prev.segments, segmentId]
        }));
    };

    const handleSendNotification = async () => {
        if (!notification.title.trim() || !notification.message.trim()) {
            toast.error("Başlık ve mesaj alanları zorunludur!");
            return;
        }

        if (notification.title.length > 50) {
            toast.error("Başlık 50 karakterden fazla olamaz!");
            return;
        }

        if (notification.message.length > 200) {
            toast.error("Mesaj 200 karakterden fazla olamaz!");
            return;
        }

        setIsLoading(true);
        try {
            // Bildirim verilerini OneSignal formatına çevir
            const formattedData = oneSignalService.formatNotificationData(notification);
            
            console.log('Gönderilecek bildirim verisi:', formattedData);
            
            // OneSignal API çağrısı
            const result = await oneSignalService.sendNotification(formattedData);
            
            console.log('OneSignal API sonucu:', result);
            
            if (result.id) {
                const newNotification = {
                    id: result.id,
                    ...notification,
                    sentAt: new Date().toISOString(),
                    status: "sent",
                    recipients: result.recipients || "Bilinmiyor"
                };

                setSentNotifications(prev => [newNotification, ...prev]);
                
                // Form'u temizle
                setNotification({
                    title: "",
                    message: "",
                    imageUrl: "",
                    redirectUrl: "",
                    targetAudience: "all",
                    segments: [],
                    playerIds: [],
                    scheduleType: "now",
                    scheduleTime: ""
                });

                toast.success(`Bildirim başarıyla gönderildi! ${result.recipients || 'Bilinmeyen sayıda'} alıcıya ulaştı.`);
            } else {
                console.error('OneSignal API hatası:', result);
                
                let errorMessage = "Bildirim gönderilemedi";
                
                if (result.error) {
                    errorMessage = result.error;
                }
                
                if (result.details) {
                    console.error('Hata detayları:', result.details);
                    
                    if (result.details.errors) {
                        const errors = result.details.errors;
                        if (errors.included_segments) {
                            errorMessage = `Segment hatası: ${errors.included_segments.join(', ')}`;
                        } else if (errors.contents) {
                            errorMessage = `Mesaj hatası: ${errors.contents.join(', ')}`;
                        } else if (errors.headings) {
                            errorMessage = `Başlık hatası: ${errors.headings.join(', ')}`;
                        } else {
                            errorMessage = `API Hatası: ${JSON.stringify(errors)}`;
                        }
                    }
                }
                
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error("Bildirim gönderme hatası:", error);
            
            let errorMessage = error.message || "Bildirim gönderilemedi";
            
            // Ağ hatası kontrolü
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = "Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.";
            }
            
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (loadingStats) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-6">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">OneSignal bağlantısı kontrol ediliyor...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <FaBell className="text-blue-600" />
                        Bildirimler
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        OneSignal üzerinden kullanıcılara bildirim gönderin
                    </p>
                    {appStats && (
                        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-blue-600 dark:text-blue-400">
                                    📱 Toplam Cihaz: {appStats.players || 0}
                                </span>
                                <span className="text-blue-600 dark:text-blue-400">
                                    📊 Uygulama: {appStats.name || 'BilBakalım'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Bildirim Gönderme Formu */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <FaPaperPlane className="text-green-600" />
                            Yeni Bildirim Gönder
                        </h2>

                        <div className="space-y-6">
                            {/* Başlık */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Başlık *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={notification.title}
                                    onChange={handleInputChange}
                                    maxLength={50}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Bildirim başlığı..."
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {notification.title.length}/50 karakter
                                </p>
                            </div>

                            {/* Mesaj */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Mesaj *
                                </label>
                                <textarea
                                    name="message"
                                    value={notification.message}
                                    onChange={handleInputChange}
                                    maxLength={200}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Bildirim mesajı..."
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {notification.message.length}/200 karakter
                                </p>
                            </div>

                            {/* Resim URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <FaImage className="inline mr-1" />
                                    Resim URL (Opsiyonel)
                                </label>
                                <input
                                    type="url"
                                    name="imageUrl"
                                    value={notification.imageUrl}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="https://example.com/image.jpg"
                                />
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

                            {/* Hedef Kitle */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <FaUsers className="inline mr-1" />
                                    Hedef Kitle
                                </label>
                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="targetAudience"
                                            value="all"
                                            checked={notification.targetAudience === "all"}
                                            onChange={handleInputChange}
                                            className="mr-2"
                                        />
                                        Tüm Kullanıcılar
                                    </label>
                                    
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="targetAudience"
                                            value="segments"
                                            checked={notification.targetAudience === "segments"}
                                            onChange={handleInputChange}
                                            className="mr-2"
                                        />
                                        Belirli Segmentler
                                    </label>
                                    
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="targetAudience"
                                            value="players"
                                            checked={notification.targetAudience === "players"}
                                            onChange={handleInputChange}
                                            className="mr-2"
                                        />
                                        Belirli Kullanıcılar (Player ID)
                                    </label>
                                </div>
                            </div>

                            {/* Segment Seçimi */}
                            {notification.targetAudience === "segments" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Segmentler
                                    </label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {segments.map((segment) => (
                                            <label key={segment.id} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={notification.segments.includes(segment.id)}
                                                    onChange={() => handleSegmentChange(segment.id)}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm">
                                                    {segment.name} ({segment.session_count || 0} kullanıcı)
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Player ID Girişi */}
                            {notification.targetAudience === "players" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Player ID'leri
                                    </label>
                                    <div className="space-y-2">
                                        <textarea
                                            value={notification.playerIds.join('\n')}
                                            onChange={(e) => setNotification(prev => ({
                                                ...prev,
                                                playerIds: e.target.value.split('\n').filter(id => id.trim())
                                            }))}
                                            rows={4}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="Her satıra bir Player ID girin..."
                                        />
                                        <button
                                            type="button"
                                            onClick={loadSamplePlayerIds}
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            Örnek Player ID'leri yükle
                                        </button>
                                    </div>
                                </div>
                            )}

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
                                            name="scheduleType"
                                            value="now"
                                            checked={notification.scheduleType === "now"}
                                            onChange={handleInputChange}
                                            className="mr-2"
                                        />
                                        Şimdi Gönder
                                    </label>
                                    
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="scheduleType"
                                            value="later"
                                            checked={notification.scheduleType === "later"}
                                            onChange={handleInputChange}
                                            className="mr-2"
                                        />
                                        Zamanla
                                    </label>
                                </div>
                            </div>

                            {/* Zamanlama Detayları */}
                            {notification.scheduleType === "later" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Gönderim Tarihi ve Saati
                                    </label>
                                    <input
                                        type="datetime-local"
                                        name="scheduleTime"
                                        value={notification.scheduleTime}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            )}

                            {/* Gönder Butonu */}
                            <button
                                onClick={handleSendNotification}
                                disabled={isLoading || !notification.title.trim() || !notification.message.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Gönderiliyor...
                                    </>
                                ) : (
                                    <>
                                        <FaPaperPlane />
                                        Bildirim Gönder
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Bildirim Geçmişi */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <FaClock className="text-blue-600" />
                            Bildirim Geçmişi
                        </h2>

                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {sentNotifications.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                    Henüz bildirim gönderilmedi.
                                </p>
                            ) : (
                                sentNotifications.map((notif, index) => (
                                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-medium text-gray-900 dark:text-white">
                                                    {notif.headings?.en || notif.title}
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    {notif.contents?.en || notif.message}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                    <span>
                                                        {new Date(notif.send_after || notif.sentAt).toLocaleString('tr-TR')}
                                                    </span>
                                                    <span>
                                                        {notif.successful || notif.recipients} alıcı
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FaCheck className="text-green-500 text-sm" />
                                                <span className="text-xs text-green-600">Gönderildi</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default NotificationsPage; 