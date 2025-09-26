import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, collectionGroup, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaArrowLeft, FaExclamationTriangle, FaPlay, FaTimes } from 'react-icons/fa';
import MaxLimitModal from '../../components/MaxLimitModal';
import ExamConfirmationModal from '../../components/ExamConfirmationModal';
import AutoFillExamModal from '../../components/AutoFillExamModal';
import { toast } from 'react-hot-toast';

const CreateExamStep2Page = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [topicStats, setTopicStats] = useState([]);
    const [warnings, setWarnings] = useState([]);
    const [questionCounts, setQuestionCounts] = useState({}); // { topicId: { easy: 0, medium: 0, hard: 0 } }
    const [dismissedWarningTopics, setDismissedWarningTopics] = useState(new Set());
    const [showMaxLimitModal, setShowMaxLimitModal] = useState(false);
    const [maxLimitInfo, setMaxLimitInfo] = useState({ title: '', message: '' });
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [showAutoFillModal, setShowAutoFillModal] = useState(false);
    const [autoFillCategory, setAutoFillCategory] = useState('');
    const [isFillingAll, setIsFillingAll] = useState(false);

    // URL'den seçilen konuları al
    const selectedTopics = location.state?.selectedTopics || [];
    
    const CATEGORIES = ['Genel Bankacılık', 'Genel Kültür', 'Genel Yetenek'];
    
    // Kategori bazında soru limitleri
    const CATEGORY_LIMITS = {
        'Genel Bankacılık': 50,
        'Genel Kültür': 25,
        'Genel Yetenek': 25
    };
    
    const TOTAL_EXAM_QUESTIONS = 100;

    useEffect(() => {
        if (selectedTopics.length === 0) {
            toast.error('Seçilen konu bulunamadı');
            navigate('/create-exam/new');
            return;
        }

        loadTopicStats();
    }, [selectedTopics]);

    const loadTopicStats = async () => {
        setLoading(true);
        try {
            const stats = [];
            const warnings = [];

            for (const topic of selectedTopics) {
                let totalQuestions = 0;
                let validQuestions = 0;
                let difficultyStats = { easy: 0, medium: 0, hard: 0 };
                let noDifficultyCount = 0;

                if (topic.source === 'konular') {
                    // Konular koleksiyonundan soruları al
                    const konuId = topic.id.replace('konu:', '');
                    const sorularRef = collectionGroup(db, "sorular");
                    const sorularSnap = await getDocs(sorularRef);
                    
                    sorularSnap.forEach(doc => {
                        const konuIdFromPath = doc.ref.parent.parent.parent.parent.id;
                        if (konuIdFromPath === konuId) {
                            totalQuestions++;
                            const data = doc.data();
                            
                            // Boş soru kontrolü
                            if (data.soruMetni && data.soruMetni.trim()) {
                                validQuestions++;
                                
                                // Zorluk seviyesi kontrolü
                                if (data.difficulty && ['easy', 'medium', 'hard'].includes(data.difficulty)) {
                                    difficultyStats[data.difficulty]++;
                                } else {
                                    noDifficultyCount++;
                                }
                            }
                        }
                    });
                } else if (topic.source === 'manual') {
                    // Manuel soruları al - topicId varsa onu kullan, yoksa topicName kullan
                    const manualRef = collection(db, 'manual-questions');
                    let q;
                    if (topic.topicId) {
                        q = query(manualRef, where('topicId', '==', topic.topicId));
                    } else {
                        q = query(manualRef, where('topicName', '==', topic.name));
                    }
                    const manualSnap = await getDocs(q);
                    
                    manualSnap.forEach(doc => {
                        totalQuestions++;
                        const data = doc.data();
                        
                        // Boş soru kontrolü
                        if (data.soruMetni && data.soruMetni.trim()) {
                            validQuestions++;
                            
                            // Zorluk seviyesi kontrolü
                            if (data.difficulty && ['easy', 'medium', 'hard'].includes(data.difficulty)) {
                                difficultyStats[data.difficulty]++;
                            } else {
                                noDifficultyCount++;
                            }
                        }
                    });
                }

                // Kategori belirleme - ID ve isim bazlı sağlam eşleme
                const getCategoryForTopic = (topicId, topicName, source, manualTopicId) => {
                    const normalizedId = (topicId || '').replace('konu:', '');

                    // Genel Bankacılık ID'leri
                    const bankacilikIds = ['-OKAdBq7LH6PXcW457aN', '2', '-OKAk2EbpC1xqSwbJbYM', '4', '3'];
                    // Genel Kültür ID'leri
                    const kulturIds = ['6'];
                    // Genel Yetenek ID'leri (Matematik, Türkçe, Tarih, Coğrafya)
                    const yetenekIds = ['-OKw6fKcYGunlY_PbCo3', '-OMBcE1I9DRj8uvlYSmH', '-OMhpwKF1PZ0-QnjyJm8', 'OMlVD6ufbDvCgZhfz8N'];

                    if (bankacilikIds.includes(normalizedId)) return 'Genel Bankacılık';
                    if (kulturIds.includes(normalizedId)) return 'Genel Kültür';
                    if (yetenekIds.includes(normalizedId)) return 'Genel Yetenek';

                    // Manuel konularda topicId ayrı gelebilir
                    const normalizedManualId = (manualTopicId || '').replace('konu:', '').replace('manual-', '');
                    if (source === 'manual') {
                        if (yetenekIds.includes(normalizedManualId)) return 'Genel Yetenek';
                        if (kulturIds.includes(normalizedManualId)) return 'Genel Kültür';
                        if (bankacilikIds.includes(normalizedManualId)) return 'Genel Bankacılık';
                    }

                    // Fallback: isimden çıkarım
                    const topic = (topicName || '').toLowerCase();
                    if (topic.includes('genel kültür')) return 'Genel Kültür';
                    if (topic.includes('matematik') || topic.includes('türkçe') || topic.includes('tarih') || topic.includes('coğrafya')) {
                        return 'Genel Yetenek';
                    }

                    return 'Genel Bankacılık';
                };

                stats.push({
                    ...topic,
                    category: getCategoryForTopic(topic.id, topic.name, topic.source, topic.topicId),
                    totalQuestions,
                    validQuestions,
                    difficultyStats,
                    noDifficultyCount
                });

                // Uyarı oluştur
                if (noDifficultyCount > 0) {
                    warnings.push({
                        topic: topic.name,
                        count: noDifficultyCount,
                        message: `${topic.name} konusunda ${noDifficultyCount} sorunun zorluk seviyesi belirtilmemiş`
                    });
                }
            }

            setTopicStats(stats);
            setWarnings(warnings);
        } catch (error) {
            console.error('Soru istatistikleri yüklenirken hata:', error);
            toast.error('Soru istatistikleri yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleQuestionCountChange = (topicId, difficulty, value) => {
        const numValue = parseInt(value) || 0;
        
        // Maksimum limit kontrolü
        const topic = topicStats.find(t => t.id === topicId);
        if (topic) {
            const available = topic.difficultyStats[difficulty] || 0;
            if (numValue > available) {
                setMaxLimitInfo({
                    title: "Maksimum Limit Aşıldı",
                    message: (
                        <>
                            <span className="font-semibold text-blue-600">{topic.name}</span> konusunda 
                            <span className="font-semibold text-purple-600"> {getDifficultyLabel(difficulty)}</span> seviyesinde 
                            sadece <span className="font-bold text-red-600">{available}</span> soru var.
                            <br />
                            <span className="text-sm text-gray-500 mt-2 block">
                                Mevcut soru sayısından fazla seçemezsiniz.
                            </span>
                        </>
                    )
                });
                setShowMaxLimitModal(true);
                return;
            }
        }

        // Kategori limiti kontrolü - sadece artış yaparken kontrol et
        const currentCounts = questionCounts[topicId] || { easy: 0, medium: 0, hard: 0 };
        const currentValue = currentCounts[difficulty] || 0;
        
        if (numValue > currentValue) { // Sadece artış yaparken kontrol et
            const topic = topicStats.find(t => t.id === topicId);
            if (topic) {
                const category = topic.category || 'Genel Bankacılık';
                const currentCategoryTotal = getCategoryQuestions(category);
                const categoryLimit = CATEGORY_LIMITS[category];
                
                // Bu konudaki mevcut toplam soru sayısını hesapla
                const currentTopicTotal = (currentCounts.easy || 0) + (currentCounts.medium || 0) + (currentCounts.hard || 0);
                
                // Yeni toplam soru sayısını hesapla
                const newTopicTotal = (difficulty === 'easy' ? numValue : currentCounts.easy || 0) + 
                                    (difficulty === 'medium' ? numValue : currentCounts.medium || 0) + 
                                    (difficulty === 'hard' ? numValue : currentCounts.hard || 0);
                
                // Kategori toplamına eklenen soru sayısı
                const addedQuestions = newTopicTotal - currentTopicTotal;
                const newCategoryTotal = currentCategoryTotal + addedQuestions;
                
                if (newCategoryTotal > categoryLimit) {
                    setMaxLimitInfo({
                        title: "Kategori Limiti Aşıldı",
                        message: (
                            <>
                                <span className="font-semibold text-blue-600">{category}</span> kategorisinde 
                                maksimum <span className="font-bold text-red-600">{categoryLimit}</span> soru seçebilirsiniz.
                                <br />
                                <div className="mt-2 text-sm">
                                    <div className="text-gray-600">• Mevcut: {currentCategoryTotal} soru</div>
                                    <div className="text-gray-600">• Limit: {categoryLimit} soru</div>
                                    <div className="text-red-600">• Fazla: {newCategoryTotal - categoryLimit} soru</div>
                                </div>
                                <span className="text-sm text-gray-500 mt-2 block">
                                    Bu kategorideki diğer konulardan soru azaltın veya başka kategoriden soru seçin.
                                </span>
                            </>
                        )
                    });
                    setShowMaxLimitModal(true);
                    return;
                }
            }
        }
        
        setQuestionCounts(prev => ({
            ...prev,
            [topicId]: {
                ...prev[topicId],
                [difficulty]: Math.max(0, numValue)
            }
        }));
    };

    const getTotalQuestions = () => {
        return Object.values(questionCounts).reduce((total, counts) => {
            return total + (counts.easy || 0) + (counts.medium || 0) + (counts.hard || 0);
        }, 0);
    };

    const getCategoryQuestions = (category) => {
        const groupedTopics = getGroupedTopics();
        const topicsInCategory = groupedTopics[category] || [];
        
        return topicsInCategory.reduce((total, topic) => {
            const counts = questionCounts[topic.id] || { easy: 0, medium: 0, hard: 0 };
            return total + (counts.easy || 0) + (counts.medium || 0) + (counts.hard || 0);
        }, 0);
    };

    const getCategoryStatus = (category) => {
        const current = getCategoryQuestions(category);
        const limit = CATEGORY_LIMITS[category];
        const percentage = Math.round((current / limit) * 100);
        
        if (current === 0) return { status: 'empty', color: 'text-gray-500', bgColor: 'bg-gray-100' };
        if (current < limit) return { status: 'under', color: 'text-blue-600', bgColor: 'bg-blue-100' };
        if (current === limit) return { status: 'perfect', color: 'text-green-600', bgColor: 'bg-green-100' };
        return { status: 'over', color: 'text-red-600', bgColor: 'bg-red-100' };
    };

    // Otomatik doldurma modal'ını aç
    const handleAutoFillClick = (category) => {
        setAutoFillCategory(category);
        setShowAutoFillModal(true);
    };

    // Tüm kategorileri otomatik doldur
    const handleAutoFillAll = () => {
        setIsFillingAll(true);
        setShowAutoFillModal(true);
    };

    // Tüm kategorileri seçilen seçenekle doldur
    const fillAllCategories = (option) => {
        const groupedTopics = getGroupedTopics();
        const newCounts = { ...questionCounts };
        
        // Zorluk dağılımını seçeneğe göre belirle
        const difficultyDistribution = option === 'servis' 
            ? { hard: 0.4, medium: 0.3, easy: 0.3 }  // Servis: %40 zor, %30 orta, %30 kolay
            : { hard: 0.7, medium: 0.2, easy: 0.1 }; // Yönetim: %70 zor, %20 orta, %10 kolay
        
        CATEGORIES.forEach(category => {
            const topicsInCategory = groupedTopics[category] || [];
            if (topicsInCategory.length === 0) return;

            if (category === 'Genel Bankacılık' || category === 'Genel Kültür') {
                // Toplam 50 soru (Genel Bankacılık) veya 25 soru (Genel Kültür) konular arasında eşit böl
                const totalQuestionsForCategory = category === 'Genel Bankacılık' ? 50 : 25;
                
                // Konuları grupla (aynı isimdeki normal ve manuel konuları birleştir)
                const topicGroups = {};
                topicsInCategory.forEach(topic => {
                    const baseName = topic.name.replace(' (Manuel)', '').replace(' (Normal)', '');
                    if (!topicGroups[baseName]) {
                        topicGroups[baseName] = [];
                    }
                    topicGroups[baseName].push(topic);
                });
                
                const uniqueTopicCount = Object.keys(topicGroups).length;
                const questionsPerUniqueTopic = Math.floor(totalQuestionsForCategory / uniqueTopicCount);
                const remainingQuestions = totalQuestionsForCategory - (questionsPerUniqueTopic * uniqueTopicCount);
                
                let extraQuestionCount = 0;
                Object.values(topicGroups).forEach(topicGroup => {
                    const extraQuestion = extraQuestionCount < remainingQuestions ? 1 : 0;
                    extraQuestionCount += extraQuestion;
                    
                    const totalQuestionsForGroup = questionsPerUniqueTopic + extraQuestion;
                    const questionsPerTopic = Math.floor(totalQuestionsForGroup / topicGroup.length);
                    const remainingInGroup = totalQuestionsForGroup - (questionsPerTopic * topicGroup.length);
                    
                    let topicIndex = 0;
                    topicGroup.forEach((topic) => {
                        const extraForThisTopic = topicIndex < remainingInGroup ? 1 : 0;
                        const finalQuestionsForTopic = questionsPerTopic + extraForThisTopic;
                        topicIndex++;
                        
                        const hardCount = Math.round(finalQuestionsForTopic * difficultyDistribution.hard);
                        const mediumCount = Math.round(finalQuestionsForTopic * difficultyDistribution.medium);
                        const easyCount = finalQuestionsForTopic - hardCount - mediumCount;
                        
                        const available = {
                            easy: Math.max(0, (topic.difficultyStats.easy || 0) - (newCounts[topic.id]?.easy || 0)),
                            medium: Math.max(0, (topic.difficultyStats.medium || 0) - (newCounts[topic.id]?.medium || 0)),
                            hard: Math.max(0, (topic.difficultyStats.hard || 0) - (newCounts[topic.id]?.hard || 0))
                        };
                        
                        const actualHard = Math.min(hardCount, available.hard);
                        const actualMedium = Math.min(mediumCount, available.medium);
                        const actualEasy = Math.min(easyCount, available.easy);
                        
                        newCounts[topic.id] = {
                            ...newCounts[topic.id],
                            easy: actualEasy,
                            medium: actualMedium,
                            hard: actualHard
                        };
                    });
                });
            } else if (category === 'Genel Yetenek') {
                // Genel Yetenek için özel mapping
                const topicMapping = {
                    'TÜRKÇE': 11,
                    'MATEMATİK': 12,
                    'TARİH': 1,
                    'COĞRAFYA': 1
                };
                
                // Konuları grupla (aynı isimdeki normal ve manuel konuları birleştir)
                const topicGroups = {};
                topicsInCategory.forEach(topic => {
                    const baseName = topic.name.replace(' (Manuel)', '').replace(' (Normal)', '');
                    if (!topicGroups[baseName]) {
                        topicGroups[baseName] = [];
                    }
                    topicGroups[baseName].push(topic);
                });
                
                Object.entries(topicGroups).forEach(([baseName, topicGroup]) => {
                    const cleanId = baseName.replace('konu:', '');
                    const totalCount = topicMapping[cleanId];
                    if (!totalCount) return;
                    
                    const questionsPerTopic = Math.floor(totalCount / topicGroup.length);
                    const remainingInGroup = totalCount - (questionsPerTopic * topicGroup.length);
                    
                    let topicIndex = 0;
                    topicGroup.forEach((topic) => {
                        const extraForThisTopic = topicIndex < remainingInGroup ? 1 : 0;
                        const finalQuestionsForTopic = questionsPerTopic + extraForThisTopic;
                        topicIndex++;
                        
                        const hardCount = Math.round(finalQuestionsForTopic * difficultyDistribution.hard);
                        const mediumCount = Math.round(finalQuestionsForTopic * difficultyDistribution.medium);
                        const easyCount = finalQuestionsForTopic - hardCount - mediumCount;
                        
                        const available = {
                            easy: Math.max(0, (topic.difficultyStats.easy || 0) - (newCounts[topic.id]?.easy || 0)),
                            medium: Math.max(0, (topic.difficultyStats.medium || 0) - (newCounts[topic.id]?.medium || 0)),
                            hard: Math.max(0, (topic.difficultyStats.hard || 0) - (newCounts[topic.id]?.hard || 0))
                        };
                        
                        const actualHard = Math.min(hardCount, available.hard);
                        const actualMedium = Math.min(mediumCount, available.medium);
                        const actualEasy = Math.min(easyCount, available.easy);
                        
                        newCounts[topic.id] = {
                            ...newCounts[topic.id],
                            easy: actualEasy,
                            medium: actualMedium,
                            hard: actualHard
                        };
                    });
                });
            }
        });
        
        setQuestionCounts(newCounts);
        setIsFillingAll(false);
        setShowAutoFillModal(false);
        toast.success('Tüm kategoriler otomatik dolduruldu!');
    };

    // Yönetim için otomatik doldurma
    const autoFillForYonetim = (category) => {
        const limit = CATEGORY_LIMITS[category];
        const current = getCategoryQuestions(category);
        const remaining = Math.max(0, limit - current);
        if (remaining === 0) {
            toast.success(`${category} zaten dolu.`);
            return;
        }

        const groupedTopics = getGroupedTopics();
        const topicsInCategory = groupedTopics[category] || [];
        if (topicsInCategory.length === 0) return;

        const newCounts = { ...questionCounts };

        if (category === 'Genel Bankacılık' || category === 'Genel Kültür') {
            // Toplam 50 soru (Genel Bankacılık) veya 25 soru (Genel Kültür) konular arasında eşit böl
            const totalQuestionsForCategory = category === 'Genel Bankacılık' ? 50 : 25;
            
            // Konuları grupla (aynı isimdeki normal ve manuel konuları birleştir)
            const topicGroups = {};
            topicsInCategory.forEach(topic => {
                const baseName = topic.name.replace(' (Manuel)', '').replace(' (Normal)', '');
                if (!topicGroups[baseName]) {
                    topicGroups[baseName] = [];
                }
                topicGroups[baseName].push(topic);
            });
            
            const uniqueTopicCount = Object.keys(topicGroups).length;
            const questionsPerUniqueTopic = Math.floor(totalQuestionsForCategory / uniqueTopicCount);
            const remainingQuestions = totalQuestionsForCategory - (questionsPerUniqueTopic * uniqueTopicCount);
            
            let extraQuestionCount = 0;
            Object.values(topicGroups).forEach(topicGroup => {
                const extraQuestion = extraQuestionCount < remainingQuestions ? 1 : 0;
                extraQuestionCount += extraQuestion;
                
                const totalQuestionsForGroup = questionsPerUniqueTopic + extraQuestion;
                const questionsPerTopic = Math.floor(totalQuestionsForGroup / topicGroup.length);
                const remainingInGroup = totalQuestionsForGroup - (questionsPerTopic * topicGroup.length);
                
                let topicIndex = 0;
                topicGroup.forEach((topic) => {
                    const extraForThisTopic = topicIndex < remainingInGroup ? 1 : 0;
                    const finalQuestionsForTopic = questionsPerTopic + extraForThisTopic;
                    topicIndex++;
                    
                    const hardCount = Math.round(finalQuestionsForTopic * 0.7);
                    const mediumCount = Math.round(finalQuestionsForTopic * 0.2);
                    const easyCount = finalQuestionsForTopic - hardCount - mediumCount;
                    const available = {
                        easy: Math.max(0, (topic.difficultyStats.easy || 0) - (questionCounts[topic.id]?.easy || 0)),
                        medium: Math.max(0, (topic.difficultyStats.medium || 0) - (questionCounts[topic.id]?.medium || 0)),
                        hard: Math.max(0, (topic.difficultyStats.hard || 0) - (questionCounts[topic.id]?.hard || 0))
                    };

                    const counts = questionCounts[topic.id] || { easy: 0, medium: 0, hard: 0 };
                    newCounts[topic.id] = {
                        ...counts,
                        easy: Math.min(counts.easy + easyCount, counts.easy + available.easy),
                        medium: Math.min(counts.medium + mediumCount, counts.medium + available.medium),
                        hard: Math.min(counts.hard + hardCount, counts.hard + available.hard)
                    };
                });
            });
        } else if (category === 'Genel Yetenek') {
            // Türkçe 11, Matematik 12, Tarih 1, Coğrafya 1 soru - %70 zor, %20 orta, %10 kolay - aynı konular kendi aralarında bölünsün
            const topicMapping = {
                '-OKw6fKcYGunlY_PbCo3': { name: 'Matematik', count: 12 },
                '-OMBcE1I9DRj8uvlYSmH': { name: 'Türkçe', count: 11 },
                '-OMhpwKF1PZ0-QnjyJm8': { name: 'Tarih', count: 1 },
                '-OMlVD6ufbDvCgZhfz8N': { name: 'Coğrafya', count: 1 }
            };

            // Konuları grupla (aynı isimdeki normal ve manuel konuları birleştir)
            const topicGroups = {};
            topicsInCategory.forEach(topic => {
                const cleanId = topic.id.replace('konu:', '');
                const mapping = topicMapping[cleanId];
                
                // Manuel konular için topicName'den kontrol et
                let baseName = null;
                if (mapping) {
                    baseName = mapping.name;
                } else if (topic.source === 'manual') {
                    // Manuel konularda topicName'den eşleştir
                    const topicName = topic.name.toLowerCase();
                    if (topicName.includes('türkçe')) baseName = 'Türkçe';
                    else if (topicName.includes('matematik')) baseName = 'Matematik';
                    else if (topicName.includes('tarih')) baseName = 'Tarih';
                    else if (topicName.includes('coğrafya')) baseName = 'Coğrafya';
                }
                
                if (baseName) {
                    if (!topicGroups[baseName]) {
                        topicGroups[baseName] = [];
                    }
                    const count = mapping ? mapping.count : 
                        (baseName === 'Türkçe' ? 11 : 
                         baseName === 'Matematik' ? 12 : 
                         baseName === 'Tarih' ? 1 : 1);
                    topicGroups[baseName].push({ ...topic, mapping: { name: baseName, count } });
                }
            });

            Object.values(topicGroups).forEach(topicGroup => {
                const totalCount = topicGroup[0].mapping.count;
                const questionsPerTopic = Math.floor(totalCount / topicGroup.length);
                const remainingInGroup = totalCount - (questionsPerTopic * topicGroup.length);
                
                let topicIndex = 0;
                topicGroup.forEach((topic) => {
                    const extraForThisTopic = topicIndex < remainingInGroup ? 1 : 0;
                    const finalQuestionsForTopic = questionsPerTopic + extraForThisTopic;
                    topicIndex++;
                    
                    let hardCount = Math.round(finalQuestionsForTopic * 0.7);
                    let mediumCount = Math.round(finalQuestionsForTopic * 0.2);
                    let easyCount = finalQuestionsForTopic - hardCount - mediumCount;
                    
                    // Eğer toplam 1-2 soru varsa, öncelik zor seviyeye
                    if (finalQuestionsForTopic <= 2) {
                        hardCount = Math.min(finalQuestionsForTopic, 1);
                        mediumCount = finalQuestionsForTopic > 1 ? 1 : 0;
                        easyCount = 0;
                    }

                    const available = {
                        easy: Math.max(0, (topic.difficultyStats.easy || 0) - (questionCounts[topic.id]?.easy || 0)),
                        medium: Math.max(0, (topic.difficultyStats.medium || 0) - (questionCounts[topic.id]?.medium || 0)),
                        hard: Math.max(0, (topic.difficultyStats.hard || 0) - (questionCounts[topic.id]?.hard || 0))
                    };

                    const counts = questionCounts[topic.id] || { easy: 0, medium: 0, hard: 0 };
                    newCounts[topic.id] = {
                        ...counts,
                        easy: Math.min(counts.easy + easyCount, counts.easy + available.easy),
                        medium: Math.min(counts.medium + mediumCount, counts.medium + available.medium),
                        hard: Math.min(counts.hard + hardCount, counts.hard + available.hard)
                    };
                });
            });
        }

        setQuestionCounts(newCounts);
        toast.success(`${category} yönetim için otomatik dolduruldu.`);
    };

    // Servis görevlileri için otomatik doldurma
    const autoFillForServis = (category) => {
        const limit = CATEGORY_LIMITS[category];
        const current = getCategoryQuestions(category);
        const remaining = Math.max(0, limit - current);
        if (remaining === 0) {
            toast.success(`${category} zaten dolu.`);
            return;
        }

        const groupedTopics = getGroupedTopics();
        const topicsInCategory = groupedTopics[category] || [];
        if (topicsInCategory.length === 0) return;

        const newCounts = { ...questionCounts };

        if (category === 'Genel Bankacılık' || category === 'Genel Kültür') {
            // Toplam 50 soru (Genel Bankacılık) veya 25 soru (Genel Kültür) konular arasında eşit böl
            const totalQuestionsForCategory = category === 'Genel Bankacılık' ? 50 : 25;
            
            // Konuları grupla (aynı isimdeki normal ve manuel konuları birleştir)
            const topicGroups = {};
            topicsInCategory.forEach(topic => {
                const baseName = topic.name.replace(' (Manuel)', '').replace(' (Normal)', '');
                if (!topicGroups[baseName]) {
                    topicGroups[baseName] = [];
                }
                topicGroups[baseName].push(topic);
            });
            
            const uniqueTopicCount = Object.keys(topicGroups).length;
            const questionsPerUniqueTopic = Math.floor(totalQuestionsForCategory / uniqueTopicCount);
            const remainingQuestions = totalQuestionsForCategory - (questionsPerUniqueTopic * uniqueTopicCount);
            
            let extraQuestionCount = 0;
            Object.values(topicGroups).forEach(topicGroup => {
                const extraQuestion = extraQuestionCount < remainingQuestions ? 1 : 0;
                extraQuestionCount += extraQuestion;
                
                const totalQuestionsForGroup = questionsPerUniqueTopic + extraQuestion;
                const questionsPerTopic = Math.floor(totalQuestionsForGroup / topicGroup.length);
                const remainingInGroup = totalQuestionsForGroup - (questionsPerTopic * topicGroup.length);
                
                let topicIndex = 0;
                topicGroup.forEach((topic) => {
                    const extraForThisTopic = topicIndex < remainingInGroup ? 1 : 0;
                    const finalQuestionsForTopic = questionsPerTopic + extraForThisTopic;
                    topicIndex++;
                    
                    const hardCount = Math.round(finalQuestionsForTopic * 0.4);
                    const mediumCount = Math.round(finalQuestionsForTopic * 0.3);
                    const easyCount = finalQuestionsForTopic - hardCount - mediumCount;
                    const available = {
                        easy: Math.max(0, (topic.difficultyStats.easy || 0) - (questionCounts[topic.id]?.easy || 0)),
                        medium: Math.max(0, (topic.difficultyStats.medium || 0) - (questionCounts[topic.id]?.medium || 0)),
                        hard: Math.max(0, (topic.difficultyStats.hard || 0) - (questionCounts[topic.id]?.hard || 0))
                    };

                    const counts = questionCounts[topic.id] || { easy: 0, medium: 0, hard: 0 };
                    newCounts[topic.id] = {
                        ...counts,
                        easy: Math.min(counts.easy + easyCount, counts.easy + available.easy),
                        medium: Math.min(counts.medium + mediumCount, counts.medium + available.medium),
                        hard: Math.min(counts.hard + hardCount, counts.hard + available.hard)
                    };
                });
            });
        } else if (category === 'Genel Yetenek') {
            // Türkçe 11, Matematik 12, Tarih 1, Coğrafya 1 soru - aynı konular kendi aralarında bölünsün
            const topicMapping = {
                '-OKw6fKcYGunlY_PbCo3': { name: 'Matematik', count: 12 },
                '-OMBcE1I9DRj8uvlYSmH': { name: 'Türkçe', count: 11 },
                '-OMhpwKF1PZ0-QnjyJm8': { name: 'Tarih', count: 1 },
                '-OMlVD6ufbDvCgZhfz8N': { name: 'Coğrafya', count: 1 }
            };

            // Konuları grupla (aynı isimdeki normal ve manuel konuları birleştir)
            const topicGroups = {};
            topicsInCategory.forEach(topic => {
                const cleanId = topic.id.replace('konu:', '');
                const mapping = topicMapping[cleanId];
                
                // Manuel konular için topicName'den kontrol et
                let baseName = null;
                if (mapping) {
                    baseName = mapping.name;
                } else if (topic.source === 'manual') {
                    // Manuel konularda topicName'den eşleştir
                    const topicName = topic.name.toLowerCase();
                    if (topicName.includes('türkçe')) baseName = 'Türkçe';
                    else if (topicName.includes('matematik')) baseName = 'Matematik';
                    else if (topicName.includes('tarih')) baseName = 'Tarih';
                    else if (topicName.includes('coğrafya')) baseName = 'Coğrafya';
                }
                
                if (baseName) {
                    if (!topicGroups[baseName]) {
                        topicGroups[baseName] = [];
                    }
                    const count = mapping ? mapping.count : 
                        (baseName === 'Türkçe' ? 11 : 
                         baseName === 'Matematik' ? 12 : 
                         baseName === 'Tarih' ? 1 : 1);
                    topicGroups[baseName].push({ ...topic, mapping: { name: baseName, count } });
                }
            });

            Object.values(topicGroups).forEach(topicGroup => {
                const totalCount = topicGroup[0].mapping.count;
                const questionsPerTopic = Math.floor(totalCount / topicGroup.length);
                const remainingInGroup = totalCount - (questionsPerTopic * topicGroup.length);
                
                let topicIndex = 0;
                topicGroup.forEach((topic) => {
                    const extraForThisTopic = topicIndex < remainingInGroup ? 1 : 0;
                    const finalQuestionsForTopic = questionsPerTopic + extraForThisTopic;
                    topicIndex++;
                    
                    let hardCount = Math.round(finalQuestionsForTopic * 0.4);
                    let mediumCount = Math.round(finalQuestionsForTopic * 0.3);
                    let easyCount = finalQuestionsForTopic - hardCount - mediumCount;
                    
                    // Eğer toplam 1-2 soru varsa, öncelik zor seviyeye
                    if (finalQuestionsForTopic <= 2) {
                        hardCount = Math.min(finalQuestionsForTopic, 1);
                        mediumCount = finalQuestionsForTopic > 1 ? 1 : 0;
                        easyCount = 0;
                    }

                    const available = {
                        easy: Math.max(0, (topic.difficultyStats.easy || 0) - (questionCounts[topic.id]?.easy || 0)),
                        medium: Math.max(0, (topic.difficultyStats.medium || 0) - (questionCounts[topic.id]?.medium || 0)),
                        hard: Math.max(0, (topic.difficultyStats.hard || 0) - (questionCounts[topic.id]?.hard || 0))
                    };

                    const counts = questionCounts[topic.id] || { easy: 0, medium: 0, hard: 0 };
                    newCounts[topic.id] = {
                        ...counts,
                        easy: Math.min(counts.easy + easyCount, counts.easy + available.easy),
                        medium: Math.min(counts.medium + mediumCount, counts.medium + available.medium),
                        hard: Math.min(counts.hard + hardCount, counts.hard + available.hard)
                    };
                });
            });
        }

        setQuestionCounts(newCounts);
        toast.success(`${category} servis görevlileri için otomatik dolduruldu.`);
    };

    // Kategoride kalan hakkı zorluklara ve konulara dengeli dağıtarak otomatik doldur (eski yöntem)
    const autoFillCategoryOld = (category) => {
        const limit = CATEGORY_LIMITS[category];
        const current = getCategoryQuestions(category);
        const remaining = Math.max(0, limit - current);
        if (remaining === 0) {
            toast.success(`${category} zaten dolu.`);
            return;
        }

        const groupedTopics = getGroupedTopics();
        const topicsInCategory = groupedTopics[category] || [];
        if (topicsInCategory.length === 0) return;

        // Kategori genelinde mevcut (kalan) kapasiteyi hesapla
        const categoryAvailableByDifficulty = { easy: 0, medium: 0, hard: 0 };
        const topicAvailableMap = {};

        topicsInCategory.forEach((topic) => {
            const counts = questionCounts[topic.id] || { easy: 0, medium: 0, hard: 0 };
            const available = {
                easy: Math.max(0, (topic.difficultyStats.easy || 0) - (counts.easy || 0)),
                medium: Math.max(0, (topic.difficultyStats.medium || 0) - (counts.medium || 0)),
                hard: Math.max(0, (topic.difficultyStats.hard || 0) - (counts.hard || 0))
            };
            topicAvailableMap[topic.id] = available;
            categoryAvailableByDifficulty.easy += available.easy;
            categoryAvailableByDifficulty.medium += available.medium;
            categoryAvailableByDifficulty.hard += available.hard;
        });

        const totalAvailable = categoryAvailableByDifficulty.easy + categoryAvailableByDifficulty.medium + categoryAvailableByDifficulty.hard;
        if (totalAvailable === 0) {
            toast.error(`${category} kategorisinde eklenebilir soru kalmadı.`);
            return;
        }

        // Adil dağıtım önceliği: her konudan en az 1 (mümkünse 2) soru
        const newCounts = { ...questionCounts };
        const prefOrder = ['medium', 'easy', 'hard'];
        const allocateOneForTopic = (t) => {
            for (const d of prefOrder) {
                const avail = topicAvailableMap[t.id][d] || 0;
                if (avail > 0) {
                    const counts = newCounts[t.id] || { easy: 0, medium: 0, hard: 0 };
                    newCounts[t.id] = { ...counts, [d]: (counts[d] || 0) + 1 };
                    topicAvailableMap[t.id][d] = avail - 1;
                    categoryAvailableByDifficulty[d] -= 1;
                    return true;
                }
            }
            return false;
        };

        // 1. tur: her konuya 1'er soru
        let remainingSlots = remaining;
        for (const t of topicsInCategory) {
            if (remainingSlots <= 0) break;
            if (allocateOneForTopic(t)) remainingSlots -= 1;
        }
        // 2. tur: mümkünse her konuya bir soru daha
        if (remainingSlots > 0) {
            for (const t of topicsInCategory) {
                if (remainingSlots <= 0) break;
                if (allocateOneForTopic(t)) remainingSlots -= 1;
            }
        }

        // Kalanı orantılı + round-robin ile dağıt
        if (remainingSlots > 0) {
            const difficultyOrder = prefOrder;
            const totalAvailAfterBase = categoryAvailableByDifficulty.easy + categoryAvailableByDifficulty.medium + categoryAvailableByDifficulty.hard;
            const plannedByDifficulty = { easy: 0, medium: 0, hard: 0 };
            let remainingToDistribute = Math.min(remainingSlots, totalAvailAfterBase);
            difficultyOrder.forEach((d) => {
                if (remainingToDistribute <= 0) return;
                const avail = categoryAvailableByDifficulty[d];
                if (avail <= 0) return;
                const take = Math.min(avail, Math.round((avail / Math.max(1, totalAvailAfterBase)) * remainingSlots));
                plannedByDifficulty[d] = take;
                remainingToDistribute -= take;
            });
            // Artanı sırayla dağıt
            let idx = 0;
            while (remainingToDistribute > 0) {
                const d = difficultyOrder[idx % difficultyOrder.length];
                if (categoryAvailableByDifficulty[d] > plannedByDifficulty[d]) {
                    plannedByDifficulty[d] += 1;
                    remainingToDistribute -= 1;
                }
                idx++;
                if (idx > 10000) break;
            }

            // Planı konulara uygula
            difficultyOrder.forEach((d) => {
                let need = plannedByDifficulty[d];
                if (need <= 0) return;

                const totalAvailD = topicsInCategory.reduce((sum, t) => sum + (topicAvailableMap[t.id][d] || 0), 0);
                if (totalAvailD === 0) return;

                // İlk tur: orantılı pay
                topicsInCategory.forEach((t) => {
                    if (need <= 0) return;
                    const avail = topicAvailableMap[t.id][d] || 0;
                    if (avail <= 0) return;
                    const counts = newCounts[t.id] || { easy: 0, medium: 0, hard: 0 };
                    const alloc = Math.min(avail, Math.floor((avail / totalAvailD) * plannedByDifficulty[d]));
                    if (alloc > 0) {
                        newCounts[t.id] = {
                            ...counts,
                            [d]: (counts[d] || 0) + alloc
                        };
                        topicAvailableMap[t.id][d] -= alloc;
                        need -= alloc;
                    }
                });

                // İkinci tur: round-robin ile artanı dağıt
                let rrIndex = 0;
                while (need > 0) {
                    const t = topicsInCategory[rrIndex % topicsInCategory.length];
                    const avail = topicAvailableMap[t.id][d] || 0;
                    const counts = newCounts[t.id] || { easy: 0, medium: 0, hard: 0 };
                    if (avail > 0) {
                        newCounts[t.id] = {
                            ...counts,
                            [d]: (counts[d] || 0) + 1
                        };
                        topicAvailableMap[t.id][d] = avail - 1;
                        need -= 1;
                    }
                    rrIndex++;
                    if (rrIndex > 10000) break;
                }
            });
        }

        setQuestionCounts(newCounts);
        toast.success(`${category} otomatik dolduruldu.`);
    };

    const getGroupedTopics = () => {
        const grouped = {
            'Genel Bankacılık': [],
            'Genel Kültür': [],
            'Genel Yetenek': []
        };
        
        topicStats.forEach(topic => {
            const category = topic.category || 'Genel Bankacılık';
            if (grouped[category]) {
                grouped[category].push(topic);
            }
        });
        
        return grouped;
    };

    const handleContinue = () => {
        const totalQuestions = getTotalQuestions();
        if (totalQuestions === 0) {
            setMaxLimitInfo({
                title: "Soru Seçilmedi",
                message: (
                    <>
                        Hiç soru seçmediniz.
                        <br />
                        <span className="text-sm text-gray-500 mt-2 block">
                            Devam etmek için en az bir soru seçmelisiniz.
                        </span>
                    </>
                )
            });
            setShowMaxLimitModal(true);
            return;
        }

        // Kategori limitlerini kontrol et
        const categoryErrors = [];
        const incompleteCategories = [];
        const currentTotalQuestions = getTotalQuestions();
        
        CATEGORIES.forEach(category => {
            const current = getCategoryQuestions(category);
            const limit = CATEGORY_LIMITS[category];
            
            if (current === 0) {
                incompleteCategories.push(`${category}: 0/${limit} (hiç soru seçilmedi)`);
            } else if (current < limit) {
                incompleteCategories.push(`${category}: ${current}/${limit} (${limit - current} soru eksik)`);
            } else if (current > limit) {
                categoryErrors.push(`${category}: ${current}/${limit} (${current - limit} fazla)`);
            }
        });

        // Toplam soru sayısı kontrolü
        if (currentTotalQuestions !== TOTAL_EXAM_QUESTIONS) {
            setMaxLimitInfo({
                title: "Soru Sayısı Eksik",
                message: (
                    <>
                        Toplam soru sayısı {TOTAL_EXAM_QUESTIONS} olmalıdır.
                        <br />
                        <div className="mt-2 text-sm">
                            <div className="text-red-600">• Mevcut: {currentTotalQuestions} soru</div>
                            <div className="text-red-600">• Gerekli: {TOTAL_EXAM_QUESTIONS} soru</div>
                            <div className="text-red-600">• Eksik: {TOTAL_EXAM_QUESTIONS - currentTotalQuestions} soru</div>
                        </div>
                        <span className="text-sm text-gray-500 mt-2 block">
                            Lütfen tüm kategorilerden yeterli soru seçin.
                        </span>
                    </>
                )
            });
            setShowMaxLimitModal(true);
            return;
        }

        // Eksik kategoriler kontrolü
        if (incompleteCategories.length > 0) {
            setMaxLimitInfo({
                title: "Kategoriler Tamamlanmadı",
                message: (
                    <>
                        Bazı kategorilerde yeterli soru seçilmedi:
                        <br />
                        <div className="mt-2 text-sm">
                            {incompleteCategories.map((error, index) => (
                                <div key={index} className="text-red-600">• {error}</div>
                            ))}
                        </div>
                        <span className="text-sm text-gray-500 mt-2 block">
                            Lütfen tüm kategorilerden yeterli soru seçin.
                        </span>
                    </>
                )
            });
            setShowMaxLimitModal(true);
            return;
        }

        // Limit aşımı kontrolü
        if (categoryErrors.length > 0) {
            setMaxLimitInfo({
                title: "Limit Aşıldı",
                message: (
                    <>
                        Bazı kategorilerde limit aşıldı:
                        <br />
                        <div className="mt-2 text-sm">
                            {categoryErrors.map((error, index) => (
                                <div key={index} className="text-red-600">• {error}</div>
                            ))}
                        </div>
                        <span className="text-sm text-gray-500 mt-2 block">
                            Lütfen soru sayılarını düzenleyin.
                        </span>
                    </>
                )
            });
            setShowMaxLimitModal(true);
            return;
        }
        
        
        // Onay modal'ını göster
        setShowConfirmationModal(true);
    };

    const loadSelectedQuestions = async () => {
        const selectedQuestions = [];
        
        for (const topic of topicStats) {
            const counts = questionCounts[topic.id] || { easy: 0, medium: 0, hard: 0 };
            
            for (const difficulty of ['easy', 'medium', 'hard']) {
                const requestedCount = counts[difficulty] || 0;
                if (requestedCount === 0) continue;
                
                let questions = [];
                
                if (topic.source === 'konular') {
                    // Konular koleksiyonundan soruları al
                    const konuId = topic.id.replace('konu:', '');
                    const sorularRef = collectionGroup(db, "sorular");
                    const sorularSnap = await getDocs(sorularRef);
                    
                    // Önce tüm uygun soruları topla
                    const allTopicQuestions = [];
                    sorularSnap.forEach(doc => {
                        const konuIdFromPath = doc.ref.parent.parent.parent.parent.id;
                        if (konuIdFromPath === konuId) {
                            const data = doc.data();
                            if (data.soruMetni && data.soruMetni.trim() && data.difficulty === difficulty) {
                                allTopicQuestions.push({
                                    id: doc.id,
                                    ...data,
                                    topicName: topic.name,
                                    topicId: topic.id,
                                    source: 'konular',
                                    sourceId: doc.id,
                                    sourceType: 'konular',
                                    sourceTopicId: topic.id
                                });
                            }
                        }
                    });
                    
                    // Rastgele seç - Firestore'dan direkt rastgele
                    const shuffled = allTopicQuestions.sort(() => Math.random() - 0.5);
                    questions = shuffled.slice(0, requestedCount);
                        
                } else if (topic.source === 'manual') {
                    // Manuel soruları al
                    const manualRef = collection(db, 'manual-questions');
                    let q;
                    if (topic.topicId) {
                        q = query(manualRef, where('topicId', '==', topic.topicId));
                    } else {
                        q = query(manualRef, where('topicName', '==', topic.name));
                    }
                    const manualSnap = await getDocs(q);
                    
                    // Önce tüm uygun soruları topla
                    const allTopicQuestions = [];
                    manualSnap.forEach(doc => {
                        const data = doc.data();
                        if (data.soruMetni && data.soruMetni.trim() && data.difficulty === difficulty) {
                            allTopicQuestions.push({
                                id: doc.id,
                                ...data,
                                topicName: topic.name,
                                topicId: topic.topicId || topic.id,
                                source: 'manual',
                                sourceId: doc.id,
                                sourceType: 'manual',
                                sourceTopicId: topic.topicId || topic.id
                            });
                        }
                    });
                    
                    // Rastgele seç - Firestore'dan direkt rastgele
                    const shuffled = allTopicQuestions.sort(() => Math.random() - 0.5);
                    questions = shuffled.slice(0, requestedCount);
                }
                
                selectedQuestions.push(...questions);
            }
        }
        
        return selectedQuestions;
    };

    const handleConfirmExam = async () => {
        const totalQuestions = getTotalQuestions();
        console.log('handleConfirmExam - topicStats:', topicStats);
        console.log('handleConfirmExam - questionCounts:', questionCounts);
        console.log('handleConfirmExam - totalQuestions:', totalQuestions);
        
        try {
            setLoading(true);
            const selectedQuestions = await loadSelectedQuestions();
            setShowConfirmationModal(false);
            
            console.log('handleConfirmExam - selectedQuestions length:', selectedQuestions.length);
            console.log('handleConfirmExam - navigating to step3 with:', { 
                selectedQuestions: selectedQuestions.length, 
                questionCounts, 
                topicStats, 
                totalQuestions 
            });
            
            // Soruları göster
            navigate('/create-exam/step3', { 
                state: { 
                    selectedQuestions,
                    questionCounts,
                    topicStats,
                    totalQuestions
                } 
            });
        } catch (error) {
            console.error('Sorular yüklenirken hata:', error);
            toast.error('Sorular yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'text-green-600 bg-green-100';
            case 'medium': return 'text-yellow-600 bg-yellow-100';
            case 'hard': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getDifficultyLabel = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'Kolay';
            case 'medium': return 'Orta';
            case 'hard': return 'Zor';
            default: return 'Belirsiz';
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Soru seçimi yükleniyor...</p>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-6">
                    <button 
                        onClick={() => navigate('/create-exam/new')}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                        aria-label="Geri"
                    >
                        <FaArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Soru Sayısı Seçimi</h1>
                        <p className="text-sm text-gray-500">Her konu için kolay/orta/zor soru sayısını belirleyin</p>
                    </div>
                </div>

                {/* Uyarılar */}
                {warnings.filter(w => !dismissedWarningTopics.has(w.topic)).length > 0 && (
                    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                            <FaExclamationTriangle className="text-amber-600 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-amber-800 mb-2">Zorluk Seviyesi Eksik Sorular</h3>
                                <div className="space-y-1">
                                    {warnings.filter(w => !dismissedWarningTopics.has(w.topic)).map((warning, index) => (
                                        <div key={index} className="text-sm text-amber-700 bg-amber-100/40 px-2 py-1 rounded">
                                            • {warning.message}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDismissedWarningTopics(prev => new Set([...prev, ...warnings.map(w => w.topic)]))}
                                className="text-xs px-3 py-1 rounded border border-amber-300 text-amber-800 hover:bg-amber-100 whitespace-nowrap"
                            >
                                Tamam
                            </button>
                        </div>
                    </div>
                )}

                {/* Kategori Limitleri Bilgilendirme */}
                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">i</div>
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-blue-800 mb-2">Sınav Kategorileri ve Limitler</h3>
                            <p className="text-sm text-blue-700 mb-3">
                                Toplam <span className="font-bold">{TOTAL_EXAM_QUESTIONS} soruluk</span> deneme sınavı oluşturacaksınız. 
                                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                                    getTotalQuestions() === TOTAL_EXAM_QUESTIONS 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    Mevcut: {getTotalQuestions()}/{TOTAL_EXAM_QUESTIONS}
                                </span>
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {CATEGORIES.map(category => {
                                    const current = getCategoryQuestions(category);
                                    const limit = CATEGORY_LIMITS[category];
                                    const status = getCategoryStatus(category);
                                    const percentage = Math.round((current / limit) * 100);
                                    
                                    return (
                                        <div key={category} className={`p-3 rounded-lg border ${status.bgColor} ${status.color}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium">{category}</span>
                                                <span className="text-xs font-bold">{current}/{limit}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className={`h-2 rounded-full transition-all ${status.status === 'over' ? 'bg-red-500' : status.status === 'perfect' ? 'bg-green-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-xs mt-1">
                                                {status.status === 'empty' && 'Henüz soru seçilmedi'}
                                                {status.status === 'under' && `${limit - current} soru daha seçilebilir`}
                                                {status.status === 'perfect' && 'Limit tamamlandı! ✅'}
                                                {status.status === 'over' && `${current - limit} soru fazla! ⚠️`}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sol: Kategori bazlı soru seçimi */}
                    <div className="lg:col-span-8">
                        <div className="space-y-6">
                            {CATEGORIES.map(category => {
                                const groupedTopics = getGroupedTopics();
                                const topicsInCategory = groupedTopics[category] || [];
                                
                                if (topicsInCategory.length === 0) return null;
                                
                                return (
                                    <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
                                            {/* <button
                                                type="button"
                                                onClick={() => handleAutoFillClick(category)}
                                                className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors"
                                                title="Kategoriyi otomatik doldur"
                                            >
                                                <FaPlay className="text-xs" />
                                            </button> */}
                                        </div>
                                        
                                        <div className="space-y-4">
                                            {topicsInCategory.map((topic, index) => {
                                                const topicId = topic.id;
                                                const currentCounts = questionCounts[topicId] || { easy: 0, medium: 0, hard: 0 };
                                                
                                                return (
                                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <h3 className="font-medium text-gray-900">{topic.name}</h3>
                                                                {topic.source === 'manual' && (
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">MANUEL</span>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm text-gray-500">Mevcut: {topic.validQuestions} soru</div>
                                                            </div>
                                                        </div>

                                                        {/* Soru sayısı seçimi */}
                                                        <div className="grid grid-cols-3 gap-4">
                                                            {['easy', 'medium', 'hard'].map(difficulty => {
                                                                const available = topic.difficultyStats[difficulty] || 0;
                                                                const selected = currentCounts[difficulty] || 0;
                                                                
                                                                const inc = () => handleQuestionCountChange(topicId, difficulty, (selected + 1));
                                                                const dec = () => handleQuestionCountChange(topicId, difficulty, Math.max(0, selected - 1));

                                                                const onInputChange = (e) => {
                                                                    const raw = e.target.value;
                                                                    const sanitized = raw.replace(/[^0-9]/g, '');
                                                                    handleQuestionCountChange(topicId, difficulty, sanitized);
                                                                };

                                                                const onFocus = (e) => e.target.select();

                                                                return (
                                                                    <div key={difficulty} className="text-center">
                                                                        <div className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(difficulty)} mb-2`}>
                                                                            {getDifficultyLabel(difficulty)}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mb-1">Mevcut: {available}</div>
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <button type="button" onClick={dec} className="px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-50">-</button>
                                                                            <input
                                                                                type="text"
                                                                                inputMode="numeric"
                                                                                pattern="[0-9]*"
                                                                                value={String(selected)}
                                                                                onChange={onInputChange}
                                                                                onFocus={onFocus}
                                                                                className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                                placeholder="0"
                                                                            />
                                                                            <button type="button" onClick={inc} className="px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-50">+</button>
                                                                        </div>
                                                                        {selected > available && (
                                                                            <div className="mt-1 text-xs text-red-600">Maks: {available}</div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="mt-2 text-xs text-gray-500">İpucu: + ve - ile ayarlayın, kutuya tıklayınca değer seçilir.</div>

                                                        {/* Uyarılar */}
                                                        {topic.noDifficultyCount > 0 && !dismissedWarningTopics.has(topicId) && (
                                                            <div className="flex items-center justify-between gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mt-3">
                                                                <div className="flex items-center gap-2">
                                                                    <FaExclamationTriangle className="text-xs" />
                                                                    <span>{topic.noDifficultyCount} sorunun zorluk seviyesi belirtilmemiş</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDismissedWarningTopics(prev => new Set([...prev, topicId]))}
                                                                    className="text-amber-600 hover:text-amber-800 p-1"
                                                                    aria-label="Uyarıyı kapat"
                                                                >
                                                                    <FaTimes className="text-xs" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sağ: Özet panel */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:sticky lg:top-6">
                            {/* Otomatik Doldur Butonu */}
                            <div className="mb-6">
                                <button
                                    onClick={handleAutoFillAll}
                                    className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                >
                                    <FaPlay className="text-sm" />
                                    Tüm Kategorileri Otomatik Doldur
                                </button>
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                    Servis Görevlileri veya Yönetim için tüm kategorileri otomatik doldurur
                                </p>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seçim Özeti</h3>
                            
                            {/* Toplam seçilen soru sayısı */}
                            <div className="text-center p-4 rounded-lg border border-gray-200 bg-blue-50 mb-4">
                                <div className="text-3xl font-bold text-blue-600">{getTotalQuestions()}</div>
                                <div className="text-sm text-gray-600">Seçilen Toplam Soru</div>
                            </div>

                            {/* Kategori bazında seçimler */}
                            <div className="space-y-3 mb-4">
                                {CATEGORIES.map(category => {
                                    const groupedTopics = getGroupedTopics();
                                    const topicsInCategory = groupedTopics[category] || [];
                                    const categoryTotal = topicsInCategory.reduce((sum, topic) => {
                                        const counts = questionCounts[topic.id] || { easy: 0, medium: 0, hard: 0 };
                                        return sum + (counts.easy || 0) + (counts.medium || 0) + (counts.hard || 0);
                                    }, 0);
                                    
                                    if (topicsInCategory.length === 0) return null;
                                    
                                    return (
                                        <div key={category} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                                            <div className="text-sm font-medium text-gray-900 mb-1">{category}</div>
                                            <div className="text-lg font-bold text-gray-900">{categoryTotal} soru</div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Zorluk dağılımı */}
                            <div className="mb-4">
                                <div className="text-sm font-medium text-gray-900 mb-2">Zorluk Dağılımı</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {['easy', 'medium', 'hard'].map(difficulty => {
                                        const total = Object.values(questionCounts).reduce((sum, counts) => {
                                            return sum + (counts[difficulty] || 0);
                                        }, 0);
                                        return (
                                            <div key={difficulty} className="text-center p-2 rounded-lg border border-gray-200">
                                                <div className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(difficulty)} mb-1`}>
                                                    {getDifficultyLabel(difficulty)}
                                                </div>
                                                <div className="text-lg font-bold text-gray-900">{total}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Uyarı sayısı */}
                            {warnings.length > 0 && (
                                <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-amber-700">
                                            <FaExclamationTriangle />
                                            <span>{warnings.length} konuda uyarı var</span>
                                        </div>
                                        {warnings.some(w => dismissedWarningTopics.has(w.topic)) && (
                                            <button
                                                type="button"
                                                onClick={() => setDismissedWarningTopics(new Set())}
                                                className="text-amber-800 hover:text-amber-900 underline underline-offset-2"
                                            >
                                                Hataları gör
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Aksiyon butonları */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate('/create-exam/new')}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Geri Dön
                                </button>
                                <button
                                    onClick={handleContinue}
                                    className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition-colors font-medium"
                                >
                                    <FaPlay className="text-sm" /> Devam Et
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Maksimum Limit Modal */}
            <MaxLimitModal
                isOpen={showMaxLimitModal}
                onClose={() => setShowMaxLimitModal(false)}
                title={maxLimitInfo.title}
                message={maxLimitInfo.message}
            />

            {/* Sınav Onay Modal */}
            <ExamConfirmationModal
                isOpen={showConfirmationModal}
                onClose={() => setShowConfirmationModal(false)}
                onConfirm={handleConfirmExam}
                topicStats={topicStats}
                questionCounts={questionCounts}
                getGroupedTopics={getGroupedTopics}
                getCategoryQuestions={getCategoryQuestions}
                getTotalQuestions={getTotalQuestions}
                getDifficultyColor={getDifficultyColor}
                getDifficultyLabel={getDifficultyLabel}
                CATEGORIES={CATEGORIES}
                CATEGORY_LIMITS={CATEGORY_LIMITS}
                TOTAL_EXAM_QUESTIONS={TOTAL_EXAM_QUESTIONS}
            />

            {/* Otomatik Doldurma Modal */}
            <AutoFillExamModal
                isOpen={showAutoFillModal}
                onClose={() => {
                    setShowAutoFillModal(false);
                    setIsFillingAll(false);
                }}
                onConfirm={(option) => {
                    if (isFillingAll) {
                        fillAllCategories(option);
                    } else {
                        if (option === 'servis') {
                            autoFillForServis(autoFillCategory);
                        } else if (option === 'yonetim') {
                            autoFillForYonetim(autoFillCategory);
                        }
                    }
                }}
            />
        </Layout>
    );
};

export default CreateExamStep2Page;
