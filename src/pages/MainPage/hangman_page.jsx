import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const HangmanPage = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [formData, setFormData] = useState({
        question: '',
        answer: '',
        difficulty: 'Kolay'
    });

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'hangmanQuestions'));
            const questionsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setQuestions(questionsData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching questions:', error);
            toast.error('Sorular yüklenirken bir hata oluştu');
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingQuestion) {
                await updateDoc(doc(db, 'hangmanQuestions', editingQuestion.id), formData);
                toast.success('Soru başarıyla güncellendi');
            } else {
                await addDoc(collection(db, 'hangmanQuestions'), formData);
                toast.success('Soru başarıyla eklendi');
            }
            setShowModal(false);
            setEditingQuestion(null);
            setFormData({ question: '', answer: '', difficulty: 'Kolay' });
            fetchQuestions();
        } catch (error) {
            console.error('Error saving question:', error);
            toast.error('Soru kaydedilirken bir hata oluştu');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bu soruyu silmek istediğinizden emin misiniz?')) {
            try {
                await deleteDoc(doc(db, 'hangmanQuestions', id));
                toast.success('Soru başarıyla silindi');
                fetchQuestions();
            } catch (error) {
                console.error('Error deleting question:', error);
                toast.error('Soru silinirken bir hata oluştu');
            }
        }
    };

    const handleEdit = (question) => {
        setEditingQuestion(question);
        setFormData({
            question: question.question,
            answer: question.answer,
            difficulty: question.difficulty
        });
        setShowModal(true);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Adam Asmaca Soruları</h1>
                <button
                    onClick={() => {
                        setEditingQuestion(null);
                        setFormData({ question: '', answer: '', difficulty: 'Kolay' });
                        setShowModal(true);
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                    <FaPlus /> Yeni Soru Ekle
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {questions.map((question) => (
                        <div key={question.id} className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                        {question.question}
                                    </h3>
                                    <p className="text-gray-600 mb-2">Cevap: {question.answer}</p>
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                                        question.difficulty === 'Kolay' ? 'bg-green-100 text-green-800' :
                                        question.difficulty === 'Orta' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {question.difficulty}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(question)}
                                        className="text-blue-600 hover:text-blue-800 p-2"
                                    >
                                        <FaEdit size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(question.id)}
                                        className="text-red-600 hover:text-red-800 p-2"
                                    >
                                        <FaTrash size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">
                            {editingQuestion ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Soru
                                </label>
                                <input
                                    type="text"
                                    value={formData.question}
                                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Cevap
                                </label>
                                <input
                                    type="text"
                                    value={formData.answer}
                                    onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Zorluk Seviyesi
                                </label>
                                <select
                                    value={formData.difficulty}
                                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                >
                                    <option value="Kolay">Kolay</option>
                                    <option value="Orta">Orta</option>
                                    <option value="Zor">Zor</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingQuestion(null);
                                        setFormData({ question: '', answer: '', difficulty: 'Kolay' });
                                    }}
                                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                                >
                                    {editingQuestion ? 'Güncelle' : 'Ekle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HangmanPage; 