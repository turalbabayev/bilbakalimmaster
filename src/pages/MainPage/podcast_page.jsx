import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/layout";
import { db, storage } from "../../firebase";
import { 
    collection, 
    getDocs, 
    addDoc, 
    deleteDoc, 
    doc, 
    updateDoc, 
    query, 
    orderBy, 
    serverTimestamp, 
    setDoc, 
    getDoc 
} from "firebase/firestore";
import { 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "firebase/storage";
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
    FaExternalLinkAlt,
    FaImage,
    FaFileUpload
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

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
    const navigate = useNavigate();

    const [units, setUnits] = useState([]);

    const [formData, setFormData] = useState({
        baslik: "",
        aciklama: "",
        sesLinki: "",
        imageUrl: "",
        isPremium: false,
        unitId: ""
    });

    const [uploadingImage, setUploadingImage] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedImageFile, setSelectedImageFile] = useState(null);

    useEffect(() => {
        loadPodcasts();
        loadUnits();
    }, []);

    const loadUnits = async () => {
        try {
            const snap = await getDocs(collection(db, "podcast-units"));
            const items = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
            setUnits(items);
        } catch (e) {
            console.error("Üniteler yüklenirken hata:", e);
            toast.error("Üniteler yüklenirken hata oluştu");
        }
    };

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
            sesLinki: "",
            imageUrl: "",
            isPremium: false,
            unitId: ""
        });
        setImagePreview(null);
        setSelectedImageFile(null);
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Resim dosyası boyutu kontrolü (5MB)
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_FILE_SIZE) {
            toast.error("Resim dosyası boyutu çok büyük! Lütfen 5MB'dan küçük bir dosya seçin.");
            return;
        }

        // Resim dosyası türü kontrolü
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Geçersiz resim dosyası türü! Lütfen JPEG, PNG, GIF veya WebP dosyası seçin.");
            return;
        }

        // Dosyayı state'e kaydet
        setSelectedImageFile(file);

        // Resim önizlemesi
        const url = URL.createObjectURL(file);
        setImagePreview(url);
    };

    const uploadImage = async (file) => {
        try {
            const timestamp = Date.now();
            const fileName = `podcast_image_${timestamp}_${file.name}`;
            const imageRef = storageRef(storage, `podcast-images/${fileName}`);
            
            await uploadBytes(imageRef, file);
            const downloadURL = await getDownloadURL(imageRef);
            
            return downloadURL;
        } catch (error) {
            console.error('Resim dosyası yüklenirken hata:', error);
            throw error;
        }
    };

    const removeImage = () => {
        setFormData(prev => ({
            ...prev,
            imageUrl: ""
        }));
        setImagePreview(null);
        setSelectedImageFile(null);
    };

    const openEditModal = (podcast) => {
        setEditingPodcast(podcast);
        setFormData({
            baslik: podcast.baslik || "",
            aciklama: podcast.aciklama || "",
            sesLinki: podcast.sesLinki || "",
            imageUrl: podcast.imageUrl || "",
            isPremium: podcast.isPremium || false,
            unitId: podcast.unitId || ""
        });
        setImagePreview(podcast.imageUrl);
        setSelectedImageFile(null);
        setShowEditModal(true);
    };

    const handleAddPodcast = async (e) => {
        e.preventDefault();
        if (!formData.baslik.trim() || !formData.sesLinki.trim()) {
            toast.error("Lütfen başlık ve ses dosyası linki girin!");
            return;
        }
        if (!formData.unitId) {
            toast.error("Lütfen bir ünite seçin!");
            return;
        }

        try {
            let imageURL = formData.imageUrl;

            if (selectedImageFile) {
                setUploadingImage(true);
                imageURL = await uploadImage(selectedImageFile);
            }

            const createdRef = await addDoc(collection(db, "podcasts"), {
                baslik: formData.baslik.trim(),
                aciklama: formData.aciklama.trim(),
                sesLinki: formData.sesLinki.trim(),
                imageUrl: imageURL,
                createdAt: serverTimestamp(),
                isActive: true,
                isPremium: formData.isPremium,
                unitId: formData.unitId
            });

            // Map podcast -> unit: add under unit subcollection
            try {
                await setDoc(doc(db, "podcast-units", formData.unitId, "podcasts", createdRef.id), {
                    podcastId: createdRef.id,
                    createdAt: serverTimestamp()
                });
            } catch (mapErr) {
                console.error("Ünite eşlemesi yazılamadı:", mapErr);
            }

            toast.success("Podcast başarıyla eklendi!");
            setShowAddModal(false);
            resetForm();
            loadPodcasts();
        } catch (error) {
            console.error('Podcast eklenirken hata:', error);
            toast.error('Podcast eklenirken bir hata oluştu');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleEditPodcast = async (e) => {
        e.preventDefault();
        if (!formData.baslik.trim()) {
            toast.error("Lütfen podcast başlığını girin!");
            return;
        }
        if (!formData.unitId) {
            toast.error("Lütfen bir ünite seçin!");
            return;
        }

        try {
            let imageURL = formData.imageUrl;

            if (selectedImageFile) {
                setUploadingImage(true);
                imageURL = await uploadImage(selectedImageFile);
            }

            const podcastRef = doc(db, "podcasts", editingPodcast.id);
            const prevUnitId = editingPodcast.unitId || "";

            await updateDoc(podcastRef, {
                baslik: formData.baslik.trim(),
                aciklama: formData.aciklama.trim(),
                sesLinki: formData.sesLinki.trim(),
                imageUrl: imageURL,
                lastUpdated: serverTimestamp(),
                isPremium: formData.isPremium,
                unitId: formData.unitId
            });

            // Sync mapping: if unit changed, move mapping
            try {
                if (prevUnitId && prevUnitId !== formData.unitId) {
                    // Remove from previous unit mapping if exists
                    const prevDocRef = doc(db, "podcast-units", prevUnitId, "podcasts", editingPodcast.id);
                    const prevDocSnap = await getDoc(prevDocRef);
                    if (prevDocSnap.exists()) {
                        await deleteDoc(prevDocRef);
                    }
                }
                // Ensure exists in new unit mapping
                await setDoc(doc(db, "podcast-units", formData.unitId, "podcasts", editingPodcast.id), {
                    podcastId: editingPodcast.id,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } catch (mapErr) {
                console.error("Ünite eşlemesi senkronizasyon hatası:", mapErr);
            }

            toast.success("Podcast başarıyla güncellendi!");
            setShowEditModal(false);
            resetForm();
            loadPodcasts();
        } catch (error) {
            console.error('Podcast güncellenirken hata:', error);
            toast.error('Podcast güncellenirken bir hata oluştu');
        } finally {
            setUploadingImage(false);
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
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/podcast-uniteleri')}
                                className="px-4 py-3 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300 rounded-xl font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
                            >
                                Üniteleri Göster
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
                            >
                                <FaPlus />
                                Podcast Ekle
                            </button>
                        </div>
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
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                        {podcast.baslik}
                                                    </h3>
                                                    {podcast.isPremium && (
                                                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">
                                                            Premium
                                                        </span>
                                                    )}
                                                    {podcast.unitId && (
                                                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-full">
                                                            Ünite: {units.find(u => u.id === podcast.unitId)?.name || podcast.unitId}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Podcast Resmi */}
                                            {podcast.imageUrl && (
                                                <div className="mb-4">
                                                    <img 
                                                        src={podcast.imageUrl} 
                                                        alt={podcast.baslik}
                                                        className="w-24 h-24 object-cover rounded-lg shadow-sm"
                                                    />
                                                </div>
                                            )}

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
                                        Ünite *
                                    </label>
                                    <select
                                        value={formData.unitId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, unitId: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        required
                                    >
                                        <option value="">Ünite seçin</option>
                                        {units.map(u => (
                                            <option key={u.id} value={u.id}>{u.name || u.id}</option>
                                        ))}
                                    </select>
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

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Podcast Resmi
                                    </label>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageSelect}
                                                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 dark:file:bg-purple-900/30 dark:file:text-purple-300 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/40"
                                            />
                                            {(imagePreview || formData.imageUrl) && (
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 font-medium"
                                                >
                                                    Kaldır
                                                </button>
                                            )}
                                        </div>
                                        
                                        {(imagePreview || formData.imageUrl) && (
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                                <div className="flex items-center gap-3">
                                                    <FaImage className="text-purple-600" />
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {selectedImageFile ? selectedImageFile.name : "Mevcut resim"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {(imagePreview || formData.imageUrl) && (
                                                    <div className="mt-3">
                                                        <img 
                                                            src={imagePreview || formData.imageUrl} 
                                                            alt="Podcast resmi" 
                                                            className="w-32 h-32 object-cover rounded-lg"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Premium Podcast
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.isPremium}
                                                onChange={(e) => setFormData(prev => ({ ...prev, isPremium: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                        </label>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {formData.isPremium ? "Premium" : "Ücretsiz"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Premium podcast'ler özel içerik olarak işaretlenir.
                                    </p>
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
                                        Ünite *
                                    </label>
                                    <select
                                        value={formData.unitId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, unitId: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        required
                                    >
                                        <option value="">Ünite seçin</option>
                                        {units.map(u => (
                                            <option key={u.id} value={u.id}>{u.name || u.id}</option>
                                        ))}
                                    </select>
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

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Podcast Resmi
                                    </label>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageSelect}
                                                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 dark:file:bg-purple-900/30 dark:file:text-purple-300 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/40"
                                            />
                                            {(imagePreview || formData.imageUrl) && (
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 font-medium"
                                                >
                                                    Kaldır
                                                </button>
                                            )}
                                        </div>
                                        
                                        {(imagePreview || formData.imageUrl) && (
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                                <div className="flex items-center gap-3">
                                                    <FaImage className="text-purple-600" />
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {selectedImageFile ? selectedImageFile.name : "Mevcut resim"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {(imagePreview || formData.imageUrl) && (
                                                    <div className="mt-3">
                                                        <img 
                                                            src={imagePreview || formData.imageUrl} 
                                                            alt="Podcast resmi" 
                                                            className="w-32 h-32 object-cover rounded-lg"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Premium Podcast
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.isPremium}
                                                onChange={(e) => setFormData(prev => ({ ...prev, isPremium: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                        </label>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {formData.isPremium ? "Premium" : "Ücretsiz"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Premium podcast'ler özel içerik olarak işaretlenir.
                                    </p>
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