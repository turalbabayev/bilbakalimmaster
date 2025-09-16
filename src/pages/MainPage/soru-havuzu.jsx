import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { FaArrowLeft, FaEdit, FaTrash, FaBookReader, FaChevronDown, FaChevronRight, FaTrashAlt, FaDownload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { saveAs } from 'file-saver';

const SoruHavuzuPage = () => {
    const navigate = useNavigate();
    const [manualQuestions, setManualQuestions] = useState([]);
    const [konular, setKonular] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [expandedTopics, setExpandedTopics] = useState({});
    // Toplu indir modal durumları
    const [isBulkDownloadOpen, setIsBulkDownloadOpen] = useState(false);
    const [bulkTopicName, setBulkTopicName] = useState("");
    const [bulkQuestions, setBulkQuestions] = useState([]);
    const [selectedForDownload, setSelectedForDownload] = useState({});
    const [downloadType, setDownloadType] = useState("tum"); // tum | sadeceSorular
    const [amountType, setAmountType] = useState("all"); // all | 10 | 20 | 30 | custom | secili
    const [customAmount, setCustomAmount] = useState("");

    // Yardımcı: ilk N soruyu seçili yap
    const setFirstNSelected = (n) => {
        const next = {};
        const limit = Math.max(0, Math.min(n, bulkQuestions.length));
        bulkQuestions.forEach((q, idx) => {
            next[q.id] = idx < limit;
        });
        setSelectedForDownload(next);
    };

    const setAllSelected = () => {
        const next = {};
        bulkQuestions.forEach(q => { next[q.id] = true; });
        setSelectedForDownload(next);
    };

    const handleAmountTypeChange = (opt) => {
        setAmountType(opt);
        if (opt === 'all') {
            setAllSelected();
        } else if (opt === '10' || opt === '20' || opt === '30') {
            setFirstNSelected(parseInt(opt, 10));
        } else if (opt === 'custom') {
            const n = parseInt(customAmount || '0', 10);
            if (!isNaN(n) && n > 0) {
                setFirstNSelected(n);
            } else {
                setFirstNSelected(0);
            }
        } else if (opt === 'secili') {
            // Kullanıcı manuel yönetecek; seçimlere dokunma
        }
    };
    const [editForm, setEditForm] = useState({
        soruMetni: '',
        cevaplar: ['', '', '', '', ''],
        dogruCevap: 'A',
        aciklama: '',
        difficulty: 'medium',
        topicName: ''
    });

    // Manuel soruları ve konuları yükle
    useEffect(() => {
        setLoading(true);
        
        // Manuel soruları yükle (createdAt DESC)
        const unsubscribeQuestions = onSnapshot(
            query(collection(db, 'manual-questions'), orderBy('createdAt', 'asc')),
            (snapshot) => {
                const questions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setManualQuestions(questions);
            }
        );

        // Konuları yükle
        const unsubscribeKonular = onSnapshot(collection(db, 'konular'), (snapshot) => {
            const konularData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setKonular(konularData);
            setLoading(false);
        });

        return () => {
            unsubscribeQuestions();
            unsubscribeKonular();
        };
    }, []);

    // Soruları konulara göre grupla
    const groupedQuestions = manualQuestions.reduce((acc, question) => {
        const topicName = question.topicName || 'Diğer';
        if (!acc[topicName]) {
            acc[topicName] = [];
        }
        acc[topicName].push(question);
        return acc;
    }, {});

    // Konu açma/kapama
    const toggleTopic = (topicName) => {
        setExpandedTopics(prev => ({
            ...prev,
            [topicName]: !prev[topicName]
        }));
    };

    // Konudaki tüm soruları sil
    const handleDeleteAllQuestionsInTopic = async (topicName, questions) => {
        if (!window.confirm(`${topicName} konusundaki ${questions.length} soruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
            return;
        }

        try {
            setLoading(true);
            
            // Tüm soruları sil
            const deletePromises = questions.map(question => 
                deleteDoc(doc(db, 'manual-questions', question.id))
            );
            
            await Promise.all(deletePromises);
            
            toast.success(`${topicName} konusundaki ${questions.length} soru başarıyla silindi!`);
        } catch (error) {
            console.error('Sorular silinirken hata:', error);
            toast.error('Sorular silinirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    // Konuyu JSON olarak indir (sorular sayfasının beklediği format)
    const handleDownloadTopicAsJSON = (topicName, questions) => {
        try {
            if (!questions || questions.length === 0) {
                toast.error('İndirilecek soru bulunamadı.');
                return;
            }

            // Modal için başlangıç state'leri hazırla ve aç
            setBulkTopicName(topicName);
            setBulkQuestions(questions);
            // Varsayılan: hepsi seçili
            const initialSel = {};
            questions.forEach(q => { initialSel[q.id] = true; });
            setSelectedForDownload(initialSel);
            setDownloadType("tum");
            setAmountType("all");
            setCustomAmount("");
            setIsBulkDownloadOpen(true);
        } catch (error) {
            console.error('JSON indirme hatası:', error);
            toast.error('JSON indirme sırasında bir hata oluştu!');
        }
    };

    // Modal içindeki JSON oluşturma ve indirme
    const performDownloadFromModal = () => {
        try {
            let baseList = [...bulkQuestions];
            // Miktara göre filtreleme
            if (amountType === '10' || amountType === '20' || amountType === '30') {
                baseList = baseList.slice(0, parseInt(amountType));
            } else if (amountType === 'custom') {
                const n = Math.min(parseInt(customAmount || '0', 10) || 0, bulkQuestions.length);
                if (n <= 0) {
                    toast.error('Geçerli bir sayı girin.');
                    return;
                }
                baseList = baseList.slice(0, n);
            } else if (amountType === 'secili') {
                const selectedIds = Object.entries(selectedForDownload).filter(([_, v]) => v).map(([id]) => id);
                if (selectedIds.length === 0) {
                    toast.error('En az bir soru seçin.');
                    return;
                }
                baseList = baseList.filter(q => selectedIds.includes(q.id));
            } // all -> hiçbir değişiklik yok

            const toOptionsObject = (cevaplar = []) => ({
                A: cevaplar?.[0] || '',
                B: cevaplar?.[1] || '',
                C: cevaplar?.[2] || '',
                D: cevaplar?.[3] || '',
                E: cevaplar?.[4] || ''
            });

            const payload = baseList.map(q => {
                const item = {
                    question: q.soruMetni || '',
                    options: toOptionsObject(q.cevaplar || [])
                };
                if (downloadType === 'tum') {
                    item.answer = (q.dogruCevap || 'A').toString().toUpperCase();
                    item.explanation = q.aciklama || '';
                    item.difficulty = q.difficulty || 'medium';
                }
                return item;
            });

            const jsonStr = JSON.stringify(payload, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const safeName = (bulkTopicName || 'konu').toString().toLowerCase().replace(/[^a-z0-9-_]+/gi, '_');
            const fileName = `manual_${safeName}_sorular.json`;
            saveAs(blob, fileName);
            toast.success(`${payload.length} soru JSON olarak indirildi`);
            setIsBulkDownloadOpen(false);
        } catch (error) {
            console.error('JSON oluşturma/indirme hatası:', error);
            toast.error('JSON indirme sırasında bir hata oluştu!');
        }
    };

    // Soru silme
    const handleDeleteQuestion = async (questionId) => {
        if (window.confirm('Bu soruyu silmek istediğinizden emin misiniz?')) {
            try {
                await deleteDoc(doc(db, 'manual-questions', questionId));
                toast.success('Soru başarıyla silindi!');
            } catch (error) {
                console.error('Soru silinirken hata:', error);
                toast.error('Soru silinirken bir hata oluştu!');
            }
        }
    };

    // Soru düzenleme başlat
    const handleEditQuestion = (question) => {
        setEditingQuestion(question.id);
        setEditForm({
            soruMetni: question.soruMetni || '',
            cevaplar: question.cevaplar || ['', '', '', '', ''],
            dogruCevap: question.dogruCevap || 'A',
            aciklama: question.aciklama || '',
            difficulty: question.difficulty || 'medium',
            topicName: question.topicName || ''
        });
    };

    // Soru güncelleme
    const handleUpdateQuestion = async () => {
        try {
            await updateDoc(doc(db, 'manual-questions', editingQuestion), {
                soruMetni: editForm.soruMetni,
                cevaplar: editForm.cevaplar,
                dogruCevap: editForm.dogruCevap,
                aciklama: editForm.aciklama,
                difficulty: editForm.difficulty,
                topicName: editForm.topicName
            });
            
            toast.success('Soru başarıyla güncellendi!');
            setEditingQuestion(null);
        } catch (error) {
            console.error('Soru güncellenirken hata:', error);
            toast.error('Soru güncellenirken bir hata oluştu!');
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-white">
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <div className="text-left mb-8">
                            <div className="flex items-center mb-4">
                                <button 
                                    onClick={() => navigate('/deneme-sinavlari')}
                                    className="mr-4 p-2 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    <FaArrowLeft className="h-5 w-5" />
                                </button>
                                <h1 className="text-2xl font-semibold text-gray-900">
                                    Soru Havuzu
                                </h1>
                            </div>
                            <p className="text-sm text-gray-600">
                                Konulara göre gruplandırılmış manuel sorular
                            </p>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : Object.keys(groupedQuestions).length === 0 ? (
                            <div className="text-center py-16">
                                <FaBookReader className="h-24 w-24 text-gray-300 mx-auto mb-6" />
                                <h3 className="text-2xl font-medium text-gray-900 mb-4">Henüz soru bulunmuyor</h3>
                                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                    Manuel soru eklemek için sınav oluşturma sayfasını kullanın.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(groupedQuestions).map(([topicName, questions]) => (
                                    <div key={topicName} className="bg-white rounded-xl shadow-lg border border-gray-100/50 overflow-hidden">
                                        {/* Konu Başlığı */}
                                        <div 
                                            onClick={() => toggleTopic(topicName)}
                                            className="p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                                                        <FaBookReader className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-semibold text-gray-900">
                                                            {topicName}
                                                        </h3>
                                                        <p className="text-sm text-gray-600">
                                                            {questions.length} soru
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-sm text-gray-500">
                                                        {questions.filter(q => q.difficulty === 'easy').length} Kolay • 
                                                        {questions.filter(q => q.difficulty === 'medium').length} Orta • 
                                                        {questions.filter(q => q.difficulty === 'hard').length} Zor
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadTopicAsJSON(topicName, questions);
                                                            }}
                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                                                            title="Toplu JSON indir"
                                                        >
                                                            <FaDownload className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteAllQuestionsInTopic(topicName, questions);
                                                            }}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                                            title="Tümünü Sil"
                                                        >
                                                            <FaTrashAlt className="h-4 w-4" />
                                                        </button>
                                                        {expandedTopics[topicName] ? (
                                                            <FaChevronDown className="h-5 w-5 text-gray-400" />
                                                        ) : (
                                                            <FaChevronRight className="h-5 w-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sorular */}
                                        {expandedTopics[topicName] && (
                                            <div className="border-t border-gray-100">
                                                <div className="p-4 space-y-4">
                                                    {questions.map((question, index) => (
                                                        <div key={question.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300">
                                                            {editingQuestion === question.id ? (
                                                                /* Düzenleme Formu */
                                                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                                                                    <div className="flex items-center gap-3 mb-6">
                                                                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                                                                            <FaEdit className="text-white text-lg" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-xl font-bold text-gray-900">Soruyu Düzenle</h4>
                                                                            <p className="text-sm text-gray-600">Soru bilgilerini güncelleyin</p>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="space-y-6">
                                                                        {/* Soru Metni */}
                                                                        <div>
                                                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                                                Soru Metni *
                                                                            </label>
                                                                            <textarea
                                                                                value={editForm.soruMetni}
                                                                                onChange={(e) => setEditForm(prev => ({ ...prev, soruMetni: e.target.value }))}
                                                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                                                                                rows="4"
                                                                                placeholder="Sorunuzu buraya yazın..."
                                                                            />
                                                                        </div>
                                                                        
                                                                        {/* Seçenekler */}
                                                                        <div>
                                                                            <label className="block text-sm font-semibold text-gray-700 mb-3">Seçenekler *</label>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                {editForm.cevaplar.map((cevap, index) => (
                                                                                    <div key={index} className="relative">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                                                <span className="text-gray-600 font-bold text-sm">
                                                                                                    {String.fromCharCode(65 + index)}
                                                                                                </span>
                                                                                            </div>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={cevap}
                                                                                                onChange={(e) => {
                                                                                                    const newCevaplar = [...editForm.cevaplar];
                                                                                                    newCevaplar[index] = e.target.value;
                                                                                                    setEditForm(prev => ({ ...prev, cevaplar: newCevaplar }));
                                                                                                }}
                                                                                                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                                                                placeholder={`${String.fromCharCode(65 + index)} seçeneğini girin...`}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* Diğer Ayarlar */}
                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                            <div>
                                                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                                                    Doğru Cevap *
                                                                                </label>
                                                                                <select
                                                                                    value={editForm.dogruCevap}
                                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, dogruCevap: e.target.value }))}
                                                                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                                                >
                                                                                    <option value="A">A Seçeneği</option>
                                                                                    <option value="B">B Seçeneği</option>
                                                                                    <option value="C">C Seçeneği</option>
                                                                                    <option value="D">D Seçeneği</option>
                                                                                    <option value="E">E Seçeneği</option>
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                                                    Zorluk Seviyesi *
                                                                                </label>
                                                                                <select
                                                                                    value={editForm.difficulty}
                                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, difficulty: e.target.value }))}
                                                                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                                                >
                                                                                    <option value="easy">🟢 Kolay</option>
                                                                                    <option value="medium">🟡 Orta</option>
                                                                                    <option value="hard">🔴 Zor</option>
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                                                    Konu *
                                                                                </label>
                                                                                <select
                                                                                    value={editForm.topicName}
                                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, topicName: e.target.value }))}
                                                                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                                                >
                                                                                    <option value="">Konu seçin</option>
                                                                                    {konular.map((konu) => (
                                                                                        <option key={konu.id} value={konu.baslik}>
                                                                                            {konu.baslik}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                        </div>

                                                                        {/* Açıklama */}
                                                                        <div>
                                                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                                                Açıklama
                                                                            </label>
                                                                            <textarea
                                                                                value={editForm.aciklama}
                                                                                onChange={(e) => setEditForm(prev => ({ ...prev, aciklama: e.target.value }))}
                                                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                                                                                rows="3"
                                                                                placeholder="Soru açıklamasını buraya yazın (isteğe bağlı)..."
                                                                            />
                                                                        </div>

                                                                        {/* Butonlar */}
                                                                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                                                                            <button
                                                                                onClick={handleUpdateQuestion}
                                                                                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
                                                                            >
                                                                                ✅ Kaydet
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingQuestion(null)}
                                                                                className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
                                                                            >
                                                                                ❌ İptal
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                /* Soru Görüntüleme */
                                                                <div>
                                                                    {/* Header */}
                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                                <span className="text-blue-600 font-bold text-sm">#{index + 1}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                                                    question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                                                                    question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                                                    'bg-red-100 text-red-700'
                                                                                }`}>
                                                                                    {question.difficulty === 'easy' ? 'Kolay' :
                                                                                     question.difficulty === 'medium' ? 'Orta' : 'Zor'}
                                                                                </span>
                                                                                <span className="text-xs text-gray-500">
                                                                                    {question.createdAt?.toDate().toLocaleDateString('tr-TR')}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                onClick={() => handleEditQuestion(question)}
                                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                                title="Düzenle"
                                                                            >
                                                                                <FaEdit className="h-4 w-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteQuestion(question.id)}
                                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                                title="Sil"
                                                                            >
                                                                                <FaTrash className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {/* Soru Metni */}
                                                                    <div className="mb-4">
                                                                        <div 
                                                                            className="text-gray-900 font-medium text-base leading-relaxed"
                                                                            dangerouslySetInnerHTML={{ __html: question.soruMetni }}
                                                                        />
                                                                    </div>
                                                                    
                                                                    {/* Seçenekler */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                                        {question.cevaplar?.map((cevap, cevapIndex) => (
                                                                            <div
                                                                                key={cevapIndex}
                                                                                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                                                                                    question.dogruCevap === String.fromCharCode(65 + cevapIndex)
                                                                                        ? "bg-green-50 border-green-300 text-green-800 shadow-sm"
                                                                                        : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                                                        question.dogruCevap === String.fromCharCode(65 + cevapIndex)
                                                                                            ? "bg-green-500 text-white"
                                                                                            : "bg-gray-300 text-gray-600"
                                                                                    }`}>
                                                                                        {String.fromCharCode(65 + cevapIndex)}
                                                                                    </div>
                                                                                    <span className="text-sm">{cevap}</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    
                                                                    {/* Açıklama */}
                                                                    {question.aciklama && (
                                                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                                            <div className="flex items-start gap-2">
                                                                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                                    <span className="text-white text-xs font-bold">i</span>
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="text-blue-800 font-semibold text-sm mb-1">Açıklama</h4>
                                                                                    <div className="text-blue-700 text-sm" dangerouslySetInnerHTML={{ __html: question.aciklama }} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isBulkDownloadOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Toplu İndir - {bulkTopicName}</h2>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">İndirme Tipi</h3>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input type="radio" className="form-radio" checked={downloadType === 'tum'} onChange={() => setDownloadType('tum')} />
                                            <span>Tüm İçerik (cevap + açıklama + zorluk)</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input type="radio" className="form-radio" checked={downloadType === 'sadeceSorular'} onChange={() => setDownloadType('sadeceSorular')} />
                                            <span>Sadece Sorular (question + options)</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">İndirme Miktarı</h3>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {['all','10','20','30','custom','secili'].map(opt => (
                                            <button key={opt} onClick={() => handleAmountTypeChange(opt)} className={`px-3 py-1 rounded-lg text-sm border ${amountType===opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}>
                                                {opt === 'all' ? 'Tüm sorular' : opt === 'custom' ? 'Özel' : opt === 'secili' ? 'Seçili' : `İlk ${opt}`}
                                            </button>
                                        ))}
                                        {amountType === 'custom' && (
                                            <input type="number" min={1} max={bulkQuestions.length} value={customAmount} onChange={(e)=>{ const raw=e.target.value; const parsed=parseInt(raw||'0',10); if(isNaN(parsed)){ setCustomAmount(''); setFirstNSelected(0); return; } const clamped=Math.min(Math.max(parsed,1), bulkQuestions.length); setCustomAmount(String(clamped)); setFirstNSelected(clamped); }} className="ml-2 w-24 px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" placeholder={`1-${bulkQuestions.length}`} />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sorular ({bulkQuestions.length})</h3>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">Seçili: {Object.values(selectedForDownload).filter(Boolean).length}</div>
                                </div>
                                <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
                                    {bulkQuestions.map((q, idx) => (
                                        <label key={q.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                            <input type="checkbox" className="mt-1" checked={!!selectedForDownload[q.id]} onChange={(e)=>{ setSelectedForDownload(prev=>({ ...prev, [q.id]: e.target.checked })); if(amountType !== 'secili'){ setAmountType('secili'); } }} />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-sm mb-1">
                                                    <span className="inline-flex items-center justify-center bg-blue-600 text-white font-semibold rounded-full w-6 h-6">{q.soruNumarasi || idx+1}</span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">{q.difficulty || 'medium'}</span>
                                                </div>
                                                <div className="text-sm text-gray-800 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: q.soruMetni }} />
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                            <button onClick={()=>setIsBulkDownloadOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">İptal</button>
                            <button onClick={performDownloadFromModal} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">JSON İndir</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default SoruHavuzuPage;