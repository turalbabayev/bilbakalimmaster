import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import AddMindCardModal from "../../components/AddMindCardModal";

function NotesPage() {
    const [mindCards, setMindCards] = useState([]);
    const [currentInfo, setCurrentInfo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('mindCards');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const fetchData = async () => {
        try {
            // Akıl Kartlarını getir
            const mindCardsRef = collection(db, "mindCards");
            const mindCardsQuery = query(mindCardsRef, orderBy("createdAt", "desc"));
            const mindCardsSnapshot = await getDocs(mindCardsQuery);
            setMindCards(mindCardsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })));

            // Güncel Bilgileri getir
            const currentInfoRef = collection(db, "currentInfo");
            const currentInfoQuery = query(currentInfoRef, orderBy("createdAt", "desc"));
            const currentInfoSnapshot = await getDocs(currentInfoQuery);
            setCurrentInfo(currentInfoSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })));
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

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-4">
                    {/* Başlık ve Sekmeler */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Notlar</h1>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setActiveTab('mindCards')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                                    activeTab === 'mindCards'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-600'
                                }`}
                            >
                                Akıl Kartları
                            </button>
                            <button
                                onClick={() => setActiveTab('currentInfo')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                                    activeTab === 'currentInfo'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-600'
                                }`}
                            >
                                Güncel Bilgiler
                            </button>
                        </div>
                    </div>

                    {/* İçerik Alanı */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        {/* Üst Kısım - Yeni Ekle Butonu */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                                {activeTab === 'mindCards' ? 'Akıl Kartları' : 'Güncel Bilgiler'}
                            </h2>
                            <button
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md transition-all duration-200 flex items-center"
                                onClick={() => setIsAddModalOpen(true)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                {activeTab === 'mindCards' ? 'Yeni Kart Ekle' : 'Yeni Bilgi Ekle'}
                            </button>
                        </div>

                        {/* İçerik Listesi */}
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeTab === 'mindCards' ? (
                                    mindCards.length > 0 ? (
                                        mindCards.map(card => (
                                            <div
                                                key={card.id}
                                                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                                                            {card.topic}
                                                        </h3>
                                                        <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
                                                            {card.subtopic}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center space-x-4">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {card.createdAt?.toDate().toLocaleDateString('tr-TR')}
                                                        </div>
                                                        <button
                                                            onClick={() => handleDelete(card.id)}
                                                            disabled={deletingId === card.id}
                                                            className={`p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 ${
                                                                deletingId === card.id ? 'opacity-50 cursor-not-allowed' : ''
                                                            }`}
                                                        >
                                                            {deletingId === card.id ? (
                                                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            ) : (
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div 
                                                    className="text-gray-600 dark:text-gray-300 mb-4 prose dark:prose-invert max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: card.content }}
                                                />

                                                {card.image && (
                                                    <div className="mt-4">
                                                        <img
                                                            src={`data:${card.imageType};base64,${card.image}`}
                                                            alt={card.topic}
                                                            className="max-h-40 rounded-lg shadow-sm"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                            Henüz akıl kartı eklenmemiş.
                                        </p>
                                    )
                                ) : (
                                    currentInfo.length > 0 ? (
                                        currentInfo.map(info => (
                                            <div
                                                key={info.id}
                                                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                                            >
                                                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                                                    {info.title}
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-300">
                                                    {info.content}
                                                </p>
                                                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(info.createdAt?.toDate()).toLocaleDateString('tr-TR')}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                            Henüz güncel bilgi eklenmemiş.
                                        </p>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Akıl Kartı Ekleme Modalı */}
            {activeTab === 'mindCards' && (
                <AddMindCardModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={fetchData}
                />
            )}
        </Layout>
    );
}

export default NotesPage; 