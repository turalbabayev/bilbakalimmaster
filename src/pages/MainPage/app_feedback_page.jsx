import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    doc,
    getDoc
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { 
    FaComments, 
    FaStar, 
    FaFilter, 
    FaSearch, 
    FaEye, 
    FaUser,
    FaCalendar,
    FaMobile,
    FaApple,
    FaAndroid,
    FaExclamationTriangle,
    FaCheckCircle,
    FaClock,
    FaSort,
    FaTimes,
    FaDownload,
    FaBug,
    FaLightbulb,
    FaHeart,
    FaThumbsDown
} from "react-icons/fa";

const AppFeedbackPage = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [platformFilter, setPlatformFilter] = useState("all");
    const [sortBy, setSortBy] = useState("date");
    const [showFilters, setShowFilters] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [userNames, setUserNames] = useState({});

    useEffect(() => {
        loadFeedbacks();
    }, []);

    useEffect(() => {
        filterAndSortFeedbacks();
    }, [feedbacks, searchTerm, platformFilter, sortBy]);

    const loadFeedbacks = async () => {
        setLoading(true);
        try {
            const feedbacksRef = collection(db, "feedbacks");
            const q = query(feedbacksRef, orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            
            const feedbacksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setFeedbacks(feedbacksData);
            
            // Kullanıcı isimlerini yükle
            await loadUserNames(feedbacksData);
        } catch (error) {
            console.error('Geri bildirimler yüklenirken hata:', error);
            toast.error('Geri bildirimler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const loadUserNames = async (feedbacksData) => {
        const uniqueUserIds = [...new Set(feedbacksData.map(f => f.userId).filter(Boolean))];
        const userNamesData = {};

        for (const userId of uniqueUserIds) {
            try {
                const userDoc = await getDoc(doc(db, "users", userId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    userNamesData[userId] = `${userData.name || ''} ${userData.surname || ''}`.trim() || 'Anonim';
                } else {
                    userNamesData[userId] = 'Anonim';
                }
            } catch (error) {
                console.error(`Kullanıcı ${userId} yüklenirken hata:`, error);
                userNamesData[userId] = 'Anonim';
            }
        }

        setUserNames(userNamesData);
    };

    const filterAndSortFeedbacks = () => {
        let filtered = [...feedbacks];

        // Arama filtresi
        if (searchTerm) {
            filtered = filtered.filter(feedback => 
                feedback.feedback?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                userNames[feedback.userId]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                feedback.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                feedback.appVersion?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Platform filtresi
        if (platformFilter !== "all") {
            filtered = filtered.filter(feedback => {
                const platformLower = feedback.platform?.toLowerCase();
                if (platformFilter === "ios") {
                    return platformLower?.includes('ios') || platformLower === 'targetplatform.ios';
                } else if (platformFilter === "android") {
                    return platformLower?.includes('android') || platformLower === 'targetplatform.android';
                }
                return false;
            });
        }

        // Sıralama
        switch (sortBy) {
            case "date":
                filtered.sort((a, b) => new Date(b.timestamp?.toDate()) - new Date(a.timestamp?.toDate()));
                break;
            case "user":
                filtered.sort((a, b) => (userNames[a.userId] || '').localeCompare(userNames[b.userId] || ''));
                break;
            case "platform":
                filtered.sort((a, b) => getPlatformDisplayName(a.platform).localeCompare(getPlatformDisplayName(b.platform)));
                break;
            default:
                break;
        }

        setFilteredFeedbacks(filtered);
    };

    const getPlatformIcon = (platform) => {
        const platformLower = platform?.toLowerCase();
        if (platformLower?.includes('ios') || platformLower === 'targetplatform.ios') {
            return <FaApple className="text-gray-600" />;
        } else if (platformLower?.includes('android') || platformLower === 'targetplatform.android') {
            return <FaAndroid className="text-green-600" />;
        } else {
            return <FaMobile className="text-gray-500" />;
        }
    };

    const getPlatformColor = (platform) => {
        const platformLower = platform?.toLowerCase();
        if (platformLower?.includes('ios') || platformLower === 'targetplatform.ios') {
            return "bg-gray-100 text-gray-800";
        } else if (platformLower?.includes('android') || platformLower === 'targetplatform.android') {
            return "bg-green-100 text-green-800";
        } else {
            return "bg-gray-100 text-gray-800";
        }
    };

    const getPlatformDisplayName = (platform) => {
        const platformLower = platform?.toLowerCase();
        if (platformLower?.includes('ios') || platformLower === 'targetplatform.ios') {
            return 'iOS';
        } else if (platformLower?.includes('android') || platformLower === 'targetplatform.android') {
            return 'Android';
        } else {
            return platform || 'Bilinmeyen';
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "Tarih yok";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const openDetailModal = (feedback) => {
        setSelectedFeedback(feedback);
        setShowDetailModal(true);
    };

    const getStats = () => {
        const total = feedbacks.length;
        const iosCount = feedbacks.filter(f => {
            const platformLower = f.platform?.toLowerCase();
            return platformLower?.includes('ios') || platformLower === 'targetplatform.ios';
        }).length;
        const androidCount = feedbacks.filter(f => {
            const platformLower = f.platform?.toLowerCase();
            return platformLower?.includes('android') || platformLower === 'targetplatform.android';
        }).length;
        const todayCount = feedbacks.filter(f => {
            const feedbackDate = f.timestamp?.toDate ? f.timestamp.toDate() : new Date(f.timestamp);
            const today = new Date();
            return feedbackDate.toDateString() === today.toDateString();
        }).length;

        return { total, iosCount, androidCount, todayCount };
    };

    const stats = getStats();

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg">
                                <FaComments className="text-3xl text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Uygulama Geri Bildirimleri</h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">Kullanıcı geri bildirimlerini yönetin ve analiz edin</p>
                            </div>
                        </div>

                        {/* İstatistikler */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                                        <FaComments className="text-blue-600 dark:text-blue-400 text-xl" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Geri Bildirim</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                                        <FaAndroid className="text-green-600 dark:text-green-400 text-xl" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Android</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.androidCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                                        <FaApple className="text-gray-600 dark:text-gray-400 text-xl" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">iOS</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.iosCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
                                        <FaCalendar className="text-purple-600 dark:text-purple-400 text-xl" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bugün</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.todayCount}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filtreler */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col lg:flex-row gap-4">
                                {/* Arama */}
                                <div className="flex-1">
                                    <div className="relative">
                                        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Geri bildirim, kullanıcı veya versiyon ara..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                {/* Platform Filtresi */}
                                <select
                                    value={platformFilter}
                                    onChange={(e) => setPlatformFilter(e.target.value)}
                                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="all">Tüm Platformlar</option>
                                    <option value="ios">iOS</option>
                                    <option value="android">Android</option>
                                </select>

                                {/* Sıralama */}
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="date">Tarihe Göre</option>
                                    <option value="user">Kullanıcıya Göre</option>
                                    <option value="platform">Platforma Göre</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Geri Bildirim Listesi */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                                <p className="mt-4 text-gray-600 dark:text-gray-400">Geri bildirimler yükleniyor...</p>
                            </div>
                        ) : filteredFeedbacks.length === 0 ? (
                            <div className="text-center py-12">
                                <FaComments className="text-6xl text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Geri Bildirim Bulunamadı</h3>
                                <p className="text-gray-600 dark:text-gray-400">Henüz geri bildirim gönderilmemiş veya filtrelerinize uygun geri bildirim yok.</p>
                            </div>
                        ) : (
                            filteredFeedbacks.map((feedback) => (
                                <div
                                    key={feedback.id}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-300 cursor-pointer"
                                    onClick={() => openDetailModal(feedback)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-4">
                                                {getPlatformIcon(feedback.platform)}
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlatformColor(feedback.platform)}`}>
                                                    {getPlatformDisplayName(feedback.platform)}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                                                    v{feedback.appVersion}
                                                </span>
                                            </div>

                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2">
                                                {feedback.feedback?.substring(0, 150)}
                                                {feedback.feedback?.length > 150 && "..."}
                                            </h3>

                                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <FaUser className="text-indigo-500" />
                                                    <span className="font-medium">{userNames[feedback.userId] || 'Anonim'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <FaCalendar className="text-indigo-500" />
                                                    <span>{formatDate(feedback.timestamp)}</span>
                                                </div>
                                                {feedback.userEmail && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-400">•</span>
                                                        <span className="text-indigo-600 dark:text-indigo-400">{feedback.userEmail}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDetailModal(feedback);
                                                }}
                                                className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all duration-200"
                                            >
                                                <FaEye />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Detay Modal */}
                {showDetailModal && selectedFeedback && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <FaComments className="text-indigo-600" />
                                        Geri Bildirim Detayı
                                    </h2>
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Geri Bildirim
                                        </label>
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                            <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">{selectedFeedback.feedback}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Kullanıcı
                                            </label>
                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                                <p className="text-gray-900 dark:text-white font-medium">{userNames[selectedFeedback.userId] || 'Anonim'}</p>
                                                {selectedFeedback.userEmail && (
                                                    <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">{selectedFeedback.userEmail}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Platform
                                            </label>
                                            <div className="flex items-center gap-2">
                                                {getPlatformIcon(selectedFeedback.platform)}
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlatformColor(selectedFeedback.platform)}`}>
                                                    {getPlatformDisplayName(selectedFeedback.platform)}
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Uygulama Versiyonu
                                            </label>
                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                                <p className="text-gray-900 dark:text-white font-medium">v{selectedFeedback.appVersion}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Tarih
                                            </label>
                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                                <p className="text-gray-900 dark:text-white font-medium">{formatDate(selectedFeedback.timestamp)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default AppFeedbackPage; 