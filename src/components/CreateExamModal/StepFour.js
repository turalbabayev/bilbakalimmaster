import React, { useState, useEffect } from 'react';
import { FaBookOpen, FaGlobe, FaBrain, FaCheck, FaRandom, FaChartPie, FaQuestionCircle } from 'react-icons/fa';
import { db } from '../../firebase';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const StepFour = ({ 
    selectedDifficulties, 
    automaticDifficultyDistribution,
    manualDifficultyCount,
    automaticTopicSelections,
    onComplete,
    onViewQuestions
}) => {
    const [automaticSelectionStats, setAutomaticSelectionStats] = useState({});
    const [loadingAutoSelection, setLoadingAutoSelection] = useState(false);
    const [availabilityWarnings, setAvailabilityWarnings] = useState([]);

    // Otomatik kategori tanımları
    const automaticCategories = {
        'Genel Bankacılık': {
            count: 60,
            topicIds: ['-OKAdBq7LH6PXcW457aN', '-OKAk2EbpC1xqSwbJbYM', '2', '3', '4'],
            icon: FaBookOpen,
            color: 'blue',
            description: 'Temel bankacılık bilgileri, finansal kavramlar ve bankacılık işlemleri'
        },
        'Genel Kültür': {
            count: 15,
            topicIds: ['6'],
            icon: FaGlobe,
            color: 'green',
            description: 'Tarih, coğrafya, sanat, edebiyat ve güncel olaylar'
        },
        'Genel Yetenek': {
            count: 25,
            topicIds: ['-OKw6fKcYGunlY_PbCo3', '-OMBcE1I9DRj8uvlYSmH', '-OMhpwKF1PZ0-QnjyJm8', 'OMlVD6ufbDvCgZhfz8N'],
            icon: FaBrain,
            color: 'purple',
            description: 'Mantık, analitik düşünme, sayısal yetenek ve problem çözme'
        }
    };

    // Konu ID'lerini isimlerle eşleştir
    const topicMapping = {
        // Genel Bankacılık
        '-OKAdBq7LH6PXcW457aN': 'Bankacılık',
        '-OKAk2EbpC1xqSwbJbYM': 'Muhasebe', 
        '2': 'Ekonomi',
        '3': 'Hukuk',
        '4': 'Krediler',
        
        // Genel Kültür
        '6': 'Genel Kültür',
        
        // Genel Yetenek
        '-OKw6fKcYGunlY_PbCo3': 'Matematik',
        '-OMBcE1I9DRj8uvlYSmH': 'Türkçe',
        '-OMhpwKF1PZ0-QnjyJm8': 'Tarih',
        'OMlVD6ufbDvCgZhfz8N': 'Coğrafya'
    };

    // Konu isimlerini al
    const getTopicNames = (topicIds) => {
        return topicIds.map(id => topicMapping[id] || id).join(', ');
    };

    // Toplam soru sayısını hesapla
    const getTotalQuestions = () => {
        if (automaticDifficultyDistribution) {
            // Kullanıcının kategori/konu bazlı adetleri toplamı
            const byCategory = Object.entries(automaticTopicSelections || {}).reduce((sum, [, topics]) => sum + Object.values(topics || {}).reduce((s, v) => s + (parseInt(v)||0), 0), 0);
            // Geriye uyumluluk: Eğer kullanıcı hiçbir değer girmediyse eski sabit toplamı kullan
            return byCategory > 0 
                ? byCategory 
                : Object.values(automaticCategories).reduce((total, category) => total + category.count, 0);
        } else {
            // Manuel zorluk dağılımı - manuel zorluk sayılarını kullan
            return Object.entries(manualDifficultyCount)
                .filter(([difficulty]) => selectedDifficulties.includes(difficulty))
                .reduce((total, [, count]) => total + count, 0);
        }
    };

    // Zorluk dağılımını hesapla
    const getDifficultyDistribution = () => {
        if (automaticDifficultyDistribution) {
            const total = getTotalQuestions();
            return {
                easy: Math.floor(total * 0.3), // %30 kolay
                medium: Math.floor(total * 0.5), // %50 orta
                hard: total - Math.floor(total * 0.3) - Math.floor(total * 0.5) // Kalan zor
            };
        } else {
            // Manuel zorluk dağılımı
            return {
                easy: manualDifficultyCount.easy || 0,
                medium: manualDifficultyCount.medium || 0,
                hard: manualDifficultyCount.hard || 0
            };
        }
    };

    const difficultyDist = getDifficultyDistribution();
    const totalSelectedQuestions = Object.values(difficultyDist).reduce((sum, count) => sum + count, 0);

    // Gerçek soru sayılarını kontrol et
    const checkQuestionAvailability = async () => {
        setLoadingAutoSelection(true);
        const warnings = [];

        try {
            // Tüm soruları çek
                const sorularRef = collectionGroup(db, "sorular");
                const sorularSnap = await getDocs(sorularRef);
                
                // Kategorilere göre gerçek soru sayılarını hesapla
                const realQuestionsByCategory = {};
                
                sorularSnap.forEach(doc => {
                    const konuId = doc.ref.parent.parent.parent.parent.id;
                    const data = doc.data();
                    
                    // Sadece difficulty field'ı olan soruları say
                    if (!data.difficulty || !['easy', 'medium', 'hard'].includes(data.difficulty)) {
                        return;
                    }
                    
                    // Hangi kategoriye ait olduğunu bul
                    for (const [categoryName, categoryData] of Object.entries(automaticCategories)) {
                        if (categoryData.topicIds.includes(konuId)) {
                            if (!realQuestionsByCategory[categoryName]) {
                                realQuestionsByCategory[categoryName] = {
                                    easy: 0,
                                    medium: 0,
                                    hard: 0
                                };
                            }
                            realQuestionsByCategory[categoryName][data.difficulty]++;
                            break;
                        }
                    }
                });

                // Her kategori için planlanan vs gerçek karşılaştırması
                const globalDistribution = calculateCategoryDifficultyDistribution();
                
                Object.entries(automaticCategories).forEach(([categoryName, categoryData]) => {
                    // Planlanan sayıları global dağılımdan al
                    const plannedEasy = globalDistribution.easy.categories[categoryName] || 0;
                    const plannedMedium = globalDistribution.medium.categories[categoryName] || 0;
                    const plannedHard = globalDistribution.hard.categories[categoryName] || 0;

                    // Gerçek soru sayıları
                    const realQuestions = realQuestionsByCategory[categoryName] || { easy: 0, medium: 0, hard: 0 };
                    
                    // Yetersiz soru kontrolü
                    const difficulties = [
                        { level: 'easy', planned: plannedEasy, available: realQuestions.easy, text: 'Kolay' },
                        { level: 'medium', planned: plannedMedium, available: realQuestions.medium, text: 'Orta' },
                        { level: 'hard', planned: plannedHard, available: realQuestions.hard, text: 'Zor' }
                    ];

                    difficulties.forEach(({ level, planned, available, text }) => {
                        if (planned > 0 && available < planned) {
                            warnings.push({
                                category: categoryName,
                                difficulty: level,
                                difficultyText: text,
                                planned: planned,
                                available: available,
                                shortage: planned - available
                            });
                        }
                    });
                });

            setAvailabilityWarnings(warnings);
            
        } catch (error) {
            console.error("Soru sayıları kontrol edilirken hata:", error);
            toast.error("Soru sayıları kontrol edilirken bir hata oluştu");
        } finally {
            setLoadingAutoSelection(false);
        }
    };

    // Otomatik seçim istatistiklerini yükle
    useEffect(() => {
        setLoadingAutoSelection(true);
        
        const loadAutomaticSelectionStats = async () => {
            try {
                const stats = {};
                
                for (const [categoryName, categoryData] of Object.entries(automaticCategories)) {
                    let totalQuestions = 0;
                    let availableByDifficulty = { easy: 0, medium: 0, hard: 0 };
                    
                    // Her kategori için sorular say
                        const sorularRef = collectionGroup(db, "sorular");
                        const sorularSnap = await getDocs(sorularRef);
                        
                        sorularSnap.forEach(doc => {
                            const konuId = doc.ref.parent.parent.parent.parent.id;
                        if (categoryData.topicIds.includes(konuId)) {
                                const data = doc.data();
                                const difficulty = data.difficulty;
                                
                            // Tüm geçerli zorluk seviyelerindeki soruları say (seçimden bağımsız)
                                if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
                                totalQuestions++;
                                availableByDifficulty[difficulty]++;
                                }
                            }
                        });
                    
                    stats[categoryName] = {
                        ...categoryData,
                        availableQuestions: totalQuestions,
                        availableByDifficulty: availableByDifficulty
                    };
                }
                
                setAutomaticSelectionStats(stats);
                setLoadingAutoSelection(false);
            } catch (error) {
                console.error("Otomatik seçim istatistikleri yüklenirken hata:", error);
                toast.error("Otomatik seçim istatistikleri yüklenirken bir hata oluştu");
                setLoadingAutoSelection(false);
            }
        };

        loadAutomaticSelectionStats();
    }, [selectedDifficulties]);

    // Component mount olduğunda soru sayılarını kontrol et
    useEffect(() => {
        checkQuestionAvailability();
    }, [automaticDifficultyDistribution, manualDifficultyCount]);

    // Kategori zorluk dağılımı hesapla - yuvarlama hatası olmadan
    const calculateCategoryDifficultyDistribution = () => {
        const totalQuestions = totalSelectedQuestions;
        const categories = Object.keys(automaticCategories);
        
        // Her kategori için temel hesaplamalar
        const categoryDetails = categories.map(categoryName => {
            const category = automaticCategories[categoryName];
            
            // Kategori sayısını dinamik hesapla
            let categoryCount;
            if (automaticDifficultyDistribution) {
                categoryCount = category.count;
            } else {
                const originalTotal = Object.values(automaticCategories).reduce((sum, cat) => sum + cat.count, 0);
                const categoryRatio = category.count / originalTotal;
                categoryCount = Math.round(getTotalQuestions() * categoryRatio);
            }
            
            return {
                name: categoryName,
                category: category,
                count: categoryCount,
                ratios: {
                    easy: difficultyDist.easy / totalQuestions,
                    medium: difficultyDist.medium / totalQuestions,
                    hard: difficultyDist.hard / totalQuestions
                }
            };
        });
        
        // Zorluk seviyelerine göre dağıtım hesapla
        const distribution = {
            easy: { total: 0, categories: {} },
            medium: { total: 0, categories: {} },
            hard: { total: 0, categories: {} }
        };
        
        // İlk dağılım - floor ile
        ['easy', 'medium', 'hard'].forEach(difficulty => {
            categoryDetails.forEach(({ name, count, ratios }) => {
                const baseAmount = Math.floor(count * ratios[difficulty]);
                distribution[difficulty].categories[name] = baseAmount;
                distribution[difficulty].total += baseAmount;
            });
        });
        
        // Eksik kalan soruları dağıt
        ['easy', 'medium', 'hard'].forEach(difficulty => {
            const targetTotal = difficultyDist[difficulty];
            const currentTotal = distribution[difficulty].total;
            const remaining = targetTotal - currentTotal;
            
            if (remaining > 0) {
                // Kalan soruları en büyük kategorilerden başlayarak dağıt
                const sortedCategories = categoryDetails
                    .sort((a, b) => b.count - a.count)
                    .slice(0, remaining);
                
                sortedCategories.forEach(({ name }) => {
                    distribution[difficulty].categories[name]++;
                    distribution[difficulty].total++;
                });
            }
        });
        
        return distribution;
    };

    if (loadingAutoSelection) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Otomatik soru dağılımı yükleniyor...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Başlık ve Açıklama */}
            <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Otomatik Soru Dağılımı</h3>
                <p className="text-gray-600">
                    Sınavınız için aşağıdaki kategorilerden otomatik olarak sorular seçilecek
                </p>
            </div>

            {/* Zorluk Seviyesi Özeti */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                    <FaChartPie className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="font-medium text-blue-900">Zorluk Seviyesi Dağılımı</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-green-600">🟢 {difficultyDist.easy}</div>
                        <div className="text-sm text-gray-600">Kolay Soru</div>
                        <div className="text-xs text-gray-500">
                            {automaticDifficultyDistribution ? '%30' : 'Manuel'}
                        </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-yellow-600">🟡 {difficultyDist.medium}</div>
                        <div className="text-sm text-gray-600">Orta Soru</div>
                        <div className="text-xs text-gray-500">
                            {automaticDifficultyDistribution ? '%50' : 'Manuel'}
                        </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-red-600">🔴 {difficultyDist.hard}</div>
                        <div className="text-sm text-gray-600">Zor Soru</div>
                        <div className="text-xs text-gray-500">
                            {automaticDifficultyDistribution ? '%20' : 'Manuel'}
                        </div>
                    </div>
                </div>
                <div className="mt-3 text-center">
                    <div className="text-lg font-bold text-blue-900">
                        Toplam: {totalSelectedQuestions} Soru
                    </div>
                </div>
            </div>

            {/* Kategori Dağılımı */}
            <div className="space-y-4">
                <div className="flex items-center mb-4">
                    <FaRandom className="h-5 w-5 text-gray-600 mr-2" />
                    <h4 className="font-medium text-gray-900">Kategori Dağılımı</h4>
                </div>

                {Object.entries(automaticCategories).map(([categoryName, category]) => {
                    const IconComponent = category.icon;
                    
                    // Kategori sayısını dinamik hesapla
                    let categoryCount, percentage;
                    
                    if (automaticDifficultyDistribution) {
                        // Kullanıcı seçimleri varsa kategori toplamını o kategorideki konuların toplamından al
                        const selectedSum = Object.values((automaticTopicSelections || {})[categoryName] || {}).reduce((s, v) => s + (parseInt(v)||0), 0);
                        if (selectedSum > 0) {
                            categoryCount = selectedSum;
                            percentage = ((selectedSum / getTotalQuestions()) * 100).toFixed(0);
                        } else {
                            // Geriye uyumluluk: eski sabit sayılar
                            categoryCount = category.count;
                            percentage = ((category.count / getTotalQuestions()) * 100).toFixed(0);
                        }
                    } else {
                        // Manuel zorluk dağılımı - orantılı hesaplama yap
                        const totalQuestions = getTotalQuestions();
                        const originalTotal = Object.values(automaticCategories).reduce((sum, cat) => sum + cat.count, 0);
                        const categoryRatio = category.count / originalTotal;
                        categoryCount = Math.round(totalQuestions * categoryRatio);
                        percentage = ((categoryCount / totalQuestions) * 100).toFixed(0);
                    }
                    
                    return (
                        <div 
                            key={categoryName}
                            className={`p-6 rounded-lg border-2 border-${category.color}-200 bg-${category.color}-50`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`p-3 rounded-full bg-${category.color}-100`}>
                                        <IconComponent className={`h-6 w-6 text-${category.color}-600`} />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className={`text-lg font-semibold text-${category.color}-900`}>
                                            {categoryName}
                                        </h5>
                                        <p className={`text-sm text-${category.color}-700 mt-1`}>
                                            {category.description}
                                        </p>
                                        <div className="flex items-center mt-2 space-x-4 text-xs">
                                            <span className={`text-${category.color}-600`}>
                                                📚 Konular: {getTopicNames(category.topicIds)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-bold text-${category.color}-700`}>
                                        {categoryCount}
                                    </div>
                                    <div className={`text-sm text-${category.color}-600`}>
                                        soru ({percentage}%)
                                        {!automaticDifficultyDistribution && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                (Manuel: {getTotalQuestions()} toplam)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Her kategorideki zorluk dağılımı */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="text-sm text-gray-600 mb-2">Bu kategoriden seçilecek zorluk dağılımı:</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {(() => {
                                        // Yeni global dağılım algoritmasını kullan
                                        const globalDistribution = calculateCategoryDifficultyDistribution();
                                        
                                        const categoryEasy = globalDistribution.easy.categories[categoryName] || 0;
                                        const categoryMedium = globalDistribution.medium.categories[categoryName] || 0;
                                        const categoryHard = globalDistribution.hard.categories[categoryName] || 0;
                                        
                                        return (
                                            <>
                                                <div className="text-center p-2 bg-white rounded border">
                                                    <div className="text-sm font-medium text-green-600">
                                                        🟢 {categoryEasy}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Kolay</div>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                    <div className="text-sm font-medium text-yellow-600">
                                                        🟡 {categoryMedium}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Orta</div>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                    <div className="text-sm font-medium text-red-600">
                                                        🔴 {categoryHard}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Zor</div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                {automaticDifficultyDistribution && Object.keys((automaticTopicSelections || {})[categoryName] || {}).length > 0 && (
                                    <div className="mt-3 text-xs text-gray-600">
                                        <div className="font-medium mb-1">Seçilen Konular ve Adetleri:</div>
                                        <ul className="list-disc list-inside space-y-0.5">
                                            {Object.entries((automaticTopicSelections || {})[categoryName] || {}).map(([topicId, val]) => (
                                                <li key={topicId}>{topicId} — {val} soru</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Manuel Konular Özeti */}
            {automaticDifficultyDistribution && Object.keys((automaticTopicSelections || {})['Manuel Konular'] || {}).length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">Manuel Konular (Otomatik Seçim)</h4>
                    <div className="text-sm text-green-700">
                        <ul className="list-disc list-inside space-y-0.5">
                            {Object.entries((automaticTopicSelections || {})['Manuel Konular']).map(([topicId, val]) => (
                                <li key={topicId}>{topicId} — {val} soru</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Uyarılar */}
            {availabilityWarnings.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center mb-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                        <h4 className="text-sm font-medium text-red-800">Yetersiz Soru Uyarısı</h4>
                    </div>
                    <div className="text-sm text-red-700">
                        <p className="mb-2">Aşağıdaki kategorilerde yeterli soru bulunamadı:</p>
                        <ul className="list-disc list-inside space-y-1">
                            {availabilityWarnings.map((warning, index) => (
                                <li key={index}>
                                    <strong>{warning.category}</strong> - {warning.difficultyText}: 
                                    {warning.available} mevcut, {warning.planned} gerekli 
                                    ({warning.shortage} eksik)
                                </li>
                            ))}
                        </ul>
                        <p className="mt-2 text-xs text-red-600">
                            Bu kategorilerdeki eksik sorular diğer zorluk seviyelerinden seçilecek veya sınav sorularınız az olabilir.
                        </p>
                    </div>
                </div>
            )}

            {/* Özet Bilgi */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center mb-3">
                    <FaCheck className="h-5 w-5 text-green-600 mr-2" />
                    <h4 className="font-medium text-green-900">Sınav Özeti</h4>
                </div>
                <div className="space-y-2 text-sm text-green-700">
                    {availabilityWarnings.length > 0 ? (
                        <>
                            <p><strong>Gerçek Toplam Soru:</strong> {totalSelectedQuestions - availabilityWarnings.reduce((total, w) => total + w.shortage, 0)} adet</p>
                            <p className="text-yellow-700"><strong>Planlanan Toplam:</strong> {totalSelectedQuestions} adet (Eksik: {availabilityWarnings.reduce((total, w) => total + w.shortage, 0)} soru)</p>
                            <p className="text-red-600 text-xs mt-2">
                                <strong>Sebep:</strong> Bazı sorularda zorluk seviyesi henüz belirlenmemiş olduğu için 
                                planlanan sayıda soru seçilemiyor.
                            </p>
                        </>
                    ) : (
                        <p><strong>Toplam Soru:</strong> {totalSelectedQuestions} adet</p>
                    )}
                    <p><strong>Seçim Yöntemi:</strong> Otomatik kategori seçimi</p>
                    <p><strong>Zorluk Dağılımı:</strong> {automaticDifficultyDistribution ? 'Otomatik (%30-50-20)' : 'Manuel belirlendi'}</p>
                    <p><strong>Kategoriler:</strong> 3 ana kategori (Genel Bankacılık, Genel Kültür, Genel Yetenek)</p>
                </div>
                <div className="mt-4 p-3 bg-white rounded border border-green-200">
                    <div className="text-xs text-green-600">
                        <strong>Not:</strong> Sorular belirtilen konu ID'lerinden rastgele seçilecek ve 
                        zorluk seviyelerine göre dağıtılacaktır. 
                        {availabilityWarnings.length > 0 && (
                            <span className="text-yellow-700">
                                {" "}Zorluk seviyesi belirtilmemiş sorular otomatik seçime dahil edilmemektedir.
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex justify-center gap-4 pt-6 border-t border-gray-200">
                <button
                    onClick={onViewQuestions}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <FaQuestionCircle className="h-4 w-4" />
                    Soruları Gör
                </button>
                <button
                    onClick={onViewQuestions}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                    <FaCheck className="h-4 w-4" />
                    Devam Et
                </button>
            </div>
        </div>
    );
};

export default StepFour; 