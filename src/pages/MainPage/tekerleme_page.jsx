import React, { useState, useEffect } from "react";
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
    serverTimestamp 
} from "firebase/firestore";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "firebase/storage";
import { toast } from "react-hot-toast";
import { 
    FaPlus, 
    FaTrash, 
    FaEdit, 
    FaPlay, 
    FaPause, 
    FaVolumeUp,
    FaMusic,
    FaFileUpload,
    FaSave,
    FaTimes,
    FaFileDownload
} from "react-icons/fa";

const TekerlemePage = () => {
    const [tekerlemeler, setTekerlemeler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showJsonUploadModal, setShowJsonUploadModal] = useState(false);
    const [jsonContent, setJsonContent] = useState('');
    const [editingTekerleme, setEditingTekerleme] = useState(null);
    const [uploadingAudio, setUploadingAudio] = useState(null);
    const [audioPreview, setAudioPreview] = useState(null);
    const [playingAudio, setPlayingAudio] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        metin: "",
        sesDosyasi: null
    });

    useEffect(() => {
        loadTekerlemeler();
    }, []);

    const loadTekerlemeler = async () => {
        setLoading(true);
        try {
            const tekerlemelerRef = collection(db, "tekerlemeler");
            const q = query(tekerlemelerRef, orderBy("tekerlemeNo", "asc"));
            const snapshot = await getDocs(q);
            
            const tekerlemelerData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setTekerlemeler(tekerlemelerData);
        } catch (error) {
            console.error('Tekerlemeler yüklenirken hata:', error);
            toast.error('Tekerlemeler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const getNextTekerlemeNo = async () => {
        try {
            const tekerlemelerRef = collection(db, "tekerlemeler");
            const q = query(tekerlemelerRef, orderBy("tekerlemeNo", "desc"));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                return 1;
            }
            
            const lastTekerleme = snapshot.docs[0].data();
            return (lastTekerleme.tekerlemeNo || 0) + 1;
        } catch (error) {
            console.error('Tekerleme no hesaplanırken hata:', error);
            return 1;
        }
    };

    const handleJsonUpload = async () => {
        try {
            let tekerlemeler;
            try {
                tekerlemeler = JSON.parse(jsonContent);
                if (!Array.isArray(tekerlemeler)) {
                    throw new Error('JSON içeriği bir dizi olmalıdır');
                }
            } catch (error) {
                toast.error('Geçersiz JSON formatı');
                return;
            }

            const nextTekerlemeNo = await getNextTekerlemeNo();
            let successCount = 0;
            
            for (let i = 0; i < tekerlemeler.length; i++) {
                const tekerleme = tekerlemeler[i];
                
                if (!tekerleme.metin) {
                    toast.error(`Tekerleme ${i + 1}: Metin eksik`);
                    continue;
                }

                try {
                    await addDoc(collection(db, "tekerlemeler"), {
                        tekerlemeNo: nextTekerlemeNo + i,
                        metin: tekerleme.metin.trim(),
                        sesDosyasi: null, // JSON ile ses dosyası yüklenemez
                        createdAt: serverTimestamp(),
                        isActive: true
                    });
                    successCount++;
                } catch (error) {
                    console.error(`Tekerleme ${i + 1} eklenirken hata:`, error);
                    toast.error(`Tekerleme ${i + 1} eklenirken hata oluştu`);
                }
            }

            if (successCount > 0) {
                toast.success(`${successCount} tekerleme başarıyla eklendi`);
                setShowJsonUploadModal(false);
                setJsonContent('');
                loadTekerlemeler();
            }
        } catch (error) {
            console.error('JSON yükleme hatası:', error);
            toast.error('Tekerlemeler yüklenirken bir hata oluştu');
        }
    };

    const handleAudioSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Dosya tipini kontrol et
            if (!file.type.startsWith('audio/')) {
                toast.error('Lütfen geçerli bir ses dosyası seçin');
                return;
            }
            
            // Dosya boyutunu kontrol et (10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.error('Ses dosyası 10MB\'dan küçük olmalıdır');
                return;
            }

            setUploadingAudio(file);
            
            // Önizleme için URL oluştur
            const audioURL = URL.createObjectURL(file);
            setAudioPreview(audioURL);
        }
    };

    const uploadAudio = async (audioFile) => {
        if (!audioFile) return null;
        
        try {
            const storageRef = ref(storage, `tekerleme-audio/${Date.now()}_${audioFile.name}`);
            const uploadResult = await uploadBytes(storageRef, audioFile);
            const downloadURL = await getDownloadURL(uploadResult.ref);
            
            return {
                name: audioFile.name,
                size: audioFile.size,
                type: audioFile.type,
                downloadURL,
                storagePath: uploadResult.ref.fullPath
            };
        } catch (error) {
            console.error('Ses dosyası yüklenirken hata:', error);
            toast.error('Ses dosyası yüklenirken hata oluştu');
            return null;
        }
    };

    const removeAudio = () => {
        setUploadingAudio(null);
        setAudioPreview(null);
        setFormData(prev => ({ ...prev, sesDosyasi: null }));
    };

    const handleAddTekerleme = async (e) => {
        e.preventDefault();
        
        if (!formData.metin.trim()) {
            toast.error('Lütfen tekerleme metnini girin');
            return;
        }

        try {
            // Tekerleme no al
            const tekerlemeNo = await getNextTekerlemeNo();

            // Ses dosyasını yükle
            let uploadedAudio = null;
            if (uploadingAudio) {
                uploadedAudio = await uploadAudio(uploadingAudio);
            }

            // Firestore'a kaydet
            const tekerlemeData = {
                tekerlemeNo,
                metin: formData.metin.trim(),
                sesDosyasi: uploadedAudio,
                createdAt: serverTimestamp(),
                isActive: true
            };

            await addDoc(collection(db, "tekerlemeler"), tekerlemeData);
            
            toast.success('Tekerleme başarıyla eklendi!');
            setShowAddModal(false);
            resetForm();
            loadTekerlemeler();
        } catch (error) {
            console.error('Tekerleme eklenirken hata:', error);
            toast.error('Tekerleme eklenirken hata oluştu');
        }
    };

    const handleEditTekerleme = async (e) => {
        e.preventDefault();
        
        if (!formData.metin.trim()) {
            toast.error('Lütfen tekerleme metnini girin');
            return;
        }

        try {
            // Yeni ses dosyasını yükle
            let newAudio = null;
            if (uploadingAudio) {
                newAudio = await uploadAudio(uploadingAudio);
            }

            // Firestore'u güncelle
            const tekerlemeRef = doc(db, "tekerlemeler", editingTekerleme.id);
            await updateDoc(tekerlemeRef, {
                metin: formData.metin.trim(),
                sesDosyasi: newAudio || editingTekerleme.sesDosyasi, // Mevcut sesi koru veya yeni sesi ekle
                lastUpdated: serverTimestamp()
            });
            
            toast.success('Tekerleme başarıyla güncellendi!');
            setShowEditModal(false);
            setEditingTekerleme(null);
            resetForm();
            loadTekerlemeler();
        } catch (error) {
            console.error('Tekerleme güncellenirken hata:', error);
            toast.error('Tekerleme güncellenirken hata oluştu');
        }
    };

    const handleDeleteTekerleme = async (tekerleme) => {
        if (!window.confirm('Bu tekerlemeyi silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            // Ses dosyasını storage'dan sil
            if (tekerleme.sesDosyasi && tekerleme.sesDosyasi.storagePath) {
                const storageRef = ref(storage, tekerleme.sesDosyasi.storagePath);
                await deleteObject(storageRef);
            }

            // Firestore'dan sil
            await deleteDoc(doc(db, "tekerlemeler", tekerleme.id));
            
            toast.success('Tekerleme başarıyla silindi!');
            loadTekerlemeler();
        } catch (error) {
            console.error('Tekerleme silinirken hata:', error);
            toast.error('Tekerleme silinirken hata oluştu');
        }
    };

    const openEditModal = (tekerleme) => {
        setEditingTekerleme(tekerleme);
        setFormData({
            metin: tekerleme.metin || "",
            sesDosyasi: tekerleme.sesDosyasi || null
        });
        setAudioPreview(tekerleme.sesDosyasi ? tekerleme.sesDosyasi.downloadURL : null);
        setUploadingAudio(null);
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormData({
            metin: "",
            sesDosyasi: null
        });
        setUploadingAudio(null);
        setAudioPreview(null);
    };

    const playAudio = (audioURL, tekerlemeId) => {
        if (playingAudio === tekerlemeId) {
            setPlayingAudio(null);
        } else {
            setPlayingAudio(tekerlemeId);
            const audio = new Audio(audioURL);
            audio.play();
            audio.onended = () => setPlayingAudio(null);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto mt-10">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FaMusic className="text-3xl text-orange-500" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tekerleme Oyunu Yönetimi</h1>
                                <p className="text-gray-600 dark:text-gray-400">Tekerleme metinleri ve ses dosyalarını yönetin</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowJsonUploadModal(true)}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
                            >
                                <FaFileUpload />
                                JSON Yükle
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
                            >
                                <FaPlus />
                                Tekerleme Ekle
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tekerleme Listesi */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600 dark:text-gray-400">Tekerlemeler yükleniyor...</p>
                        </div>
                    ) : tekerlemeler.length === 0 ? (
                        <div className="text-center py-12">
                            <FaMusic className="text-gray-400 text-6xl mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 text-lg">Henüz tekerleme eklenmemiş.</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-4 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-all duration-200"
                            >
                                İlk Tekerlemeyi Ekle
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tekerlemeler.map((tekerleme) => (
                                <div key={tekerleme.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="bg-orange-100 text-orange-800 text-sm font-semibold px-3 py-1 rounded-full">
                                                    #{tekerleme.tekerlemeNo}
                                                </span>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {tekerleme.metin}
                                                </h3>
                                            </div>
                                            {tekerleme.sesDosyasi && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <FaVolumeUp />
                                                    <span>{tekerleme.sesDosyasi.name}</span>
                                                    <span>({formatFileSize(tekerleme.sesDosyasi.size)})</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            {tekerleme.sesDosyasi && (
                                                <button
                                                    onClick={() => playAudio(tekerleme.sesDosyasi.downloadURL, tekerleme.id)}
                                                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    {playingAudio === tekerleme.id ? <FaPause /> : <FaPlay />}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openEditModal(tekerleme)}
                                                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTekerleme(tekerleme)}
                                                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Tekerleme Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FaPlus className="text-orange-600" />
                                    Tekerleme Ekle
                                </h2>
                            </div>
                            
                            <form onSubmit={handleAddTekerleme} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Tekerleme Metni *
                                    </label>
                                    <textarea
                                        value={formData.metin}
                                        onChange={(e) => setFormData(prev => ({ ...prev, metin: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Tekerleme metnini girin"
                                        rows="4"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Ses Dosyası (Opsiyonel)
                                    </label>
                                    <div className="space-y-4">
                                        {/* Mevcut ses gösterimi */}
                                        {audioPreview && (
                                            <div className="relative inline-block">
                                                <audio controls className="w-full">
                                                    <source src={audioPreview} type="audio/mpeg" />
                                                    Tarayıcınız ses dosyasını desteklemiyor.
                                                </audio>
                                                <button
                                                    type="button"
                                                    onClick={removeAudio}
                                                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 text-xs transition-colors"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* Ses yükleme alanı */}
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                onChange={handleAudioSelect}
                                                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-center">
                                                    <FaFileUpload className="text-gray-400 text-2xl mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Ses dosyası seçmek için tıklayın (Max: 10MB)
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaSave />
                                        Tekerleme Ekle
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Tekerleme Modal */}
                {showEditModal && editingTekerleme && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FaEdit className="text-orange-600" />
                                    Tekerleme Düzenle
                                </h2>
                            </div>
                            
                            <form onSubmit={handleEditTekerleme} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Tekerleme Metni *
                                    </label>
                                    <textarea
                                        value={formData.metin}
                                        onChange={(e) => setFormData(prev => ({ ...prev, metin: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Tekerleme metnini girin"
                                        rows="4"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Yeni Ses Dosyası Ekle (Opsiyonel)
                                    </label>
                                    <div className="space-y-4">
                                        {/* Mevcut ses gösterimi */}
                                        {audioPreview && (
                                            <div className="relative inline-block">
                                                <audio controls className="w-full">
                                                    <source src={audioPreview} type="audio/mpeg" />
                                                    Tarayıcınız ses dosyasını desteklemiyor.
                                                </audio>
                                                <button
                                                    type="button"
                                                    onClick={removeAudio}
                                                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 text-xs transition-colors"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* Ses yükleme alanı */}
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                onChange={handleAudioSelect}
                                                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-center">
                                                    <FaFileUpload className="text-gray-400 text-2xl mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Yeni ses dosyası seçmek için tıklayın (Max: 10MB)
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaSave />
                                        Güncelle
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* JSON Upload Modal */}
                {showJsonUploadModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FaFileUpload className="text-green-600" />
                                    Tekerlemeler JSON Yükle
                                </h2>
                            </div>
                            
                            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                <div className="bg-blue-50 dark:bg-blue-900 rounded-xl p-4">
                                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">JSON Formatı:</h3>
                                    <pre className="text-sm text-blue-700 dark:text-blue-300">
{`[
    {
        "metin": "Bir berber bir berbere gel beraber bir berber dükkanı açalım demiş"
    },
    {
        "metin": "Kırk kırık küp, kırkının da kulpu kırık küp"
    }
]`}
                                    </pre>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        JSON İçeriği
                                    </label>
                                    <textarea
                                        value={jsonContent}
                                        onChange={(e) => setJsonContent(e.target.value)}
                                        className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        placeholder="JSON içeriğini buraya yapıştırın..."
                                    />
                                </div>

                                <div className="bg-yellow-50 dark:bg-yellow-900 rounded-xl p-4">
                                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Not:</h3>
                                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                                        <li>• JSON ile sadece metin eklenebilir</li>
                                        <li>• Ses dosyaları ayrı ayrı yüklenmelidir</li>
                                        <li>• Tekerleme no'ları otomatik olarak atanır</li>
                                        <li>• Metin alanı zorunludur</li>
                                    </ul>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => {
                                            setShowJsonUploadModal(false);
                                            setJsonContent('');
                                        }}
                                        className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={handleJsonUpload}
                                        className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaFileUpload />
                                        JSON Yükle
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default TekerlemePage; 