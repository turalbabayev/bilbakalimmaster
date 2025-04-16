import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { toast } from "react-hot-toast";
import AddMindCardModal from "../../components/AddMindCardModal";
import EditMindCardModal from "../../components/EditMindCardModal";
import AddCurrentInfo from "../../components/AddCurrentInfo";
import CurrentInfoList from "../../components/CurrentInfoList";
import { useTopics } from "../../hooks/useTopics";

function NotesPage() {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('mindCards');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [selectedKonu, setSelectedKonu] = useState(null);
    const currentInfoListRef = useRef(null);
    const { topics, loading: topicsLoading } = useTopics();

    useEffect(() => {
        const unsubscribers = [];

        const fetchCardsForTopic = (topicId) => {
            const konuRef = doc(db, "miniCards-konular", topicId);
            const cardsRef = collection(konuRef, "cards");
            const q = query(cardsRef, orderBy("createdAt", "desc"));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const topicCards = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    konuId: topicId,
                    konuBaslik: topics.find(t => t.id === topicId)?.baslik
                }));

                setCards(prevCards => {
                    const otherTopicCards = prevCards.filter(card => card.konuId !== topicId);
                    return [...otherTopicCards, ...topicCards];
                });
                setLoading(false);
            });

            unsubscribers.push(unsubscribe);
        };

        if (topics.length > 0) {
            topics.forEach(topic => {
                fetchCardsForTopic(topic.id);
            });
        }

        // Cleanup function
        return () => {
            unsubscribers.forEach(unsubscribe => unsubscribe());
        };
    }, [topics]);

    const handleDelete = async (konuId, cardId) => {
        if (window.confirm("Bu akıl kartını silmek istediğinizden emin misiniz?")) {
            setDeletingId(cardId);
            try {
                const konuRef = doc(db, "miniCards-konular", konuId);
                const cardRef = doc(konuRef, "cards", cardId);
                await deleteDoc(cardRef);
                toast.success("Akıl kartı başarıyla silindi!");
            } catch (error) {
                console.error("Akıl kartı silinirken hata:", error);
                toast.error("Akıl kartı silinirken bir hata oluştu!");
            } finally {
                setDeletingId(null);
            }
        }
    };

    const handleEdit = (card, konuId) => {
        setSelectedCard({...card, konuId});
        setIsEditModalOpen(true);
    };

    const handleEditSuccess = () => {
        // This function is called when the edit modal is closed
        // You might want to refresh the cards or handle any other necessary actions
    };

    const handleKonuSelect = (konuId) => {
        setSelectedKonu(konuId);
    };

    const handleBackToKonular = () => {
        setSelectedKonu(null);
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
                        <div className="flex space-x-4">
                            <button
                                onClick={() => {
                                    setActiveTab('mindCards');
                                    setSelectedKonu(null);
                                }}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                                    activeTab === 'mindCards'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                Akıl Kartları
                            </button>
                            <button
                                onClick={() => setActiveTab('currentInfo')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                                    activeTab === 'currentInfo'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                Güncel Bilgiler
                            </button>
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            {activeTab === 'mindCards' ? 'Yeni Kart Ekle' : 'Yeni Güncel Bilgi Ekle'}
                        </button>
                    </div>

                    {activeTab === 'mindCards' && (
                        loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : selectedKonu ? (
                            <div>
                                <div className="flex items-center mb-6">
                                    <button
                                        onClick={handleBackToKonular}
                                        className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Konulara Dön
                                    </button>
                                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-white ml-4">
                                        {topics.find(t => t.id === selectedKonu)?.baslik}
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {cards.filter(card => card.konuId === selectedKonu).map((card) => (
                                        <div
                                            key={card.id}
                                            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                                        >
                                            {card.resim && (
                                                <div className="relative h-48 overflow-hidden">
                                                    <img
                                                        src={`data:${card.resimTuru};base64,${card.resim}`}
                                                        alt={card.topic}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                        {card.altKonu}
                                                    </h3>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleEdit(card, selectedKonu)}
                                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(selectedKonu, card.id)}
                                                            disabled={deletingId === card.id}
                                                            className={`${
                                                                deletingId === card.id
                                                                    ? 'text-gray-400'
                                                                    : 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300'
                                                            }`}
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div
                                                    className="prose dark:prose-invert max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: card.content }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {topics.map((topic) => {
                                    const cardCount = cards.filter(card => card.konuId === topic.id).length;
                                    return (
                                        <button
                                            key={topic.id}
                                            onClick={() => handleKonuSelect(topic.id)}
                                            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 text-left"
                                        >
                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                                {topic.baslik}
                                            </h3>
                                            {cardCount > 0 ? (
                                                <p className="text-gray-600 dark:text-gray-400">
                                                    {cardCount} adet kart
                                                </p>
                                            ) : (
                                                <div className="flex items-center text-gray-500 dark:text-gray-400">
                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                    </svg>
                                                    <span>Henüz kart eklenmemiş</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {activeTab === 'currentInfo' && (
                        <CurrentInfoList ref={currentInfoListRef} />
                    )}

                    {/* Modallar */}
                    {activeTab === 'mindCards' ? (
                        <>
                            <AddMindCardModal
                                isOpen={isAddModalOpen}
                                onClose={() => setIsAddModalOpen(false)}
                                onSuccess={() => {
                                    // Refresh cards after adding a new one
                                    setSelectedKonu(null);
                                }}
                            />
                            <EditMindCardModal
                                isOpen={isEditModalOpen}
                                onClose={() => setIsEditModalOpen(false)}
                                card={selectedCard}
                                konuId={selectedCard?.konuId}
                                onSuccess={handleEditSuccess}
                            />
                        </>
                    ) : (
                        <AddCurrentInfo
                            isOpen={isAddModalOpen}
                            onClose={() => setIsAddModalOpen(false)}
                            onSuccess={() => currentInfoListRef.current?.fetchGuncelBilgiler()}
                        />
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default NotesPage; 