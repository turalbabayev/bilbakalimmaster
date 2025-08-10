import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { FaArrowLeft, FaEdit, FaTrash, FaBookReader } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';

const SoruHavuzuPage = () => {
    const navigate = useNavigate();
    const [manualQuestions, setManualQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [editForm, setEditForm] = useState({
        soruMetni: '',
        cevaplar: ['', '', '', '', ''],
        dogruCevap: 'A',
        aciklama: '',
        difficulty: 'medium',
        topicName: ''
    });

    // Manuel soruları yükle
    useEffect(() => {
        setLoading(true);
        const unsubscribe = onSnapshot(collection(db, 'manual-questions'), (snapshot) => {
            const questions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setManualQuestions(questions.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center">
                        <button 
                            onClick={() => navigate('/deneme-sinavlari')}
                            className="mr-4 p-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <FaArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Soru Havuzu</h1>
                            <p className="text-gray-600 mt-2">Manuel eklenen soruları görüntüleyin ve düzenleyin</p>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600">
                        Toplam {manualQuestions.length} soru
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : manualQuestions.length === 0 ? (
                    <div className="text-center py-16">
                        <FaBookReader className="h-24 w-24 text-gray-300 mx-auto mb-6" />
                        <h3 className="text-2xl font-medium text-gray-900 mb-4">Henüz soru bulunmuyor</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Manuel soru eklemek için sınav oluşturma sayfasını kullanın. Eklediğiniz sorular burada görüntülenecek.
                        </p>
                        <button
                            onClick={() => navigate('/create-exam')}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Soru Ekle
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {manualQuestions.map((question) => (
                            <div key={question.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                                {editingQuestion === question.id ? (
                                    /* Düzenleme Formu */
                                    <div className="p-6 bg-gray-50">
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Soruyu Düzenle</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Soru Metni</label>
                                                <textarea
                                                    value={editForm.soruMetni}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, soruMetni: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    rows="3"
                                                />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {editForm.cevaplar.map((cevap, index) => (
                                                    <div key={index}>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            {String.fromCharCode(65 + index)} Seçeneği
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={cevap}
                                                            onChange={(e) => {
                                                                const newCevaplar = [...editForm.cevaplar];
                                                                newCevaplar[index] = e.target.value;
                                                                setEditForm(prev => ({ ...prev, cevaplar: newCevaplar }));
                                                            }}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Doğru Cevap</label>
                                                    <select
                                                        value={editForm.dogruCevap}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, dogruCevap: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="A">A</option>
                                                        <option value="B">B</option>
                                                        <option value="C">C</option>
                                                        <option value="D">D</option>
                                                        <option value="E">E</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Zorluk</label>
                                                    <select
                                                        value={editForm.difficulty}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, difficulty: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="easy">Kolay</option>
                                                        <option value="medium">Orta</option>
                                                        <option value="hard">Zor</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Konu</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.topicName}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, topicName: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                                                <textarea
                                                    value={editForm.aciklama}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, aciklama: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    rows="2"
                                                />
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    onClick={handleUpdateQuestion}
                                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                                                >
                                                    Kaydet
                                                </button>
                                                <button
                                                    onClick={() => setEditingQuestion(null)}
                                                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                                                >
                                                    İptal
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Soru Görüntüleme */
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                                                        {question.topicName}
                                                    </span>
                                                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                                                        question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {question.difficulty === 'easy' ? 'Kolay' :
                                                         question.difficulty === 'medium' ? 'Orta' : 'Zor'}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        {question.createdAt?.toDate().toLocaleDateString('tr-TR')}
                                                    </span>
                                                </div>
                                                <div 
                                                    className="text-gray-900 font-medium mb-4 text-lg"
                                                    dangerouslySetInnerHTML={{ __html: question.soruMetni }}
                                                />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                    {question.cevaplar?.map((cevap, index) => (
                                                        <div
                                                            key={index}
                                                            className={`p-3 rounded-lg border-2 text-sm ${
                                                                question.dogruCevap === String.fromCharCode(65 + index)
                                                                    ? "bg-green-50 border-green-200 text-green-800"
                                                                    : "bg-gray-50 border-gray-200 text-gray-700"
                                                            }`}
                                                        >
                                                            <span className="font-bold mr-2">
                                                                {String.fromCharCode(65 + index)}:
                                                            </span>
                                                            {cevap}
                                                        </div>
                                                    ))}
                                                </div>
                                                {question.aciklama && (
                                                    <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                                        <strong className="text-blue-800">Açıklama:</strong>
                                                        <div className="mt-1" dangerouslySetInnerHTML={{ __html: question.aciklama }} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2 ml-6">
                                                <button
                                                    onClick={() => handleEditQuestion(question)}
                                                    className="p-3 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                    title="Düzenle"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteQuestion(question.id)}
                                                    className="p-3 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                    title="Sil"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default SoruHavuzuPage; 