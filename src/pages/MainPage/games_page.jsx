import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { collection, getDocs, addDoc, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaPlus, FaArrowLeft } from "react-icons/fa";

function GamesPage() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHangman, setShowHangman] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [formData, setFormData] = useState({
        question: '',
        answer: '',
    });
    const navigate = useNavigate();

    // Varsayılan oyunları yükle
    const defaultGames = [
        {
            id: "yuzde-kac",
            title: "100'de Kaç",
            description: "Verilen sayının yüzdelik değerini bul",
            icon: "percentage",
            color: "blue"
        },
        {
            id: "eslestir",
            title: "Eşleştir",
            description: "Birbiriyle eşleşen kartları bul",
            icon: "puzzle",
            color: "purple"
        },
        {
            id: "kelime-bulmaca",
            title: "Kelime Bulmaca",
            description: "Gizlenmiş kelimeleri bul",
            icon: "search",
            color: "green"
        },
        {
            id: "adam-asmaca",
            title: "Adam Asmaca",
            description: "Kelimeyi tahmin et, adamı kurtar",
            icon: "user",
            color: "red"
        },
        {
            id: "hizli-matematik",
            title: "Hızlı Matematik",
            description: "Matematik işlemlerini hızlıca çöz",
            icon: "calculator",
            color: "yellow"
        },
        {
            id: "tic-tac-toe",
            title: "Tic Tac Toe",
            description: "Klasik XOX oyunu",
            icon: "grid",
            color: "pink"
        }
    ];

    useEffect(() => {
        const initializeGames = async () => {
            try {
                const gamesRef = collection(db, "games");
                const q = query(gamesRef, orderBy("title"));
                const querySnapshot = await getDocs(q);
                
                // Eğer oyunlar koleksiyonu boşsa, varsayılan oyunları ekle
                if (querySnapshot.empty) {
                    for (const game of defaultGames) {
                        await addDoc(gamesRef, {
                            ...game,
                            createdAt: new Date(),
                            isActive: true
                        });
                    }
                    toast.success("Varsayılan oyunlar yüklendi!");
                    const newSnapshot = await getDocs(q);
                    setGames(newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                } else {
                    setGames(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }
            } catch (error) {
                console.error("Oyunlar yüklenirken hata:", error);
                toast.error("Oyunlar yüklenirken bir hata oluştu!");
            } finally {
                setLoading(false);
            }
        };

        initializeGames();
    }, []);

    useEffect(() => {
        if (showHangman) {
            fetchHangmanQuestions();
        }
    }, [showHangman]);

    const fetchHangmanQuestions = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'hangmanQuestions'));
            const questionsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setQuestions(questionsData);
        } catch (error) {
            console.error('Error fetching questions:', error);
            toast.error('Sorular yüklenirken bir hata oluştu');
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
            setFormData({ question: '', answer: '' });
            fetchHangmanQuestions();
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
                fetchHangmanQuestions();
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
        });
        setShowModal(true);
    };

    const getColorClass = (color) => {
        const classes = {
            blue: "bg-blue-500 hover:bg-blue-600",
            purple: "bg-purple-500 hover:bg-purple-600",
            green: "bg-green-500 hover:bg-green-600",
            red: "bg-red-500 hover:bg-red-600",
            yellow: "bg-yellow-500 hover:bg-yellow-600",
            pink: "bg-pink-500 hover:bg-pink-600"
        };
        return classes[color] || classes.blue;
    };

    const getIcon = (iconName) => {
        switch (iconName) {
            case "percentage":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                );
            case "puzzle":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                );
            case "search":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                );
            case "user":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                );
            case "calculator":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                );
            case "grid":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    if (showHangman) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowHangman(false)}
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <FaArrowLeft size={24} />
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800">Adam Asmaca Soruları</h1>
                    </div>
                    <button
                        onClick={() => {
                            setEditingQuestion(null);
                            setFormData({ question: '', answer: '' });
                            setShowModal(true);
                        }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
                    >
                        <FaPlus /> Yeni Soru Ekle
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {questions.map((question, index) => (
                        <div 
                            key={question.id} 
                            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="bg-blue-100 text-blue-800 text-lg font-semibold px-4 py-1 rounded-full">
                                            #{index + 1}
                                        </span>
                                    </div>
                                    <h3 className="text-xl text-gray-800 mb-3">
                                        {question.question}
                                    </h3>
                                    <p className="text-gray-600">
                                        <span className="font-medium">Cevap:</span> {question.answer}
                                    </p>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={() => handleEdit(question)}
                                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <FaEdit size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(question.id)}
                                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <FaTrash size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">
                                {editingQuestion ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-gray-700 text-sm font-bold mb-2">
                                        Soru
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.question}
                                        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="Sorunuzu yazın..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-sm font-bold mb-2">
                                        Cevap
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.answer}
                                        onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="Cevabı yazın..."
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingQuestion(null);
                                            setFormData({ question: '', answer: '' });
                                        }}
                                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        {editingQuestion ? 'Güncelle' : 'Ekle'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {questions.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">Henüz soru eklenmemiş.</p>
                        <button
                            onClick={() => {
                                setEditingQuestion(null);
                                setFormData({ question: '', answer: '' });
                                setShowModal(true);
                            }}
                            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                        >
                            İlk soruyu ekleyin
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-4">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Oyunlar</h1>
                        <button
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md transition-all duration-200 flex items-center"
                            onClick={() => {/* Yeni oyun ekleme modalını aç */}}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Yeni Oyun Ekle
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {games.map((game) => (
                                <div
                                    key={game.id}
                                    onClick={() => {
                                        if (game.title === "Adam Asmaca") {
                                            setShowHangman(true);
                                        }
                                    }}
                                    className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl cursor-pointer ${getColorClass(game.color)} text-white`}
                                >
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="bg-white/20 rounded-lg p-2">
                                                {getIcon(game.icon)}
                                            </div>
                                            {game.isActive && (
                                                <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                                                    Aktif
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{game.title}</h3>
                                        <p className="text-white/80">{game.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default GamesPage; 