import React, { useState, useEffect } from 'react';
import { FaBookOpen, FaGlobe, FaBrain, FaCheck, FaArrowLeft, FaEye, FaSpinner, FaCheckSquare, FaSquare } from 'react-icons/fa';
import { db } from '../../firebase';
import { collectionGroup, getDocs, collection, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const StepFive = ({ 
    selectionMethod,
    selectedTopics,
    selectedDifficulties, 
    automaticDifficultyDistribution,
    manualDifficultyCount,
    automaticTopicSelections,
    onComplete,
    onBack
}) => {
    const [questions, setQuestions] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());
    const [manualQuestions, setManualQuestions] = useState([]);

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
            description: 'Mantık, analitik düşünce, sayısal yetenek ve problem çözme'
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

    // Soru objesini Firestore için temizle
    const cleanQuestionData = (question) => {
        const cleanQuestion = {
            id: question.id,
            konuId: question.konuId,
            topicName: question.topicName,
            soruMetni: question.soruMetni,
            difficulty: question.difficulty,
            dogruCevap: question.dogruCevap
        };

        // Seçenekleri temizle
        if (question.cevaplar && Array.isArray(question.cevaplar)) {
            cleanQuestion.cevaplar = question.cevaplar;
        } else if (question.a !== undefined) {
            cleanQuestion.a = question.a;
            cleanQuestion.b = question.b;
            cleanQuestion.c = question.c;
            cleanQuestion.d = question.d;
            if (question.e) cleanQuestion.e = question.e;
        } else if (question.siklar) {
            cleanQuestion.siklar = question.siklar;
        } else if (question.secenekler) {
            cleanQuestion.secenekler = question.secenekler;
        }

        if (question.aciklama) {
            cleanQuestion.aciklama = question.aciklama;
        }

        return cleanQuestion;
    };

    // Manuel seçimde toplam soru limitini hesapla
    const getTotalManualLimit = () => {
        if (selectionMethod === 'manual') {
            return Object.entries(manualDifficultyCount)
                .filter(([difficulty]) => selectedDifficulties.includes(difficulty))
                .reduce((total, [, count]) => total + count, 0);
        }
        return 100;
    };

    // Soru seçimi/seçim kaldırma - zorluk seviyesi limitleri ile
    const toggleQuestionSelection = (questionId, questionDifficulty) => {
        setSelectedQuestionIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) {
                newSet.delete(questionId);
            } else {
                // Manuel seçimde dinamik limit kontrolü
                const totalLimit = getTotalManualLimit();
                if (newSet.size >= totalLimit) {
                    toast.error(`Maksimum ${totalLimit} soru seçebilirsiniz!`);
                    return prev;
                }
                
                // Manuel seçimde zorluk seviyesi bazında limit kontrolü
                if (selectionMethod === 'manual') {
                    // Şu anda seçili soruların zorluk seviyesi dağılımını hesapla
                    const currentDifficultyCount = {
                        easy: 0,
                        medium: 0,
                        hard: 0
                    };
                    
                    // Seçili soruların zorluk seviyelerini say
                    Object.values(questions).forEach(categoryData => {
                        Object.entries(categoryData.questions).forEach(([difficulty, difficultyQuestions]) => {
                            difficultyQuestions.forEach(question => {
                                if (newSet.has(question.id)) {
                                    if (difficulty === 'easy') currentDifficultyCount.easy++;
                                    else if (difficulty === 'medium') currentDifficultyCount.medium++;
                                    else if (difficulty === 'hard') currentDifficultyCount.hard++;
                                }
                            });
                        });
                    });
                    
                    // Yeni eklenmek istenen sorunun zorluk seviyesi limitini kontrol et
                    const normalizedDifficulty = questionDifficulty === 'unspecified' ? 'easy' : questionDifficulty;
                    const currentCount = currentDifficultyCount[normalizedDifficulty] || 0;
                    const limit = manualDifficultyCount[normalizedDifficulty] || 0;
                    
                    if (currentCount >= limit) {
                        const difficultyNames = { easy: 'Kolay', medium: 'Orta', hard: 'Zor' };
                        toast.error(`${difficultyNames[normalizedDifficulty]} seviyesinden maksimum ${limit} soru seçebilirsiniz! (Şu anda: ${currentCount})`);
                        return prev;
                    }
                }
                
                newSet.add(questionId);
            }
            return newSet;
        });
    };

    // Kategori için tüm soruları seç/seçim kaldır - zorluk limitleri ile
    const toggleCategorySelection = (categoryQuestions) => {
        const allQuestionIds = Object.values(categoryQuestions)
            .flat()
            .map(q => q.id);
        
        const allSelected = allQuestionIds.every(id => selectedQuestionIds.has(id));
        
        setSelectedQuestionIds(prev => {
            const newSet = new Set(prev);
            
            if (allSelected) {
                // Tümünü kaldır
                allQuestionIds.forEach(id => newSet.delete(id));
            } else {
                // Manuel seçimde zorluk limitlerine göre seç
                if (selectionMethod === 'manual') {
                    // Şu anki zorluk dağılımını hesapla
                    const currentDifficultyCount = {
                        easy: 0,
                        medium: 0,
                        hard: 0
                    };
                    
                    Object.values(questions).forEach(categoryData => {
                        Object.entries(categoryData.questions).forEach(([difficulty, difficultyQuestions]) => {
                            difficultyQuestions.forEach(question => {
                                if (newSet.has(question.id)) {
                                    if (difficulty === 'easy') currentDifficultyCount.easy++;
                                    else if (difficulty === 'medium') currentDifficultyCount.medium++;
                                    else if (difficulty === 'hard') currentDifficultyCount.hard++;
                                }
                            });
                        });
                    });
                    
                    const totalLimit = getTotalManualLimit();
                    
                    // Her zorluk seviyesinden limitlere kadar seç
                    Object.entries(categoryQuestions).forEach(([difficulty, difficultyQuestions]) => {
                        const normalizedDifficulty = difficulty === 'unspecified' ? 'easy' : difficulty;
                        const limit = manualDifficultyCount[normalizedDifficulty] || 0;
                        const currentCount = currentDifficultyCount[normalizedDifficulty] || 0;
                        const availableSlots = Math.max(0, limit - currentCount); // Negatif değer önleme
                        
                        console.log(`Kategori seçimi - ${difficulty} seviyesi:`, {
                            limit,
                            currentCount,
                            availableSlots,
                            questionCount: difficultyQuestions.length
                        });
                        
                        if (availableSlots > 0 && difficultyQuestions.length > 0) {
                            let addedCount = 0;
                            difficultyQuestions.forEach(question => {
                                if (addedCount < availableSlots && newSet.size < totalLimit && !newSet.has(question.id)) {
                                    newSet.add(question.id);
                                    addedCount++;
                                    if (normalizedDifficulty === 'easy') currentDifficultyCount.easy++;
                                    else if (normalizedDifficulty === 'medium') currentDifficultyCount.medium++;
                                    else if (normalizedDifficulty === 'hard') currentDifficultyCount.hard++;
                                }
                            });
                            
                            console.log(`${difficulty} seviyesinden ${addedCount} soru eklendi`);
                        }
                    });
                    
                    toast.success("Zorluk seviyesi limitleringe göre sorular seçildi!");
                } else {
                    // Otomatik seçimde normal toplu seçim
                    allQuestionIds.forEach(id => {
                        if (newSet.size < 100 && !newSet.has(id)) {
                            newSet.add(id);
                        }
                    });
                    
                    if (newSet.size >= 100) {
                        toast.warning("100 soru sınırına ulaştınız!");
                    }
                }
            }
            
            return newSet;
        });
    };

    // Zorluk seviyesi bazında seçilen soru sayılarını hesapla
    const getSelectedDifficultyCount = () => {
        const difficultyCount = {
            easy: 0,
            medium: 0,
            hard: 0,
            unspecified: 0
        };
        
        Object.values(questions).forEach(categoryData => {
            Object.entries(categoryData.questions).forEach(([difficulty, difficultyQuestions]) => {
                difficultyQuestions.forEach(question => {
                    if (selectedQuestionIds.has(question.id)) {
                        difficultyCount[difficulty]++;
                    }
                });
            });
        });
        
        return difficultyCount;
    };

    // Soruları yükle
    useEffect(() => {
        const loadQuestions = async () => {
            setLoading(true);
            
            try {
                console.log('StepFive - Sorular yükleniyor...');
                
                const categoryQuestions = {};
                let allQuestionsByCategory = {};
                
                const sorularRef = collectionGroup(db, "sorular");
                const sorularSnap = await getDocs(sorularRef);
                
                if (sorularSnap.size === 0) {
                    toast.error("Veritabanında hiç soru bulunamadı");
                    setQuestions({});
                    setLoading(false);
                    return;
                }

                // Kategorilere göre soruları grupla
                sorularSnap.forEach(doc => {
                    try {
                        const pathParts = doc.ref.path.split('/');
                        let konuId;
                        
                        if (pathParts.includes('konular') && pathParts.includes('sorular')) {
                            const konularIndex = pathParts.indexOf('konular');
                            konuId = pathParts[konularIndex + 1];
                        } else {
                            return;
                        }
                        
                        const data = doc.data();
                        
                        if (selectionMethod === 'automatic') {
                            // Otomatik seçim için tüm kategorilere soruları topla
                            for (const [categoryName, categoryData] of Object.entries(automaticCategories)) {
                                if (categoryData.topicIds.includes(konuId)) {
                                    if (!allQuestionsByCategory[categoryName]) {
                                        allQuestionsByCategory[categoryName] = {
                                            easy: [],
                                            medium: [],
                                            hard: []
                                        };
                                    }
                                    
                                    // SADECE zorluk seviyesi belirli olan soruları dahil et
                                    if (data.difficulty && ['easy', 'medium', 'hard'].includes(data.difficulty)) {
                                        const selectedTopicsForCategory = Object.keys((automaticTopicSelections || {})[categoryName] || {});
                                        const topicAllowed = selectedTopicsForCategory.length === 0 || selectedTopicsForCategory.includes(konuId);
                                        if (topicAllowed) {
                                            allQuestionsByCategory[categoryName][data.difficulty].push({
                                                id: doc.id,
                                                konuId: konuId,
                                                topicName: topicMapping[konuId] || konuId,
                                                ...data
                                            });
                                        }
                                    }
                                    // Zorluk seviyesi belirtilmemiş soruları TAMAMEN ATLA
                                    break; // Bir kategoriye ait olduktan sonra döngüden çık
                                }
                            }
                        } else {
                            // Manuel seçim - SADECE seçilen konulardan soruları yükle
                            if (selectedTopics.includes(konuId)) {
                                const categoryName = topicMapping[konuId] || konuId;
                                
                                if (!allQuestionsByCategory[categoryName]) {
                                    allQuestionsByCategory[categoryName] = {
                                        easy: [],
                                        medium: [],
                                        hard: [],
                                        unspecified: []
                                    };
                                }
                                
                                // Sadece seçilen zorluk seviyelerindeki soruları dahil et
                                if (data.difficulty && selectedDifficulties.includes(data.difficulty)) {
                                    allQuestionsByCategory[categoryName][data.difficulty].push({
                                        id: doc.id,
                                        konuId: konuId,
                                        topicName: topicMapping[konuId] || konuId,
                                        ...data
                                    });
                                } else if (!data.difficulty && selectedDifficulties.includes('unspecified')) {
                                    // Zorluk seviyesi belirtilmemiş sorular için
                                    allQuestionsByCategory[categoryName]['unspecified'].push({
                                        id: doc.id,
                                        konuId: konuId,
                                        topicName: topicMapping[konuId] || konuId,
                                        ...data
                                    });
                                }
                            }
                        }
                    } catch (docError) {
                        console.error('Soru işlenirken hata:', docError);
                    }
                });

                console.log('Kategorilere ayrılmış sorular:', allQuestionsByCategory);

                // Manuel sorular için ek işlem - sadece manuel seçimde
                if (selectionMethod === 'manual') {
                    // Manuel konuları işle
                    for (const topicId of selectedTopics) {
                        if (topicId.startsWith('manual-')) {
                            const topicName = topicId.replace('manual-', '');
                            const relevantQuestions = manualQuestions.filter(q => q.topicName === topicName && q.isActive !== false);
                            
                            if (relevantQuestions.length > 0) {
                                if (!allQuestionsByCategory[topicName]) {
                                    allQuestionsByCategory[topicName] = {
                                        easy: [],
                                        medium: [],
                                        hard: [],
                                        unspecified: []
                                    };
                                }
                                
                                relevantQuestions.forEach(question => {
                                    // Sadece seçilen zorluk seviyelerindeki soruları dahil et
                                    if (question.difficulty && selectedDifficulties.includes(question.difficulty)) {
                                        allQuestionsByCategory[topicName][question.difficulty].push({
                                            id: question.id,
                                            konuId: `manual-${topicName}`,
                                            topicName: topicName,
                                            soruMetni: question.soruMetni,
                                            difficulty: question.difficulty,
                                            dogruCevap: question.dogruCevap,
                                            cevaplar: question.cevaplar, // Array formatında
                                            aciklama: question.aciklama
                                        });
                                    } else if (!question.difficulty && selectedDifficulties.includes('unspecified')) {
                                        // Zorluk seviyesi belirtilmemiş manuel sorular
                                        allQuestionsByCategory[topicName]['unspecified'].push({
                                            id: question.id,
                                            konuId: `manual-${topicName}`,
                                            topicName: topicName,
                                            soruMetni: question.soruMetni,
                                            difficulty: 'unspecified',
                                            dogruCevap: question.dogruCevap,
                                            cevaplar: question.cevaplar, // Array formatında
                                            aciklama: question.aciklama
                                        });
                                    }
                                });
                                
                                console.log(`Manuel konu ${topicName} işlendi:`, {
                                    topicName,
                                    totalQuestions: relevantQuestions.length,
                                    processed: Object.values(allQuestionsByCategory[topicName]).flat().length
                                });
                            }
                        }
                    }
                }

                console.log('Manuel sorular dahil edilmiş kategoriler:', allQuestionsByCategory);

                if (selectionMethod === 'automatic') {
                    // Otomatik seçim - Yeni global algoritma kullan
                    const globalDistribution = calculateCategoryDifficultyDistribution();
                    
                    console.log('StepFive - Global dağılım:', globalDistribution);

                    await Promise.all(globalDistribution.map(async (categoryInfo) => {
                        const categoryName = categoryInfo.name;
                        const categoryQuestionsList = allQuestionsByCategory[categoryName];
                        
                        if (!categoryQuestionsList || Object.values(categoryQuestionsList).flat().length === 0) {
                            console.warn(`${categoryName} kategorisinde soru bulunamadı`);
                            return;
                        }

                        // Kategori sorularını zorluk seviyesine göre grupla
                        const questionsByDifficulty = {
                            easy: categoryQuestionsList.easy || [],
                            medium: categoryQuestionsList.medium || [],
                            hard: categoryQuestionsList.hard || [],
                            unspecified: categoryQuestionsList.unspecified || []
                        };

                        let requiredEasy, requiredMedium, requiredHard;

                        if (automaticDifficultyDistribution) {
                            // Otomatik zorluk dağılımı
                            const selectedSum = Object.values((automaticTopicSelections || {})[categoryName] || {}).reduce((s, v) => s + (parseInt(v)||0), 0);
                            const categoryTotal = selectedSum > 0 ? selectedSum : categoryInfo.count;
                            const difficultyDist = getDifficultyDistribution();
                            
                            const totalDifficultyQuestions = difficultyDist.easy + difficultyDist.medium + difficultyDist.hard;
                            const categoryRatio = totalDifficultyQuestions > 0 ? categoryTotal / totalDifficultyQuestions : 1;
                            
                            requiredEasy = Math.round(difficultyDist.easy * categoryRatio);
                            requiredMedium = Math.round(difficultyDist.medium * categoryRatio);
                            requiredHard = Math.round(difficultyDist.hard * categoryRatio);
                        } else {
                            // Manuel zorluk dağılımı - global algoritma sonuçlarını kullan
                            requiredEasy = categoryInfo.easyCount || 0;
                            requiredMedium = categoryInfo.mediumCount || 0;
                            requiredHard = categoryInfo.hardCount || 0;
                        }

                        console.log(`${categoryName} hedef sayılar:`, { easy: requiredEasy, medium: requiredMedium, hard: requiredHard });

                        // Soruları seç
                        const selectedQuestions = [];
                        
                        const selectedEasy = selectQuestionsWithFallback(questionsByDifficulty, 'easy', requiredEasy, categoryName);
                        selectedQuestions.push(...selectedEasy);
                        
                        const selectedMedium = selectQuestionsWithFallback(questionsByDifficulty, 'medium', requiredMedium, categoryName);
                        selectedQuestions.push(...selectedMedium);
                        
                        const selectedHard = selectQuestionsWithFallback(questionsByDifficulty, 'hard', requiredHard, categoryName);
                        selectedQuestions.push(...selectedHard);

                        // Konu kotaları uygulanacaksa uygula (basit filtre)
                        const topicQuotas = (automaticTopicSelections || {})[categoryName] || {};
                        if (Object.keys(topicQuotas).length > 0) {
                            const quotaByTopic = { ...topicQuotas };
                            const filtered = [];
                            for (const q of selectedQuestions) {
                                const tId = q.konuId;
                                const remaining = parseInt(quotaByTopic[tId] || 0);
                                if (remaining > 0) {
                                    filtered.push(q);
                                    quotaByTopic[tId] = remaining - 1;
                                }
                            }
                            if (filtered.length > 0) {
                                selectedQuestions.length = 0;
                                selectedQuestions.push(...filtered);
                            }
                        }

                        // Soruları gerçek zorluk seviyelerine göre grupla ve temizle
                        const finalQuestions = {
                            easy: selectedQuestions.filter(q => q.difficulty === 'easy').map(q => cleanQuestionData(q)),
                            medium: selectedQuestions.filter(q => q.difficulty === 'medium').map(q => cleanQuestionData(q)),
                            hard: selectedQuestions.filter(q => q.difficulty === 'hard').map(q => cleanQuestionData(q))
                        };

                        console.log(`${categoryName} final sorular:`, {
                            easy: finalQuestions.easy.length,
                            medium: finalQuestions.medium.length,
                            hard: finalQuestions.hard.length,
                            toplam: Object.values(finalQuestions).flat().length
                        });

                        // Kategori için final veri yapısı
                        categoryQuestions[categoryName] = {
                            questions: finalQuestions,
                            metadata: {
                                categoryTotal: automaticDifficultyDistribution ? categoryInfo.count : categoryInfo.dynamicCount,
                                requested: { easy: requiredEasy, medium: requiredMedium, hard: requiredHard },
                                actual: {
                                    easy: finalQuestions.easy.length,
                                    medium: finalQuestions.medium.length,
                                    hard: finalQuestions.hard.length
                                }
                            }
                        };
                    }));
                } else {
                    // Manuel seçim - Tüm soruları göster, kullanıcı seçsin
                    Object.entries(allQuestionsByCategory).forEach(([categoryName, categoryQuestionsList]) => {
                        categoryQuestions[categoryName] = {
                            questions: categoryQuestionsList,
                            metadata: {
                                total: Object.values(categoryQuestionsList).flat().length
                            }
                        };
                    });
                }

                console.log('Final categoryQuestions:', categoryQuestions);
                setQuestions(categoryQuestions);
            } catch (error) {
                console.error("Sorular yüklenirken hata:", error);
                toast.error(`Sorular yüklenirken hata oluştu: ${error.message}`);
                setQuestions({});
            } finally {
                setLoading(false);
            }
        };

        loadQuestions();
    }, [selectedTopics, selectedDifficulties, selectionMethod, manualQuestions]);

    // Manuel soruları yükle
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'manual-questions'), (snapshot) => {
            const questions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setManualQuestions(questions);
        });

        return () => unsubscribe();
    }, []);

    // Zorluk seviyesi renkleri
    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'text-green-600 bg-green-100';
            case 'medium': return 'text-yellow-600 bg-yellow-100';
            case 'hard': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getDifficultyText = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'Kolay';
            case 'medium': return 'Orta';
            case 'hard': return 'Zor';
            case 'unspecified': return 'Belirtilmemiş';
            default: return difficulty;
        }
    };

    // Global dağılım algoritması - StepFour ile aynı
    const calculateCategoryDifficultyDistribution = () => {
        // Toplam soru sayısını hesapla
        const totalQuestions = automaticDifficultyDistribution 
            ? Object.values(automaticCategories).reduce((sum, cat) => sum + cat.count, 0)
            : Object.values(manualDifficultyCount || {}).reduce((sum, count) => sum + (count || 0), 0);

        console.log('StepFive - Toplam soru sayısı:', totalQuestions);

        // Kategori sayılarını hesapla - object'ten array'e çevir
        const categoryData = Object.entries(automaticCategories).map(([categoryName, category]) => {
            const categoryCount = automaticDifficultyDistribution 
                ? category.count 
                : Math.round((category.count / Object.values(automaticCategories).reduce((sum, cat) => sum + cat.count, 0)) * totalQuestions);
            
            return {
                name: categoryName,
                ...category,
                dynamicCount: categoryCount
            };
        });

        // Zorluk dağılımını hesapla (manuel seçimde)
        if (!automaticDifficultyDistribution) {
            const easyCount = manualDifficultyCount?.easy || 0;
            const mediumCount = manualDifficultyCount?.medium || 0;
            const hardCount = manualDifficultyCount?.hard || 0;

            // Her kategori için başlangıç dağılımı
            let easyDistribution = categoryData.map(cat => Math.floor((cat.dynamicCount / totalQuestions) * easyCount));
            let mediumDistribution = categoryData.map(cat => Math.floor((cat.dynamicCount / totalQuestions) * mediumCount));
            let hardDistribution = categoryData.map(cat => Math.floor((cat.dynamicCount / totalQuestions) * hardCount));

            // Kalan soruları dağıt
            const remainingEasy = easyCount - easyDistribution.reduce((sum, count) => sum + count, 0);
            const remainingMedium = mediumCount - mediumDistribution.reduce((sum, count) => sum + count, 0);
            const remainingHard = hardCount - hardDistribution.reduce((sum, count) => sum + count, 0);

            // En büyük kategorilere kalan soruları ver
            const sortedIndices = categoryData
                .map((cat, index) => ({ index, count: cat.dynamicCount }))
                .sort((a, b) => b.count - a.count)
                .map(item => item.index);

            for (let i = 0; i < remainingEasy; i++) {
                easyDistribution[sortedIndices[i % sortedIndices.length]]++;
            }
            for (let i = 0; i < remainingMedium; i++) {
                mediumDistribution[sortedIndices[i % sortedIndices.length]]++;
            }
            for (let i = 0; i < remainingHard; i++) {
                hardDistribution[sortedIndices[i % sortedIndices.length]]++;
            }

            return categoryData.map((cat, index) => ({
                ...cat,
                easyCount: easyDistribution[index],
                mediumCount: mediumDistribution[index],
                hardCount: hardDistribution[index]
            }));
        }

        return categoryData;
    };

    // Zorluk dağılımını hesaplama fonksiyonu
    const getDifficultyDistribution = () => {
        if (automaticDifficultyDistribution) {
            const total = Object.values(automaticCategories).reduce((sum, cat) => sum + cat.count, 0);
            return {
                easy: Math.floor(total * 0.3),
                medium: Math.floor(total * 0.5),
                hard: total - Math.floor(total * 0.3) - Math.floor(total * 0.5)
            };
        } else {
            // Manuel zorluk sayılarını kullan
            return {
                easy: manualDifficultyCount.easy || 0,
                medium: manualDifficultyCount.medium || 0,
                hard: manualDifficultyCount.hard || 0
            };
        }
    };

    // Yetersiz sorular için fallback fonksiyonu
    const selectQuestionsWithFallback = (questionsByDifficulty, targetDifficulty, required, categoryName) => {
        if (required <= 0) return [];
        
        const available = questionsByDifficulty[targetDifficulty] || [];
        let selected = [];
        
        if (available.length >= required) {
            const shuffled = [...available].sort(() => 0.5 - Math.random());
            selected = shuffled.slice(0, required);
        } else if (available.length > 0) {
            selected = [...available];
        }
        
        console.log(`${categoryName} - ${targetDifficulty}: ${selected.length}/${required} soru seçildi`);
        return selected;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <FaSpinner className="animate-spin h-8 w-8 text-blue-500 mr-3" />
                <span className="text-gray-600">Sorular yükleniyor...</span>
            </div>
        );
    }

    if (selectionMethod === 'manual') {
        // Manuel Seçim UI
        return (
            <div className="max-w-7xl mx-auto space-y-4">
                {/* Başlık */}
                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Sınavınız İçin Sorular Seçin</h3>
                    <p className="text-gray-600">
                        Seçtiğiniz konulardan sınavınıza dahil etmek istediğiniz soruları seçin (Maksimum 100 soru)
                    </p>
                </div>

                {/* Seçim Özeti */}
                <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {selectedQuestionIds.size}
                            </div>
                            <div className="text-sm text-gray-600">Seçilen Soru</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {getTotalManualLimit() - selectedQuestionIds.size}
                            </div>
                            <div className="text-sm text-gray-600">Kalan Limit</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {Object.keys(questions).length}
                            </div>
                            <div className="text-sm text-gray-600">Konu Sayısı</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                {Object.values(questions).reduce((total, cat) => {
                                    return total + Object.values(cat.questions).flat().length;
                                }, 0)}
                            </div>
                            <div className="text-sm text-gray-600">Toplam Mevcut</div>
                        </div>
                    </div>
                </div>

                {/* Zorluk Seviyesi Limitleri - Manuel seçimde göster */}
                {selectionMethod === 'manual' && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Zorluk Seviyesi Limitleri</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(() => {
                                const selectedCount = getSelectedDifficultyCount();
                                return [
                                    { key: 'easy', name: 'Kolay', color: 'green' },
                                    { key: 'medium', name: 'Orta', color: 'yellow' },
                                    { key: 'hard', name: 'Zor', color: 'red' }
                                ].filter(({ key }) => {
                                    // Sadece seçilen zorluk seviyelerini göster
                                    return selectedDifficulties.includes(key);
                                }).map(({ key, name, color }) => {
                                    const limit = manualDifficultyCount[key] || 0;
                                    const selected = selectedCount[key] + (key === 'easy' ? (selectedCount.unspecified || 0) : 0); // unspecified'ı sadece kolay'a ekle
                                    const percentage = limit > 0 ? (selected / limit) * 100 : 0;
                                    const isOverLimit = selected > limit;
                                    
                                    return (
                                        <div key={key} className={`border rounded-lg p-3 ${isOverLimit ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`font-medium text-${color}-700`}>
                                                    {name}
                                                </span>
                                                <span className={`text-sm font-bold ${isOverLimit ? 'text-red-600' : `text-${color}-600`}`}>
                                                    {selected}/{limit}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className={`h-2 rounded-full transition-all duration-300 ${
                                                        isOverLimit ? 'bg-red-500' : `bg-${color}-500`
                                                    }`}
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                ></div>
                                            </div>
                                            {isOverLimit && (
                                                <p className="text-xs text-red-600 mt-1">Limit aşıldı!</p>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                )}

                {/* Konular ve Sorular */}
                <div className="space-y-4">
                    {Object.entries(questions).map(([categoryName, categoryData]) => {
                        const IconComponent = automaticCategories[categoryName]?.icon || FaBookOpen;
                        const categoryColor = automaticCategories[categoryName]?.color || 'blue';
                        const allQuestions = Object.values(categoryData.questions).flat();
                        
                        const selectedCount = allQuestions.filter(q => selectedQuestionIds.has(q.id)).length;
                        const allSelected = allQuestions.length > 0 && allQuestions.every(q => selectedQuestionIds.has(q.id));

                        return (
                            <div key={categoryName} className={`rounded-lg border-2 border-${categoryColor}-200 bg-${categoryColor}-50 overflow-hidden`}>
                                {/* Kategori Başlığı */}
                                <div className={`bg-${categoryColor}-100 px-6 py-3 border-b border-${categoryColor}-200`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full bg-${categoryColor}-200`}>
                                                <IconComponent className={`h-5 w-5 text-${categoryColor}-700`} />
                                            </div>
                                            <div>
                                                <h4 className={`text-lg font-semibold text-${categoryColor}-900`}>
                                                    {categoryName}
                                                </h4>
                                                <p className={`text-sm text-${categoryColor}-700`}>
                                                    {automaticDifficultyDistribution 
                                                        ? `${allQuestions.length} soru seçildi (Hedef: ${automaticCategories[categoryName]?.count || 0})` 
                                                        : `${allQuestions.length} soru seçildi (Manuel dağılım)`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Tümünü Seç/Kaldır Butonu */}
                                        <button
                                            onClick={() => toggleCategorySelection(categoryData.questions)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                allSelected 
                                                    ? `bg-${categoryColor}-200 text-${categoryColor}-800 hover:bg-${categoryColor}-300`
                                                    : `bg-white text-${categoryColor}-700 border border-${categoryColor}-300 hover:bg-${categoryColor}-50`
                                            }`}
                                        >
                                            {allSelected ? <FaCheckSquare /> : <FaSquare />}
                                            {allSelected ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                                        </button>
                                    </div>
                                </div>

                                {/* Zorluk Seviyelerine Göre Sorular */}
                                <div className="p-4">
                                    <div className="space-y-4">
                                        {Object.entries(categoryData.questions).map(([difficulty, difficultyQuestions]) => {
                                            if (difficultyQuestions.length === 0) return null;

                                            return (
                                                <div key={difficulty} className="bg-white rounded-lg border border-gray-200">
                                                    <div className="p-3 border-b border-gray-100">
                                                        <div className="flex items-center justify-between">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
                                                                {getDifficultyText(difficulty)}
                                                            </span>
                                                            <span className="text-sm text-gray-600">
                                                                {difficultyQuestions.filter(q => selectedQuestionIds.has(q.id)).length}/{difficultyQuestions.length} seçildi
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="p-3 max-h-96 overflow-y-auto">
                                                        <div className="space-y-2">
                                                            {difficultyQuestions.map((question, index) => {
                                                                const isSelected = selectedQuestionIds.has(question.id);
                                                                
                                                                return (
                                                                    <div 
                                                                        key={question.id}
                                                                        className={`p-3 rounded border transition-all cursor-pointer ${
                                                                            isSelected 
                                                                                ? 'bg-blue-50 border-blue-300 shadow-sm' 
                                                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-start gap-3">
                                                                            {/* Checkbox */}
                                                                            <button
                                                                                onClick={() => toggleQuestionSelection(question.id, difficulty)}
                                                                                className="mt-1 flex-shrink-0"
                                                                            >
                                                                                {isSelected ? (
                                                                                    <FaCheckSquare className="h-5 w-5 text-blue-600" />
                                                                                ) : (
                                                                                    <FaSquare className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                                                                )}
                                                                            </button>
                                                                            
                                                                            {/* Soru İçeriği */}
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-medium text-gray-900 mb-1">
                                                                                    {index + 1}. {question.soruMetni || 'Soru metni bulunamadı'}
                                                                                </p>
                                                                                <p className="text-xs text-gray-500">
                                                                                    📚 {question.topicName}
                                                                                </p>
                                                                            </div>
                                                                            
                                                                            {/* Görüntüle Butonu */}
                                                                            <button
                                                                                onClick={() => setSelectedQuestion(question)}
                                                                                className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                                                                            >
                                                                                <FaEye className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                    <button
                        onClick={onBack}
                        className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        <FaArrowLeft className="h-4 w-4" />
                        Geri Dön
                    </button>
                    
                    <div className="text-center">
                        <div className={`text-lg font-bold ${selectedQuestionIds.size > getTotalManualLimit() ? 'text-red-600' : 'text-blue-600'}`}>
                            {selectedQuestionIds.size}/{getTotalManualLimit()} Soru Seçildi
                        </div>
                        {selectedQuestionIds.size > getTotalManualLimit() && (
                            <p className="text-sm text-red-600">Maksimum {getTotalManualLimit()} soru seçebilirsiniz!</p>
                        )}
                    </div>
                    
                    <button
                        onClick={() => {
                            if (selectedQuestionIds.size === 0) {
                                toast.error("En az 1 soru seçmelisiniz!");
                                return;
                            }
                            
                            const totalLimit = getTotalManualLimit();
                            if (selectedQuestionIds.size > totalLimit) {
                                toast.error(`Maksimum ${totalLimit} soru seçebilirsiniz!`);
                                return;
                            }
                            
                            // Manuel seçimde zorluk seviyesi limitlerini kontrol et
                            if (selectionMethod === 'manual') {
                                const selectedCount = getSelectedDifficultyCount();
                                const limits = manualDifficultyCount;
                                
                                // unspecified soruları kolay olarak say
                                const actualCount = {
                                    easy: selectedCount.easy + selectedCount.unspecified,
                                    medium: selectedCount.medium,
                                    hard: selectedCount.hard
                                };
                                
                                // Limit aşımlarını kontrol et
                                const difficultyNames = { easy: 'Kolay', medium: 'Orta', hard: 'Zor' };
                                for (const [difficulty, count] of Object.entries(actualCount)) {
                                    const limit = limits[difficulty] || 0;
                                    if (count > limit) {
                                        toast.error(`${difficultyNames[difficulty]} seviyesinden ${count} soru seçtiniz, maksimum ${limit} olmalı!`);
                                        return;
                                    }
                                }
                            }
                            
                            // Seçilen soruları filtrele ve temizle
                            const selectedQuestionsData = {};
                            
                            Object.entries(questions).forEach(([categoryName, categoryData]) => {
                                const filteredQuestions = {
                                    easy: [],
                                    medium: [],
                                    hard: [],
                                    unspecified: []
                                };
                                
                                Object.entries(categoryData.questions).forEach(([difficulty, difficultyQuestions]) => {
                                    difficultyQuestions.forEach(question => {
                                        if (selectedQuestionIds.has(question.id)) {
                                            filteredQuestions[difficulty].push(cleanQuestionData(question));
                                        }
                                    });
                                });
                                
                                // Sadece en az 1 soru seçilen kategorileri dahil et
                                const totalSelected = Object.values(filteredQuestions).flat().length;
                                if (totalSelected > 0) {
                                    selectedQuestionsData[categoryName] = {
                                        questions: filteredQuestions,
                                        metadata: {
                                            categoryTotal: totalSelected,
                                            actual: {
                                                easy: filteredQuestions.easy.length,
                                                medium: filteredQuestions.medium.length,
                                                hard: filteredQuestions.hard.length,
                                                unspecified: filteredQuestions.unspecified.length
                                            }
                                        }
                                    };
                                }
                            });
                            
                            console.log('Manuel seçim - Seçilen sorular gönderiliyor:', selectedQuestionsData);
                            onComplete(selectedQuestionsData);
                        }}
                        disabled={selectedQuestionIds.size === 0 || selectedQuestionIds.size > getTotalManualLimit()}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <FaCheck className="h-4 w-4" />
                        Devam Et ({selectedQuestionIds.size} Soru)
                    </button>
                </div>

                {/* Soru Detay Modal */}
                {selectedQuestion && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h5 className="text-lg font-bold text-gray-900">Soru Detayı</h5>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedQuestion.difficulty)}`}>
                                            {getDifficultyText(selectedQuestion.difficulty)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            console.log('=== SORU DEBUG ===');
                                            console.log('Seçilen soru:', selectedQuestion);
                                            console.log('dogruCevap alanı:', selectedQuestion.dogruCevap);
                                            console.log('Tüm alan isimleri:', Object.keys(selectedQuestion));
                                            console.log('==================');
                                            setSelectedQuestion(null);
                                        }}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-6">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span>📚 Konu: {selectedQuestion.topicName}</span>
                                    </div>
                                    
                                    <div>
                                        <h6 className="font-medium text-gray-900 mb-3">Soru:</h6>
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-gray-700 leading-relaxed">{selectedQuestion.soruMetni}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Seçenekler - A, B, C, D gibi şıkları göster */}
                                    {(() => {
                                        // Seçenekler için farklı alan isimlerini kontrol et
                                        let options = null;
                                        
                                        if (selectedQuestion.cevaplar && Array.isArray(selectedQuestion.cevaplar)) {
                                            // Array formatındaki cevapları objeye çevir
                                            options = {};
                                            const letters = ['a', 'b', 'c', 'd', 'e'];
                                            selectedQuestion.cevaplar.forEach((cevap, index) => {
                                                if (cevap && letters[index]) {
                                                    options[letters[index]] = cevap;
                                                }
                                            });
                                        } else if (selectedQuestion.a !== undefined && selectedQuestion.b !== undefined) {
                                            options = { a: selectedQuestion.a, b: selectedQuestion.b, c: selectedQuestion.c, d: selectedQuestion.d, e: selectedQuestion.e };
                                        } else {
                                            options = selectedQuestion.siklar || selectedQuestion.secenekler || selectedQuestion.options || selectedQuestion.choices;
                                        }
                                        
                                        if (!options || Object.keys(options).length === 0) return null;
                                        
                                        return (
                                            <div>
                                                <h6 className="font-medium text-gray-900 mb-3">Seçenekler:</h6>
                                                <div className="space-y-2">
                                                    {Object.entries(options).map(([key, value]) => {
                                                        if (!value) return null; // Boş seçenekleri gösterme
                                                        
                                                        const isCorrect = selectedQuestion.dogruCevap === key || 
                                                                        selectedQuestion.dogruCevap === key.toLowerCase() || 
                                                                        selectedQuestion.dogruCevap === key.toUpperCase();
                                                        
                                                        return (
                                                            <div 
                                                                key={key} 
                                                                className={`p-3 rounded-lg border ${
                                                                    isCorrect
                                                                        ? 'bg-green-50 border-green-200 text-green-700'
                                                                        : 'bg-gray-50 border-gray-200'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">{key.toUpperCase()})</span>
                                                                    <span>{value}</span>
                                                                    {isCorrect && (
                                                                        <span className="ml-auto text-green-600 font-medium">✓ Doğru</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Doğru Cevap Vurgusu */}
                                    {selectedQuestion.dogruCevap && (
                                        <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-green-600 text-lg">✅</span>
                                                <h6 className="font-bold text-green-800">Doğru Cevap:</h6>
                                            </div>
                                            <div className="bg-green-50 p-3 rounded border border-green-200">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-green-700 text-lg">
                                                        {selectedQuestion.dogruCevap.toUpperCase()})
                                                    </span>
                                                    <span className="text-green-700 font-medium">
                                                        {(() => {
                                                            // Doğru cevap metnini bul
                                                            let correctText = "Metin bulunamadı";
                                                            
                                                            if (selectedQuestion.cevaplar && Array.isArray(selectedQuestion.cevaplar)) {
                                                                // Array formatındaki cevaplardan doğru cevabı bul
                                                                const letters = ['a', 'b', 'c', 'd', 'e'];
                                                                const correctIndex = letters.indexOf(selectedQuestion.dogruCevap.toLowerCase());
                                                                if (correctIndex !== -1 && selectedQuestion.cevaplar[correctIndex]) {
                                                                    correctText = selectedQuestion.cevaplar[correctIndex];
                                                                }
                                                            } else {
                                                                // Object formatındaki seçeneklerden bul
                                                                const options = selectedQuestion.a !== undefined && selectedQuestion.b !== undefined ? 
                                                                    { a: selectedQuestion.a, b: selectedQuestion.b, c: selectedQuestion.c, d: selectedQuestion.d, e: selectedQuestion.e } :
                                                                    selectedQuestion.siklar || selectedQuestion.secenekler || selectedQuestion.options || selectedQuestion.choices;
                                                                
                                                                if (options) {
                                                                    const correctKey = selectedQuestion.dogruCevap.toLowerCase();
                                                                    correctText = options[correctKey] || options[selectedQuestion.dogruCevap] || "Metin bulunamadı";
                                                                }
                                                            }
                                                            
                                                            return correctText;
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedQuestion.aciklama && (
                                        <div>
                                            <h6 className="font-medium text-gray-900 mb-3">Açıklama:</h6>
                                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <p className="text-blue-700">{selectedQuestion.aciklama}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    } else {
        // Otomatik Seçim UI
        return (
            <div className="max-w-7xl mx-auto space-y-4">
                {/* Başlık */}
                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Seçilen Sorular</h3>
                    <p className="text-gray-600">
                        {automaticDifficultyDistribution 
                            ? "Otomatik zorluk dağılımı ile kategorilere göre sorular seçildi"
                            : "Manuel zorluk dağılımı ile kategorilere göre sorular seçildi"
                        }
                    </p>
                </div>

                {/* Genel Özet - Kompakt */}
                <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {Object.values(questions).reduce((total, cat) => {
                                    const allQuestions = [
                                        ...cat.questions.easy,
                                        ...cat.questions.medium,
                                        ...cat.questions.hard
                                    ];
                                    return total + allQuestions.length;
                                }, 0)}
                            </div>
                            <div className="text-sm text-gray-600">Toplam Soru</div>
                        </div>
                        {Object.entries(questions).map(([categoryName, categoryData]) => {
                            const IconComponent = automaticCategories[categoryName]?.icon || FaBookOpen;
                            const categoryColor = automaticCategories[categoryName]?.color || 'blue';
                            const allQuestions = [
                                ...categoryData.questions.easy,
                                ...categoryData.questions.medium,
                                ...categoryData.questions.hard
                            ];
                            return (
                                <div key={categoryName} className="text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <IconComponent className={`h-4 w-4 text-${categoryColor}-600`} />
                                        <span className={`text-lg font-bold text-${categoryColor}-600`}>
                                            {allQuestions.length}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-600">{categoryName}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Kategoriler ve Sorular - Daha Kompakt */}
                <div className="space-y-4">
                    {Object.entries(questions).map(([categoryName, categoryData]) => {
                        const IconComponent = automaticCategories[categoryName]?.icon || FaBookOpen;
                        const categoryColor = automaticCategories[categoryName]?.color || 'blue';
                        const allQuestions = [
                            ...categoryData.questions.easy,
                            ...categoryData.questions.medium,
                            ...categoryData.questions.hard
                        ];

                        return (
                            <div key={categoryName} className={`rounded-lg border-2 border-${categoryColor}-200 bg-${categoryColor}-50 overflow-hidden`}>
                                {/* Kategori Başlığı - Daha Kompakt */}
                                <div className={`bg-${categoryColor}-100 px-6 py-3 border-b border-${categoryColor}-200`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full bg-${categoryColor}-200`}>
                                                <IconComponent className={`h-5 w-5 text-${categoryColor}-700`} />
                                            </div>
                                            <div>
                                                <h4 className={`text-lg font-semibold text-${categoryColor}-900`}>
                                                    {categoryName}
                                                </h4>
                                                <p className={`text-sm text-${categoryColor}-700`}>
                                                    {automaticDifficultyDistribution 
                                                        ? `${allQuestions.length} soru seçildi (Hedef: ${automaticCategories[categoryName]?.count || 0})` 
                                                        : `${allQuestions.length} soru seçildi (Manuel dağılım)`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        {/* Zorluk Dağılım Özeti */}
                                        <div className="flex gap-2">
                                            {categoryData.questions.easy.length > 0 && (
                                                <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium">
                                                    🟢 {categoryData.questions.easy.length}
                                                </span>
                                            )}
                                            {categoryData.questions.medium.length > 0 && (
                                                <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">
                                                    🟡 {categoryData.questions.medium.length}
                                                </span>
                                            )}
                                            {categoryData.questions.hard.length > 0 && (
                                                <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs font-medium">
                                                    🔴 {categoryData.questions.hard.length}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Zorluk Seviyelerine Göre Sorular - Grid Layout */}
                                <div className="p-4">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {['easy', 'medium', 'hard'].map(difficulty => {
                                            const difficultyQuestions = categoryData.questions[difficulty] || [];
                                            if (difficultyQuestions.length === 0) return null;

                                            return (
                                                <div key={difficulty} className="bg-white rounded-lg border border-gray-200">
                                                    <div className="p-3 border-b border-gray-100">
                                                        <div className="flex items-center justify-between">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
                                                                {getDifficultyText(difficulty)}
                                                            </span>
                                                            <span className="text-sm text-gray-600">
                                                                {difficultyQuestions.length} soru
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="p-3 max-h-64 overflow-y-auto">
                                                        <div className="space-y-2">
                                                            {difficultyQuestions.map((question, index) => (
                                                                <div 
                                                                    key={question.id}
                                                                    className="p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors cursor-pointer group"
                                                                    onClick={() => setSelectedQuestion(question)}
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                                                                                {index + 1}. {question.soruMetni || 'Soru metni bulunamadı'}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 truncate">
                                                                                📚 {question.topicName}
                                                                            </p>
                                                                        </div>
                                                                        <FaEye className="h-3 w-3 text-gray-400 ml-2 group-hover:text-gray-600 flex-shrink-0" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex justify-center gap-4 pt-6 border-t border-gray-200">
                    <button
                        onClick={onBack}
                        className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        <FaArrowLeft className="h-4 w-4" />
                        Geri Dön
                    </button>
                    <button
                        onClick={() => {
                            // Temiz soru verilerini hazırla (icon, fonksiyon vs. çıkar)
                            const cleanQuestions = {};
                            
                            Object.entries(questions).forEach(([categoryName, categoryData]) => {
                                cleanQuestions[categoryName] = {
                                    questions: categoryData.questions,
                                    metadata: categoryData.metadata
                                };
                            });
                            
                            console.log('StepFive - Temiz soru verileri gönderiliyor:', cleanQuestions);
                            onComplete(cleanQuestions);
                        }}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        <FaCheck className="h-4 w-4" />
                        Devam Et
                    </button>
                </div>

                {/* Soru Detay Modal */}
                {selectedQuestion && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h5 className="text-lg font-bold text-gray-900">Soru Detayı</h5>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedQuestion.difficulty)}`}>
                                            {getDifficultyText(selectedQuestion.difficulty)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedQuestion(null)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-6">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span>📚 Konu: {selectedQuestion.topicName}</span>
                                    </div>
                                    
                                    <div>
                                        <h6 className="font-medium text-gray-900 mb-3">Soru:</h6>
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-gray-700 leading-relaxed">{selectedQuestion.soruMetni}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Seçenekler */}
                                    {(() => {
                                        let options = null;
                                        
                                        if (selectedQuestion.cevaplar && Array.isArray(selectedQuestion.cevaplar)) {
                                            options = {};
                                            const letters = ['a', 'b', 'c', 'd', 'e'];
                                            selectedQuestion.cevaplar.forEach((cevap, index) => {
                                                if (cevap && letters[index]) {
                                                    options[letters[index]] = cevap;
                                                }
                                            });
                                        } else if (selectedQuestion.a !== undefined && selectedQuestion.b !== undefined) {
                                            options = { a: selectedQuestion.a, b: selectedQuestion.b, c: selectedQuestion.c, d: selectedQuestion.d, e: selectedQuestion.e };
                                        } else {
                                            options = selectedQuestion.siklar || selectedQuestion.secenekler || selectedQuestion.options || selectedQuestion.choices;
                                        }
                                        
                                        if (!options || Object.keys(options).length === 0) return null;
                                        
                                        return (
                                            <div>
                                                <h6 className="font-medium text-gray-900 mb-3">Seçenekler:</h6>
                                                <div className="space-y-2">
                                                    {Object.entries(options).map(([key, value]) => {
                                                        if (!value) return null;
                                                        
                                                        const isCorrect = selectedQuestion.dogruCevap === key || 
                                                                        selectedQuestion.dogruCevap === key.toLowerCase() || 
                                                                        selectedQuestion.dogruCevap === key.toUpperCase();
                                                        
                                                        return (
                                                            <div 
                                                                key={key} 
                                                                className={`p-3 rounded-lg border ${
                                                                    isCorrect
                                                                        ? 'bg-green-50 border-green-200 text-green-700'
                                                                        : 'bg-gray-50 border-gray-200'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">{key.toUpperCase()})</span>
                                                                    <span>{value}</span>
                                                                    {isCorrect && (
                                                                        <span className="ml-auto text-green-600 font-medium">✓ Doğru</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {selectedQuestion.aciklama && (
                                        <div>
                                            <h6 className="font-medium text-gray-900 mb-3">Açıklama:</h6>
                                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <p className="text-blue-700">{selectedQuestion.aciklama}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
};

export default StepFive; 