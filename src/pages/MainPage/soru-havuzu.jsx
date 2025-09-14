import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { FaArrowLeft, FaEdit, FaTrash, FaBookReader, FaChevronDown, FaChevronRight, FaTrashAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';

const SoruHavuzuPage = () => {
    const navigate = useNavigate();
    const [manualQuestions, setManualQuestions] = useState([]);
    const [konular, setKonular] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [expandedTopics, setExpandedTopics] = useState({});
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
        
        // Manuel soruları yükle
        const unsubscribeQuestions = onSnapshot(collection(db, 'manual-questions'), (snapshot) => {
            const questions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setManualQuestions(questions.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()));
        });

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
        </Layout>
    );
};

export default SoruHavuzuPage;