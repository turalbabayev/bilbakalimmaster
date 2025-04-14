import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { toast } from "react-hot-toast";
import AddMindCardModal from "../../components/AddMindCardModal";

function NotesPage() {
    const [mindCards, setMindCards] = useState([]);
    const [currentInfo, setCurrentInfo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('mindCards');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
                                                            {card.akılKartKonusu}
                                                        </h3>
                                                        <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
                                                            {card.akılKartAltKonusu}
                                                        </p>
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {card.createdAt?.toDate().toLocaleDateString('tr-TR')}
                                                    </div>
                                                </div>
                                                
                                                <div 
                                                    className="text-gray-600 dark:text-gray-300 mb-4 prose dark:prose-invert max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: card.akılKartİçeriği }}
                                                />

                                                {card.akılKartResmi && (
                                                    <div className="mt-4">
                                                        <img
                                                            src={`data:${card.resimTuru};base64,${card.akılKartResmi}`}
                                                            alt={card.akılKartKonusu}
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