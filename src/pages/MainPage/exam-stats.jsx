import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { 
    FaChartBar, 
    FaArrowLeft, 
    FaUsers, 
    FaCheckCircle, 
    FaClock, 
    FaGraduationCap, 
    FaSpinner, 
    FaExclamationTriangle,
    FaQuestionCircle,
    FaCalendarAlt
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const ExamStatsPage = () => {
    const navigate = useNavigate();
    const { examId } = useParams();
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);

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
                setExam({ id: examSnap.id, ...data });
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

    // Güvenli tarih dönüştürme fonksiyonu
    const safeToDate = (dateValue) => {
        if (!dateValue) return null;
        
        // Eğer zaten Date objesi ise
        if (dateValue instanceof Date) {
            return isNaN(dateValue.getTime()) ? null : dateValue;
        }
        
        // Eğer Firestore Timestamp ise
        if (dateValue && typeof dateValue.toDate === 'function') {
            try {
                return dateValue.toDate();
            } catch (error) {
                console.error('Timestamp dönüştürme hatası:', error);
                return null;
            }
        }
        
        // Eğer string ise
        if (typeof dateValue === 'string') {
            const date = new Date(dateValue);
            return isNaN(date.getTime()) ? null : date;
        }
        
        // Eğer number ise (timestamp)
        if (typeof dateValue === 'number') {
            const date = new Date(dateValue);
            return isNaN(date.getTime()) ? null : date;
        }
        
        return null;
    };

    // Tarih formatına çevirme
    const formatDate = (date) => {
        if (!date) return 'Belirtilmemiş';
        
        const safeDate = safeToDate(date);
        if (!safeDate) return 'Geçersiz tarih';
        
        return safeDate.toLocaleDateString('tr-TR');
    };

    const formatTime = (date) => {
        if (!date) return '';
        
        const safeDate = safeToDate(date);
        if (!safeDate) return '';
        
        return safeDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-center py-12">
                            <FaSpinner className="animate-spin h-8 w-8 text-blue-500 mr-3" />
                            <span className="text-gray-600 text-lg">İstatistikler yükleniyor...</span>
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
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <FaExclamationTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Sınav bulunamadı</h3>
                            <p className="text-gray-600 mb-6">İstediğiniz sınavın istatistikleri mevcut değil.</p>
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

    // Gerçek istatistikleri hesapla
    const stats = {
        totalQuestions: exam.totalQuestions || 0,
        totalParticipants: exam.participants || 0,
        duration: exam.duration || 0,
        status: exam.status || 'draft',
        createdAt: safeToDate(exam.createdAt),
        startDateTime: safeToDate(exam.startDateTime),
        endDateTime: safeToDate(exam.endDateTime)
    };

    // Soru kategorilerini analiz et
    const categoryStats = [];
    let actualTotalQuestions = 0;
    
    if (exam.questions || exam.selectedQuestions) {
        const questionsData = exam.questions || exam.selectedQuestions || {};
        Object.entries(questionsData).forEach(([categoryName, categoryData]) => {
            if (categoryData && typeof categoryData === 'object') {
                const categoryQuestions = categoryData.questions || categoryData;
                const totalQuestions = Object.values(categoryQuestions).reduce((total, difficulty) => {
                    return total + (Array.isArray(difficulty) ? difficulty.length : 0);
                }, 0);
                
                if (totalQuestions > 0) {
                    categoryStats.push({
                        name: categoryName,
                        questionCount: totalQuestions
                    });
                    actualTotalQuestions += totalQuestions;
                }
            }
        });
        
        // Yüzde hesaplamalarını güncelle
        categoryStats.forEach(category => {
            category.percentage = Math.round((category.questionCount / actualTotalQuestions) * 100);
        });
    }
    
    // Gerçek toplam soru sayısını güncelle
    stats.totalQuestions = actualTotalQuestions;

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate(`/deneme-sinavlari/detay/${examId}`)}
                            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <FaArrowLeft className="h-5 w-5 mr-2" />
                            Detaya Dön
                        </button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <FaChartBar className="text-purple-600" />
                                Sınav İstatistikleri
                            </h1>
                            <p className="text-gray-600 mt-1">{exam.name || 'İsimsiz Sınav'}</p>
                        </div>
                    </div>

                    {/* İstatistik Kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-blue-100 rounded-lg p-3">
                                        <FaQuestionCircle className="h-6 w-6 text-blue-600" />
                                    </div>
                                </div>
                                <div className="ml-5">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Toplam Soru
                                    </h3>
                                    <div className="mt-1 text-3xl font-semibold text-blue-600">
                                        {stats.totalQuestions}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-green-100 rounded-lg p-3">
                                        <FaUsers className="h-6 w-6 text-green-600" />
                                    </div>
                                </div>
                                <div className="ml-5">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Katılımcı
                                    </h3>
                                    <div className="mt-1 text-3xl font-semibold text-green-600">
                                        {stats.totalParticipants}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-orange-100 rounded-lg p-3">
                                        <FaClock className="h-6 w-6 text-orange-600" />
                                    </div>
                                </div>
                                <div className="ml-5">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Süre
                                    </h3>
                                    <div className="mt-1 text-3xl font-semibold text-orange-600">
                                        {stats.duration} dk
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-purple-100 rounded-lg p-3">
                                        <FaCheckCircle className="h-6 w-6 text-purple-600" />
                                    </div>
                                </div>
                                <div className="ml-5">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Durum
                                    </h3>
                                    <div className="mt-1 text-lg font-semibold text-purple-600">
                                        {(() => {
                                            switch (stats.status) {
                                                case 'active': return '🟢 Aktif';
                                                case 'draft': return '📝 Taslak';
                                                case 'scheduled': return '⏰ Planlandı';
                                                case 'expired': return '❌ Süresi Doldu';
                                                case 'cancelled': return '⚠️ İptal';
                                                default: return '❓ Bilinmiyor';
                                            }
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Kategori Soru Dağılımı */}
                    {categoryStats.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                            <h2 className="text-lg font-medium text-gray-900 mb-6">
                                Kategori Soru Dağılımı
                            </h2>
                            <div className="space-y-4">
                                {categoryStats.map((category) => (
                                    <div key={category.name}>
                                        <div className="flex justify-between text-sm font-medium text-gray-900 mb-2">
                                            <span>{category.name}</span>
                                            <span>{category.questionCount} soru (%{category.percentage})</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                                                style={{ width: `${category.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Gelecek Özellikler */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-medium text-gray-900">
                                Katılımcı Analizi
                            </h2>
                            <div className="bg-purple-100 rounded-lg p-2">
                                <FaGraduationCap className="h-5 w-5 text-purple-600" />
                            </div>
                        </div>
                        <div className="text-center py-12 text-gray-500">
                            <FaChartBar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 mb-2">Yakında Gelecek</h3>
                            <p className="text-sm">
                                Katılımcı başarı oranları, soru bazlı analizler ve detaylı raporlar yakında burada olacak.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ExamStatsPage; 