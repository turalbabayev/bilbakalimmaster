import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { toast } from "react-hot-toast";
import { 
    FaUpload, 
    FaTrash, 
    FaDownload, 
    FaEye, 
    FaEdit, 
    FaPlus,
    FaFilePdf,
    FaCalendarAlt,
    FaUser,
    FaSearch,
    FaSort,
    FaFilter
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

const PDFBankPage = () => {
    const [pdfs, setPdfs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPdf, setEditingPdf] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("date");
    const [filterBy, setFilterBy] = useState("all");

    // Upload form state
    const [uploadForm, setUploadForm] = useState({
        title: "",
        description: "",
        category: "",
        author: "",
        file: null
    });

    useEffect(() => {
        loadPDFs();
    }, []);

    const loadPDFs = async () => {
        setIsLoading(true);
        try {
            const pdfsRef = collection(db, "pdf-bank");
            const q = query(pdfsRef, orderBy("uploadDate", "desc"));
            const snapshot = await getDocs(q);
            
            const pdfsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setPdfs(pdfsData);
        } catch (error) {
            console.error('PDF\'ler yüklenirken hata:', error);
            toast.error('PDF\'ler yüklenirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setUploadForm(prev => ({ ...prev, file }));
        } else {
            toast.error('Lütfen geçerli bir PDF dosyası seçin');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        
        if (!uploadForm.file || !uploadForm.title.trim()) {
            toast.error('Lütfen gerekli alanları doldurun');
            return;
        }

        setIsUploading(true);
        try {
            // Firebase Storage'a yükle
            const storageRef = ref(storage, `pdf-bank/${Date.now()}_${uploadForm.file.name}`);
            const uploadResult = await uploadBytes(storageRef, uploadForm.file);
            const downloadURL = await getDownloadURL(uploadResult.ref);

            // Firestore'a kaydet
            const pdfData = {
                title: uploadForm.title.trim(),
                description: uploadForm.description.trim(),
                category: uploadForm.category.trim(),
                author: uploadForm.author.trim(),
                fileName: uploadForm.file.name,
                fileSize: uploadForm.file.size,
                downloadURL,
                storagePath: uploadResult.ref.fullPath,
                uploadDate: serverTimestamp(),
                isActive: true,
                downloadCount: 0
            };

            await addDoc(collection(db, "pdf-bank"), pdfData);
            
            toast.success('PDF başarıyla yüklendi!');
            setShowUploadModal(false);
            setUploadForm({
                title: "",
                description: "",
                category: "",
                author: "",
                file: null
            });
            loadPDFs();
        } catch (error) {
            console.error('PDF yüklenirken hata:', error);
            toast.error('PDF yüklenirken hata oluştu');
        } finally {
            setIsUploading(false);
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        
        if (!editingPdf || !uploadForm.title.trim()) {
            toast.error('Lütfen gerekli alanları doldurun');
            return;
        }

        setIsUploading(true);
        try {
            const pdfRef = doc(db, "pdf-bank", editingPdf.id);
            const updateData = {
                title: uploadForm.title.trim(),
                description: uploadForm.description.trim(),
                category: uploadForm.category.trim(),
                author: uploadForm.author.trim(),
                lastUpdated: serverTimestamp()
            };

            await updateDoc(pdfRef, updateData);
            
            toast.success('PDF başarıyla güncellendi!');
            setShowEditModal(false);
            setEditingPdf(null);
            setUploadForm({
                title: "",
                description: "",
                category: "",
                author: "",
                file: null
            });
            loadPDFs();
        } catch (error) {
            console.error('PDF güncellenirken hata:', error);
            toast.error('PDF güncellenirken hata oluştu');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (pdf) => {
        if (!window.confirm(`"${pdf.title}" PDF'ini silmek istediğinize emin misiniz?`)) {
            return;
        }

        try {
            // Firestore'dan sil
            await deleteDoc(doc(db, "pdf-bank", pdf.id));
            
            // Storage'dan sil
            if (pdf.storagePath) {
                const storageRef = ref(storage, pdf.storagePath);
                await deleteObject(storageRef);
            }
            
            toast.success('PDF başarıyla silindi!');
            loadPDFs();
        } catch (error) {
            console.error('PDF silinirken hata:', error);
            toast.error('PDF silinirken hata oluştu');
        }
    };

    const openEditModal = (pdf) => {
        setEditingPdf(pdf);
        setUploadForm({
            title: pdf.title,
            description: pdf.description || "",
            category: pdf.category || "",
            author: pdf.author || "",
            file: null
        });
        setShowEditModal(true);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Tarih yok';
        return new Date(timestamp.toDate()).toLocaleString('tr-TR');
    };

    // Filtreleme ve sıralama
    const filteredAndSortedPDFs = pdfs
        .filter(pdf => {
            const matchesSearch = pdf.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                pdf.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                pdf.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                pdf.author.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesFilter = filterBy === "all" || pdf.category === filterBy;
            
            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "title":
                    return a.title.localeCompare(b.title);
                case "date":
                    return b.uploadDate?.toDate() - a.uploadDate?.toDate();
                case "size":
                    return b.fileSize - a.fileSize;
                case "downloads":
                    return (b.downloadCount || 0) - (a.downloadCount || 0);
                default:
                    return 0;
            }
        });

    const categories = [...new Set(pdfs.map(pdf => pdf.category).filter(Boolean))];

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                <div className="container mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
                            <FaFilePdf className="text-red-500" />
                            PDF Bankası
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-lg">
                            Mobil uygulama için PDF dosyalarını yönetin ve paylaşın
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
                                        placeholder="PDF ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                <select
                                    value={filterBy}
                                    onChange={(e) => setFilterBy(e.target.value)}
                                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Tüm Kategoriler</option>
                                    {categories.map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                                
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="date">Tarihe Göre</option>
                                    <option value="title">İsme Göre</option>
                                    <option value="size">Boyuta Göre</option>
                                    <option value="downloads">İndirme Sayısına Göre</option>
                                </select>
                            </div>

                            {/* Yükleme Butonu */}
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                            >
                                <FaPlus />
                                PDF Yükle
                            </button>
                        </div>
                    </div>

                    {/* PDF Listesi */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                PDF Dosyaları ({filteredAndSortedPDFs.length})
                            </h2>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600 dark:text-gray-400">PDF'ler yükleniyor...</p>
                            </div>
                        ) : filteredAndSortedPDFs.length === 0 ? (
                            <div className="text-center py-12">
                                <FaFilePdf className="text-gray-400 text-6xl mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400 text-lg">
                                    {searchTerm || filterBy !== "all" ? 'Arama kriterlerinize uygun PDF bulunamadı.' : 'Henüz PDF yüklenmemiş.'}
                                </p>
                                {!searchTerm && filterBy === "all" && (
                                    <button
                                        onClick={() => setShowUploadModal(true)}
                                        className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200"
                                    >
                                        İlk PDF'i Yükle
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredAndSortedPDFs.map((pdf) => (
                                    <div key={pdf.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-200">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                                                    {pdf.title}
                                                </h3>
                                                {pdf.description && (
                                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                                                        {pdf.description}
                                                    </p>
                                                )}
                                            </div>
                                            <FaFilePdf className="text-red-500 text-2xl flex-shrink-0 ml-2" />
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            {pdf.category && (
                                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                    <FaFilter className="mr-2" />
                                                    {pdf.category}
                                                </div>
                                            )}
                                            {pdf.author && (
                                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                    <FaUser className="mr-2" />
                                                    {pdf.author}
                                                </div>
                                            )}
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                <FaCalendarAlt className="mr-2" />
                                                {formatDate(pdf.uploadDate)}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Boyut: {formatFileSize(pdf.fileSize)}
                                            </div>
                                            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                                İndirme: {pdf.downloadCount || 0}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <a
                                                href={pdf.downloadURL}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                                            >
                                                <FaEye />
                                                Görüntüle
                                            </a>
                                            <a
                                                href={pdf.downloadURL}
                                                download
                                                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                                            >
                                                <FaDownload />
                                                İndir
                                            </a>
                                            <button
                                                onClick={() => openEditModal(pdf)}
                                                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(pdf)}
                                                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Upload Modal */}
                {showUploadModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FaUpload className="text-blue-600" />
                                    PDF Yükle
                                </h2>
                            </div>
                            
                            <form onSubmit={handleUpload} className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        PDF Dosyası *
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileSelect}
                                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Başlık *
                                    </label>
                                    <input
                                        type="text"
                                        value={uploadForm.title}
                                        onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="PDF başlığını girin"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Açıklama
                                    </label>
                                    <textarea
                                        value={uploadForm.description}
                                        onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="PDF açıklamasını girin"
                                        rows="3"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Kategori
                                        </label>
                                        <input
                                            type="text"
                                            value={uploadForm.category}
                                            onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Örn: Ders Notları"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Yazar
                                        </label>
                                        <input
                                            type="text"
                                            value={uploadForm.author}
                                            onChange={(e) => setUploadForm(prev => ({ ...prev, author: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="PDF yazarını girin"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUploading}
                                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isUploading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Yükleniyor...
                                            </>
                                        ) : (
                                            <>
                                                <FaUpload />
                                                PDF Yükle
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {showEditModal && editingPdf && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FaEdit className="text-orange-600" />
                                    PDF Düzenle
                                </h2>
                            </div>
                            
                            <form onSubmit={handleEdit} className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Başlık *
                                    </label>
                                    <input
                                        type="text"
                                        value={uploadForm.title}
                                        onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="PDF başlığını girin"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                        Açıklama
                                    </label>
                                    <textarea
                                        value={uploadForm.description}
                                        onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="PDF açıklamasını girin"
                                        rows="3"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Kategori
                                        </label>
                                        <input
                                            type="text"
                                            value={uploadForm.category}
                                            onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Örn: Ders Notları"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Yazar
                                        </label>
                                        <input
                                            type="text"
                                            value={uploadForm.author}
                                            onChange={(e) => setUploadForm(prev => ({ ...prev, author: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="PDF yazarını girin"
                                        />
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

export default PDFBankPage; 