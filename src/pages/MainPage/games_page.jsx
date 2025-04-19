import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { collection, getDocs, addDoc, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

function GamesPage() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isHangmanModalOpen, setIsHangmanModalOpen] = useState(false);
    const [hangmanQuestion, setHangmanQuestion] = useState("");
    const [hangmanAnswer, setHangmanAnswer] = useState("");
    const [hangmanQuestions, setHangmanQuestions] = useState([]);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [showQuestions, setShowQuestions] = useState(false);

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

    // Soruları yükle
    const loadHangmanQuestions = async () => {
        try {
            const questionsRef = collection(db, "hangman_questions");
            const q = query(questionsRef, orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            setHangmanQuestions(
                querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
            );
        } catch (error) {
            console.error("Sorular yüklenirken hata:", error);
            toast.error("Sorular yüklenirken bir hata oluştu!");
        }
    };

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
        loadHangmanQuestions();
    }, []);

    const handleHangmanSubmit = async (e) => {
        e.preventDefault();
        
        if (!hangmanQuestion.trim() || !hangmanAnswer.trim()) {
            toast.error("Soru ve cevap alanları boş bırakılamaz!");
            return;
        }

        try {
            if (editingQuestion) {
                // Güncelleme
                await updateDoc(doc(db, "hangman_questions", editingQuestion.id), {
                    question: hangmanQuestion.trim(),
                    answer: hangmanAnswer.trim().toUpperCase(),
                    updatedAt: new Date()
                });
                toast.success("Soru başarıyla güncellendi!");
            } else {
                // Yeni soru ekleme
                await addDoc(collection(db, "hangman_questions"), {
                    question: hangmanQuestion.trim(),
                    answer: hangmanAnswer.trim().toUpperCase(),
                    createdAt: new Date()
                });
                toast.success("Soru başarıyla eklendi!");
            }
            
            // Formu temizle
            setHangmanQuestion("");
            setHangmanAnswer("");
            setEditingQuestion(null);
            
            // Soruları yeniden yükle
            await loadHangmanQuestions();
            
            // Modalı kapat
            setIsHangmanModalOpen(false);

        } catch (error) {
            console.error("Soru işlemi sırasında hata:", error);
            toast.error("İşlem sırasında bir hata oluştu!");
        }
    };

    const handleEditQuestion = (question) => {
        setEditingQuestion(question);
        setHangmanQuestion(question.question);
        setHangmanAnswer(question.answer);
        setIsHangmanModalOpen(true);
    };

    const handleDeleteQuestion = async (questionId) => {
        if (!window.confirm("Bu soruyu silmek istediğinizden emin misiniz?")) {
            return;
        }

        try {
            await deleteDoc(doc(db, "hangman_questions", questionId));
            toast.success("Soru başarıyla silindi!");
            await loadHangmanQuestions();
        } catch (error) {
            console.error("Soru silinirken hata:", error);
            toast.error("Soru silinirken bir hata oluştu!");
        }
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
                                            setShowQuestions(true);
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

                    {/* Adam Asmaca Soruları Listesi */}
                    {showQuestions && (
                        <div className="mt-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Adam Asmaca Soruları
                                </h2>
                                <button
                                    onClick={() => {
                                        setEditingQuestion(null);
                                        setHangmanQuestion("");
                                        setHangmanAnswer("");
                                        setIsHangmanModalOpen(true);
                                    }}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                    Yeni Soru Ekle
                                </button>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Soru
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Cevap
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    İşlemler
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {hangmanQuestions.map((question) => (
                                                <tr key={question.id}>
                                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-900 dark:text-white">
                                                        {question.question}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                                                        {question.answer}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => handleEditQuestion(question)}
                                                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                                                        >
                                                            Düzenle
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteQuestion(question.id)}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                        >
                                                            Sil
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Adam Asmaca Soru Ekleme/Düzenleme Modalı */}
            {isHangmanModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {editingQuestion ? "Soruyu Düzenle" : "Yeni Soru Ekle"}
                        </h2>
                        
                        <form onSubmit={handleHangmanSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Soru
                                </label>
                                <input
                                    type="text"
                                    value={hangmanQuestion}
                                    onChange={(e) => setHangmanQuestion(e.target.value)}
                                    placeholder="Örn: Türkiye'nin başkenti neresidir?"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Cevap
                                </label>
                                <input
                                    type="text"
                                    value={hangmanAnswer}
                                    onChange={(e) => setHangmanAnswer(e.target.value)}
                                    placeholder="Örn: ANKARA"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                                />
                            </div>
                            
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsHangmanModalOpen(false);
                                        setEditingQuestion(null);
                                        setHangmanQuestion("");
                                        setHangmanAnswer("");
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                >
                                    {editingQuestion ? "Güncelle" : "Ekle"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default GamesPage; 