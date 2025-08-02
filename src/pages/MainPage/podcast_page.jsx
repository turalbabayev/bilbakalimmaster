import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { 
    collection, 
    getDocs, 
    addDoc, 
    deleteDoc, 
    doc, 
    updateDoc, 
    query, 
    orderBy, 
    serverTimestamp 
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { 
    FaPlay, 
    FaPause, 
    FaEdit, 
    FaTrash, 
    FaPlus, 
    FaLink, 
    FaSave, 
    FaTimes, 
    FaPodcast,
    FaMicrophone,
    FaCalendar,
    FaClock,
    FaUser,
    FaSearch,
    FaFilter,
    FaSort,
    FaVolumeUp,
    FaVolumeMute,
    FaExternalLinkAlt
} from "react-icons/fa";

const PodcastPage = () => {
    const [podcasts, setPodcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPodcast, setEditingPodcast] = useState(null);
    const [playingAudio, setPlayingAudio] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredPodcasts, setFilteredPodcasts] = useState([]);
    const [audioVolume, setAudioVolume] = useState(0.7);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef(null);

    const [formData, setFormData] = useState({
        baslik: "",
        aciklama: "",
        sesLinki: ""
    });

    useEffect(() => {
        loadPodcasts();
    }, []);

    useEffect(() => {
        filterPodcasts();
    }, [podcasts, searchTerm]);

    // Audio element için event listener'lar
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = audioVolume;
            audioRef.current.muted = isMuted;
        }
    }, [audioVolume, isMuted]);

    const loadPodcasts = async () => {
        setLoading(true);
        try {
            const podcastsRef = collection(db, "podcasts");
            const q = query(podcastsRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            
            const podcastsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setPodcasts(podcastsData);
        } catch (error) {
            console.error('Podcast\'ler yüklenirken hata:', error);
            toast.error('Podcast\'ler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const filterPodcasts = () => {
        let filtered = [...podcasts];

        if (searchTerm) {
            filtered = filtered.filter(podcast => 
                podcast.baslik?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                podcast.aciklama?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredPodcasts(filtered);
    };

    const playAudio = (audioUrl) => {
        if (!audioUrl) {
            toast.error("Ses dosyası linki bulunamadı!");
            return;
        }

        try {
            // Eğer aynı ses dosyası zaten çalıyorsa durdur
            if (playingAudio === audioUrl && audioRef.current) {
                audioRef.current.pause();
                setPlayingAudio(null);
                return;
            }

            // Yeni ses dosyası çalmaya başla
            if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.load();
                
                audioRef.current.play().then(() => {
                    setPlayingAudio(audioUrl);
                    toast.success("Ses dosyası çalınıyor...");
                }).catch((error) => {
                    console.error('Ses dosyası çalınırken hata:', error);
                    toast.error("Ses dosyası çalınamadı! Linki kontrol edin.");
                });
            }
        } catch (error) {
            console.error('Ses dosyası oynatılırken hata:', error);
            toast.error("Ses dosyası oynatılamadı!");
        }
    };

    const pauseAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setPlayingAudio(null);
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setAudioVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
        }
    };

    const resetForm = () => {
        setFormData({
            baslik: "",
            aciklama: "",
            sesLinki: ""
        });
    };

    const openEditModal = (podcast) => {
        setEditingPodcast(podcast);
        setFormData({
            baslik: podcast.baslik || "",
            aciklama: podcast.aciklama || "",
            sesLinki: podcast.sesLinki || ""
        });
        setShowEditModal(true);
    };

    const handleAddPodcast = async (e) => {
        e.preventDefault();
        if (!formData.baslik.trim() || !formData.sesLinki.trim()) {
            toast.error("Lütfen başlık ve ses dosyası linki girin!");
            return;
        }

        try {
            // Firestore'a kaydet
            await addDoc(collection(db, "podcasts"), {
                baslik: formData.baslik.trim(),
                aciklama: formData.aciklama.trim(),
                sesLinki: formData.sesLinki.trim(),
                createdAt: serverTimestamp(),
                isActive: true
            });

            toast.success("Podcast başarıyla eklendi!");
            setShowAddModal(false);
            resetForm();
            loadPodcasts();
        } catch (error) {
            console.error('Podcast eklenirken hata:', error);
            toast.error('Podcast eklenirken bir hata oluştu');
        }
    };

    const handleEditPodcast = async (e) => {
        e.preventDefault();
        if (!formData.baslik.trim()) {
            toast.error("Lütfen podcast başlığını girin!");
            return;
        }

        try {
            // Firestore'u güncelle
            const podcastRef = doc(db, "podcasts", editingPodcast.id);
            await updateDoc(podcastRef, {
                baslik: formData.baslik.trim(),
                aciklama: formData.aciklama.trim(),
                sesLinki: formData.sesLinki.trim(),
                lastUpdated: serverTimestamp()
            });

            toast.success("Podcast başarıyla güncellendi!");
            setShowEditModal(false);
            resetForm();
            loadPodcasts();
        } catch (error) {
            console.error('Podcast güncellenirken hata:', error);
            toast.error('Podcast güncellenirken bir hata oluştu');
        }
    };

    const handleDeletePodcast = async (podcast) => {
        if (!window.confirm("Bu podcast'i silmek istediğinizden emin misiniz?")) {
            return;
        }

        try {
            // Firestore'dan sil
            await deleteDoc(doc(db, "podcasts", podcast.id));

            toast.success("Podcast başarıyla silindi!");
            loadPodcasts();
        } catch (error) {
            console.error('Podcast silinirken hata:', error);
            toast.error('Podcast silinirken bir hata oluştu');
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

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-600 rounded-2xl">
                                <FaPodcast className="text-3xl text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Podcast Yönetimi</h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">Podcast ses kayıtlarını yönetin</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
                        >
                            <FaPlus />
                            Podcast Ekle
                        </button>
                    </div>

                    {/* Ses Kontrolleri */}
                    {playingAudio && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={pauseAudio}
                                        className="p-3 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                                    >
                                        <FaPause />
                                    </button>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">Şu anda çalıyor</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {podcasts.find(p => p.sesLinki === playingAudio)?.baslik || "Bilinmeyen"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={toggleMute}
                                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                                        >
                                            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                                        </button>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={audioVolume}
                                            onChange={handleVolumeChange}
                                            className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Arama */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
                        <div className="relative">
                            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Podcast ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                    </div>

                    {/* Podcast Listesi */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                                <p className="mt-4 text-gray-600 dark:text-gray-400">Podcast'ler yükleniyor...</p>
                            </div>
                        ) : filteredPodcasts.length === 0 ? (
                            <div className="text-center py-12">
                                <FaPodcast className="text-6xl text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Podcast Bulunamadı</h3>
                                <p className="text-gray-600 dark:text-gray-400">Henüz podcast eklenmemiş veya arama kriterlerinize uygun podcast yok.</p>
                            </div>
                        ) : (
                            filteredPodcasts.map((podcast) => (
                                <div
                                    key={podcast.id}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-4">
                                                <FaMicrophone className="text-purple-600 text-xl" />
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                    {podcast.baslik}
                                                </h3>
                                            </div>

                                            {podcast.aciklama && (
                                                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                                    {podcast.aciklama}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                                <div className="flex items-center gap-1">
                                                    <FaCalendar />
                                                    <span>{formatDate(podcast.createdAt)}</span>
                                                </div>
                                            </div>

                                            {/* Ses Dosyası Linki */}
                                            {podcast.sesLinki && (
                                                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => playAudio(podcast.sesLinki)}
                                                                className={`p-3 rounded-xl transition-colors ${
                                                                    playingAudio === podcast.sesLinki
                                                                        ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800'
                                                                        : 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800'
                                                                }`}
                                                            >
                                                                {playingAudio === podcast.sesLinki ? (
                                                                    <FaPause />
                                                                ) : (
                                                                    <FaPlay />
                                                                )}
                                                            </button>
                                                            <div className="flex-1">
                                                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                                    {podcast.sesLinki}
                                                                </p>
                                                                <p className="text-xs text-purple-600 dark:text-purple-400">
                                                                    {playingAudio === podcast.sesLinki ? "Çalıyor..." : "Dinlemek için tıklayın"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <a
                                                                href={podcast.sesLinki}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                                                title="Linki aç"
                                                            >
                                                                <FaExternalLinkAlt />
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEditModal(podcast)}
                                                className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePodcast(podcast)}
                                                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Hidden Audio Element */}
                <audio
                    ref={audioRef}
                    onEnded={() => setPlayingAudio(null)}
                    onError={(e) => {
                        console.error('Audio error:', e);
                        toast.error("Ses dosyası yüklenirken hata oluştu!");
                        setPlayingAudio(null);
                    }}
                    style={{ display: 'none' }}
                />

                {/* Add Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FaPodcast className="text-purple-600" />
                                    Yeni Podcast Ekle
                                </h2>
                            </div>
                            
                            <form onSubmit={handleAddPodcast} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Podcast Başlığı *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.baslik}
                                        onChange={(e) => setFormData(prev => ({ ...prev, baslik: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Podcast başlığını girin"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Açıklama
                                    </label>
                                    <textarea
                                        value={formData.aciklama}
                                        onChange={(e) => setFormData(prev => ({ ...prev, aciklama: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Podcast açıklamasını girin"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Ses Dosyası Linki *
                                    </label>
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <FaLink className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="url"
                                                value={formData.sesLinki}
                                                onChange={(e) => setFormData(prev => ({ ...prev, sesLinki: e.target.value }))}
                                                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                placeholder="Ses dosyası linkini girin"
                                                required
                                            />
                                        </div>
                                        
                                        {formData.sesLinki && (
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                                <div className="flex items-center gap-3">
                                                    <FaLink className="text-purple-600" />
                                                    <div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            {formData.sesLinki}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            resetForm();
                                        }}
                                        className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaSave />
                                        Podcast Ekle
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {showEditModal && editingPodcast && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FaEdit className="text-purple-600" />
                                    Podcast Düzenle
                                </h2>
                            </div>
                            
                            <form onSubmit={handleEditPodcast} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Podcast Başlığı *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.baslik}
                                        onChange={(e) => setFormData(prev => ({ ...prev, baslik: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Podcast başlığını girin"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Açıklama
                                    </label>
                                    <textarea
                                        value={formData.aciklama}
                                        onChange={(e) => setFormData(prev => ({ ...prev, aciklama: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Podcast açıklamasını girin"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Ses Dosyası Linki
                                    </label>
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <FaLink className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="url"
                                                value={formData.sesLinki}
                                                onChange={(e) => setFormData(prev => ({ ...prev, sesLinki: e.target.value }))}
                                                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                placeholder="Ses dosyası linkini girin"
                                            />
                                        </div>
                                        
                                        {formData.sesLinki && (
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                                <div className="flex items-center gap-3">
                                                    <FaLink className="text-purple-600" />
                                                    <div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            {formData.sesLinki}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            resetForm();
                                        }}
                                        className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaSave />
                                        Güncelle
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default PodcastPage; 