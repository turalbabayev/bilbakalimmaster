import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import AddMindCardModal from "../../components/AddMindCardModal";
import EditMindCardModal from "../../components/EditMindCardModal";
import AddCurrentInfo from "../../components/AddCurrentInfo";
import CurrentInfoList from "../../components/CurrentInfoList";

function NotesPage() {
    const [mindCards, setMindCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('mindCards');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const currentInfoListRef = useRef(null);

    const fetchData = async () => {
        try {
            // Akıl Kartlarını getir
            const mindCardsRef = collection(db, "mindCards");
            const mindCardsQuery = query(mindCardsRef, orderBy("createdAt", "desc"));
            const mindCardsSnapshot = await getDocs(mindCardsQuery);
            
            // Kartları konulara göre grupla
            const groupedCards = {};
            mindCardsSnapshot.docs.forEach(doc => {
                const card = { id: doc.id, ...doc.data() };
                const konuId = card.konu?.id || "diğer";
                
                if (!groupedCards[konuId]) {
                    groupedCards[konuId] = {
                        konuBaslik: card.konu?.baslik || "Diğer",
                        cards: []
                    };
                }
                groupedCards[konuId].cards.push(card);
            });
            
            setMindCards(groupedCards);
        } catch (error) {
            console.error("Veriler yüklenirken hata:", error);
            toast.error("Veriler yüklenirken bir hata oluştu!");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bu akıl kartını silmek istediğinizden emin misiniz?")) {
            setDeletingId(id);
            try {
                await deleteDoc(doc(db, "mindCards", id));
                toast.success("Akıl kartı başarıyla silindi!");
                fetchData();
            } catch (error) {
                console.error("Akıl kartı silinirken hata:", error);
                toast.error("Akıl kartı silinirken bir hata oluştu!");
            } finally {
                setDeletingId(null);
            }
        }
    };

    const handleEdit = (card) => {
        setSelectedCard(card);
        setIsEditModalOpen(true);
    };

    const handleEditSuccess = () => {
        fetchData();
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setActiveTab('mindCards')}
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
                        ) : (
                            Object.entries(mindCards).map(([konuId, { konuBaslik, cards }]) => (
                                <div key={konuId} className="mb-8">
                                    <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                                        {konuBaslik}
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {cards.map((card) => (
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
                                                            {card.topic}
                                                        </h3>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleEdit(card)}
                                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(card.id)}
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
                                                    {card.altKonu && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                            Alt Konu: {card.altKonu}
                                                        </p>
                                                    )}
                                                    <div
                                                        className="prose dark:prose-invert max-w-none"
                                                        dangerouslySetInnerHTML={{ __html: card.content }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )
                    )}

                    {/* Modallar */}
                    {activeTab === 'mindCards' ? (
                        <>
                            <AddMindCardModal
                                isOpen={isAddModalOpen}
                                onClose={() => setIsAddModalOpen(false)}
                                onSuccess={fetchData}
                            />
                            <EditMindCardModal
                                isOpen={isEditModalOpen}
                                onClose={() => setIsEditModalOpen(false)}
                                card={selectedCard}
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