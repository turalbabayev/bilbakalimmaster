import React, { useState, useEffect } from 'react';
import { FaQuestionCircle, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { db } from '../../firebase';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const StepThree = ({ 
    selectionMethod, 
    selectedTopics, 
    selectedDifficulties, 
    onToggleDifficultySelection,
    automaticDifficultyDistribution,
    onSetAutomaticDifficultyDistribution,
    manualDifficultyCount,
    onSetManualDifficultyCount,
    konular
}) => {
    const navigate = useNavigate();
    const [difficultyStats, setDifficultyStats] = useState({});
    const [loadingDifficulty, setLoadingDifficulty] = useState(false);
    const [questionsWithoutDifficulty, setQuestionsWithoutDifficulty] = useState(0);

    // Otomatik kategori tanımları
    const automaticCategories = {
        'Genel Bankacılık': {
            count: 60,
            topicIds: ['-OKAdBq7LH6PXcW457aN', '-OKAk2EbpC1xqSwbJbYM', '2', '3', '4']
        },
        'Genel Kültür': {
            count: 15,
            topicIds: ['6']
        },
        'Genel Yetenek': {
            count: 25,
            topicIds: ['-OKw6fKcYGunlY_PbCo3', '-OMBcE1I9DRj8uvlYSmH', '-OMhpwKF1PZ0-QnjyJm8', 'OMlVD6ufbDvCgZhfz8N']
        }
    };

    // Otomatik toplam soru sayısını hesapla
    const getTotalAutomaticQuestions = () => {
        if (automaticDifficultyDistribution) {
            // Otomatik zorluk dağılımı - eski kategori sayılarını kullan
            return Object.values(automaticCategories).reduce((total, category) => total + category.count, 0);
        } else {
            // Manuel zorluk dağılımı - manuel zorluk sayılarını kullan
            return Object.entries(manualDifficultyCount)
                .filter(([key]) => selectedDifficulties.includes(key))
                .reduce((total, [, count]) => total + count, 0);
        }
    };

    const getTotalSelectedQuestions = () => {
        if (selectionMethod === 'manual') {
            // Manuel seçim - kullanıcının belirlediği sayıları topla
            return Object.entries(manualDifficultyCount)
                .filter(([key]) => selectedDifficulties.includes(key))
                .reduce((total, [, count]) => total + count, 0);
        } else if (selectionMethod === 'automatic') {
            if (automaticDifficultyDistribution) {
                // Otomatik seçim + Otomatik zorluk dağılımı - sabit toplam 100
                return getTotalAutomaticQuestions();
            } else {
                // Otomatik seçim + Manuel zorluk dağılımı - kullanıcının belirlediği sayıları topla
                return Object.entries(manualDifficultyCount)
                    .filter(([key]) => selectedDifficulties.includes(key))
                    .reduce((total, [, count]) => total + count, 0);
            }
        }
        
        return 0;
    };

    const getDifficultyDisplayText = () => {
        if (selectedDifficulties.length === 3) {
            return 'Tüm zorluklar';
        } else if (selectedDifficulties.length === 0) {
            return 'Zorluk seçilmedi';
        } else {
            const labels = { easy: 'Kolay', medium: 'Orta', hard: 'Zor' };
            return selectedDifficulties.map(d => labels[d]).join(', ');
        }
    };

    // Tüm zorlukları seç/seçme
    const toggleAllDifficulties = () => {
        if (selectedDifficulties.length === 3) {
            onToggleDifficultySelection('easy');
            onToggleDifficultySelection('hard');
        } else {
            ['easy', 'medium', 'hard'].forEach(diff => {
                if (!selectedDifficulties.includes(diff)) {
                    onToggleDifficultySelection(diff);
                }
            });
        }
    };

    // Zorluk seviyesi istatistiklerini yükle
    useEffect(() => {
        setLoadingDifficulty(true);
        
        const loadDifficultyStats = async () => {
            try {
                if (selectionMethod === 'automatic') {
                    if (automaticDifficultyDistribution) {
                        // Otomatik seçim - sabit kategori sayılarını göster
                        const stats = {
                            easy: 0,
                            medium: 0,
                            hard: 0
                        };

                        // Kategori sayılarını zorluk seviyelerine eşit dağıt (örnek dağılım)
                        const totalQuestions = getTotalAutomaticQuestions();
                        stats.easy = Math.floor(totalQuestions * 0.3); // %30 kolay
                        stats.medium = Math.floor(totalQuestions * 0.5); // %50 orta  
                        stats.hard = totalQuestions - stats.easy - stats.medium; // Kalan zor

                        setDifficultyStats(stats);
                        setLoadingDifficulty(false);
                    } else {
                        // Otomatik seçim + Manuel zorluk dağılımı - gerçek kategori soru sayılarını göster
                        const stats = {
                            easy: 0,
                            medium: 0,
                            hard: 0
                        };

                        const categoriesTopicIds = [
                            ...automaticCategories['Genel Bankacılık'].topicIds || ['-OKAdBq7LH6PXcW457aN', '-OKAk2EbpC1xqSwbJbYM', '2', '3', '4'],
                            ...automaticCategories['Genel Kültür'].topicIds || ['6'], 
                            ...automaticCategories['Genel Yetenek'].topicIds || ['-OKw6fKcYGunlY_PbCo3', '-OMBcE1I9DRj8uvlYSmH', '-OMhpwKF1PZ0-QnjyJm8', 'OMlVD6ufbDvCgZhfz8N']
                        ];

                        let questionsWithoutDifficultyCount = 0;

                        // Otomatik kategorilerdeki gerçek soru sayılarını al
                        const sorularRef = collectionGroup(db, "sorular");
                        const sorularSnap = await getDocs(sorularRef);
                        
                        sorularSnap.forEach(doc => {
                            const konuId = doc.ref.parent.parent.parent.parent.id;
                            if (categoriesTopicIds.includes(konuId)) {
                                const data = doc.data();
                                const difficulty = data.difficulty;
                                
                                if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
                                    stats[difficulty] = (stats[difficulty] || 0) + 1;
                                } else {
                                    questionsWithoutDifficultyCount++;
                                }
                            }
                        });

                        setDifficultyStats(stats);
                        setQuestionsWithoutDifficulty(questionsWithoutDifficultyCount);
                        setLoadingDifficulty(false);
                    }
                } else {
                    // Manuel seçim - gerçek soru sayılarını göster
                    const stats = {
                        easy: 0,
                        medium: 0,
                        hard: 0
                    };

                    let questionsWithoutDifficultyCount = 0;

                    // Manuel seçim - sadece seçili konulardan istatistik çek
                    for (const topicId of selectedTopics) {
                        const sorularRef = collectionGroup(db, "sorular");
                        const sorularSnap = await getDocs(sorularRef);
                        
                        sorularSnap.forEach(doc => {
                            const konuId = doc.ref.parent.parent.parent.parent.id;
                            if (konuId === topicId) {
                                const data = doc.data();
                                const difficulty = data.difficulty;
                                
                                if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
                                    stats[difficulty] = (stats[difficulty] || 0) + 1;
                                } else {
                                    questionsWithoutDifficultyCount++;
                                }
                            }
                        });
                    }

                    setDifficultyStats(stats);
                    setQuestionsWithoutDifficulty(questionsWithoutDifficultyCount);
                    setLoadingDifficulty(false);
                }
            } catch (error) {
                console.error("Zorluk istatistikleri yüklenirken hata:", error);
                toast.error("Zorluk istatistikleri yüklenirken bir hata oluştu");
                setLoadingDifficulty(false);
            }
        };

        loadDifficultyStats();
    }, [selectedTopics, selectionMethod, automaticDifficultyDistribution]);

    if (loadingDifficulty) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Zorluk seviyeleri yükleniyor...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Zorluk Seviyelerini Seçin:</h3>
                <button
                    onClick={toggleAllDifficulties}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    {selectedDifficulties.length === 3 ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                </button>
            </div>

            {/* Otomatik seçim için açıklama */}
            {selectionMethod === 'automatic' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                        <FaQuestionCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-blue-800 mb-3">
                                Zorluk Seviyesi Dağılımı Seçimi
                            </h4>
                            
                            {/* Otomatik/Manuel Zorluk Dağılımı Toggle */}
                            <div className="space-y-3">
                                <div 
                                    onClick={() => onSetAutomaticDifficultyDistribution(true)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        automaticDifficultyDistribution 
                                            ? 'border-blue-400 bg-blue-100' 
                                            : 'border-blue-200 bg-white hover:bg-blue-50'
                                    }`}
                                >
                                    <div className="flex items-center">
                                        <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                                            automaticDifficultyDistribution 
                                                ? 'border-blue-500 bg-blue-500' 
                                                : 'border-blue-300'
                                        }`}>
                                            {automaticDifficultyDistribution && (
                                                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-blue-800">
                                                🤖 Otomatik Zorluk Dağılımı (Önerilen)
                                            </div>
                                            <div className="text-xs text-blue-700 mt-1">
                                                Sistem dengeli bir zorluk dağılımı yapacak (%30 Kolay, %50 Orta, %20 Zor)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div 
                                    onClick={() => onSetAutomaticDifficultyDistribution(false)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        !automaticDifficultyDistribution 
                                            ? 'border-blue-400 bg-blue-100' 
                                            : 'border-blue-200 bg-white hover:bg-blue-50'
                                    }`}
                                >
                                    <div className="flex items-center">
                                        <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                                            !automaticDifficultyDistribution 
                                                ? 'border-blue-500 bg-blue-500' 
                                                : 'border-blue-300'
                                        }`}>
                                            {!automaticDifficultyDistribution && (
                                                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-blue-800">
                                                🎯 Manuel Zorluk Seçimi
                                            </div>
                                            <div className="text-xs text-blue-700 mt-1">
                                                Hangi zorluk seviyelerini dahil edeceğinizi kendiniz belirleyin
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {automaticDifficultyDistribution && (
                                <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                                    <div className="text-xs text-blue-700">
                                        <strong>Otomatik Dağılım:</strong> Toplam 100 soru 
                                        (Genel Bankacılık: 60, Genel Kültür: 15, Genel Yetenek: 25) 
                                        dengeli zorluk dağılımıyla seçilecek.
                                    </div>
                                    <div className="flex items-center justify-center mt-2 space-x-4 text-xs">
                                        <span className="text-green-600">🟢 Kolay: 30 soru</span>
                                        <span className="text-yellow-600">🟡 Orta: 50 soru</span>
                                        <span className="text-red-600">🔴 Zor: 20 soru</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Zorluk Seviyesi Eksik Uyarısı - Sadece manuel seçim veya manuel zorluk dağılımında göster */}
            {questionsWithoutDifficulty > 0 && (selectionMethod !== 'automatic' || !automaticDifficultyDistribution) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                        <FaExclamationTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
                        <div>
                            <h4 className="text-sm font-medium text-yellow-800 mb-1">
                                Dikkat: Zorluk Seviyesi Eksik Sorular
                            </h4>
                            <p className="text-sm text-yellow-700">
                                {questionsWithoutDifficulty} sorunun zorluk seviyesi belirlenmemiş. 
                                Bu sorular sınava dahil edilmeyecek.
                            </p>
                            <button
                                onClick={() => {
                                    navigate('/question');
                                }}
                                className="text-sm text-yellow-800 underline hover:text-yellow-900 mt-2"
                            >
                                Sorular sayfasından zorluk seviyelerini belirle
                            </button>
                        </div>
                    </div>
                </div>
            )}
                    
            {/* Zorluk Seviyesi Seçimi - Sadece manuel seçim veya otomatik+manuel zorluk dağılımında göster */}
            {(selectionMethod !== 'automatic' || !automaticDifficultyDistribution) && (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {[
                        { key: 'easy', label: 'Kolay Sorular', icon: '🟢', desc: 'Temel ve kolay seviyedeki soruları dahil et', color: 'green' },
                        { key: 'medium', label: 'Orta Sorular', icon: '🟡', desc: 'Orta seviyedeki soruları dahil et', color: 'yellow' },
                        { key: 'hard', label: 'Zor Sorular', icon: '🔴', desc: 'Zor ve karmaşık soruları dahil et', color: 'red' }
                    ].map((difficulty) => {
                        const isSelected = selectedDifficulties.includes(difficulty.key);
                        const count = difficultyStats[difficulty.key] || 0;
                        
                        return (
                            <div
                                key={difficulty.key}
                                onClick={() => onToggleDifficultySelection(difficulty.key)}
                                className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                    isSelected 
                                        ? `border-${difficulty.color}-500 bg-${difficulty.color}-50 shadow-md` 
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                            isSelected 
                                                ? `border-${difficulty.color}-500 bg-${difficulty.color}-500` 
                                                : 'border-gray-300'
                                        }`}>
                                            {isSelected && (
                                                <FaCheck className="w-4 h-4 text-white" />
                                            )}
                                        </div>
                                        <span className="text-2xl">{difficulty.icon}</span>
                                        <div className="flex-1">
                                            <h4 className={`font-semibold text-lg ${isSelected ? `text-${difficulty.color}-900` : 'text-gray-900'}`}>
                                                {difficulty.label}
                                            </h4>
                                            <p className={`text-sm ${isSelected ? `text-${difficulty.color}-700` : 'text-gray-600'} mt-1`}>
                                                {difficulty.desc}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center">
                                            <FaQuestionCircle className={`h-5 w-5 mr-2 ${isSelected ? `text-${difficulty.color}-600` : 'text-gray-500'}`} />
                                            <span className={`text-base font-semibold ${isSelected ? `text-${difficulty.color}-700` : 'text-gray-600'}`}>
                                                {count} soru
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Manuel Seçim için Soru Sayısı Belirleme */}
            {(selectionMethod === 'manual' || (selectionMethod === 'automatic' && !automaticDifficultyDistribution)) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Her Zorluk Seviyesinden Kaç Soru Seçilsin?</h4>
                    
                    <div className="space-y-4">
                        {[
                            { key: 'easy', label: 'Kolay Sorular', icon: '🟢', color: 'green' },
                            { key: 'medium', label: 'Orta Sorular', icon: '🟡', color: 'yellow' },
                            { key: 'hard', label: 'Zor Sorular', icon: '🔴', color: 'red' }
                        ].filter(diff => selectedDifficulties.includes(diff.key)).map((difficulty) => {
                            const availableCount = difficultyStats[difficulty.key] || 0;
                            const selectedCount = manualDifficultyCount[difficulty.key];
                            
                            return (
                                <div key={difficulty.key} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{difficulty.icon}</span>
                                        <div>
                                            <h5 className="font-medium text-gray-900">{difficulty.label}</h5>
                                            <p className="text-sm text-gray-600">Mevcut: {availableCount} soru</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onSetManualDifficultyCount(prev => ({
                                                    ...prev,
                                                    [difficulty.key]: Math.max(0, prev[difficulty.key] - 1)
                                                }))}
                                                className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                                                disabled={selectedCount <= 0}
                                            >
                                                -
                                            </button>
                                            
                                            <input
                                                type="number"
                                                min="0"
                                                max={availableCount}
                                                value={selectedCount}
                                                onChange={(e) => {
                                                    const value = Math.min(Math.max(0, parseInt(e.target.value) || 0), availableCount);
                                                    
                                                    // Hem otomatik hem manuel seçimde toplam 100 soru sınırı kontrolü
                                                    const currentTotal = getTotalSelectedQuestions();
                                                    const currentValue = manualDifficultyCount[difficulty.key];
                                                    const newTotal = currentTotal - currentValue + value;
                                                    
                                                    if (newTotal > 100) {
                                                        const maxAllowed = 100 - (currentTotal - currentValue);
                                                        const finalValue = Math.max(0, maxAllowed);
                                                        onSetManualDifficultyCount(prev => ({
                                                            ...prev,
                                                            [difficulty.key]: finalValue
                                                        }));
                                                        toast.error("Toplam soru sayısı 100'ü geçemez!");
                                                        return;
                                                    }
                                                    
                                                    onSetManualDifficultyCount(prev => ({
                                                        ...prev,
                                                        [difficulty.key]: value
                                                    }));
                                                }}
                                                className="w-16 px-2 py-1 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            
                                            <button
                                                onClick={() => {
                                                    const newValue = Math.min(availableCount, selectedCount + 1);
                                                    
                                                    // Hem otomatik hem manuel seçimde toplam 100 soru sınırı kontrolü
                                                    const currentTotal = getTotalSelectedQuestions();
                                                    const currentValue = manualDifficultyCount[difficulty.key];
                                                    const newTotal = currentTotal - currentValue + newValue;
                                                    
                                                    if (newTotal > 100) {
                                                        toast.error("Toplam soru sayısı 100'ü geçemez!");
                                                        return;
                                                    }
                                                    
                                                    onSetManualDifficultyCount(prev => ({
                                                        ...prev,
                                                        [difficulty.key]: newValue
                                                    }));
                                                }}
                                                className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                                                disabled={selectedCount >= availableCount || getTotalSelectedQuestions() >= 100}
                                            >
                                                +
                                            </button>
                                        </div>
                                        
                                        {/* Hızlı Seçim Butonları */}
                                        <div className="flex gap-1">
                                            {[5, 10, 20].filter(num => num <= availableCount).map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => {
                                                        // Hem otomatik hem manuel seçimde toplam 100 soru sınırı kontrolü
                                                        const currentTotal = getTotalSelectedQuestions();
                                                        const currentValue = manualDifficultyCount[difficulty.key];
                                                        const newTotal = currentTotal - currentValue + num;
                                                        
                                                        if (newTotal > 100) {
                                                            const maxAllowed = 100 - (currentTotal - currentValue);
                                                            const finalValue = Math.max(0, maxAllowed);
                                                            onSetManualDifficultyCount(prev => ({
                                                                ...prev,
                                                                [difficulty.key]: finalValue
                                                            }));
                                                            toast.error("Toplam soru sayısı 100'ü geçemez!");
                                                            return;
                                                        }
                                                        
                                                        onSetManualDifficultyCount(prev => ({
                                                            ...prev,
                                                            [difficulty.key]: num
                                                        }));
                                                    }}
                                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                            {availableCount > 0 && (
                                                <button
                                                    onClick={() => {
                                                        let finalValue = availableCount;
                                                        
                                                        // Hem otomatik hem manuel seçimde toplam 100 soru sınırı kontrolü
                                                        const currentTotal = getTotalSelectedQuestions();
                                                        const currentValue = manualDifficultyCount[difficulty.key];
                                                        const newTotal = currentTotal - currentValue + availableCount;
                                                        
                                                        if (newTotal > 100) {
                                                            const maxAllowed = 100 - (currentTotal - currentValue);
                                                            finalValue = Math.max(0, maxAllowed);
                                                            if (finalValue < availableCount) {
                                                                toast.error("Toplam soru sayısı 100'ü geçemez!");
                                                            }
                                                        }
                                                        
                                                        onSetManualDifficultyCount(prev => ({
                                                            ...prev,
                                                            [difficulty.key]: finalValue
                                                        }));
                                                    }}
                                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                >
                                                    Tümü
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Toplam Soru Özeti */}
                    <div className={`mt-4 p-4 rounded-lg border ${
                        getTotalSelectedQuestions() > 100 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-blue-50 border-blue-200'
                    }`}>
                        <h5 className={`font-medium mb-2 ${
                            getTotalSelectedQuestions() > 100 
                                ? 'text-red-900' 
                                : 'text-blue-900'
                        }`}>Seçim Özeti:</h5>
                        
                        {/* 100 soru sınırı uyarısı - hem manuel hem otomatik */}
                        {getTotalSelectedQuestions() > 100 && (
                            <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded-lg">
                                <div className="flex items-center">
                                    <FaExclamationTriangle className="h-4 w-4 text-red-500 mr-2" />
                                    <span className="text-sm text-red-700 font-medium">
                                        Toplam soru sayısı 100'ü geçemez! Lütfen sayıları azaltın.
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            {[
                                { key: 'easy', label: 'Kolay', icon: '🟢' },
                                { key: 'medium', label: 'Orta', icon: '🟡' },
                                { key: 'hard', label: 'Zor', icon: '🔴' }
                            ].filter(diff => selectedDifficulties.includes(diff.key)).map(difficulty => (
                                <div key={difficulty.key} className="bg-white p-3 rounded-lg border border-blue-200">
                                    <div className={`text-lg font-bold ${
                                        getTotalSelectedQuestions() > 100 
                                            ? 'text-red-900' 
                                            : 'text-blue-900'
                                    }`}>
                                        {difficulty.icon} {manualDifficultyCount[difficulty.key]}
                                    </div>
                                    <div className={`text-xs ${
                                        getTotalSelectedQuestions() > 100 
                                            ? 'text-red-700' 
                                            : 'text-blue-700'
                                    }`}>{difficulty.label} Soru</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 text-center">
                            <div className={`text-xl font-bold ${
                                getTotalSelectedQuestions() > 100 
                                    ? 'text-red-900' 
                                    : 'text-blue-900'
                            }`}>
                                Toplam: {getTotalSelectedQuestions()} Soru
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Seçim Özeti */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
                <h4 className="font-medium text-green-900 mb-2">Seçim Özeti:</h4>
                <div className="space-y-1">
                    <p className="text-sm text-green-700">
                        <strong>Konular:</strong> {selectionMethod === 'automatic' ? 'Tüm konular' : `${selectedTopics.length} konu seçildi`}
                    </p>
                    <p className="text-sm text-green-700">
                        <strong>Zorluk Seviyeleri:</strong> {selectionMethod === 'automatic' && automaticDifficultyDistribution ? 'Otomatik dağılım (%30 Kolay, %50 Orta, %20 Zor)' : getDifficultyDisplayText()}
                    </p>
                    <p className="text-sm text-green-700">
                        <strong>Toplam Soru:</strong> {selectionMethod === 'automatic' ? getTotalAutomaticQuestions() : getTotalSelectedQuestions()} soru
                    </p>
                    {selectedDifficulties.length > 1 && (selectionMethod !== 'automatic' || !automaticDifficultyDistribution) && (
                        <div className="mt-2 text-xs text-green-600">
                            <strong>Detay:</strong> 
                            {selectedDifficulties.map(d => {
                                const labels = { easy: 'Kolay', medium: 'Orta', hard: 'Zor' };
                                if (selectionMethod === 'manual') {
                                    return ` ${labels[d]}: ${manualDifficultyCount[d]}`;
                                } else {
                                    return ` ${labels[d]}: ${difficultyStats[d] || 0}`;
                                }
                            }).join(' |')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StepThree; 