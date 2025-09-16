import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { 
    FaArrowLeft, 
    FaEye, 
    FaEdit, 
    FaTrash, 
    FaClock, 
    FaUsers,
    FaQuestionCircle,
    FaCalendarAlt,
    FaPlay,
    FaStop,
    FaChartBar,
    FaSpinner,
    FaExclamationTriangle,
    FaCheckCircle,
    FaTimesCircle,
    FaCopy,
    FaDownload,
    FaPrint,
    FaShare,
    FaInfoCircle,
    FaListAlt,
    FaGraduationCap,
    FaTag,
    FaChevronDown,
    FaChevronRight,
    FaExpand,
    FaCompress
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const ExamDetailPage = () => {
    const navigate = useNavigate();
    const { examId } = useParams();
    
    // State yönetimi
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    
    // Expand/Collapse state'leri
    const [expandedCategories, setExpandedCategories] = useState({});
    const [expandedDifficulties, setExpandedDifficulties] = useState({});
    const [showAllQuestions, setShowAllQuestions] = useState(false);
    const [showAllInDifficulty, setShowAllInDifficulty] = useState({});

    // Zamanla modal state'i
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleData, setScheduleData] = useState({
        startDateTime: '',
        endDateTime: '',
        publishDuration: 2,
        publishUnit: 'hours'
    });

    // Sınavı yükle
    useEffect(() => {
        if (examId) {
            loadExam();
        }
    }, [examId]);

    const loadExam = async () => {
        try {
            setLoading(true);
            const examRef = doc(db, 'examlar', examId);
            const examSnap = await getDoc(examRef);
            
            if (examSnap.exists()) {
                const data = examSnap.data();
                
                // Debug için tüm veriyi görelim
                console.log('Exam data:', data);
                console.log('Questions field:', data.questions);
                console.log('SelectedQuestions field:', data.selectedQuestions);
                console.log('All data keys:', Object.keys(data));
                
                // Güvenli tarih dönüştürme
                const safeToDate = (dateValue) => {
                    if (!dateValue) return new Date();
                    if (dateValue instanceof Date) return dateValue;
                    if (dateValue && typeof dateValue.toDate === 'function') return dateValue.toDate();
                    if (typeof dateValue === 'string') return new Date(dateValue);
                    return new Date();
                };

                setExam({
                    id: examSnap.id,
                    ...data,
                    createdAt: safeToDate(data.createdAt),
                    startDate: safeToDate(data.startDateTime),
                    endDate: safeToDate(data.endDateTime),
                    title: data.name || 'İsimsiz Sınav',
                    participants: data.participants || 0,
                    totalQuestions: data.totalQuestions || 0,
                    duration: data.duration || 0
                });
            } else {
                toast.error('Sınav bulunamadı');
                navigate('/deneme-sinavlari/liste');
            }
        } catch (error) {
            console.error('Sınav yüklenirken hata:', error);
            toast.error('Sınav yüklenirken hata oluştu');
            navigate('/deneme-sinavlari/liste');
        } finally {
            setLoading(false);
        }
    };

    // Sınav durumunu belirle - Sadece aktif/pasif
    const getExamStatus = (exam) => {
        if (!exam) return 'active';
        if (exam.status === 'cancelled') return 'cancelled';
        return 'active';
    };

    // Durum badge'i - Sadece aktif/pasif
    const getStatusBadge = (status) => {
        const config = {
            active: { 
                color: 'bg-green-100 text-green-800 border-green-200', 
                label: 'Aktif',
                icon: '🟢'
            },
            cancelled: { 
                color: 'bg-red-100 text-red-800 border-red-200', 
                label: 'Pasif',
                icon: '⏸️'
            }
        };

        const statusConfig = config[status] || config.active;
        return (
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                <span className="text-lg">{statusConfig.icon}</span>
                {statusConfig.label}
            </span>
        );
    };

    // Sınav silme
    const handleDeleteExam = async () => {
        if (!window.confirm('Bu sınavı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
            return;
        }
        
        try {
            setDeleteLoading(true);
            await deleteDoc(doc(db, 'examlar', examId));
            toast.success('Sınav başarıyla silindi');
            navigate('/deneme-sinavlari/liste');
        } catch (error) {
            console.error('Sınav silinirken hata:', error);
            toast.error('Sınav silinirken hata oluştu');
        } finally {
            setDeleteLoading(false);
        }
    };

    // Sınav durumunu güncelle
    const handleStatusUpdate = async (newStatus) => {
        try {
            setUpdateLoading(true);
            const now = new Date();
            let updateData = {
                status: newStatus,
                updatedAt: now
            };
            
            // Durum bazlı tarih güncellemeleri
            if (newStatus === 'active') {
                // Aktif duruma geçerken başlangıç tarihini şimdi yap
                updateData.startDateTime = now;
                
                // Bitiş tarihini her zaman yayın süresine göre hesapla
                let endDateTime = null;
                
                if (exam.publishDuration && exam.publishUnit) {
                    // Yayın süresi varsa ona göre hesapla
                    let multiplier = 1;
                    switch (exam.publishUnit) {
                        case 'minutes':
                        case 'dakika':
                            multiplier = 60 * 1000; // Dakika → milisaniye
                            break;
                        case 'hours':
                        case 'saat':
                            multiplier = 60 * 60 * 1000; // Saat → milisaniye
                            break;
                        case 'days':
                        case 'gün':
                            multiplier = 24 * 60 * 60 * 1000; // Gün → milisaniye
                            break;
                        case 'weeks':
                        case 'hafta':
                            multiplier = 7 * 24 * 60 * 60 * 1000; // Hafta → milisaniye
                            break;
                        default:
                            multiplier = 60 * 60 * 1000; // Varsayılan: saat
                    }
                    const publishDurationInMs = exam.publishDuration * multiplier;
                    endDateTime = new Date(now.getTime() + publishDurationInMs);
                } else {
                    // Yayın süresi yoksa varsayılan 2 saat
                    endDateTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                }
                
                updateData.endDateTime = endDateTime;
                
            } else if (newStatus === 'scheduled') {
                // Zamanlanmış duruma geçerken gelecek bir tarih belirle
                updateData.startDateTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 saat sonra
                
                // Yayın türüne göre bitiş tarihi hesapla
                if (exam.publishDuration && exam.publishUnit) {
                    let multiplier = 1;
                    switch (exam.publishUnit) {
                        case 'minutes':
                        case 'dakika':
                            multiplier = 60 * 1000;
                            break;
                        case 'hours':
                        case 'saat':
                            multiplier = 60 * 60 * 1000;
                            break;
                        case 'days':
                        case 'gün':
                            multiplier = 24 * 60 * 60 * 1000;
                            break;
                        case 'weeks':
                        case 'hafta':
                            multiplier = 7 * 24 * 60 * 60 * 1000;
                            break;
                        default:
                            multiplier = 60 * 60 * 1000;
                    }
                    const publishDurationInMs = exam.publishDuration * multiplier;
                    updateData.endDateTime = new Date(updateData.startDateTime.getTime() + publishDurationInMs);
                } else {
                    updateData.endDateTime = new Date(updateData.startDateTime.getTime() + 3 * 60 * 60 * 1000); // 3 saat sonra
                }
            }
            
            console.log('Durum güncelleme verisi:', {
                newStatus,
                publishType: exam.publishType,
                publishDuration: exam.publishDuration,
                publishUnit: exam.publishUnit,
                duration: exam.duration,
                updateData
            });
            
            await updateDoc(doc(db, 'examlar', examId), updateData);
            
            // Local state'i güncelle
            setExam(prev => ({
                ...prev,
                status: newStatus,
                updatedAt: now,
                ...(updateData.startDateTime && { 
                    startDate: updateData.startDateTime,
                    startDateTime: updateData.startDateTime 
                }),
                ...(updateData.endDateTime && { 
                    endDate: updateData.endDateTime,
                    endDateTime: updateData.endDateTime 
                })
            }));
            
            const statusMessages = {
                active: 'Sınav aktifleştirildi',
                scheduled: 'Sınav zamanlandı ve yayın süresine göre otomatik bitiş tarihi belirlendi',
                cancelled: 'Sınav pasif edildi',
                draft: 'Sınav taslak durumuna alındı'
            };
            
            toast.success(statusMessages[newStatus] || 'Sınav durumu güncellendi');
        } catch (error) {
            console.error('Sınav durumu güncellenirken hata:', error);
            toast.error('Sınav durumu güncellenirken hata oluştu');
        } finally {
            setUpdateLoading(false);
        }
    };

    // Kopyalama fonksiyonu
    const handleCopyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            toast.success('Panoya kopyalandı');
        }).catch(() => {
            toast.error('Kopyalama başarısız');
        });
    };

    // Kategori expand/collapse
    const toggleCategory = (categoryName) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryName]: !prev[categoryName]
        }));
    };

    // Zorluk seviyesi expand/collapse
    const toggleDifficulty = (categoryName, difficulty) => {
        const key = `${categoryName}-${difficulty}`;
        setExpandedDifficulties(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Tüm kategorileri aç/kapat
    const toggleAllCategories = () => {
        const questionsData = exam.questions || exam.selectedQuestions || {};
        const allCategories = Object.keys(questionsData);
        const allExpanded = allCategories.every(cat => expandedCategories[cat]);
        
        if (allExpanded) {
            setExpandedCategories({});
            setExpandedDifficulties({});
        } else {
            const newExpanded = {};
            const newDifficultyExpanded = {};
            allCategories.forEach(categoryName => {
                newExpanded[categoryName] = true;
                const categoryData = questionsData[categoryName];
                const categoryQuestions = categoryData?.questions || categoryData || {};
                Object.keys(categoryQuestions).forEach(difficulty => {
                    newDifficultyExpanded[`${categoryName}-${difficulty}`] = true;
                });
            });
            setExpandedCategories(newExpanded);
            setExpandedDifficulties(newDifficultyExpanded);
        }
    };

    // Zamanla modal'ını aç
    const handleScheduleExam = () => {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const threeLaterHours = new Date(now.getTime() + 3 * 60 * 60 * 1000);
        
        setScheduleData({
            startDateTime: oneHourLater.toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm format
            endDateTime: threeLaterHours.toISOString().slice(0, 16),
            publishDuration: exam.publishDuration || 2,
            publishUnit: exam.publishUnit || 'hours'
        });
        setShowScheduleModal(true);
    };

    // Zamanla modal'ını kaydet
    const handleSaveSchedule = async () => {
        try {
            setUpdateLoading(true);
            
            const startDateTime = new Date(scheduleData.startDateTime);
            const endDateTime = new Date(scheduleData.endDateTime);
            
            // Tarih validasyonu
            const now = new Date();
            if (startDateTime <= now) {
                toast.error('Başlangıç tarihi gelecekte olmalıdır');
                return;
            }
            
            if (endDateTime <= startDateTime) {
                toast.error('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
                return;
            }
            
            const updateData = {
                status: 'scheduled',
                startDateTime: startDateTime,
                endDateTime: endDateTime,
                publishDuration: scheduleData.publishDuration,
                publishUnit: scheduleData.publishUnit,
                updatedAt: new Date()
            };
            
            console.log('Zamanla verileri:', updateData);
            
            await updateDoc(doc(db, 'examlar', examId), updateData);
            
            // Local state'i güncelle
            setExam(prev => ({
                ...prev,
                status: 'scheduled',
                startDate: startDateTime,
                startDateTime: startDateTime,
                endDate: endDateTime,
                endDateTime: endDateTime,
                publishDuration: scheduleData.publishDuration,
                publishUnit: scheduleData.publishUnit,
                updatedAt: new Date()
            }));
            
            setShowScheduleModal(false);
            toast.success(`Sınav ${startDateTime.toLocaleString('tr-TR')} tarihinde başlayacak şekilde zamanlandı`);
        } catch (error) {
            console.error('Sınav zamanlanırken hata:', error);
            toast.error('Sınav zamanlanırken hata oluştu');
        } finally {
            setUpdateLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center justify-center py-12">
                            <FaSpinner className="animate-spin h-8 w-8 text-blue-500 mr-3" />
                            <span className="text-gray-600 text-lg">Sınav detayları yükleniyor...</span>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!exam) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <FaExclamationTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Sınav bulunamadı</h3>
                            <p className="text-gray-600 mb-6">İstediğiniz sınav mevcut değil veya silinmiş olabilir.</p>
                            <button
                                onClick={() => navigate('/deneme-sinavlari/liste')}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Sınav Listesine Dön
                            </button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    const status = getExamStatus(exam);

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate('/deneme-sinavlari/liste')}
                            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <FaArrowLeft className="h-5 w-5 mr-2" />
                            Listeye Dön
                        </button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <FaListAlt className="text-purple-600" />
                                Sınav Detayları
                            </h1>
                            <p className="text-gray-600 mt-1">Sınav bilgilerini görüntüleyin ve yönetin</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Ana Bilgiler */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Başlık ve Durum */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                            {exam.title || 'İsimsiz Sınav'}
                                        </h2>
                                    </div>
                                    <div className="ml-4">
                                        {getStatusBadge(status)}
                                    </div>
                                </div>

                                {/* İstatistikler Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                        <FaQuestionCircle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                                        <div className="text-2xl font-bold text-blue-600">{exam.totalQuestions}</div>
                                        <div className="text-sm text-gray-600">Soru</div>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <FaUsers className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                        <div className="text-2xl font-bold text-green-600">{exam.participants}</div>
                                        <div className="text-sm text-gray-600">Katılımcı</div>
                                    </div>
                                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                                        <FaClock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                                        <div className="text-2xl font-bold text-orange-600">{exam.duration}</div>
                                        <div className="text-sm text-gray-600">Dakika</div>
                                    </div>
                                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <FaGraduationCap className="h-5 w-5 text-purple-500" />
                                            <div className="text-lg font-bold text-purple-600">
                                                {(() => {
                                                    // Hedef kitle gösterimini düzenle
                                                    if (exam.targetAudience === 'herkes') {
                                                        return 'Herkes';
                                                    } else if (exam.targetAudience === 'tumUnvanlar') {
                                                        return 'Tüm Ünvanlar';
                                                    } else if (exam.targetAudience === 'seciliUnvanlar' && exam.selectedExpertise && exam.selectedExpertise.length > 0) {
                                                        // Seçili ünvanları göster - selectedExpertise array'inden
                                                        const titles = exam.selectedExpertise.map(item => item.name || item.title || item);
                                                        if (titles.length <= 2) {
                                                            return titles.join(', ');
                                                        } else {
                                                            return `${titles.slice(0, 2).join(', ')} +${titles.length - 2}`;
                                                        }
                                                    } else if (exam.targetAudience === 'seciliUnvanlar') {
                                                        return 'Seçili Ünvanlar';
                                                    } else {
                                                        return exam.targetAudience || 'Genel';
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-600">Hedef Kitle</div>
                                    </div>
                                </div>
                            </div>


                            {/* Sınav Soruları */}
                            {((exam.questions && Object.keys(exam.questions).length > 0) || 
                              (exam.selectedQuestions && Object.keys(exam.selectedQuestions).length > 0)) && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            <FaQuestionCircle className="text-blue-500" />
                                            Sınav Soruları
                                            <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                                Toplam: {(() => {
                                                    const questionsData = exam.questions || exam.selectedQuestions || {};
                                                    return Object.values(questionsData).reduce((total, category) => {
                                                        const categoryQuestions = category?.questions || category || {};
                                                        return total + Object.values(categoryQuestions).reduce((catTotal, difficulty) => {
                                                            return catTotal + (Array.isArray(difficulty) ? difficulty.length : 0);
                                                        }, 0);
                                                    }, 0);
                                                })()} soru
                                            </span>
                                        </h3>
                                        
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={toggleAllCategories}
                                                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                title="Tümünü Aç/Kapat"
                                            >
                                                {Object.keys(expandedCategories).length > 0 ? (
                                                    <>
                                                        <FaCompress className="h-3 w-3" />
                                                        Tümünü Kapat
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaExpand className="h-3 w-3" />
                                                        Tümünü Aç
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {Object.entries(exam.questions || exam.selectedQuestions || {}).map(([categoryName, categoryData]) => {
                                            if (!categoryData || typeof categoryData !== 'object') {
                                                return null;
                                            }
                                            
                                            const categoryQuestions = categoryData.questions || categoryData;
                                            const categoryTotal = Object.values(categoryQuestions).reduce((total, difficulty) => {
                                                return total + (Array.isArray(difficulty) ? difficulty.length : 0);
                                            }, 0);
                                            
                                            if (categoryTotal === 0) return null;
                                            
                                            const isExpanded = expandedCategories[categoryName];
                                            
                                            return (
                                                <div key={categoryName} className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <div 
                                                        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                                                        onClick={() => toggleCategory(categoryName)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {isExpanded ? (
                                                                <FaChevronDown className="h-4 w-4 text-gray-500" />
                                                            ) : (
                                                                <FaChevronRight className="h-4 w-4 text-gray-500" />
                                                            )}
                                                            <h4 className="text-lg font-medium text-gray-900">{categoryName}</h4>
                                                        </div>
                                                        <span className="bg-white text-gray-700 px-3 py-1 rounded-full text-sm font-medium border">
                                                            {categoryTotal} soru
                                                        </span>
                                                    </div>
                                                    
                                                    {isExpanded && (
                                                        <div className="p-4 space-y-4">
                                                            {Object.entries(categoryQuestions).map(([difficulty, questions]) => {
                                                                if (!Array.isArray(questions) || questions.length === 0) return null;
                                                                
                                                                const difficultyConfig = {
                                                                    easy: { label: 'Kolay', color: 'bg-green-100 text-green-800 border-green-200', icon: '🟢' },
                                                                    medium: { label: 'Orta', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🟡' },
                                                                    hard: { label: 'Zor', color: 'bg-red-100 text-red-800 border-red-200', icon: '🔴' },
                                                                    unspecified: { label: 'Belirtilmemiş', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '⚪' }
                                                                };
                                                                
                                                                const config = difficultyConfig[difficulty] || difficultyConfig.unspecified;
                                                                const difficultyKey = `${categoryName}-${difficulty}`;
                                                                const isDifficultyExpanded = expandedDifficulties[difficultyKey];
                                                                
                                                                return (
                                                                    <div key={difficulty} className="border border-gray-200 rounded-lg overflow-hidden">
                                                                        <div 
                                                                            className="p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                                                                            onClick={() => toggleDifficulty(categoryName, difficulty)}
                                                                        >
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-2">
                                                                                    {isDifficultyExpanded ? (
                                                                                        <FaChevronDown className="h-3 w-3 text-gray-500" />
                                                                                    ) : (
                                                                                        <FaChevronRight className="h-3 w-3 text-gray-500" />
                                                                                    )}
                                                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${config.color}`}>
                                                                                        {config.icon} {config.label}
                                                                                    </span>
                                                                                    <span className="text-sm text-gray-600">{questions.length} soru</span>
                                                                                </div>
                                                                            </div>
                                                                            {/* Konu bazında dağılım */}
                                                                            {(() => {
                                                                                const counts = {};
                                                                                questions.forEach(q => {
                                                                                    const t = (q.topicName || 'Diğer').toString();
                                                                                    counts[t] = (counts[t] || 0) + 1;
                                                                                });
                                                                                const entries = Object.entries(counts);
                                                                                if (entries.length <= 1) return null;
                                                                                return (
                                                                                    <div className="mt-2 flex flex-wrap gap-2 pl-6">
                                                                                        {entries.map(([t, c]) => (
                                                                                            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-white border text-gray-700">
                                                                                                {t}: {c}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        
                                                                        {isDifficultyExpanded && (
                                                                            <div className="p-3 space-y-3 bg-white">
                                                                                {(() => {
                                                                                    const sortedQuestions = [...questions].sort((a, b) => {
                                                                                        const an = typeof a.soruNumarasi === 'number' ? a.soruNumarasi : Number.POSITIVE_INFINITY;
                                                                                        const bn = typeof b.soruNumarasi === 'number' ? b.soruNumarasi : Number.POSITIVE_INFINITY;
                                                                                        if (an !== bn) return an - bn;
                                                                                        // fallback: stable by id/text
                                                                                        return String(a.id || '').localeCompare(String(b.id || ''));
                                                                                    });
                                                                                    const key = `${categoryName}-${difficulty}`;
                                                                                    const isExpandedAll = !!showAllInDifficulty[key];
                                                                                    const visible = isExpandedAll ? sortedQuestions : sortedQuestions.slice(0, 5);
                                                                                    return visible.map((question, index) => (
                                                                                    <div key={question.id || index} className="bg-gray-50 rounded-lg p-4 border">
                                                                                        <div className="flex items-start justify-between mb-3">
                                                                                            <span className="text-sm font-medium text-gray-700">
                                                                                                Soru {question.soruNumarasi || (index + 1)}
                                                                                            </span>
                                                                                            <button
                                                                                                onClick={() => handleCopyToClipboard(question.id)}
                                                                                                className="text-xs text-gray-400 hover:text-gray-600"
                                                                                                title="Soru ID'sini kopyala"
                                                                                            >
                                                                                                <FaCopy className="h-3 w-3" />
                                                                                            </button>
                                                                                        </div>
                                                                                        {question.topicName && (
                                                                                            <div className="mb-2">
                                                                                                <span className="inline-block text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                                                                                    {question.topicName}
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                        
                                                                                        {/* Soru Metni */}
                                                                                        <div className="text-sm text-gray-900 mb-4 font-medium">
                                                                                            {question.soruMetni || 'Soru metni bulunamadı'}
                                                                                        </div>
                                                                                        
                                                                                        {/* Şıklar - Farklı formatlarda kontrol et */}
                                                                                        {(() => {
                                                                                            // Farklı şık formatlarını kontrol et
                                                                                            console.log('Question data for choices:', question);
                                                                                            let choices = [];
                                                                                            
                                                                                            // 1. siklar array formatı
                                                                                            if (question.siklar && Array.isArray(question.siklar)) {
                                                                                                choices = question.siklar;
                                                                                            }
                                                                                            // 2. cevaplar array formatı
                                                                                            else if (question.cevaplar && Array.isArray(question.cevaplar)) {
                                                                                                choices = question.cevaplar;
                                                                                            }
                                                                                            // 3. secenekler array formatı
                                                                                            else if (question.secenekler && Array.isArray(question.secenekler)) {
                                                                                                choices = question.secenekler;
                                                                                            }
                                                                                            // 4. options array formatı
                                                                                            else if (question.options && Array.isArray(question.options)) {
                                                                                                choices = question.options;
                                                                                            }
                                                                                            // 5. choices array formatı
                                                                                            else if (question.choices && Array.isArray(question.choices)) {
                                                                                                choices = question.choices;
                                                                                            }
                                                                                            // 6. A, B, C, D ayrı alanlar
                                                                                            else if (question.a !== undefined && question.b !== undefined) {
                                                                                                choices = [
                                                                                                    question.a,
                                                                                                    question.b,
                                                                                                    question.c || '',
                                                                                                    question.d || '',
                                                                                                    question.e || ''
                                                                                                ].filter(choice => choice && choice.trim() !== '');
                                                                                            }
                                                                                            
                                                                                            console.log('Found choices:', choices);
                                                                                            
                                                                                            return choices.length > 0 ? (
                                                                                                <div className="mb-4">
                                                                                                    <div className="text-xs font-medium text-gray-600 mb-2">Şıklar:</div>
                                                                                                    <div className="space-y-1">
                                                                                                        {choices.map((choice, choiceIndex) => {
                                                                                                            if (!choice || choice.trim() === '') return null;
                                                                                                            const letter = String.fromCharCode(65 + choiceIndex); // A, B, C, D, E
                                                                                                            const isCorrect = question.dogruCevap === letter;
                                                                                                            return (
                                                                                                                <div key={choiceIndex} className={`flex items-start gap-2 p-2 rounded text-xs ${
                                                                                                                    isCorrect 
                                                                                                                        ? 'bg-green-100 text-green-800 border border-green-200' 
                                                                                                                        : 'bg-white border border-gray-200'
                                                                                                                }`}>
                                                                                                                    <span className="font-bold min-w-[16px]">
                                                                                                                        {letter}:
                                                                                                                    </span>
                                                                                                                    <span className="flex-1">{choice}</span>
                                                                                                                    {isCorrect && (
                                                                                                                        <FaCheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            );
                                                                                                        })}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : null;
                                                                                        })()}
                                                                                        
                                                                                        {/* Açıklama */}
                                                                                        {question.aciklama && (
                                                                                            <div className="mb-3">
                                                                                                <div className="text-xs font-medium text-gray-600 mb-1">Açıklama:</div>
                                                                                                <div className="text-xs text-gray-700 bg-blue-50 p-2 rounded border border-blue-200">
                                                                                                    {question.aciklama}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                        
                                                                                        {/* Doğru Cevap */}
                                                                                        <div className="flex items-center gap-2 text-xs">
                                                                                            <FaCheckCircle className="h-3 w-3 text-green-500" />
                                                                                            <span className="text-gray-600">Doğru Cevap:</span>
                                                                                            <span className="font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                                                                                                {question.dogruCevap}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                    ));
                                                                                })()}
                                                                                {questions.length > 5 && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setShowAllInDifficulty(prev => ({
                                                                                            ...prev,
                                                                                            [`${categoryName}-${difficulty}`]: !prev[`${categoryName}-${difficulty}`]
                                                                                        }))}
                                                                                        className="w-full text-center p-3 text-gray-600 text-sm hover:text-blue-700 hover:bg-blue-50 rounded"
                                                                                    >
                                                                                        {showAllInDifficulty[`${categoryName}-${difficulty}`]
                                                                                            ? 'Daha az göster'
                                                                                            : `+${Math.max(0, questions.length - 5)} soru daha...`}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Özet İstatistikler */}
                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <h4 className="text-md font-medium text-gray-900 mb-4">Zorluk Seviyesi Dağılımı</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {['easy', 'medium', 'hard', 'unspecified'].map(difficulty => {
                                                const count = Object.values(exam.questions || exam.selectedQuestions || {}).reduce((total, category) => {
                                                    if (!category || typeof category !== 'object') return total;
                                                    const categoryQuestions = category.questions || category;
                                                    const difficultyQuestions = categoryQuestions[difficulty];
                                                    return total + (Array.isArray(difficultyQuestions) ? difficultyQuestions.length : 0);
                                                }, 0);
                                                
                                                if (count === 0) return null;
                                                
                                                const config = {
                                                    easy: { label: 'Kolay', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
                                                    medium: { label: 'Orta', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
                                                    hard: { label: 'Zor', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                                                    unspecified: { label: 'Belirtilmemiş', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
                                                }[difficulty];
                                                
                                                return (
                                                    <div key={difficulty} className={`text-center p-4 rounded-lg border ${config.bg} ${config.border}`}>
                                                        <div className={`text-2xl font-bold ${config.color} mb-1`}>{count}</div>
                                                        <div className="text-xs text-gray-600 font-medium">{config.label}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Yan Panel - Aksiyonlar */}
                        <div className="space-y-6">
                            {/* Durum Kontrolleri */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Durum Kontrolleri</h3>
                                <div className="space-y-3">
                                    {/* Mevcut durum göstergesi */}
                                    <div className="p-3 bg-gray-50 rounded-lg border">
                                        <div className="text-sm text-gray-600 mb-1">Mevcut Durum</div>
                                        <div className="font-medium">
                                            {getStatusBadge(status)}
                                        </div>
                                    </div>

                                    {/* Durum bazlı aksiyonlar */}
                                    {status === 'active' && (
                                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                            <div className="text-sm text-green-700 mb-3">
                                                ✅ Bu sınav aktif durumda.
                                            </div>
                                            <button
                                                onClick={() => handleStatusUpdate('cancelled')}
                                                disabled={updateLoading}
                                                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                                            >
                                                {updateLoading ? <FaSpinner className="animate-spin" /> : <FaStop />}
                                                Pasif Et
                                            </button>
                                        </div>
                                    )}
                                    
                                    {status === 'cancelled' && (
                                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                            <div className="text-sm text-yellow-700 mb-3">
                                                ⚠️ Bu sınav pasif durumda.
                                            </div>
                                            <button
                                                onClick={() => handleStatusUpdate('active')}
                                                disabled={updateLoading}
                                                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                            >
                                                {updateLoading ? <FaSpinner className="animate-spin" /> : <FaPlay />}
                                                Aktif Et
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Ana Aksiyonlar */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">İşlemler</h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            const currentStatus = getExamStatus(exam);
                                            if (currentStatus === 'active') {
                                                toast.error('Aktif sınavlar düzenlenemez!');
                                                return;
                                            }
                                            navigate(`/deneme-sinavlari/duzenle/${exam.id}`);
                                        }}
                                        disabled={getExamStatus(exam) === 'active'}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                                            getExamStatus(exam) === 'active'
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                        title={
                                            getExamStatus(exam) === 'active' 
                                                ? 'Aktif sınavlar düzenlenemez'
                                                : 'Sınavı düzenle'
                                        }
                                    >
                                        <FaEdit />
                                        Düzenle
                                        {getExamStatus(exam) === 'active' && (
                                            <FaExclamationTriangle className="h-4 w-4 text-yellow-500" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => navigate(`/deneme-sinavlari/istatistik/${exam.id}`)}
                                        className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                                    >
                                        <FaChartBar />
                                        İstatistikler
                                    </button>
                                </div>
                            </div>

                            {/* Tehlikeli İşlemler */}
                            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                                <h3 className="text-lg font-semibold text-red-900 mb-4">Tehlikeli İşlemler</h3>
                                <button
                                    onClick={handleDeleteExam}
                                    disabled={deleteLoading}
                                    className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {deleteLoading ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                                    Sınavı Sil
                                </button>
                                <p className="text-xs text-red-600 mt-2">Bu işlem geri alınamaz!</p>
                            </div>

                            {/* Sınav ID */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sınav Bilgileri</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sınav ID</label>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono">
                                                {exam.id}
                                            </code>
                                            <button
                                                onClick={() => handleCopyToClipboard(exam.id)}
                                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                                title="Kopyala"
                                            >
                                                <FaCopy className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Oluşturan</label>
                                        <div className="px-3 py-2 bg-gray-100 rounded text-sm">
                                            {exam.createdBy || 'Bilinmiyor'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Zamanla Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <FaCalendarAlt className="text-blue-500" />
                                    Sınavı Zamanla
                                </h3>
                                <button
                                    onClick={() => setShowScheduleModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <FaTimesCircle className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Başlangıç Tarihi */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Başlangıç Tarihi ve Saati
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={scheduleData.startDateTime}
                                        onChange={(e) => setScheduleData(prev => {
                                            const newData = {
                                                ...prev,
                                                startDateTime: e.target.value
                                            };
                                            
                                            // Bitiş tarihini otomatik hesapla
                                            if (e.target.value) {
                                                const start = new Date(e.target.value);
                                                let multiplier = 1;
                                                switch (newData.publishUnit) {
                                                    case 'minutes':
                                                    case 'dakika':
                                                        multiplier = 60 * 1000;
                                                        break;
                                                    case 'hours':
                                                    case 'saat':
                                                        multiplier = 60 * 60 * 1000;
                                                        break;
                                                    case 'days':
                                                    case 'gün':
                                                        multiplier = 24 * 60 * 60 * 1000;
                                                        break;
                                                    case 'weeks':
                                                    case 'hafta':
                                                        multiplier = 7 * 24 * 60 * 60 * 1000;
                                                        break;
                                                    default:
                                                        multiplier = 60 * 60 * 1000;
                                                }
                                                const durationInMs = newData.publishDuration * multiplier;
                                                const end = new Date(start.getTime() + durationInMs);
                                                newData.endDateTime = end.toISOString().slice(0, 16);
                                            }
                                            
                                            return newData;
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                </div>

                                {/* Yayın Süresi */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sınav Ne Kadar Süre Aktif Kalacak?
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Süre</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={scheduleData.publishDuration}
                                                onChange={(e) => setScheduleData(prev => {
                                                    const newData = {
                                                        ...prev,
                                                        publishDuration: parseInt(e.target.value) || 1
                                                    };
                                                    
                                                    // Bitiş tarihini otomatik hesapla
                                                    if (newData.startDateTime) {
                                                        const start = new Date(newData.startDateTime);
                                                        let multiplier = 1;
                                                        switch (newData.publishUnit) {
                                                            case 'minutes':
                                                            case 'dakika':
                                                                multiplier = 60 * 1000;
                                                                break;
                                                            case 'hours':
                                                            case 'saat':
                                                                multiplier = 60 * 60 * 1000;
                                                                break;
                                                            case 'days':
                                                            case 'gün':
                                                                multiplier = 24 * 60 * 60 * 1000;
                                                                break;
                                                            case 'weeks':
                                                            case 'hafta':
                                                                multiplier = 7 * 24 * 60 * 60 * 1000;
                                                                break;
                                                            default:
                                                                multiplier = 60 * 60 * 1000;
                                                        }
                                                        const durationInMs = newData.publishDuration * multiplier;
                                                        const end = new Date(start.getTime() + durationInMs);
                                                        newData.endDateTime = end.toISOString().slice(0, 16);
                                                    }
                                                    
                                                    return newData;
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Birim</label>
                                            <select
                                                value={scheduleData.publishUnit}
                                                onChange={(e) => setScheduleData(prev => {
                                                    const newData = {
                                                        ...prev,
                                                        publishUnit: e.target.value
                                                    };
                                                    
                                                    // Bitiş tarihini otomatik hesapla
                                                    if (newData.startDateTime) {
                                                        const start = new Date(newData.startDateTime);
                                                        let multiplier = 1;
                                                        switch (newData.publishUnit) {
                                                            case 'minutes':
                                                            case 'dakika':
                                                                multiplier = 60 * 1000;
                                                                break;
                                                            case 'hours':
                                                            case 'saat':
                                                                multiplier = 60 * 60 * 1000;
                                                                break;
                                                            case 'days':
                                                            case 'gün':
                                                                multiplier = 24 * 60 * 60 * 1000;
                                                                break;
                                                            case 'weeks':
                                                            case 'hafta':
                                                                multiplier = 7 * 24 * 60 * 60 * 1000;
                                                                break;
                                                            default:
                                                                multiplier = 60 * 60 * 1000;
                                                        }
                                                        const durationInMs = newData.publishDuration * multiplier;
                                                        const end = new Date(start.getTime() + durationInMs);
                                                        newData.endDateTime = end.toISOString().slice(0, 16);
                                                    }
                                                    
                                                    return newData;
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="minutes">Dakika</option>
                                                <option value="hours">Saat</option>
                                                <option value="days">Gün</option>
                                                <option value="weeks">Hafta</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Hızlı Süre Seçenekleri */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Hızlı Seçenekler
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                setScheduleData(prev => {
                                                    const newData = {
                                                        ...prev,
                                                        publishDuration: 2,
                                                        publishUnit: 'hours'
                                                    };
                                                    
                                                    // Bitiş tarihini otomatik hesapla
                                                    if (newData.startDateTime) {
                                                        const start = new Date(newData.startDateTime);
                                                        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
                                                        newData.endDateTime = end.toISOString().slice(0, 16);
                                                    }
                                                    
                                                    return newData;
                                                });
                                            }}
                                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                                        >
                                            2 Saat
                                        </button>
                                        <button
                                            onClick={() => {
                                                setScheduleData(prev => {
                                                    const newData = {
                                                        ...prev,
                                                        publishDuration: 6,
                                                        publishUnit: 'hours'
                                                    };
                                                    
                                                    // Bitiş tarihini otomatik hesapla
                                                    if (newData.startDateTime) {
                                                        const start = new Date(newData.startDateTime);
                                                        const end = new Date(start.getTime() + 6 * 60 * 60 * 1000);
                                                        newData.endDateTime = end.toISOString().slice(0, 16);
                                                    }
                                                    
                                                    return newData;
                                                });
                                            }}
                                            className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
                                        >
                                            6 Saat
                                        </button>
                                        <button
                                            onClick={() => {
                                                setScheduleData(prev => {
                                                    const newData = {
                                                        ...prev,
                                                        publishDuration: 1,
                                                        publishUnit: 'days'
                                                    };
                                                    
                                                    // Bitiş tarihini otomatik hesapla
                                                    if (newData.startDateTime) {
                                                        const start = new Date(newData.startDateTime);
                                                        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
                                                        newData.endDateTime = end.toISOString().slice(0, 16);
                                                    }
                                                    
                                                    return newData;
                                                });
                                            }}
                                            className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors"
                                        >
                                            1 Gün
                                        </button>
                                        <button
                                            onClick={() => {
                                                setScheduleData(prev => {
                                                    const newData = {
                                                        ...prev,
                                                        publishDuration: 1,
                                                        publishUnit: 'weeks'
                                                    };
                                                    
                                                    // Bitiş tarihini otomatik hesapla
                                                    if (newData.startDateTime) {
                                                        const start = new Date(newData.startDateTime);
                                                        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
                                                        newData.endDateTime = end.toISOString().slice(0, 16);
                                                    }
                                                    
                                                    return newData;
                                                });
                                            }}
                                            className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200 transition-colors"
                                        >
                                            1 Hafta
                                        </button>
                                    </div>
                                </div>

                                {/* Hesaplanan Bitiş Tarihi Önizlemesi */}
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="text-sm text-gray-600 mb-2">
                                        <FaInfoCircle className="inline h-4 w-4 mr-1" />
                                        <strong>Hesaplanan Bitiş Tarihi:</strong>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900">
                                        {scheduleData.startDateTime && scheduleData.endDateTime ? (
                                            <>
                                                <div className="text-green-700">
                                                    📅 {new Date(scheduleData.endDateTime).toLocaleDateString('tr-TR', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                                <div className="text-green-600 text-xs mt-1">
                                                    🕒 {new Date(scheduleData.endDateTime).toLocaleTimeString('tr-TR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                                <div className="text-blue-600 text-xs mt-2 bg-blue-50 p-2 rounded">
                                                    ⏱️ Toplam süre: {scheduleData.publishDuration} {(() => {
                                                        switch (scheduleData.publishUnit) {
                                                            case 'minutes': return 'dakika';
                                                            case 'hours': return 'saat';
                                                            case 'days': return 'gün';
                                                            case 'weeks': return 'hafta';
                                                            default: return scheduleData.publishUnit;
                                                        }
                                                    })()}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-gray-500">Başlangıç tarihi seçiniz</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Aksiyonları */}
                            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                                <button
                                    onClick={() => setShowScheduleModal(false)}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSaveSchedule}
                                    disabled={updateLoading || !scheduleData.startDateTime}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {updateLoading ? <FaSpinner className="animate-spin h-4 w-4" /> : <FaCalendarAlt />}
                                    Zamanla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default ExamDetailPage; 