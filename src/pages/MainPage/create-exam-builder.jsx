import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/layout';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaSearch, FaCheck, FaArrowLeft, FaPlay, FaChevronDown, FaChevronRight, FaTag, FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import MaxLimitModal from '../../components/MaxLimitModal';

const CreateExamBuilderPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [allTopics, setAllTopics] = useState([]); // { id, name, source, category }
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [openCats, setOpenCats] = useState({ 'Genel Bankacılık': true, 'Genel Kültür': true, 'Genel Yetenek': true });
    const [showMaxLimitModal, setShowMaxLimitModal] = useState(false);
    const [maxLimitInfo, setMaxLimitInfo] = useState({ title: '', message: '' });

    useEffect(() => {
        const loadTopics = async () => {
            setLoading(true);
            try {
                const konularSnap = await getDocs(collection(db, 'konular'));
                const konularList = konularSnap.docs.map(d => {
                    const data = d.data() || {};
                    const name = data.baslik || data.title || '';
                    const rawCat = (data.kategori || data.category || data.kategoriBaslik || data.categoryTitle || data.mainCategory || '').toString();
                    const category = normalizeCategory(rawCat, name, d.id);
                    return name && category ? { id: `konu:${d.id}`, name, source: 'konular', category, topicId: d.id } : null;
                }).filter(Boolean);

                const manualSnap = await getDocs(collection(db, 'manual-questions'));
                const manualTopicMap = new Map(); // topicName -> { topicId, count }
                manualSnap.forEach(d => {
                    const data = d.data() || {};
                    const topicName = (data.topicName || '').trim();
                    const topicId = data.topicId || '';
                    if (topicName) {
                        if (!manualTopicMap.has(topicName)) {
                            manualTopicMap.set(topicName, { topicId, count: 0 });
                        }
                        manualTopicMap.get(topicName).count++;
                    }
                });
                const manualList = Array.from(manualTopicMap.entries()).map(([name, { topicId, count }]) => {
                    const category = normalizeCategory('', name, topicId);
                    return category ? { 
                        id: `manual:${name}`, 
                        name, 
                        source: 'manual', 
                        category, 
                        topicId,
                        count 
                    } : null;
                }).filter(Boolean);

                const merged = [...konularList, ...manualList]
                    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
                setAllTopics(merged);
            } catch (e) {
                console.error('Konular yüklenemedi:', e);
                toast.error('Konular yüklenemedi');
            } finally {
                setLoading(false);
            }
        };
        loadTopics();
    }, []);

    const CATEGORIES = ['Genel Bankacılık', 'Genel Kültür', 'Genel Yetenek'];

    function normalizeCategory(raw, nameFallback, topicId = null) {
        // ID'lere göre kategorizasyon
        const bankIds = ['-OKAdBq7LH6PXcW457aN', '2', '-OKAk2EbpC1xqSwbJbYM', '4', '3'];
        const gkIds = ['6'];
        const gyIds = ['-OKw6fKcYGunlY_PbCo3', '-OMBcE1I9DRj8uvlYSmH', '-OMhpwKF1PZ0-QnjyJm8', '-OMlVD6ufbDvCgZhfz8N'];

        // Önce ID kontrolü yap
        if (topicId) {
            if (bankIds.includes(topicId)) return 'Genel Bankacılık';
            if (gkIds.includes(topicId)) return 'Genel Kültür';
            if (gyIds.includes(topicId)) return 'Genel Yetenek';
            // ID'si belirtilen listede yoksa null döndür (gösterilmesin)
            return null;
        }

        // Manuel sorular için topicId kontrolü (manual-questions collection'ında)
        if (nameFallback) {
            const n = nameFallback.toString().trim().toLowerCase();
            
            // Sadece belirli konulara izin ver
            const allowedTopics = [
                'bankacılık', 'bankacilik', 'muhasebe', 'ekonomi', 'hukuk', 'kredi', 'krediler',
                'genel kültür', 'genel kultur',
                'matematik', 'türkçe', 'turkce', 'tarih', 'coğrafya', 'cografya'
            ];
            
            // İzin verilen konulardan biri mi kontrol et
            const isAllowed = allowedTopics.some(topic => n.includes(topic));
            if (!isAllowed) {
                return null; // İzin verilmeyen konular gösterilmesin
            }
            
            // Genel Bankacılık konuları
            if (n.includes('bankacılık') || n.includes('bankacilik') || 
                n.includes('muhasebe') || n.includes('ekonomi') || 
                n.includes('hukuk') || n.includes('kredi') || n.includes('krediler')) {
                return 'Genel Bankacılık';
            }
            
            // Genel Kültür konuları
            if (n.includes('genel kültür') || n.includes('genel kultur')) {
                return 'Genel Kültür';
            }
            
            // Genel Yetenek konuları
            if (n.includes('matematik') || n.includes('türkçe') || n.includes('turkce') || 
                n.includes('tarih') || n.includes('coğrafya') || n.includes('cografya')) {
                return 'Genel Yetenek';
            }
        }

        // Varsayılan: null döndür (gösterilmesin)
        return null;
    }

    const filteredTopics = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return allTopics;
        return allTopics.filter(t => t.name.toLowerCase().includes(q));
    }, [allTopics, query]);

    const groupedTopics = useMemo(() => {
        const groups = {
            'Genel Bankacılık': [],
            'Genel Kültür': [],
            'Genel Yetenek': []
        };
        for (const t of filteredTopics) {
            const cat = CATEGORIES.includes(t.category) ? t.category : 'Genel Bankacılık';
            groups[cat].push(t);
        }
        return groups;
    }, [filteredTopics]);

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleContinue = () => {
        if (selected.size === 0) {
            setMaxLimitInfo({
                title: "Konu Seçilmedi",
                message: (
                    <>
                        Hiç konu seçmediniz.
                        <br />
                        <span className="text-sm text-gray-500 mt-2 block">
                            Devam etmek için en az bir konu seçmelisiniz.
                        </span>
                    </>
                )
            });
            setShowMaxLimitModal(true);
            return;
        }
        const selectedTopics = allTopics.filter(t => selected.has(t.id));
        console.log('Seçilen konular:', selectedTopics);
        toast.success(`${selectedTopics.length} konu seçildi`);
        
        // İkinci adıma geç
        navigate('/create-exam/step2', { 
            state: { selectedTopics } 
        });
    };

    const toggleCategory = (cat) => {
        setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const selectAllInCategory = (cat) => {
        const items = (groupedTopics[cat] || []).map(t => t.id);
        setSelected(prev => {
            const next = new Set(prev);
            items.forEach(id => next.add(id));
            return next;
        });
    };

    const clearAllInCategory = (cat) => {
        const items = new Set((groupedTopics[cat] || []).map(t => t.id));
        setSelected(prev => {
            const next = new Set();
            prev.forEach(id => { if (!items.has(id)) next.add(id); });
            return next;
        });
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-6">
                    <button 
                        onClick={() => navigate('/create-exam')}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                        aria-label="Geri"
                    >
                        <FaArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Sınav Oluştur</h1>
                        <p className="text-sm text-gray-500">Konuları seçin</p>
                    </div>
                </div>

                {/* Üst bilgi */}
                <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                        <FaTag className="text-blue-500" />
                        <span>Kategorilere göre seçin • Manuel konular rozetle işaretli</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sol: Konu seçim alanı */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                                <div className="relative w-full md:max-w-md">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Konu ara..."
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="text-sm text-gray-600">
                                    {loading ? 'Yükleniyor...' : `${filteredTopics.length} konu`} • {selected.size} seçildi
                                </div>
                            </div>

                            {CATEGORIES.map(cat => (
                                <div key={cat} className="mb-4 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => toggleCategory(cat)} className="text-gray-600 hover:text-gray-800">
                                                {openCats[cat] ? <FaChevronDown className="text-sm" /> : <FaChevronRight className="text-sm" />}
                                            </button>
                                            <h3 className="text-base font-semibold text-gray-900">{cat}</h3>
                                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">{groupedTopics[cat]?.length || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => selectAllInCategory(cat)} className="text-xs px-3 py-1.5 rounded-md border border-gray-300 hover:bg-blue-50 hover:border-blue-300 text-gray-700 transition-all">Tümünü Seç</button>
                                            <button onClick={() => clearAllInCategory(cat)} className="text-xs px-3 py-1.5 rounded-md border border-gray-300 hover:bg-red-50 hover:border-red-300 text-gray-700 transition-all">Temizle</button>
                                        </div>
                                    </div>
                                    {openCats[cat] && (
                                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {loading ? (
                                                Array.from({ length: 4 }).map((_, i) => (
                                                    <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                                                ))
                                            ) : (
                                                (groupedTopics[cat] || []).map(t => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => toggleSelect(t.id)}
                                                        className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all shadow-sm hover:shadow-md ${selected.has(t.id) ? 'border-blue-500 bg-blue-50 shadow-blue-100' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
                                                    >
                                                        <span className="truncate text-left flex items-center gap-2">
                                                            <span className="truncate text-sm font-medium">{t.name}</span>
                                                            {t.source === 'manual' && (
                                                                <span className="shrink-0 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">MANUEL</span>
                                                            )}
                                                        </span>
                                                        {selected.has(t.id) && <FaCheck className="text-blue-600 text-sm" />}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sağ: Özet panel */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:sticky lg:top-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seçim Özeti</h3>
                            
                            {/* Kategori sayıları */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {CATEGORIES.map(cat => {
                                    const count = (groupedTopics[cat] || []).length;
                                    const selectedCount = Array.from(selected).filter(id => {
                                        const t = allTopics.find(x => x.id === id);
                                        return t && t.category === cat;
                                    }).length;
                                    return (
                                        <div key={cat} className="text-center p-3 rounded-lg border border-gray-200 bg-gray-50">
                                            <div className="text-xs text-gray-600 mb-1">{cat.split(' ')[1]}</div>
                                            <div className="text-lg font-bold text-gray-900">{selectedCount}</div>
                                            <div className="text-xs text-gray-500">/{count}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Seçilen konular listesi */}
                            <div className="mb-4">
                                <div className="text-sm text-gray-600 mb-2">Seçilen konular ({selected.size})</div>
                                {selected.size > 0 ? (
                                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                                        {Array.from(selected).map(id => {
                                            const t = allTopics.find(x => x.id === id);
                                            if (!t) return null;
                                            return (
                                                <div key={id} className="flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <span className="text-sm font-medium text-gray-900 truncate">{t.name}</span>
                                                        {t.source === 'manual' && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">M</span>
                                                        )}
                                                    </div>
                                                    <button 
                                                        onClick={() => toggleSelect(id)} 
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                    >
                                                        <FaTimes className="text-xs" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 text-center py-4">Henüz konu seçilmedi</div>
                                )}
                            </div>

                            {/* Aksiyon butonları */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => setSelected(new Set())}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Seçimi Temizle
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
                animationType="calendar"
            />
        </Layout>
    );
};

export default CreateExamBuilderPage;


