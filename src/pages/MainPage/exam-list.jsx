import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { 
    FaListAlt, 
    FaArrowLeft, 
    FaEye, 
    FaEdit, 
    FaTrash, 
    FaClock, 
    FaPlus,
    FaSearch,
    FaFilter,
    FaSortAmountDown,
    FaSortAmountUp,
    FaTh,
    FaList,
    FaUsers,
    FaQuestionCircle,
    FaCalendarAlt,
    FaPlay,
    FaStop,
    FaCopy,
    FaDownload,
    FaChartBar,
    FaSpinner,
    FaExclamationTriangle
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const ExamListPage = () => {
    const navigate = useNavigate();
    
    // State yönetimi
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' veya 'list'
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [sortDirection, setSortDirection] = useState('desc');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedExams, setSelectedExams] = useState(new Set());
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Sınavları yükle
    useEffect(() => {
        loadExams();
    }, []);

    const loadExams = async () => {
        try {
            setLoading(true);
            const examsRef = collection(db, 'examlar');
            const snapshot = await getDocs(examsRef);
            
            console.log('Firestore snapshot size:', snapshot.size);
            console.log('Firestore docs:', snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
            
            // Güvenli tarih dönüştürme fonksiyonu
            const safeToDate = (dateValue) => {
                if (!dateValue) return new Date();
                
                // Eğer zaten Date objesi ise
                if (dateValue instanceof Date) {
                    return dateValue;
                }
                
                // Eğer Firestore Timestamp ise
                if (dateValue && typeof dateValue.toDate === 'function') {
                    return dateValue.toDate();
                }
                
                // Eğer string ise
                if (typeof dateValue === 'string') {
                    return new Date(dateValue);
                }
                
                // Varsayılan
                return new Date();
            };
            
            const examsList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: safeToDate(data.createdAt),
                    startDate: safeToDate(data.startDateTime),
                    endDate: safeToDate(data.endDateTime),
                    title: data.name || 'İsimsiz Sınav',
                    participants: data.participants || 0,
                    totalQuestions: data.totalQuestions || 0,
                    duration: data.duration || 0
                };
            });
            
            console.log('Processed exams list:', examsList);
            setExams(examsList);
        } catch (error) {
            console.error('Sınavlar yüklenirken hata:', error);
            toast.error('Sınavlar yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    // Sınav durumunu belirle
    const getExamStatus = (exam) => {
        const now = new Date();
        const startDate = new Date(exam.startDate);
        const endDate = exam.endDate ? new Date(exam.endDate) : null;
        
        if (exam.status === 'draft') return 'draft';
        if (exam.status === 'cancelled') return 'cancelled';
        if (endDate && now > endDate) return 'expired';
        if (now >= startDate) return 'active';
        return 'scheduled';
    };

    // Durum badge'i
    const getStatusBadge = (status) => {
        const config = {
            active: { 
                color: 'bg-green-100 text-green-800 border-green-200', 
                label: 'Aktif',
                icon: '🟢'
            },
            draft: { 
                color: 'bg-gray-100 text-gray-800 border-gray-200', 
                label: 'Taslak',
                icon: '📝'
            },
            scheduled: { 
                color: 'bg-blue-100 text-blue-800 border-blue-200', 
                label: 'Planlandı',
                icon: '⏰'
            },
            expired: { 
                color: 'bg-red-100 text-red-800 border-red-200', 
                label: 'Süresi Doldu',
                icon: '❌'
            },
            cancelled: { 
                color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
                label: 'İptal Edildi',
                icon: '⚠️'
            }
        };

        const statusConfig = config[status] || config.draft;
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                <span>{statusConfig.icon}</span>
                {statusConfig.label}
            </span>
        );
    };

    // Filtreleme ve sıralama
    const filteredAndSortedExams = exams
        .filter(exam => {
            const matchesSearch = exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const examStatus = getExamStatus(exam);
            const matchesStatus = statusFilter === 'all' || examStatus === statusFilter;
            
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'title':
                    aValue = a.title?.toLowerCase() || '';
                    bValue = b.title?.toLowerCase() || '';
                    break;
                case 'startDate':
                    aValue = new Date(a.startDate);
                    bValue = new Date(b.startDate);
                    break;
                case 'participants':
                    aValue = a.participants || 0;
                    bValue = b.participants || 0;
                    break;
                case 'questions':
                    aValue = a.totalQuestions || 0;
                    bValue = b.totalQuestions || 0;
                    break;
                default: // newest
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
            }
            
            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

    // Sınav silme
    const handleDeleteExam = async (examId) => {
        if (!window.confirm('Bu sınavı silmek istediğinizden emin misiniz?')) {
            return;
        }
        
        try {
            setDeleteLoading(true);
            await deleteDoc(doc(db, 'examlar', examId));
            setExams(exams.filter(exam => exam.id !== examId));
            setSelectedExams(prev => {
                const newSet = new Set(prev);
                newSet.delete(examId);
                return newSet;
            });
            toast.success('Sınav başarıyla silindi');
        } catch (error) {
            console.error('Sınav silinirken hata:', error);
            toast.error('Sınav silinirken hata oluştu');
        } finally {
            setDeleteLoading(false);
        }
    };

    // Sınav durumunu güncelle
    const handleStatusUpdate = async (examId, newStatus) => {
        try {
            await updateDoc(doc(db, 'examlar', examId), {
                status: newStatus,
                updatedAt: new Date()
            });
            
            setExams(exams.map(exam => 
                exam.id === examId 
                    ? { ...exam, status: newStatus, updatedAt: new Date() }
                    : exam
            ));
            
            toast.success('Sınav durumu güncellendi');
        } catch (error) {
            console.error('Sınav durumu güncellenirken hata:', error);
            toast.error('Sınav durumu güncellenirken hata oluştu');
        }
    };

    // Grid görünümü
    const GridView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredAndSortedExams.map((exam) => {
                const status = getExamStatus(exam);
                const statusConfig = {
                    active: { 
                        gradient: 'from-green-400 to-emerald-500',
                        bg: 'bg-green-50',
                        border: 'border-green-200',
                        icon: '🟢'
                    },
                    draft: { 
                        gradient: 'from-gray-400 to-slate-500',
                        bg: 'bg-gray-50',
                        border: 'border-gray-200',
                        icon: '📝'
                    },
                    scheduled: { 
                        gradient: 'from-blue-400 to-indigo-500',
                        bg: 'bg-blue-50',
                        border: 'border-blue-200',
                        icon: '⏰'
                    },
                    expired: { 
                        gradient: 'from-red-400 to-rose-500',
                        bg: 'bg-red-50',
                        border: 'border-red-200',
                        icon: '❌'
                    },
                    cancelled: { 
                        gradient: 'from-amber-400 to-orange-500',
                        bg: 'bg-amber-50',
                        border: 'border-amber-200',
                        icon: '⚠️'
                    }
                };
                
                const currentStatus = statusConfig[status] || statusConfig.draft;
                
                return (
                    <div key={exam.id} className="group">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                            {/* Gradient Header */}
                            <div className={`h-3 bg-gradient-to-r ${currentStatus.gradient}`}></div>
                            
                            {/* Card Content */}
                            <div className="p-6">
                                {/* Header Section */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`p-2 rounded-lg ${currentStatus.bg} ${currentStatus.border} border`}>
                                                <span className="text-lg">{currentStatus.icon}</span>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer"
                                                    title={exam.title || 'İsimsiz Sınav'}>
                                                    {(exam.title || 'İsimsiz Sınav').length > 30 
                                                        ? `${(exam.title || 'İsimsiz Sınav').substring(0, 30)}...`
                                                        : (exam.title || 'İsimsiz Sınav')
                                                    }
                                                </h3>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${currentStatus.bg} border ${currentStatus.border}`}>
                                                        {status === 'active' ? 'Aktif' : 
                                                         status === 'draft' ? 'Taslak' :
                                                         status === 'scheduled' ? 'Planlandı' :
                                                         status === 'expired' ? 'Süresi Doldu' : 'İptal'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Description */}
                                {exam.description && (
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                        {exam.description}
                                    </p>
                                )}
                                
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-100">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                                <FaQuestionCircle className="h-3 w-3 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-blue-600 font-medium">Sorular</div>
                                                <div className="text-sm font-bold text-blue-800">{exam.totalQuestions || 0}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-xl border border-green-100">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-green-100 rounded-lg">
                                                <FaUsers className="h-3 w-3 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-green-600 font-medium">Katılımcı</div>
                                                <div className="text-sm font-bold text-green-800">{exam.participants || 0}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-3 rounded-xl border border-orange-100">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-orange-100 rounded-lg">
                                                <FaClock className="h-3 w-3 text-orange-600" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-orange-600 font-medium">Süre</div>
                                                <div className="text-sm font-bold text-orange-800">{exam.duration || 0} dk</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-3 rounded-xl border border-purple-100">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-purple-100 rounded-lg">
                                                <FaCalendarAlt className="h-3 w-3 text-purple-600" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-purple-600 font-medium">Tarih</div>
                                                <div className="text-xs font-bold text-purple-800">
                                                    {new Date(exam.startDate).toLocaleDateString('tr-TR', { 
                                                        day: '2-digit', 
                                                        month: '2-digit',
                                                        year: '2-digit'
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center justify-between gap-2">
                                    {/* Primary Actions */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => navigate(`/deneme-sinavlari/detay/${exam.id}`)}
                                            className="p-2.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-xl transition-all duration-200 hover:scale-110"
                                            title="Detayları Görüntüle"
                                        >
                                            <FaEye className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/deneme-sinavlari/duzenle/${exam.id}`)}
                                            className="p-2.5 bg-green-100 text-green-600 hover:bg-green-200 rounded-xl transition-all duration-200 hover:scale-110"
                                            title="Düzenle"
                                        >
                                            <FaEdit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/deneme-sinavlari/istatistik/${exam.id}`)}
                                            className="p-2.5 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-xl transition-all duration-200 hover:scale-110"
                                            title="İstatistikler"
                                        >
                                            <FaChartBar className="h-4 w-4" />
                                        </button>
                                    </div>
                                    
                                    {/* Status & Danger Actions */}
                                    <div className="flex items-center gap-1">
                                        {status === 'draft' && (
                                            <button
                                                onClick={() => handleStatusUpdate(exam.id, 'active')}
                                                className="p-2.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-xl transition-all duration-200 hover:scale-110"
                                                title="Aktifleştir"
                                            >
                                                <FaPlay className="h-3 w-3" />
                                            </button>
                                        )}
                                        {status === 'active' && (
                                            <button
                                                onClick={() => handleStatusUpdate(exam.id, 'cancelled')}
                                                className="p-2.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-xl transition-all duration-200 hover:scale-110"
                                                title="Durdur"
                                            >
                                                <FaStop className="h-3 w-3" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteExam(exam.id)}
                                            className="p-2.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-xl transition-all duration-200 hover:scale-110"
                                            title="Sil"
                                            disabled={deleteLoading}
                                        >
                                            {deleteLoading ? (
                                                <FaSpinner className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <FaTrash className="h-3 w-3" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Hover Effect Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-transparent to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 rounded-2xl pointer-events-none"></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // Liste görünümü
    const ListView = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sınav
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Durum
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tarih
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Süre
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sorular
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Katılımcılar
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                İşlemler
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAndSortedExams.map((exam) => {
                            const status = getExamStatus(exam);
                            return (
                                <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-start">
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    {exam.title || 'İsimsiz Sınav'}
                                                </div>
                                                {exam.description && (
                                                    <div className="text-sm text-gray-500 truncate mt-1">
                                                        {exam.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {new Date(exam.startDate).toLocaleDateString('tr-TR')}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(exam.startDate).toLocaleTimeString('tr-TR', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 flex items-center">
                                            <FaClock className="h-4 w-4 mr-2 text-gray-400" />
                                            {exam.duration || 0} dk
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 flex items-center">
                                            <FaQuestionCircle className="h-4 w-4 mr-2 text-gray-400" />
                                            {exam.totalQuestions || 0}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 flex items-center">
                                            <FaUsers className="h-4 w-4 mr-2 text-gray-400" />
                                            {exam.participants || 0}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end items-center space-x-2">
                                            <button
                                                onClick={() => navigate(`/deneme-sinavlari/detay/${exam.id}`)}
                                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Görüntüle"
                                            >
                                                <FaEye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/deneme-sinavlari/duzenle/${exam.id}`)}
                                                className="text-gray-400 hover:text-green-600 transition-colors"
                                                title="Düzenle"
                                            >
                                                <FaEdit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/deneme-sinavlari/istatistik/${exam.id}`)}
                                                className="text-gray-400 hover:text-purple-600 transition-colors"
                                                title="İstatistikler"
                                            >
                                                <FaChartBar className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteExam(exam.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                title="Sil"
                                                disabled={deleteLoading}
                                            >
                                                {deleteLoading ? (
                                                    <FaSpinner className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <FaTrash className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (loading) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-center py-12">
                            <FaSpinner className="animate-spin h-8 w-8 text-blue-500 mr-3" />
                            <span className="text-gray-600 text-lg">Sınavlar yükleniyor...</span>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/deneme-sinavlari')}
                                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                <FaArrowLeft className="h-5 w-5 mr-2" />
                                Geri
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <FaListAlt className="text-purple-600" />
                                    Sınav Listesi
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Toplam {filteredAndSortedExams.length} sınav bulundu
                                </p>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => navigate('/deneme-sinavlari/olustur')}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <FaPlus className="h-4 w-4" />
                            Yeni Sınav
                        </button>
                    </div>

                    {/* Filters & Controls */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            {/* Search */}
                            <div className="flex-1 max-w-md">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <input
                                        type="text"
                                        placeholder="Sınav ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-3">
                                {/* Status Filter */}
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                >
                                    <option value="all">Tüm Durumlar</option>
                                    <option value="active">Aktif</option>
                                    <option value="draft">Taslak</option>
                                    <option value="scheduled">Planlandı</option>
                                    <option value="expired">Süresi Doldu</option>
                                    <option value="cancelled">İptal Edildi</option>
                                </select>

                                {/* Sort */}
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                >
                                    <option value="newest">En Yeni</option>
                                    <option value="title">Alfabetik</option>
                                    <option value="startDate">Başlangıç Tarihi</option>
                                    <option value="participants">Katılımcı Sayısı</option>
                                    <option value="questions">Soru Sayısı</option>
                                </select>

                                {/* Sort Direction */}
                                <button
                                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    title={sortDirection === 'asc' ? 'Artan' : 'Azalan'}
                                >
                                    {sortDirection === 'asc' ? (
                                        <FaSortAmountUp className="h-4 w-4 text-gray-600" />
                                    ) : (
                                        <FaSortAmountDown className="h-4 w-4 text-gray-600" />
                                    )}
                                </button>

                                {/* View Mode */}
                                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 transition-colors ${
                                            viewMode === 'grid' 
                                                ? 'bg-blue-600 text-white' 
                                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                        }`}
                                        title="Grid Görünümü"
                                    >
                                        <FaTh className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 transition-colors ${
                                            viewMode === 'list' 
                                                ? 'bg-blue-600 text-white' 
                                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                        }`}
                                        title="Liste Görünümü"
                                    >
                                        <FaList className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    {filteredAndSortedExams.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <FaExclamationTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {searchTerm || statusFilter !== 'all' ? 'Sonuç bulunamadı' : 'Henüz sınav yok'}
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {searchTerm || statusFilter !== 'all' 
                                    ? 'Arama kriterlerinizi değiştirip tekrar deneyin.'
                                    : 'İlk sınavınızı oluşturmak için başlayın.'
                                }
                            </p>
                            {!searchTerm && statusFilter === 'all' && (
                                <button
                                    onClick={() => navigate('/deneme-sinavlari/olustur')}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                    İlk Sınavı Oluştur
                                </button>
                            )}
                        </div>
                    ) : (
                        viewMode === 'grid' ? <GridView /> : <ListView />
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default ExamListPage;