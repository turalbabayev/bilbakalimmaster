import React, { useState } from 'react';
import Layout from '../../components/layout';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaPlay, FaClock, FaFileAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import statsService from '../../services/statsService';

const CreateExamStep4Page = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedQuestions, totalQuestions, questionCounts, topicStats } = location.state || {};

    const [examName, setExamName] = useState('');
    const [duration, setDuration] = useState(120); // 120 dakika default
    const [targetAudience, setTargetAudience] = useState('herkes'); // 'herkes', 'tumUnvanlar', 'seciliUnvanlar'
    const [selectedExpertise, setSelectedExpertise] = useState([]); // Seçili ünvanlar
    const [loading, setLoading] = useState(false);

    // Debug için
    console.log('Step4 - questionCounts:', questionCounts);
    console.log('Step4 - topicStats:', topicStats);

    // Ünvan seçenekleri
    const expertiseOptions = [
        'Servis Asistanı',
        'Servis Görevlisi', 
        'Servis Yetkilisi',
        'Yönetmen Yardımcısı',
        'Yönetmen'
    ];

    const handleTargetAudienceChange = (value) => {
        setTargetAudience(value);
        if (value !== 'seciliUnvanlar') {
            setSelectedExpertise([]);
        }
    };

    const handleExpertiseToggle = (expertise) => {
        setSelectedExpertise(prev => 
            prev.includes(expertise)
                ? prev.filter(e => e !== expertise)
                : [...prev, expertise]
        );
    };

    // Kategori hesaplama fonksiyonu
    const getCategoryQuestions = (category) => {
        if (!questionCounts || !topicStats) return 0;
        
        let total = 0;
        topicStats.forEach(topic => {
            const topicCategory = topic.category || 'Genel Bankacılık';
            if (topicCategory === category) {
                const counts = questionCounts[topic.id] || { easy: 0, medium: 0, hard: 0 };
                const topicTotal = (counts.easy || 0) + (counts.medium || 0) + (counts.hard || 0);
                total += topicTotal;
            }
        });
        return total;
    };

    // Kategori belirleme (step3 ile birebir uyumlu, kesin eşleşmeler)
    const getCategoryLabel = (topicName) => {
        if (!topicName) return 'Genel Bankacılık';
        const t = topicName.toString().trim().toLocaleUpperCase('tr-TR');
        if (t === 'GENEL KÜLTÜR') return 'Genel Kültür';
        if (['MATEMATİK', 'TÜRKÇE', 'TARİH', 'COĞRAFYA'].includes(t)) return 'Genel Yetenek';
        if (['BANKACILIK', 'HUKUK', 'KREDİLER', 'EKONOMİ', 'MUHASEBE'].includes(t)) return 'Genel Bankacılık';
        return 'Genel Bankacılık';
    };

    // Zorluk normalizasyonu (step3 ile tutarlı: bilinmeyenleri 'easy' kabul et)
    const normalizeDifficulty = (value) => {
        if (!value) return 'easy';
        const v = String(value).toLowerCase().trim();
        if (v === 'easy' || v === 'kolay') return 'easy';
        if (v === 'medium' || v === 'orta') return 'medium';
        if (v === 'hard' || v === 'zor') return 'hard';
        return 'easy';
    };


    const handleCreateExam = async () => {
        if (!examName.trim()) {
            toast.error('Lütfen sınav adını giriniz');
            return;
        }

        if (duration < 30) {
            toast.error('Sınav süresi en az 30 dakika olmalıdır');
            return;
        }

        if (targetAudience === 'seciliUnvanlar' && selectedExpertise.length === 0) {
            toast.error('Lütfen en az bir ünvan seçin');
            return;
        }

        setLoading(true);
        
        try {
            // Soruları eski sistem formatına çevir (kategori bazında gruplandır)
            const formatQuestionsForFirestore = (questions) => {
                if (!questions || !Array.isArray(questions)) return {};
                
                // Önce tüm soruları kategorilere göre grupla
                const tempGrouped = {};
                
                questions.forEach((question, index) => {
                    const category = getCategoryLabel(question.topicName || question.topic || 'Genel Bankacılık');
                    
                    if (!tempGrouped[category]) {
                        tempGrouped[category] = {
                            questions: {
                                easy: [],
                                medium: [],
                                hard: []
                            }
                        };
                    }
                    
                    const difficulty = normalizeDifficulty(question.difficulty);
                    
                    // Soruya kaynak ID'sini ekle
                    const questionWithSourceId = {
                        ...question,
                        sourceId: question.id, // Kaynak ID'sini sakla
                        sourceType: question.source || 'manual', // Kaynak tipini sakla (manual/konular)
                        sourceTopicId: question.topicId || question.konuId // Kaynak konu ID'sini sakla
                    };
                    
                    tempGrouped[category].questions[difficulty].push(questionWithSourceId);
                });

                // Debug: kaydedilecek dağılımı logla
                try {
                    const dbg = {};
                    Object.entries(tempGrouped).forEach(([cat, data]) => {
                        const q = data.questions;
                        dbg[cat] = {
                            easy: q.easy.length,
                            medium: q.medium.length,
                            hard: q.hard.length
                        };
                    });
                    console.log('Step4 - Firestore kaydı dağılımı:', dbg);
                } catch {}
                
                // Manuel olarak sıralı obje oluştur - her kategorinin sırasını garanti et
                const orderedQuestions = {};
                
                // 1. Genel Kültür (ilk)
                if (tempGrouped['Genel Kültür']) {
                    orderedQuestions['Genel Kültür'] = tempGrouped['Genel Kültür'];
                }
                
                // 2. Genel Yetenek (ikinci)
                if (tempGrouped['Genel Yetenek']) {
                    orderedQuestions['Genel Yetenek'] = tempGrouped['Genel Yetenek'];
                }
                
                // 3. Genel Bankacılık (üçüncü)
                if (tempGrouped['Genel Bankacılık']) {
                    orderedQuestions['Genel Bankacılık'] = tempGrouped['Genel Bankacılık'];
                }
                
                return orderedQuestions;
            };

            // Firestore'a kaydetmek için sınav verilerini hazırla (eski sistemle birebir aynı)
            const examToSave = {
                name: examName,
                duration: duration,
                targetAudience: targetAudience,
                selectedExpertise: selectedExpertise || [],
                questions: formatQuestionsForFirestore(selectedQuestions),
                totalQuestions: totalQuestions || 0,
                
                // Yayın zamanlama bilgileri (yeni sistem için immediate)
                publishType: 'immediate', // 'immediate' veya 'scheduled'
                startDateTime: null,
                endDateTime: null,
                publishUnit: 'permanent', // 'permanent', 'days', 'hours'
                publishDuration: null,
                
                // Sistem bilgileri
                status: 'aktif',
                createdAt: serverTimestamp(),
                createdBy: 'admin', // İleride kullanıcı sisteminden alınacak
                participants: 0,
                results: []
            };

            // Firestore'a kaydet
            const docRef = await addDoc(collection(db, 'examlar'), examToSave);
            
            // Genel istatistikleri güncelle (deneme sınavı sayısını artır)
            try {
                await statsService.incrementDenemeSinaviCount(1);
            } catch (statsError) {
                console.error("Genel istatistikler güncellenirken hata:", statsError);
            }
            
            console.log('Sınav başarıyla kaydedildi, ID:', docRef.id);
            toast.success(`Sınav başarıyla oluşturuldu ve yayınlandı! ID: ${docRef.id}`);
            
            // Ana sayfaya dön
            navigate('/deneme-sinavlari');
            
        } catch (error) {
            console.error('Sınav kaydedilirken hata oluştu:', error);
            toast.error('Sınav kaydedilemedi. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/create-exam/step3', { 
            state: { selectedQuestions, totalQuestions } 
        });
    };

    if (!selectedQuestions || selectedQuestions.length === 0) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Sınav Bulunamadı</h1>
                        <p className="text-gray-600 mb-6">Seçilen sorular bulunamadı. Lütfen tekrar deneyiniz.</p>
                        <button
                            onClick={() => navigate('/create-exam/new')}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            Yeni Sınav Oluştur
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={handleBack}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                        aria-label="Geri"
                    >
                        <FaArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Sınav Bilgileri</h1>
                        <p className="text-gray-500">Sınavınızı tamamlamak için son bilgileri giriniz</p>
                    </div>
                </div>

                {/* Ana İçerik */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sol Sütun - Form (2/3 genişlik) */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">Sınav Detayları</h2>
                            
                            {/* Sınav Adı */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sınav Adı *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaFileAlt className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={examName}
                                        onChange={(e) => setExamName(e.target.value)}
                                        placeholder="Örn: 2025 KPSS Genel Kültür Deneme Sınavı"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Sınavınızı tanımlayacak açıklayıcı bir isim giriniz
                                </p>
                            </div>

                            {/* Süre */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sınav Süresi (Dakika) *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaClock className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        min="30"
                                        max="300"
                                        value={duration}
                                        onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Önerilen süre: {totalQuestions} soru için {Math.ceil(totalQuestions * 1.5)} dakika
                                </p>
                            </div>

                            {/* Süre Önerileri */}
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Hızlı Seçim</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[60, 90, 120, 150, 180].map((time) => (
                                        <button
                                            key={time}
                                            onClick={() => setDuration(time)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                duration === time
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {time} dk
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Hedef Kitle */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Bu Sınav Kimlere Yönelik? *
                                </label>
                                <div className="space-y-3">
                                    {/* Herkes Seçeneği */}
                                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="targetAudience"
                                            value="herkes"
                                            checked={targetAudience === 'herkes'}
                                            onChange={(e) => handleTargetAudienceChange(e.target.value)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900">Herkes</div>
                                            <div className="text-xs text-gray-500">Tüm kullanıcılar bu sınava katılabilir</div>
                                        </div>
                                    </label>

                                    {/* Tüm Ünvanlar Seçeneği */}
                                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="targetAudience"
                                            value="tumUnvanlar"
                                            checked={targetAudience === 'tumUnvanlar'}
                                            onChange={(e) => handleTargetAudienceChange(e.target.value)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900">Tüm Ünvanlar</div>
                                            <div className="text-xs text-gray-500">Sadece ünvanı olan kullanıcılar katılabilir</div>
                                        </div>
                                    </label>

                                    {/* Seçili Ünvanlar Seçeneği */}
                                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="targetAudience"
                                            value="seciliUnvanlar"
                                            checked={targetAudience === 'seciliUnvanlar'}
                                            onChange={(e) => handleTargetAudienceChange(e.target.value)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900">Belirli Ünvanlar</div>
                                            <div className="text-xs text-gray-500">Sadece seçili ünvanlardaki kullanıcılar katılabilir</div>
                                        </div>
                                    </label>
                                </div>

                                {/* Ünvan Seçimi */}
                                {targetAudience === 'seciliUnvanlar' && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <h4 className="text-sm font-medium text-blue-900 mb-3">Ünvan Seçimi</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {expertiseOptions.map((expertise) => (
                                                <label
                                                    key={expertise}
                                                    className="flex items-center p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedExpertise.includes(expertise)}
                                                        onChange={() => handleExpertiseToggle(expertise)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-900">{expertise}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Oluştur Butonu */}
                            <button
                                onClick={handleCreateExam}
                                disabled={loading || !examName.trim()}
                                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                                    loading || !examName.trim()
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Oluşturuluyor...
                                    </>
                                ) : (
                                    <>
                                        <FaPlay className="w-4 h-4" />
                                        Sınavı Oluştur
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Sağ Sütun - Özet (1/3 genişlik) */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Sınav Özeti */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <h3 className="text-sm font-medium text-gray-900 mb-3">Sınav Özeti</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Toplam Soru:</span>
                                    <span className="font-medium">{totalQuestions}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Süre:</span>
                                    <span className="font-medium">{duration} dakika</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Soru/Dakika:</span>
                                    <span className="font-medium">{(totalQuestions / duration).toFixed(1)}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-200">
                                    <div className="text-gray-600 mb-1">Hedef Kitle:</div>
                                    <div className="text-xs text-gray-800">
                                        {targetAudience === 'herkes' ? 'Herkes' :
                                         targetAudience === 'tumUnvanlar' ? 'Tüm Ünvanlar' :
                                         selectedExpertise.length > 0 ? 
                                             selectedExpertise.join(', ') : 
                                             'Ünvan seçimi yapılmadı'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Kategori Dağılımı */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <h3 className="text-sm font-medium text-gray-900 mb-3">Kategori Dağılımı</h3>
                            <div className="space-y-2 text-sm">
                                {['Genel Kültür', 'Genel Yetenek', 'Genel Bankacılık'].map(category => {
                                    const count = getCategoryQuestions(category);
                                    return (
                                        <div key={category} className="flex justify-between">
                                            <span className="text-gray-600">{category}:</span>
                                            <span className="font-medium">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Zorluk Dağılımı */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <h3 className="text-sm font-medium text-gray-900 mb-3">Zorluk Dağılımı</h3>
                            <div className="space-y-2 text-sm">
                                {[
                                    { key: 'easy', label: 'Kolay' },
                                    { key: 'medium', label: 'Orta' },
                                    { key: 'hard', label: 'Zor' }
                                ].map(({ key, label }) => {
                                    const count = selectedQuestions.filter(q => {
                                        const difficulty = q.difficulty ? q.difficulty.toLowerCase() : '';
                                        return difficulty === key;
                                    }).length;
                                    return (
                                        <div key={key} className="flex justify-between">
                                            <span className="text-gray-600">{label}:</span>
                                            <span className="font-medium">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default CreateExamStep4Page;

