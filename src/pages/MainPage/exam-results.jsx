import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { FaClipboardCheck, FaArrowLeft, FaSearch, FaDownload, FaUser, FaClock, FaChartBar, FaEye, FaFilter, FaSort, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, where, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';

const ExamResultsPage = () => {
    const navigate = useNavigate();

    // State'ler
    const [results, setResults] = useState([]);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedResult, setSelectedResult] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedExam, setSelectedExam] = useState('');
    const [availableExams, setAvailableExams] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);

    // Sonuçları yükle
    useEffect(() => {
        setLoading(true);
        
        // Exam results'ı yükle
        const unsubscribeResults = onSnapshot(
            query(collection(db, 'exam_results'), orderBy('createdAt', 'desc')),
            async (snapshot) => {
                const resultsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                setResults(resultsData);
                
                // Mevcut sınavları al
                const exams = [...new Set(resultsData.map(result => result.examName).filter(Boolean))];
                setAvailableExams(exams);
                
                // Eğer sınav seçilmemişse ilk sınavı seç
                if (exams.length > 0 && !selectedExam) {
                    setSelectedExam(exams[0]);
                }
                
                // Unique user ID'leri al
                const uniqueUserIds = [...new Set(resultsData.map(result => result.userId))];
                
                // Users'ı yükle
                const usersData = {};
                for (const userId of uniqueUserIds) {
                    try {
                        const userDoc = doc(db, 'users', userId);
                        const userSnap = await getDoc(userDoc);
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            usersData[userId] = {
                                name: userData.name || 'Bilinmeyen',
                                surname: userData.surname || 'Kullanıcı',
                                character: userData.character || null
                            };
                        } else {
                            usersData[userId] = {
                                name: 'Bilinmeyen',
                                surname: 'Kullanıcı'
                            };
                        }
                    } catch (error) {
                        console.error('User yüklenirken hata:', error);
                        usersData[userId] = {
                            name: 'Bilinmeyen',
                            surname: 'Kullanıcı'
                        };
                    }
                }
                
                setUsers(usersData);
                setLoading(false);
            },
            (error) => {
                console.error('Results yüklenirken hata:', error);
                toast.error('Sonuçlar yüklenirken bir hata oluştu!');
                setLoading(false);
            }
        );

        return () => unsubscribeResults();
    }, []);

    // Seçili sınavın sonuçlarını filtrele ve sırala
    const filteredAndSortedResults = results
        .filter(result => {
            // Önce sınav filtresi
            if (selectedExam && result.examName !== selectedExam) {
                return false;
            }
            
            // Sonra arama filtresi
            const user = users[result.userId];
            const userName = user ? `${user.name} ${user.surname}` : 'Bilinmeyen Kullanıcı';
            const searchLower = searchTerm.toLowerCase();
            
            return (
                userName.toLowerCase().includes(searchLower) ||
                result.examName?.toLowerCase().includes(searchLower) ||
                result.examId?.toLowerCase().includes(searchLower)
            );
        })
        .sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            
            if (sortBy === 'createdAt') {
                aValue = a.createdAt?.toDate?.() || new Date(0);
                bValue = b.createdAt?.toDate?.() || new Date(0);
            }
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

    // Pagination hesaplamaları
    const totalResults = filteredAndSortedResults.length;
    const totalPages = Math.ceil(totalResults / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentResults = filteredAndSortedResults.slice(startIndex, endIndex);

    // Sayfa değiştiğinde scroll yukarı
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    // Filtre değiştiğinde sayfa 1'e dön
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedExam, searchTerm, sortBy, sortOrder]);

    // Detay modalını aç
    const openDetailModal = (result) => {
        setSelectedResult(result);
        setShowDetailModal(true);
    };

    // Zaman formatla
    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}s ${minutes}d ${secs}sn`;
        } else if (minutes > 0) {
            return `${minutes}d ${secs}sn`;
        } else {
            return `${secs}sn`;
        }
    };

    // Başarı oranı rengi
    const getSuccessRateColor = (rate) => {
        if (rate >= 80) return 'text-green-600 bg-green-100';
        if (rate >= 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    // Puan hesapla (her soru 1 puan)
    const calculateScore = (result) => {
        const totalQuestions = result.totalQuestions || 0;
        const correctAnswers = result.correctAnswers || 0;
        return correctAnswers; // Her doğru cevap 1 puan
    };

    // Sonuç silme
    const handleDeleteResult = async (resultId, userName) => {
        if (!window.confirm(`${userName} kullanıcısının sınav sonucunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
            return;
        }

        try {
            setLoading(true);
            await deleteDoc(doc(db, 'exam_results', resultId));
            toast.success('Sınav sonucu başarıyla silindi!');
        } catch (error) {
            console.error('Sonuç silinirken hata:', error);
            toast.error('Sonuç silinirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="bg-white min-h-screen">
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
                                    <h1 className="text-2xl font-bold text-gray-900">Sınav Sonuçları</h1>
                                    <p className="text-sm text-gray-600">Tüm sınav sonuçlarını görüntüleyin ve analiz edin</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-blue-600">{totalResults}</div>
                                <div className="text-sm text-gray-500">
                                    {selectedExam ? `${selectedExam} Sonuçları` : 'Toplam Sonuç'}
                                </div>
                            </div>
                    </div>

                        {/* Sınav Seçimi */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Sınav Seçin
                                    </label>
                                    <select
                                        value={selectedExam}
                                        onChange={(e) => setSelectedExam(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    >
                                        <option value="">Tüm Sınavlar</option>
                                        {availableExams.map((exam) => (
                                            <option key={exam} value={exam}>
                                                {exam}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Arama
                                    </label>
                                <div className="relative">
                                    <input
                                        type="search"
                                            placeholder="Kullanıcı adı ile ara..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    />
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Sırala
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        >
                                            <option value="createdAt">Tarih</option>
                                            <option value="successRate">Başarı Oranı</option>
                                            <option value="totalQuestions">Toplam Soru</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Yön
                                        </label>
                                        <button
                                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                            className="px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                                        >
                                            <FaSort className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : totalResults === 0 ? (
                            <div className="text-center py-16">
                                <FaClipboardCheck className="h-24 w-24 text-gray-300 mx-auto mb-6" />
                                <h3 className="text-2xl font-medium text-gray-900 mb-4">Sonuç bulunamadı</h3>
                                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                    Arama kriterlerinize uygun sonuç bulunamadı.
                                </p>
                            </div>
                        ) : (
                            /* Sonuç Kartları */
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {currentResults.map((result) => {
                                    const user = users[result.userId];
                                    const userName = user ? `${user.name} ${user.surname}` : 'Bilinmeyen Kullanıcı';
                                    const successRate = result.successRate || 0;
                                    
                                    return (
                                        <div key={result.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        {user?.character?.image ? (
                                                            <img 
                                                                src={`/${user.character.image.split('/').pop()}`}
                                                                alt={userName}
                                                                className="w-12 h-12 rounded-xl object-cover"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    e.target.nextSibling.style.display = 'flex';
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div 
                                                            className={`w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center ${user?.character?.image ? 'hidden' : ''}`}
                                                        >
                                                            <span className="text-blue-600 font-medium text-lg">
                                                                {userName ? userName[0].toUpperCase() : '?'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 text-lg">{userName}</h3>
                                                        <p className="text-sm text-gray-500">{result.examName || 'Sınav'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openDetailModal(result)}
                                                        className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Detayları Gör"
                                                    >
                                                        <FaEye className="h-4 w-4" />
                                                        <span className="text-sm font-medium">Detay</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteResult(result.id, userName)}
                                                        className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Sonucu Sil"
                                                    >
                                                        <FaTrash className="h-4 w-4" />
                                                        <span className="text-sm font-medium">Sil</span>
                            </button>
                        </div>
                    </div>

                                            {/* Başarı Oranı ve Puan */}
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-600">Başarı Oranı</span>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSuccessRateColor(successRate)}`}>
                                                        %{successRate.toFixed(1)}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                                    <div 
                                                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.min(successRate, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-600">Puan</span>
                                                    <span className="text-lg font-bold text-blue-600">
                                                        {calculateScore(result)} / {result.totalQuestions || 0}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* İstatistikler */}
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                                    <div className="text-2xl font-bold text-green-600">{result.correctAnswers || 0}</div>
                                                    <div className="text-xs text-green-600 font-medium">Doğru</div>
                                                </div>
                                                <div className="text-center p-3 bg-red-50 rounded-lg">
                                                    <div className="text-2xl font-bold text-red-600">{result.wrongAnswers || 0}</div>
                                                    <div className="text-xs text-red-600 font-medium">Yanlış</div>
                                                </div>
                                            </div>

                                            {/* Süre ve Tarih */}
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <FaClock className="h-4 w-4" />
                                                    <span>Süre: {formatTime(result.elapsedTimeSeconds || 0)}</span>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {result.createdAt?.toDate?.()?.toLocaleString('tr-TR', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) || 'Tarih bilinmiyor'}
                                                </div>
                                            </div>

                                            {/* Kategori Sonuçları */}
                                            {result.categoryResults && (
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Kategori Sonuçları</h4>
                                                    {Object.entries(result.categoryResults).map(([category, data]) => (
                                                        <div key={category} className="flex items-center justify-between text-xs">
                                                            <span className="text-gray-600">{category}</span>
                                                            <span className={`px-2 py-1 rounded ${getSuccessRateColor(data.successRate || 0)}`}>
                                                                %{(data.successRate || 0).toFixed(0)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Detay Modal */}
                        {showDetailModal && selectedResult && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                                <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                                    {/* Modal Header - Sticky */}
                                    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6 rounded-t-xl">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900">Sınav Detayları</h2>
                                                <p className="text-gray-600">{selectedResult.examName || 'Sınav'}</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        const user = users[selectedResult.userId];
                                                        const userName = user ? `${user.name} ${user.surname}` : 'Bilinmeyen Kullanıcı';
                                                        handleDeleteResult(selectedResult.id, userName);
                                                        setShowDetailModal(false);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Sonucu Sil"
                                                >
                                                    <FaTrash className="h-4 w-4" />
                                                    <span className="text-sm font-medium">Sil</span>
                                                </button>
                                                <button
                                                    onClick={() => setShowDetailModal(false)}
                                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Modal Content - Scrollable */}
                                    <div className="flex-1 overflow-y-auto p-6">
                                        {/* Genel Bilgiler */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                            <div className="bg-blue-50 rounded-xl p-4">
                                                <div className="text-3xl font-bold text-blue-600 mb-1">
                                                    %{(selectedResult.successRate || 0).toFixed(1)}
                                                </div>
                                                <div className="text-sm text-blue-600 font-medium">Başarı Oranı</div>
                                            </div>
                                            <div className="bg-purple-50 rounded-xl p-4">
                                                <div className="text-3xl font-bold text-purple-600 mb-1">
                                                    {calculateScore(selectedResult)} / {selectedResult.totalQuestions || 0}
                                                </div>
                                                <div className="text-sm text-purple-600 font-medium">Puan</div>
                                            </div>
                                            <div className="bg-green-50 rounded-xl p-4">
                                                <div className="text-3xl font-bold text-green-600 mb-1">
                                                    {selectedResult.correctAnswers || 0}
                                                </div>
                                                <div className="text-sm text-green-600 font-medium">Doğru Cevap</div>
                                            </div>
                                            <div className="bg-red-50 rounded-xl p-4">
                                                <div className="text-3xl font-bold text-red-600 mb-1">
                                                    {selectedResult.wrongAnswers || 0}
                                                </div>
                                                <div className="text-sm text-red-600 font-medium">Yanlış Cevap</div>
                                            </div>
                                        </div>

                                        {/* Kategori Sonuçları */}
                                        {selectedResult.categoryResults && (
                                            <div className="mb-8">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategori Sonuçları</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {Object.entries(selectedResult.categoryResults).map(([category, data]) => (
                                                        <div key={category} className="bg-gray-50 rounded-xl p-4">
                                                            <h4 className="font-semibold text-gray-900 mb-3">{category}</h4>
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between text-sm">
                                                                    <span>Başarı Oranı:</span>
                                                                    <span className={`font-semibold ${getSuccessRateColor(data.successRate || 0)}`}>
                                                                        %{(data.successRate || 0).toFixed(1)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span>Doğru:</span>
                                                                    <span className="text-green-600 font-semibold">{data.correctAnswers || 0}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span>Yanlış:</span>
                                                                    <span className="text-red-600 font-semibold">{data.wrongAnswers || 0}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span>Boş:</span>
                                                                    <span className="text-gray-600 font-semibold">{data.emptyAnswers || 0}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span>Toplam:</span>
                                                                    <span className="font-semibold">{data.totalQuestions || 0}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Soru Analizi */}
                                        {selectedResult.questionAnalysis && selectedResult.questionAnalysis.length > 0 && (
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Soru Analizi</h3>
                                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                                    {selectedResult.questionAnalysis.map((question, index) => (
                                                        <div key={index} className="bg-gray-50 rounded-xl p-4">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                                        question.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                                                    }`}>
                                                                        {question.questionIndex + 1}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-gray-900">{question.category}</div>
                                                                        <div className="text-sm text-gray-500">
                                                                            {question.difficulty === 'easy' ? '🟢 Kolay' :
                                                                             question.difficulty === 'medium' ? '🟡 Orta' : '🔴 Zor'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                                    question.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                    {question.isCorrect ? 'Doğru' : 'Yanlış'}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="mb-3">
                                                                <div className="text-sm text-gray-700 font-medium mb-2">Soru:</div>
                                                                <div className="text-sm text-gray-600 bg-white p-3 rounded-lg">
                                                                    {question.questionText}
                                                                </div>
                                                            </div>

                                                            <div className="mb-3">
                                                                <div className="text-sm text-gray-700 font-medium mb-2">Seçenekler:</div>
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    {question.options?.map((option, optIndex) => (
                                                                        <div key={optIndex} className={`p-2 rounded text-sm ${
                                                                            option === question.correctAnswer ? 'bg-green-100 text-green-800 border border-green-300' :
                                                                            option === question.userAnswer ? 'bg-red-100 text-red-800 border border-red-300' :
                                                                            'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                            <span className="font-bold mr-2">{String.fromCharCode(65 + optIndex)}:</span>
                                                                            {option}
                                                                            {option === question.correctAnswer && <span className="ml-2 text-green-600">✓</span>}
                                                                            {option === question.userAnswer && !question.isCorrect && <span className="ml-2 text-red-600">✗</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {question.explanation && (
                                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                                    <div className="text-sm text-blue-800 font-medium mb-1">Açıklama:</div>
                                                                    <div className="text-sm text-blue-700">{question.explanation}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                                <div className="flex items-center text-sm text-gray-700">
                                    <span>
                                        {startIndex + 1}-{Math.min(endIndex, totalResults)} arası, toplam {totalResults} sonuç
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {/* Önceki Sayfa */}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Önceki
                                    </button>
                                    
                                    {/* Sayfa Numaraları */}
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                        currentPage === pageNum
                                                            ? 'bg-blue-600 text-white'
                                                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Sonraki Sayfa */}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Sonraki
                                    </button>
                                </div>
                        </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ExamResultsPage; 