import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { toast } from "react-hot-toast";
import { 
    FaPlus, 
    FaTrash, 
    FaEdit, 
    FaDownload, 
    FaEye, 
    FaCalendarAlt,
    FaClock,
    FaUsers,
    FaLink,
    FaFileAlt,
    FaFilePdf,
    FaFilePowerpoint,
    FaFileWord,
    FaFileExcel,
    FaSearch,
    FaFilter,
    FaSort,
    FaVideo,
    FaPlay,
    FaExternalLinkAlt,
    FaUpload,
    FaImage,
    FaTimes
} from "react-icons/fa";
import { db, storage } from "../../firebase";
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc,
    serverTimestamp,
    query,
    orderBy 
} from "firebase/firestore";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "firebase/storage";

const MeetingArchivePage = () => {
    const [meetings, setMeetings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("date");
    const [filterBy, setFilterBy] = useState("all");

    // Form state
    const [meetingForm, setMeetingForm] = useState({
        title: "",
        description: "",
        date: "",
        time: "",
        duration: "",
        participants: "",
        meetingLink: "",
        archiveLink: "",
        image: null,
        files: []
    });

    // File upload state
    const [uploadingFiles, setUploadingFiles] = useState([]);
    const [uploadingImage, setUploadingImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        loadMeetings();
    }, []);

    const loadMeetings = async () => {
        setIsLoading(true);
        try {
            const meetingsRef = collection(db, "meeting-archive");
            const q = query(meetingsRef, orderBy("meetingDate", "desc"));
            const snapshot = await getDocs(q);
            
            const meetingsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setMeetings(meetingsData);
        } catch (error) {
            console.error('Toplantılar yüklenirken hata:', error);
            toast.error('Toplantılar yüklenirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setUploadingFiles(files);
    };

    const uploadFiles = async (files) => {
        const uploadedFiles = [];
        
        for (const file of files) {
            try {
                const storageRef = ref(storage, `meeting-files/${Date.now()}_${file.name}`);
                const uploadResult = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(uploadResult.ref);
                
                uploadedFiles.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    downloadURL,
                    storagePath: uploadResult.ref.fullPath
                });
            } catch (error) {
                console.error(`Dosya yüklenirken hata: ${file.name}`, error);
                toast.error(`${file.name} yüklenirken hata oluştu`);
            }
        }
        
        return uploadedFiles;
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Dosya tipini kontrol et
            if (!file.type.startsWith('image/')) {
                toast.error('Lütfen geçerli bir resim dosyası seçin');
                return;
            }
            
            // Dosya boyutunu kontrol et (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Resim dosyası 5MB\'dan küçük olmalıdır');
                return;
            }

            setUploadingImage(file);
            
            // Önizleme oluştur
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async (imageFile) => {
        if (!imageFile) return null;
        
        try {
            const storageRef = ref(storage, `meeting-images/${Date.now()}_${imageFile.name}`);
            const uploadResult = await uploadBytes(storageRef, imageFile);
            const downloadURL = await getDownloadURL(uploadResult.ref);
            
            return {
                name: imageFile.name,
                size: imageFile.size,
                type: imageFile.type,
                downloadURL,
                storagePath: uploadResult.ref.fullPath
            };
        } catch (error) {
            console.error('Resim yüklenirken hata:', error);
            toast.error('Resim yüklenirken hata oluştu');
            return null;
        }
    };

    const removeImage = () => {
        setUploadingImage(null);
        setImagePreview(null);
        setMeetingForm(prev => ({ ...prev, image: null }));
    };

    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        switch (extension) {
            case 'pdf':
                return <FaFilePdf className="text-red-500" />;
            case 'ppt':
            case 'pptx':
                return <FaFilePowerpoint className="text-orange-500" />;
            case 'doc':
            case 'docx':
                return <FaFileWord className="text-blue-500" />;
            case 'xls':
            case 'xlsx':
                return <FaFileExcel className="text-green-500" />;
            default:
                return <FaFileAlt className="text-gray-500" />;
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Tarih yok';
        return new Date(dateString).toLocaleDateString('tr-TR');
    };

    const formatTime = (timeString) => {
        if (!timeString) return 'Saat yok';
        return timeString;
    };

    const handleAddMeeting = async (e) => {
        e.preventDefault();
        
        if (!meetingForm.title.trim() || !meetingForm.date) {
            toast.error('Lütfen gerekli alanları doldurun');
            return;
        }

        setIsUploading(true);
        try {
            // Resmi yükle
            let uploadedImage = null;
            if (uploadingImage) {
                uploadedImage = await uploadImage(uploadingImage);
            }

            // Dosyaları yükle
            let uploadedFiles = [];
            if (uploadingFiles.length > 0) {
                uploadedFiles = await uploadFiles(uploadingFiles);
            }

            // Toplantı tarihini birleştir
            const meetingDateTime = new Date(`${meetingForm.date}T${meetingForm.time || '00:00'}`);

            // Firestore'a kaydet
            const meetingData = {
                title: meetingForm.title.trim(),
                description: meetingForm.description.trim(),
                meetingDate: meetingDateTime,
                date: meetingForm.date,
                time: meetingForm.time,
                duration: meetingForm.duration.trim(),
                participants: meetingForm.participants.trim(),
                meetingLink: meetingForm.meetingLink.trim(),
                archiveLink: meetingForm.archiveLink.trim(),
                image: uploadedImage,
                files: uploadedFiles,
                createdAt: serverTimestamp(),
                isActive: true
            };

            await addDoc(collection(db, "meeting-archive"), meetingData);
            
            toast.success('Toplantı başarıyla eklendi!');
            setShowAddModal(false);
            resetForm();
            loadMeetings();
        } catch (error) {
            console.error('Toplantı eklenirken hata:', error);
            toast.error('Toplantı eklenirken hata oluştu');
        } finally {
            setIsUploading(false);
        }
    };

    const resetForm = () => {
        setMeetingForm({
            title: "",
            description: "",
            date: "",
            time: "",
            duration: "",
            participants: "",
            meetingLink: "",
            archiveLink: "",
            image: null,
            files: []
        });
        setUploadingFiles([]);
        setUploadingImage(null);
        setImagePreview(null);
    };

    const handleEditMeeting = async (e) => {
        e.preventDefault();
        
        if (!editingMeeting || !meetingForm.title.trim() || !meetingForm.date) {
            toast.error('Lütfen gerekli alanları doldurun');
            return;
        }

        setIsUploading(true);
        try {
            // Yeni dosyaları yükle
            let newFiles = [];
            if (uploadingFiles.length > 0) {
                newFiles = await uploadFiles(uploadingFiles);
            }

            // Yeni resmi yükle
            let newImage = null;
            if (uploadingImage) {
                newImage = await uploadImage(uploadingImage);
            }

            // Mevcut dosyaları koru, yeni dosyaları ekle
            const allFiles = [...(editingMeeting.files || []), ...newFiles];

            const meetingRef = doc(db, "meeting-archive", editingMeeting.id);
            const updateData = {
                title: meetingForm.title.trim(),
                description: meetingForm.description.trim(),
                meetingDate: new Date(`${meetingForm.date}T${meetingForm.time || '00:00'}`),
                date: meetingForm.date,
                time: meetingForm.time,
                duration: meetingForm.duration.trim(),
                participants: meetingForm.participants.trim(),
                meetingLink: meetingForm.meetingLink.trim(),
                archiveLink: meetingForm.archiveLink.trim(),
                image: newImage || editingMeeting.image, // Mevcut resmi koru veya yeni resmi ekle
                files: allFiles,
                lastUpdated: serverTimestamp()
            };

            await updateDoc(meetingRef, updateData);
            
            toast.success('Toplantı başarıyla güncellendi!');
            setShowEditModal(false);
            setEditingMeeting(null);
            resetForm();
            loadMeetings();
        } catch (error) {
            console.error('Toplantı güncellenirken hata:', error);
            toast.error('Toplantı güncellenirken hata oluştu');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteMeeting = async (meeting) => {
        if (!window.confirm(`"${meeting.title}" toplantısını silmek istediğinize emin misiniz?`)) {
            return;
        }

        try {
            // Dosyaları storage'dan sil
            if (meeting.files && meeting.files.length > 0) {
                for (const file of meeting.files) {
                    if (file.storagePath) {
                        const storageRef = ref(storage, file.storagePath);
                        await deleteObject(storageRef);
                    }
                }
            }

            // Resmi storage'dan sil
            if (meeting.image && meeting.image.storagePath) {
                const storageRef = ref(storage, meeting.image.storagePath);
                await deleteObject(storageRef);
            }

            // Firestore'dan sil
            await deleteDoc(doc(db, "meeting-archive", meeting.id));
            
            toast.success('Toplantı başarıyla silindi!');
            loadMeetings();
        } catch (error) {
            console.error('Toplantı silinirken hata:', error);
            toast.error('Toplantı silinirken hata oluştu');
        }
    };

    const handleDeleteFile = async (meeting, fileIndex) => {
        const file = meeting.files[fileIndex];
        
        try {
            // Storage'dan dosyayı sil
            if (file.storagePath) {
                const storageRef = ref(storage, file.storagePath);
                await deleteObject(storageRef);
            }

            // Firestore'dan dosyayı kaldır
            const meetingRef = doc(db, "meeting-archive", meeting.id);
            const updatedFiles = meeting.files.filter((_, index) => index !== fileIndex);
            await updateDoc(meetingRef, { files: updatedFiles });
            
            toast.success('Dosya başarıyla silindi!');
            loadMeetings();
        } catch (error) {
            console.error('Dosya silinirken hata:', error);
            toast.error('Dosya silinirken hata oluştu');
        }
    };

    const openEditModal = (meeting) => {
        setEditingMeeting(meeting);
        setMeetingForm({
            title: meeting.title || "",
            description: meeting.description || "",
            date: meeting.date || "",
            time: meeting.time || "",
            duration: meeting.duration || "",
            participants: meeting.participants || "",
            meetingLink: meeting.meetingLink || "",
            archiveLink: meeting.archiveLink || "",
            image: meeting.image || null,
            files: meeting.files || []
        });
        setImagePreview(meeting.image ? meeting.image.downloadURL : null);
        setUploadingFiles([]);
        setUploadingImage(null);
        setShowEditModal(true);
    };

    // Filtreleme ve sıralama
    const filteredAndSortedMeetings = meetings
        .filter(meeting => {
            const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                meeting.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                meeting.participants.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesFilter = filterBy === "all" || 
                                (filterBy === "withArchive" && meeting.archiveLink) ||
                                (filterBy === "withFiles" && meeting.files && meeting.files.length > 0);
            
            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "title":
                    return a.title.localeCompare(b.title);
                case "date":
                    return new Date(b.meetingDate) - new Date(a.meetingDate);
                case "participants":
                    return a.participants.localeCompare(b.participants);
                default:
                    return 0;
            }
        });

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                <div className="container mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
                            <FaVideo className="text-purple-600" />
                            Toplantı Arşivi
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-lg">
                            Google Meet toplantılarını ve ilgili dosyaları yönetin
                        </p>
                    </div>

                    {/* Kontrol Paneli */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
                        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                            {/* Arama ve Filtreler */}
                            <div className="flex flex-col sm:flex-row gap-4 flex-1">
                                <div className="relative flex-1">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Toplantı ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                                
                                <select
                                    value={filterBy}
                                    onChange={(e) => setFilterBy(e.target.value)}
                                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="all">Tüm Toplantılar</option>
                                    <option value="withArchive">Arşiv Linki Olanlar</option>
                                    <option value="withFiles">Dosyası Olanlar</option>
                                </select>
                                
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="date">Tarihe Göre</option>
                                    <option value="title">İsme Göre</option>
                                    <option value="participants">Katılımcılara Göre</option>
                                </select>
                            </div>

                            {/* Ekleme Butonu */}
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                            >
                                <FaPlus />
                                Toplantı Ekle
                            </button>
                        </div>
                    </div>

                    {/* Toplantı Listesi */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Toplantılar ({filteredAndSortedMeetings.length})
                            </h2>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600 dark:text-gray-400">Toplantılar yükleniyor...</p>
                            </div>
                        ) : filteredAndSortedMeetings.length === 0 ? (
                            <div className="text-center py-12">
                                <FaVideo className="text-gray-400 text-6xl mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400 text-lg">
                                    {searchTerm || filterBy !== "all" ? 'Arama kriterlerinize uygun toplantı bulunamadı.' : 'Henüz toplantı eklenmemiş.'}
                                </p>
                                {!searchTerm && filterBy === "all" && (
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-200"
                                    >
                                        İlk Toplantıyı Ekle
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {filteredAndSortedMeetings.map((meeting) => (
                                    <div key={meeting.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-200">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-start gap-4">
                                                    {/* Toplantı Resmi */}
                                                    {meeting.image && (
                                                        <div className="flex-shrink-0">
                                                            <img 
                                                                src={meeting.image.downloadURL} 
                                                                alt={meeting.title}
                                                                className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                                            {meeting.title}
                                                        </h3>
                                                        {meeting.description && (
                                                            <p className="text-gray-600 dark:text-gray-400 mb-3">
                                                                {meeting.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <button
                                                    onClick={() => openEditModal(meeting)}
                                                    className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMeeting(meeting)}
                                                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                <FaCalendarAlt className="mr-2" />
                                                {formatDate(meeting.date)}
                                            </div>
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                <FaClock className="mr-2" />
                                                {formatTime(meeting.time)} {meeting.duration && `(${meeting.duration})`}
                                            </div>
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                <FaUsers className="mr-2" />
                                                {meeting.participants || 'Belirtilmemiş'}
                                            </div>
                                            <div className="flex items-center text-sm text-purple-600 dark:text-purple-400 font-medium">
                                                <FaFileAlt className="mr-2" />
                                                {meeting.files ? meeting.files.length : 0} Dosya
                                            </div>
                                        </div>

                                        {/* Linkler */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {meeting.meetingLink && (
                                                <a
                                                    href={meeting.meetingLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                                >
                                                    <FaVideo />
                                                    Toplantı Linki
                                                </a>
                                            )}
                                            {meeting.archiveLink && (
                                                <a
                                                    href={meeting.archiveLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                                >
                                                    <FaPlay />
                                                    Arşiv İzle
                                                </a>
                                            )}
                                        </div>

                                        {/* Dosyalar */}
                                        {meeting.files && meeting.files.length > 0 && (
                                            <div className="bg-white dark:bg-gray-600 rounded-lg p-4">
                                                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                    <FaFileAlt />
                                                    Toplantı Dosyaları
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {meeting.files.map((file, index) => (
                                                        <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-500 rounded-lg p-3">
                                                            <div className="flex items-center flex-1 min-w-0">
                                                                <div className="mr-2 text-lg">
                                                                    {getFileIcon(file.name)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                        {file.name}
                                                                    </p>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                        {formatFileSize(file.size)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1 ml-2">
                                                                <a
                                                                    href={file.downloadURL}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-1 text-blue-600 hover:text-blue-700"
                                                                    title="Görüntüle"
                                                                >
                                                                    <FaEye />
                                                                </a>
                                                                <a
                                                                    href={file.downloadURL}
                                                                    download
                                                                    className="p-1 text-green-600 hover:text-green-700"
                                                                    title="İndir"
                                                                >
                                                                    <FaDownload />
                                                                </a>
                                                                <button
                                                                    onClick={() => handleDeleteFile(meeting, index)}
                                                                    className="p-1 text-red-600 hover:text-red-700"
                                                                    title="Sil"
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Meeting Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FaPlus className="text-purple-600" />
                                    Toplantı Ekle
                                </h2>
                            </div>
                            
                            <form onSubmit={handleAddMeeting} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Toplantı Başlığı *
                                        </label>
                                        <input
                                            type="text"
                                            value={meetingForm.title}
                                            onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="Toplantı başlığını girin"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Toplantı Tarihi *
                                        </label>
                                        <input
                                            type="date"
                                            value={meetingForm.date}
                                            onChange={(e) => setMeetingForm(prev => ({ ...prev, date: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Toplantı Saati
                                        </label>
                                        <input
                                            type="time"
                                            value={meetingForm.time}
                                            onChange={(e) => setMeetingForm(prev => ({ ...prev, time: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Süre
                                        </label>
                                        <input
                                            type="text"
                                            value={meetingForm.duration}
                                            onChange={(e) => setMeetingForm(prev => ({ ...prev, duration: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="Örn: 1 saat 30 dakika"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Katılımcılar
                                    </label>
                                    <input
                                        type="text"
                                        value={meetingForm.participants}
                                        onChange={(e) => setMeetingForm(prev => ({ ...prev, participants: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Katılımcı isimlerini virgülle ayırarak girin"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Açıklama
                                    </label>
                                    <textarea
                                        value={meetingForm.description}
                                        onChange={(e) => setMeetingForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Toplantı açıklamasını girin"
                                        rows="3"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Toplantı Linki (Google Meet)
                                        </label>
                                        <input
                                            type="url"
                                            value={meetingForm.meetingLink}
                                            onChange={(e) => setMeetingForm(prev => ({ ...prev, meetingLink: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="https://meet.google.com/..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Arşiv Linki (Google Drive)
                                        </label>
                                        <input
                                            type="url"
                                            value={meetingForm.archiveLink}
                                            onChange={(e) => setMeetingForm(prev => ({ ...prev, archiveLink: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="https://drive.google.com/..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Toplantı Resmi (Opsiyonel)
                                    </label>
                                    <div className="space-y-4">
                                        {/* Mevcut resim gösterimi */}
                                        {(imagePreview || meetingForm.image) && (
                                            <div className="relative inline-block">
                                                <img 
                                                    src={imagePreview || (meetingForm.image && meetingForm.image.downloadURL)} 
                                                    alt="Toplantı resmi"
                                                    className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 text-xs transition-colors"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* Resim yükleme alanı */}
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageSelect}
                                                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-center">
                                                    <FaImage className="text-gray-400 text-2xl mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Resim seçmek için tıklayın (Max: 5MB)
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Toplantı Dosyaları
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileSelect}
                                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                    {uploadingFiles.length > 0 && (
                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                            {uploadingFiles.length} dosya seçildi
                                        </div>
                                    )}
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
                                        disabled={isUploading}
                                        className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isUploading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Ekleniyor...
                                            </>
                                        ) : (
                                            <>
                                                <FaPlus />
                                                Toplantı Ekle
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Meeting Modal */}
                {showEditModal && editingMeeting && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FaEdit className="text-orange-600" />
                                    Toplantı Düzenle
                                </h2>
                            </div>
                            
                            <form onSubmit={handleEditMeeting} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Toplantı Başlığı *
                                        </label>
                                        <input
                                            type="text"
                                            value={meetingForm.title}
                                            onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="Toplantı başlığını girin"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Toplantı Tarihi *
                                        </label>
                                        <input
                                            type="date"
                                            value={meetingForm.date}
                                            onChange={(e) => setMeetingForm(prev => ({ ...prev, date: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Toplantı Saati
                                        </label>
                                        <input
                                            type="time"
                                            value={meetingForm.time}
                                            onChange={(e) => setMeetingForm(prev => ({ ...prev, time: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Süre
                                        </label>
                                        <input
                                            type="text"
                                            value={meetingForm.duration}
                                            onChange={(e) => setMeetingForm(prev => ({ ...prev, duration: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="Örn: 1 saat 30 dakika"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Katılımcılar
                                    </label>
                                    <input
                                        type="text"
                                        value={meetingForm.participants}
                                        onChange={(e) => setMeetingForm(prev => ({ ...prev, participants: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Katılımcı isimlerini virgülle ayırarak girin"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Açıklama
                                    </label>
                                    <textarea
                                        value={meetingForm.description}
                                        onChange={(e) => setMeetingForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Toplantı açıklamasını girin"
                                        rows="3"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Toplantı Linki (Google Meet)
                                        </label>
                                        <input
                                            type="url"
                                            value={meetingForm.meetingLink}
                                            onChange={(e) => setMeetingForm(prev => ({ ...prev, meetingLink: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="https://meet.google.com/..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Arşiv Linki (Google Drive)
                                        </label>
                                        <input
                                            type="url"
                                            value={meetingForm.archiveLink}
                                            onChange={(e) => setMeetingForm(prev => ({ ...prev, archiveLink: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="https://drive.google.com/..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Yeni Dosyalar Ekle
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileSelect}
                                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                    {uploadingFiles.length > 0 && (
                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                            {uploadingFiles.length} yeni dosya seçildi
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Yeni Resim Ekle (Opsiyonel)
                                    </label>
                                    <div className="space-y-4">
                                        {/* Mevcut resim gösterimi */}
                                        {(imagePreview || meetingForm.image) && (
                                            <div className="relative inline-block">
                                                <img 
                                                    src={imagePreview || (meetingForm.image && meetingForm.image.downloadURL)} 
                                                    alt="Toplantı resmi"
                                                    className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 text-xs transition-colors"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* Resim yükleme alanı */}
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageSelect}
                                                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-center">
                                                    <FaImage className="text-gray-400 text-2xl mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Resim seçmek için tıklayın (Max: 5MB)
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
                                        disabled={isUploading}
                                        className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isUploading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Güncelleniyor...
                                            </>
                                        ) : (
                                            <>
                                                <FaEdit />
                                                Güncelle
                                            </>
                                        )}
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

export default MeetingArchivePage; 