import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaPlay, FaEye, FaEyeSlash, FaRandom, FaDownload, FaChevronDown, FaChevronRight, FaInfoCircle, FaTimes, FaExchangeAlt } from 'react-icons/fa';
import { collection, collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';

const CreateExamStep3Page = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showAnswers, setShowAnswers] = useState(false);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const [avoidRepeats, setAvoidRepeats] = useState(true);
    const [collapsedCategories, setCollapsedCategories] = useState(new Set());
    const [collapsedTopics, setCollapsedTopics] = useState(new Set());
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showReplaceModal, setShowReplaceModal] = useState(false);
    const [replaceTarget, setReplaceTarget] = useState(null); // { question }
    const [replaceOptions, setReplaceOptions] = useState([]);
    const [replaceLoading, setReplaceLoading] = useState(false);
    const [recentlyChangedQuestionIndex, setRecentlyChangedQuestionIndex] = useState(null);
    const [replaceSearchTerm, setReplaceSearchTerm] = useState('');
    
    const { selectedQuestions, totalQuestions, questionCounts, topicStats } = location.state || {};

    // Debug için
    console.log('Step3 - questionCounts:', questionCounts);
    console.log('Step3 - topicStats:', topicStats);

    // Kullanılmış soruları saklamak için anahtar (akışa özel)
    const USED_KEY = 'examBuilder:usedQuestionIds';

    const getUsedIds = () => {
        try {
            const raw = localStorage.getItem(USED_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const setUsedIds = (ids) => {
        try {
            // Listeyi makul boyutta tut (son 2000 kaydı koru)
            const unique = Array.from(new Set(ids)).slice(-2000);
            localStorage.setItem(USED_KEY, JSON.stringify(unique));
        } catch {}
    };

    const buildShuffled = (baseQuestions, excludeUsed) => {
        const used = excludeUsed ? new Set(getUsedIds()) : new Set();
        const nonRepeated = [];
        const repeated = [];
        for (const q of baseQuestions) {
            if (q?.id && used.has(q.id)) repeated.push(q); else nonRepeated.push(q);
        }
        // Önce tekrarsızları al, gerekirse tekrar edenlerle doldur
        const targetLen = baseQuestions.length;
        const combined = nonRepeated.concat(repeated).slice(0, targetLen);
        // Karıştır
        return combined.sort(() => Math.random() - 0.5);
    };

    useEffect(() => {
        if (!selectedQuestions || selectedQuestions.length === 0) {
            toast.error('Seçilen soru bulunamadı');
            navigate('/create-exam/new');
            return;
        }
        const normalized = (selectedQuestions || []).map(q => ({
            ...q,
            difficulty: normalizeDifficulty(q.difficulty)
        }));
        setShuffledQuestions(buildShuffled(normalized, true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedQuestions, navigate]);

    const shuffleQuestions = () => {
        const shuffled = buildShuffled(selectedQuestions, avoidRepeats);
        setShuffledQuestions(shuffled);
        toast.success(avoidRepeats ? 'Tekrarlar hariç karıştırıldı!' : 'Sorular karıştırıldı!');
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'text-green-600 bg-green-100 border-green-200';
            case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
            case 'hard': return 'text-red-600 bg-red-100 border-red-200';
            default: return 'text-gray-600 bg-gray-100 border-gray-200';
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

    // Zorluk değerlerini normalize et
    const normalizeDifficulty = (value) => {
        if (!value) return 'easy';
        const v = String(value).toLowerCase().trim();
        if (v === 'easy' || v === 'kolay') return 'easy';
        if (v === 'medium' || v === 'orta') return 'medium';
        if (v === 'hard' || v === 'zor') return 'hard';
        if (v === 'unspecified' || v === 'belirsiz' || v === '') return 'easy';
        return 'easy';
    };

    const getCategoryColor = (topicName) => {
        // Kategori renklerini belirle
        if (['BANKACILIK', 'EKONOMİ', 'MUHASEBE', 'KREDİLER', 'HUKUK'].includes(topicName)) {
            return 'text-blue-600 bg-blue-100 border-blue-200';
        } else if (topicName === 'GENEL KÜLTÜR') {
            return 'text-purple-600 bg-purple-100 border-purple-200';
        } else if (['MATEMATİK', 'TÜRKÇE', 'TARİH', 'COĞRAFYA'].includes(topicName)) {
            return 'text-green-600 bg-green-100 border-green-200';
        }
        return 'text-gray-600 bg-gray-100 border-gray-200';
    };

    const getCategoryLabel = (topicName) => {
        if (['BANKACILIK', 'EKONOMİ', 'MUHASEBE', 'KREDİLER', 'HUKUK'].includes(topicName)) {
            return 'Genel Bankacılık';
        } else if (topicName === 'GENEL KÜLTÜR') {
            return 'Genel Kültür';
        } else if (['MATEMATİK', 'TÜRKÇE', 'TARİH', 'COĞRAFYA'].includes(topicName)) {
            return 'Genel Yetenek';
        }
        return 'Diğer';
    };

    // Belirtilen kategori/konu sırasına göre soruNumarasi ataması yap
    // Sabit başlangıçlar: GK -> 1, GY -> en az 26, GB -> en az 51
    const assignQuestionNumbers = (questions) => {
        const normalizeTopic = (t) => (t || '').toString().trim().toLocaleUpperCase('tr-TR');

        // Sıra:
        // 1) Genel Kültür (GENEL KÜLTÜR)
        // 2) Genel Yetenek: TÜRKÇE, TARİH, COĞRAFYA, MATEMATİK
        // 3) Genel Bankacılık: BANKACILIK, HUKUK, KREDİLER, EKONOMİ, MUHASEBE
        const genelYetenekOrder = ['TÜRKÇE', 'TARİH', 'COĞRAFYA', 'MATEMATİK'];
        const genelBankacilikOrder = ['BANKACILIK', 'HUKUK', 'KREDİLER', 'EKONOMİ', 'MUHASEBE'];

        // Grupları oluştur (tekilleştirerek)
        const seen = new Set();
        const gk = [];
        const gy = [];
        const gb = [];
        const other = [];
        for (const q of questions) {
            if (!q?.id || seen.has(q.id)) continue;
            seen.add(q.id);
            const cat = getCategoryLabel(q.topicName);
            if (cat === 'Genel Kültür') gk.push(q);
            else if (cat === 'Genel Yetenek') gy.push(q);
            else if (cat === 'Genel Bankacılık') gb.push(q);
            else other.push(q);
        }

        // Yetenek ve Bankacılık alt konu sıralarına göre düzenle
        const sortByOrder = (arr, order) => {
            const upper = (t) => normalizeTopic(t);
            return order.flatMap(topic => arr.filter(q => upper(q.topicName) === topic));
        };
        const gyOrdered = sortByOrder(gy, genelYetenekOrder);
        const gbOrdered = sortByOrder(gb, genelBankacilikOrder);

        // Numara atama
        const idToNumber = new Map();
        let num = 1;
        for (const q of gk) idToNumber.set(q.id, num++);
        // Genel Yetenek en az 26'dan devam etsin
        if (num < 26) num = 26;
        for (const q of gyOrdered) idToNumber.set(q.id, num++);
        // Genel Bankacılık en az 51'den başlasın
        if (num < 51) num = 51;
        for (const q of gbOrdered) idToNumber.set(q.id, num++);
        // Diğerleri en sona
        for (const q of other) if (!idToNumber.has(q.id)) idToNumber.set(q.id, num++);

        return questions.map(q => ({ ...q, soruNumarasi: idToNumber.get(q.id) || null }));
    };

    const exportToPDF = () => {
        toast.success('PDF export özelliği yakında eklenecek!');
    };

    const toggleCategory = (category) => {
        setCollapsedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    const toggleTopic = (topicKey) => {
        setCollapsedTopics(prev => {
            const newSet = new Set(prev);
            if (newSet.has(topicKey)) {
                newSet.delete(topicKey);
            } else {
                newSet.add(topicKey);
            }
            return newSet;
        });
    };

    const openDetailModal = (question) => {
        setSelectedQuestion(question);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setSelectedQuestion(null);
        setShowDetailModal(false);
    };

    const openReplaceModal = async (question) => {
        setReplaceTarget(question);
        setShowReplaceModal(true);
        setReplaceLoading(true);
        try {
            const topicName = question.topicName;
            const source = question.source; // 'konular' | 'manual' (Step2'den geliyor)
            const topicId = question.topicId || question.konuId; // her iki isimlendirme için destek

            const options = [];
            if (source === 'manual') {
                const manualRef = collection(db, 'manual-questions');
                let qRef;
                if (topicId) {
                    qRef = query(manualRef, where('topicId', '==', String(topicId).replace('konu:', '')));
                } else {
                    qRef = query(manualRef, where('topicName', '==', topicName));
                }
                const snap = await getDocs(qRef);
                snap.forEach(doc => {
                    const data = doc.data();
                    if (!data?.soruMetni || !String(data.soruMetni).trim()) return; // boş metinleri alma
                    options.push({
                        id: doc.id,
                        topicName,
                        topicId: data.topicId || topicId,
                        source: 'manual',
                        soruMetni: data.soruMetni,
                        cevaplar: data.cevaplar,
                        difficulty: normalizeDifficulty(data.difficulty || question.difficulty),
                        dogruCevap: data.dogruCevap,
                        aciklama: data.aciklama,
                        createdAt: data.createdAt
                    });
                });
            } else {
                // konular koleksiyonundan ilgili konuya ait tüm sorular
                const sorularRef = collectionGroup(db, 'sorular');
                const snap = await getDocs(sorularRef);
                snap.forEach(doc => {
                    const konuIdFromPath = doc.ref.parent.parent.parent.parent.id;
                    if (topicId && String(konuIdFromPath) === String(String(topicId).replace('konu:', ''))) {
                        const data = doc.data();
                        if (!data?.soruMetni || !String(data.soruMetni).trim()) return; // boş metinleri alma
                        options.push({
                            id: doc.id,
                            topicName,
                            topicId: topicId,
                            source: 'konular',
                            soruMetni: data.soruMetni,
                            cevaplar: data.cevaplar || data.secenekler || data.siklar || [data.a, data.b, data.c, data.d, data.e].filter(Boolean),
                            difficulty: normalizeDifficulty(data.difficulty || question.difficulty),
                            dogruCevap: data.dogruCevap,
                            aciklama: data.aciklama,
                            createdAt: data.createdAt || new Date()
                        });
                    }
                });
            }

            // Mevcuttaki soruyu en üste koymamak için aynı id'yi sonda tutalım
            const filtered = options.filter(o => o.id !== question.id && o.soruMetni && String(o.soruMetni).trim());
            
            // Soruları manuel havuzundaki sıraya göre sırala (createdAt ASC)
            const sortedOptions = filtered.sort((a, b) => {
                const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return aDate - bDate;
            });
            
            setReplaceOptions(sortedOptions);
        } catch (e) {
            console.error('Sorular yüklenemedi:', e);
        } finally {
            setReplaceLoading(false);
        }
    };

    const closeReplaceModal = () => {
        setReplaceTarget(null);
        setReplaceOptions([]);
        setShowReplaceModal(false);
        setReplaceSearchTerm('');
    };

    // Filtrelenmiş soruları al
    const getFilteredReplaceOptions = () => {
        if (!replaceSearchTerm.trim()) return replaceOptions;
        
        const searchNum = parseInt(replaceSearchTerm);
        if (isNaN(searchNum)) return replaceOptions;
        
        return replaceOptions.filter((_, index) => (index + 1) === searchNum);
    };

    // Soru numarasını al (filtrelenmiş listede gerçek numarayı döndür)
    const getQuestionNumber = (question, filteredIndex) => {
        if (!replaceSearchTerm.trim()) {
            return filteredIndex + 1;
        }
        
        const searchNum = parseInt(replaceSearchTerm);
        if (isNaN(searchNum)) return filteredIndex + 1;
        
        // Arama yapıldığında, orijinal listedeki gerçek numarayı bul
        const originalIndex = replaceOptions.findIndex((_, index) => (index + 1) === searchNum);
        return originalIndex + 1;
    };

    const applyReplacement = (newQuestion) => {
        if (!replaceTarget) return;
        const normalizedNew = { ...newQuestion, difficulty: normalizeDifficulty(newQuestion.difficulty) };
        
        // Eski sorunun index'ini bul
        const oldIndex = shuffledQuestions.findIndex(q => q.id === replaceTarget.id);
        
        const replaced = shuffledQuestions.map(q => q.id === replaceTarget.id ? normalizedNew : q);
        setShuffledQuestions(replaced);
        
        // Yeni sorunun index'ini işaretle (aynı pozisyonda)
        setRecentlyChangedQuestionIndex(oldIndex);
        
        // 5 saniye sonra işareti kaldır
        setTimeout(() => {
            setRecentlyChangedQuestionIndex(null);
        }, 5000);
        
        setReplaceTarget(null);
        setReplaceOptions([]);
        setShowReplaceModal(false);
        toast.success('Soru değiştirildi');
        
        // Scroll to the changed question
        setTimeout(() => {
            const questionElement = document.querySelector(`[data-question-index="${oldIndex}"]`);
            if (questionElement) {
                // Kategori ve konu durumlarını kontrol et ve gerekirse aç
                const categoryElement = questionElement.closest('.bg-white.rounded-xl.shadow-sm');
                const topicElement = questionElement.closest('.border.border-gray-100');
                
                if (categoryElement) {
                    const categoryHeader = categoryElement.querySelector('.bg-gray-50.px-6.py-4');
                    const categoryName = categoryHeader?.querySelector('h3')?.textContent;
                    
                    if (categoryName && collapsedCategories.has(categoryName)) {
                        // Kategori kapalıysa aç
                        toggleCategory(categoryName);
                    }
                }
                
                if (topicElement) {
                    const topicHeader = topicElement.querySelector('.bg-gray-50.px-4.py-3');
                    const topicName = topicHeader?.querySelector('h4')?.textContent;
                    const categoryName = categoryElement?.querySelector('h3')?.textContent;
                    
                    if (topicName && categoryName) {
                        const topicKey = `${categoryName}-${topicName}`;
                        if (collapsedTopics.has(topicKey)) {
                            // Konu kapalıysa aç
                            toggleTopic(topicKey);
                        }
                    }
                }
                
                // Son olarak scroll yap
                setTimeout(() => {
                    questionElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }, 300);
            }
        }, 100);
    };

    const cleanHtml = (text) => {
        if (!text) return '';
        return text
            .replace(/<[^>]*>/g, '') // HTML etiketlerini kaldır
            // Temel HTML entity'leri
            .replace(/&rsquo;/g, "'") // &rsquo; → '
            .replace(/&lsquo;/g, "'") // &lsquo; → '
            .replace(/&rdquo;/g, '"') // &rdquo; → "
            .replace(/&ldquo;/g, '"') // &ldquo; → "
            .replace(/&nbsp;/g, ' ') // &nbsp; → boşluk
            .replace(/&amp;/g, '&') // &amp; → &
            .replace(/&lt;/g, '<') // &lt; → <
            .replace(/&gt;/g, '>') // &gt; → >
            .replace(/&quot;/g, '"') // &quot; → "
            // Türkçe karakterler
            .replace(/&ouml;/g, 'ö') // &ouml; → ö
            .replace(/&Ouml;/g, 'Ö') // &Ouml; → Ö
            .replace(/&uuml;/g, 'ü') // &uuml; → ü
            .replace(/&Uuml;/g, 'Ü') // &Uuml; → Ü
            .replace(/&ccedil;/g, 'ç') // &ccedil; → ç
            .replace(/&Ccedil;/g, 'Ç') // &Ccedil; → Ç
            .replace(/&scedil;/g, 'ş') // &scedil; → ş
            .replace(/&Scedil;/g, 'Ş') // &Scedil; → Ş
            .replace(/&igrave;/g, 'ı') // &igrave; → ı
            .replace(/&Igrave;/g, 'İ') // &Igrave; → İ
            .replace(/&gbreve;/g, 'ğ') // &gbreve; → ğ
            .replace(/&Gbreve;/g, 'Ğ') // &Gbreve; → Ğ
            // Diğer yaygın entity'ler
            .replace(/&eacute;/g, 'é') // &eacute; → é
            .replace(/&Eacute;/g, 'É') // &Eacute; → É
            .replace(/&agrave;/g, 'à') // &agrave; → à
            .replace(/&Agrave;/g, 'À') // &Agrave; → À
            .replace(/&egrave;/g, 'è') // &egrave; → è
            .replace(/&Egrave;/g, 'È') // &Egrave; → È
            .replace(/&iacute;/g, 'í') // &iacute; → í
            .replace(/&Iacute;/g, 'Í') // &Iacute; → Í
            .replace(/&oacute;/g, 'ó') // &oacute; → ó
            .replace(/&Oacute;/g, 'Ó') // &Oacute; → Ó
            .replace(/&uacute;/g, 'ú') // &uacute; → ú
            .replace(/&Uacute;/g, 'Ú') // &Uacute; → Ú
            .replace(/&aacute;/g, 'á') // &aacute; → á
            .replace(/&Aacute;/g, 'Á') // &Aacute; → Á
            .replace(/&ntilde;/g, 'ñ') // &ntilde; → ñ
            .replace(/&Ntilde;/g, 'Ñ') // &Ntilde; → Ñ
            .trim();
    };


    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/create-exam/step2')}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                            aria-label="Geri"
                        >
                            <FaArrowLeft className="h-4 w-4" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Seçilen Sorular</h1>
                            <p className="text-gray-500">Toplam {totalQuestions} soru • Kategori ve konu bazında düzenlenmiş</p>
                        </div>
                    </div>
                    
                    {/* Kontroller - Üstte */}
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-600 mr-2">
                            <input
                                type="checkbox"
                                checked={avoidRepeats}
                                onChange={(e) => setAvoidRepeats(e.target.checked)}
                                className="rounded"
                            />
                            Tekrarları hariç tut
                        </label>
                        <button
                            onClick={shuffleQuestions}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <FaRandom className="w-4 h-4" />
                            Karıştır
                        </button>
                        <button
                            onClick={() => setShowAnswers(!showAnswers)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                showAnswers 
                                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                            }`}
                        >
                            {showAnswers ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                            {showAnswers ? 'Cevapları Gizle' : 'Cevapları Göster'}
                        </button>
                        <button
                            onClick={exportToPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                            <FaDownload className="w-4 h-4" />
                            PDF İndir
                        </button>
                    </div>
                </div>

                {/* Bilgilendirme */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">i</div>
                        <div>
                            <h3 className="text-sm font-medium text-blue-800 mb-1">Nasıl Kullanılır?</h3>
                            <p className="text-sm text-blue-700">
                                Soruları görmek için kategorileri ve konuları açmanız gerekiyor. 
                                <span className="font-medium">Kategori başlıklarına tıklayarak</span> kategorileri açabilir, 
                                <span className="font-medium"> konu başlıklarına tıklayarak</span> konuları açabilirsiniz.
                            </p>
                        </div>
                    </div>
                </div>

                {/* İstatistikler */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600 mb-2">{totalQuestions}</div>
                            <div className="text-sm text-gray-600">Toplam Soru</div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600 mb-2">
                                {shuffledQuestions.filter(q => q.difficulty === 'easy').length}
                            </div>
                            <div className="text-sm text-gray-600">Kolay Soru</div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-yellow-600 mb-2">
                                {shuffledQuestions.filter(q => q.difficulty === 'medium').length}
                            </div>
                            <div className="text-sm text-gray-600">Orta Soru</div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-red-600 mb-2">
                                {shuffledQuestions.filter(q => q.difficulty === 'hard').length}
                            </div>
                            <div className="text-sm text-gray-600">Zor Soru</div>
                        </div>
                    </div>
                </div>

                {/* Sorular - 2 Sütunlu Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sol Sütun - Kategoriler (2/3 genişlik) */}
                    <div className="lg:col-span-2 space-y-6">
                        {['Genel Kültür', 'Genel Yetenek', 'Genel Bankacılık'].map(category => {
                            const categoryQuestions = shuffledQuestions.filter(q => getCategoryLabel(q.topicName) === category);
                            if (categoryQuestions.length === 0) return null;

                            const isCollapsed = collapsedCategories.has(category);

                            return (
                                <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    {/* Kategori Header - Tıklanabilir */}
                                    <div 
                                        className="bg-gray-50 px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => toggleCategory(category)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                                                <p className="text-sm text-gray-600">{categoryQuestions.length} soru</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isCollapsed ? (
                                                    <FaChevronRight className="text-gray-500" />
                                                ) : (
                                                    <FaChevronDown className="text-gray-500" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Konu Grupları - Collapsible */}
                                    {!isCollapsed && (
                                        <div className="p-6 space-y-6">
                                            {Object.entries(
                                                categoryQuestions.reduce((acc, q) => {
                                                    if (!acc[q.topicName]) acc[q.topicName] = [];
                                                    acc[q.topicName].push(q);
                                                    return acc;
                                                }, {})
                                            ).map(([topicName, questions]) => {
                                                const topicKey = `${category}-${topicName}`;
                                                const isTopicCollapsed = collapsedTopics.has(topicKey);

                                                return (
                                                    <div key={topicName} className="border border-gray-100 rounded-lg overflow-hidden">
                                                        {/* Konu Header - Tıklanabilir */}
                                                        <div 
                                                            className="bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                                            onClick={() => toggleTopic(topicKey)}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <h4 className="font-medium text-gray-900">{topicName}</h4>
                                                                    <span className="text-xs text-gray-500">{questions.length} soru</span>
                                                                    {questions[0].source === 'manual' && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                                            MANUEL
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {isTopicCollapsed ? (
                                                                        <FaChevronRight className="text-gray-400 text-sm" />
                                                                    ) : (
                                                                        <FaChevronDown className="text-gray-400 text-sm" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Sorular - Collapsible */}
                                                        {!isTopicCollapsed && (
                                                            <div className="p-4 space-y-4">
                                                                {questions.map((question, qIndex) => {
                                                                    const globalIndex = shuffledQuestions.findIndex(q => q.id === question.id);
                                                                    const isRecentlyChanged = recentlyChangedQuestionIndex === globalIndex;
                                                                    return (
                                                                    <div 
                                                                        key={question.id} 
                                                                        data-question-index={globalIndex}
                                                                        className={`bg-gray-50 rounded-lg p-4 transition-all duration-300 ${
                                                                            isRecentlyChanged 
                                                                                ? 'ring-2 ring-green-400 ring-opacity-80 bg-green-50 border-2 border-green-400 shadow-lg animate-pulse' 
                                                                                : ''
                                                                        }`}
                                                                    >
                                                        {/* Soru Başlığı */}
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                                    {question.soruNumarasi || (shuffledQuestions.indexOf(question) + 1)}
                                                                </div>
                                                                <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(question.difficulty)}`}>
                                                                    {getDifficultyLabel(question.difficulty)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => openDetailModal(question)}
                                                                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                >
                                                                    <FaInfoCircle className="w-3 h-3" />
                                                                    Detaylı Gör
                                                                </button>
                                                                <button
                                                                    onClick={() => openReplaceModal(question)}
                                                                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                                >
                                                                    <FaExchangeAlt className="w-3 h-3" />
                                                                    Soruyu Değiştir
                                                                </button>
                                                            </div>
                                                        </div>

                                                                        {/* Soru Metni */}
                                                                        <div className="mb-4">
                                                                            <p className="text-sm text-gray-800 leading-relaxed">
                                                                                {cleanHtml(question.soruMetni)}
                                                                            </p>
                                                                        </div>

                                                                        {/* Seçenekler */}
                                                                        <div className="space-y-2 mb-4">
                                                                            {['A', 'B', 'C', 'D', 'E'].map(option => {
                                                                                const optionKey = `secenek${option}`;
                                                                                const optionText = question[optionKey];
                                                                                if (!optionText) return null;
                                                                                
                                                                                return (
                                                                                    <div key={option} className="flex items-center gap-2 text-xs">
                                                                                        <span className="w-5 h-5 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-medium">
                                                                                            {option}
                                                                                        </span>
                                                                                        <span className="text-gray-700">{cleanHtml(optionText)}</span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        {/* Cevap */}
                                                                        {showAnswers && (
                                                                            <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                                                                                <div className="flex items-center gap-2 mb-2">
                                                                                    <FaCheck className="text-green-600 text-xs" />
                                                                                    <span className="text-xs font-medium text-green-800">Doğru Cevap</span>
                                                                                </div>
                                                                                <div className="text-sm font-bold text-green-900">
                                                                                    {question.dogruCevap}
                                                                                </div>
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
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Sağ Sütun - Özet (1/3 genişlik) */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Genel Özet */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Sınav Özeti</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">Toplam</span>
                                    <span className="font-bold text-gray-900">{totalQuestions}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">Kolay</span>
                                    <span className="font-bold text-green-600">
                                        {shuffledQuestions.filter(q => q.difficulty === 'easy').length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">Orta</span>
                                    <span className="font-bold text-yellow-600">
                                        {shuffledQuestions.filter(q => q.difficulty === 'medium').length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">Zor</span>
                                    <span className="font-bold text-red-600">
                                        {shuffledQuestions.filter(q => q.difficulty === 'hard').length}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Kategori Dağılımı */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Kategoriler</h3>
                            <div className="space-y-2">
                                {['Genel Bankacılık', 'Genel Kültür', 'Genel Yetenek'].map(category => {
                                    const count = shuffledQuestions.filter(q => getCategoryLabel(q.topicName) === category).length;
                                    return (
                                        <div key={category} className="flex justify-between items-center text-xs">
                                            <span className="text-gray-600 truncate">{category}</span>
                                            <span className="font-bold text-gray-900">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Alt Butonlar - Sticky */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 py-4 mt-8">
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/create-exam/step2')}
                            className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Geri Dön
                        </button>
                        <button
                            onClick={() => {
                                // soruNumarasi ata ve kaydetmeden önce hazırla
                                const numbered = assignQuestionNumbers(shuffledQuestions);
                                // Kullanılmış soru ID'lerini güncelle
                                const used = getUsedIds();
                                const next = used.concat(numbered.map(q => q.id).filter(Boolean));
                                setUsedIds(next);
                                navigate('/create-exam/step4', { 
                                    state: { 
                                        selectedQuestions: numbered, 
                                        totalQuestions,
                                        questionCounts: location.state?.questionCounts,
                                        topicStats: location.state?.topicStats
                                    } 
                                });
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                        >
                            <FaPlay className="w-4 h-4" />
                            Devam Et
                        </button>
                    </div>
                </div>
            </div>

            {/* Soruyu Değiştir Modal */}
            {showReplaceModal && replaceTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Soruyu Değiştir</h3>
                                    <p className="text-sm text-gray-600">Konu: {replaceTarget.topicName}</p>
                                </div>
                                <button
                                    onClick={closeReplaceModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            {replaceLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                </div>
                            ) : replaceOptions.length === 0 ? (
                                <div className="text-center py-12 text-gray-600">Bu konuda alternatif soru bulunamadı.</div>
                            ) : (
                                <>
                                    {/* Arama Fieldı */}
                                    <div className="mb-6">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                placeholder="Soru numarası ile ara (örn: 5)"
                                                value={replaceSearchTerm}
                                                onChange={(e) => setReplaceSearchTerm(e.target.value)}
                                                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                min="1"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            {replaceSearchTerm && (
                                                <button
                                                    onClick={() => setReplaceSearchTerm('')}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                                >
                                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Toplam {replaceOptions.length} soru • {getFilteredReplaceOptions().length} sonuç
                                        </p>
                                    </div>

                                    {/* Sorular */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {getFilteredReplaceOptions().map((q, index) => (
                                        <div key={q.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                                        #{getQuestionNumber(q, index)}
                                                    </span>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(q.difficulty)}`}>
                                                        {getDifficultyLabel(q.difficulty)}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => applyReplacement(q)}
                                                    className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                                >
                                                    Bu Soruyu Seç
                                                </button>
                                            </div>
                                            <div className="text-sm text-gray-800 mb-2 line-clamp-4">{cleanHtml(q.soruMetni)}</div>
                                            {q.cevaplar && Array.isArray(q.cevaplar) && (
                                                <div className="space-y-1">
                                                    {q.cevaplar.slice(0,5).map((cevap, idx) => (
                                                        <div key={idx} className="text-xs text-gray-600">{String.fromCharCode(65+idx)}) {cleanHtml(cevap)}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Detay Modal */}
            {showDetailModal && selectedQuestion && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                        {/* Modal Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                        {selectedQuestion.soruNumarasi || (shuffledQuestions.indexOf(selectedQuestion) + 1)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Soru Detayı</h3>
                                        <p className="text-sm text-gray-600">{selectedQuestion.topicName}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeDetailModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            {/* Soru Metni */}
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Soru Metni</h4>
                                <p className="text-lg text-gray-900 leading-relaxed bg-gray-50 p-4 rounded-lg">
                                    {cleanHtml(selectedQuestion.soruMetni)}
                                </p>
                            </div>

                            {/* Seçenekler */}
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Seçenekler</h4>
                                <div className="space-y-2">
                                    {selectedQuestion.cevaplar && selectedQuestion.cevaplar.length > 0 ? (
                                        selectedQuestion.cevaplar.map((cevap, index) => {
                                            const optionLetter = String.fromCharCode(65 + index); // A, B, C, D, E
                                            return (
                                                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                        {optionLetter}
                                                    </div>
                                                    <span className="text-sm text-gray-900 flex-1">{cleanHtml(cevap)}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        // Fallback: Eski secenekA, secenekB formatı
                                        ['A', 'B', 'C', 'D', 'E'].map(option => {
                                            const optionKey = `secenek${option}`;
                                            const optionText = selectedQuestion[optionKey];
                                            if (!optionText) return null;
                                            
                                            return (
                                                <div key={option} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                        {option}
                                                    </div>
                                                    <span className="text-sm text-gray-900 flex-1">{cleanHtml(optionText)}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Cevap */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaCheck className="text-green-600 w-4 h-4" />
                                    <h4 className="text-sm font-medium text-green-800">Doğru Cevap</h4>
                                </div>
                                <div className="text-lg font-bold text-green-900 bg-white/50 rounded-lg p-2 text-center">
                                    {selectedQuestion.dogruCevap}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(selectedQuestion.difficulty)}`}>
                                        {getDifficultyLabel(selectedQuestion.difficulty)}
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span>{getCategoryLabel(selectedQuestion.topicName)}</span>
                                    {selectedQuestion.source === 'manual' && (
                                        <>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-amber-600 font-medium">Manuel</span>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={closeDetailModal}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default CreateExamStep3Page;

// Replace Modal UI
// Component return'ünün hemen üstünde modalı koşullu render edelim
// (Bu dosyanın sonunda olması render sırası açısından sorun yaratmaz)
// Modal: showReplaceModal && replaceTarget
//#region ReplaceModalRender
