import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc, onSnapshot, writeBatch, updateDoc, serverTimestamp, getDoc, where } from "firebase/firestore";
import { toast } from "react-hot-toast";
import AddMindCardModal from "../../components/AddMindCardModal";
import EditMindCardModal from "../../components/EditMindCardModal";
import AddCurrentInfo from "../../components/AddCurrentInfo";
import CurrentInfoList from "../../components/CurrentInfoList";
import { useTopics } from "../../hooks/useTopics";
import AddTopicModal from "../../components/AddTopicModal";
import BulkMindCardVerification from "../../components/BulkMindCardVerification";
import BulkDownloadMindCards from "../../components/BulkDownloadMindCards";
import BulkDeleteMindCards from "../../components/BulkDeleteMindCards";

function NotesPage() {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('mindCards');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isBulkVerificationOpen, setIsBulkVerificationOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [selectedKonu, setSelectedKonu] = useState(null);
    const currentInfoListRef = useRef(null);
    const bulkVerificationRef = useRef(null);
    const { topics, loading: topicsLoading } = useTopics();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedKonuForDelete, setSelectedKonuForDelete] = useState("");
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
    const [isBulkDownloadOpen, setIsBulkDownloadOpen] = useState(false);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [seciliTakasKart, setSeciliTakasKart] = useState(null);
    const [guncelBilgiler, setGuncelBilgiler] = useState([]);

    useEffect(() => {
        const unsubscribers = [];

        const fetchCardsForTopic = (topicId) => {
            const konuRef = doc(db, "miniCards-konular", topicId);
            const cardsRef = collection(konuRef, "cards");
            const q = query(cardsRef, orderBy("kartNo", "asc"));

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
            setLoading(true);
            // Önce cards'ı temizle
            setCards([]);
            // Sonra tüm konular için kartları yükle
            topics.forEach(topic => {
                fetchCardsForTopic(topic.id);
            });
        }

        // Cleanup function
        return () => {
            unsubscribers.forEach(unsubscribe => unsubscribe());
        };
    }, [topics]);

    const yenidenNumaralandir = async (konuId) => {
        try {
            const konuRef = doc(db, "miniCards-konular", konuId);
            const cardsRef = collection(konuRef, "cards");
            const q = query(cardsRef, orderBy("kartNo", "asc"));
            const snapshot = await getDocs(q);
            
            const batch = writeBatch(db);
            snapshot.docs.forEach((doc, index) => {
                batch.update(doc.ref, { kartNo: index + 1 });
            });
            
            await batch.commit();
        } catch (error) {
            console.error("Kartlar yeniden numaralandırılırken hata:", error);
            toast.error("Kartlar yeniden numaralandırılırken bir hata oluştu!");
        }
    };

    const handleDelete = async (konuId, cardId) => {
        if (window.confirm("Bu akıl kartını silmek istediğinizden emin misiniz?")) {
            setDeletingId(cardId);
            try {
                const konuRef = doc(db, "miniCards-konular", konuId);
                const cardRef = doc(konuRef, "cards", cardId);
                await deleteDoc(cardRef);
                await yenidenNumaralandir(konuId);
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

    const handleBulkDelete = async () => {
        if (!selectedKonuForDelete) {
            toast.error("Lütfen bir konu seçin!");
            return;
        }

        if (!window.confirm(`${topics.find(t => t.id === selectedKonuForDelete)?.baslik} konusundaki TÜM kartlar silinecek. Emin misiniz?`)) {
            return;
        }

        setIsDeletingAll(true);
        try {
            const konuRef = doc(db, "miniCards-konular", selectedKonuForDelete);
            const cardsRef = collection(konuRef, "cards");
            const cardsQuery = query(cardsRef);
            const snapshot = await getDocs(cardsQuery);

            // Batch işlemi başlat
            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Batch işlemini uygula
            await batch.commit();
            
            toast.success("Tüm kartlar başarıyla silindi!");
            setIsDeleteModalOpen(false);
            setSelectedKonuForDelete("");
        } catch (error) {
            console.error("Kartlar silinirken hata:", error);
            toast.error("Kartlar silinirken bir hata oluştu!");
        } finally {
            setIsDeletingAll(false);
        }
    };

    const handleCardUpdate = async (card, updatedContent) => {
        try {
            const cardRef = doc(db, 'miniCards-konular', card.konuId, 'cards', card.id);
            await updateDoc(cardRef, {
                content: updatedContent,
                updatedAt: serverTimestamp()
            });
            toast.success('Kart başarıyla güncellendi!');
        } catch (error) {
            console.error('Kart güncellenirken hata:', error);
            toast.error('Kart güncellenirken bir hata oluştu!');
        }
    };

    const handleUpdateFromBulkVerification = (card) => {
        setSelectedCard(card);
        setIsEditModalOpen(true);
    };

    const refreshCards = () => {
        // Kartları yeniden yükle
        const unsubscribers = [];
        setLoading(true);
        setCards([]);

        topics.forEach(topic => {
            const konuRef = doc(db, "miniCards-konular", topic.id);
            const cardsRef = collection(konuRef, "cards");
            const q = query(cardsRef, orderBy("kartNo", "asc"));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const topicCards = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    konuId: topic.id,
                    konuBaslik: topic.baslik
                }));

                setCards(prevCards => {
                    const otherTopicCards = prevCards.filter(card => card.konuId !== topic.id);
                    return [...otherTopicCards, ...topicCards];
                });
                setLoading(false);
            });

            unsubscribers.push(unsubscribe);
        });

        return () => {
            unsubscribers.forEach(unsubscribe => unsubscribe());
        };
    };

    const handleKartTakasSecim = (kart) => {
        if (seciliTakasKart === null) {
            setSeciliTakasKart(kart);
            toast.success(`${kart.kartNo} numaralı kart takas için seçildi. Şimdi takas edilecek diğer kartı seçin.`);
        } else {
            if (seciliTakasKart.id === kart.id) {
                setSeciliTakasKart(null);
                toast.error('Takas işlemi iptal edildi.');
                return;
            }

            handleKartTakas(seciliTakasKart, kart);
        }
    };

    const handleKartTakas = async (kart1, kart2) => {
        try {
            const kart1Ref = doc(db, `miniCards-konular/${kart1.konuId}/cards`, kart1.id);
            const kart2Ref = doc(db, `miniCards-konular/${kart2.konuId}/cards`, kart2.id);

            const batch = writeBatch(db);
            
            // Kartların numaralarını takas et
            batch.update(kart1Ref, { 
                kartNo: kart2.kartNo,
                updatedAt: serverTimestamp()
            });
            batch.update(kart2Ref, { 
                kartNo: kart1.kartNo,
                updatedAt: serverTimestamp()
            });

            await batch.commit();
            toast.success(`${kart1.kartNo} ve ${kart2.kartNo} numaralı kartlar takaslandı!`);
        } catch (error) {
            console.error('Kart takas işleminde hata:', error);
            toast.error('Kartlar takaslanırken bir hata oluştu!');
        } finally {
            setSeciliTakasKart(null);
        }
    };

    const guncelBilgileriTasi = async () => {
        try {
            // Eski koleksiyondan tüm güncel bilgileri al
            const guncelBilgilerRef = collection(db, "guncelBilgiler");
            const q = query(guncelBilgilerRef, orderBy("tarih", "desc"));
            const snapshot = await getDocs(q);
            
            // Batch işlemi başlat
            const batch = writeBatch(db);
            let bilgiNo = 1;
            
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                batch.update(doc.ref, {
                    ...data,
                    bilgiNo,
                    updatedAt: serverTimestamp()
                });
                bilgiNo++;
            });
            
            await batch.commit();
            toast.success("Güncel bilgiler başarıyla numaralandırıldı!");
        } catch (error) {
            console.error("Güncel bilgiler numaralandırılırken hata:", error);
            toast.error("Güncel bilgiler numaralandırılırken bir hata oluştu!");
        }
    };

    const guncelBilgiSil = async (bilgiId) => {
        try {
            const bilgiRef = doc(db, "guncelBilgiler", bilgiId);
            
            // Silinecek bilginin numarasını al
            const bilgiDoc = await getDoc(bilgiRef);
            const silinenBilgiNo = bilgiDoc.data().bilgiNo;

            // Bilgiyi sil
            await deleteDoc(bilgiRef);

            // Diğer bilgilerin numaralarını güncelle
            const guncelBilgilerRef = collection(db, "guncelBilgiler");
            const q = query(guncelBilgilerRef, 
                where("bilgiNo", ">", silinenBilgiNo),
                orderBy("bilgiNo")
            );
            const snapshot = await getDocs(q);

            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    bilgiNo: doc.data().bilgiNo - 1,
                    updatedAt: serverTimestamp()
                });
            });
            await batch.commit();

            toast.success('Güncel bilgi başarıyla silindi!');
            refreshGuncelBilgiler();
        } catch (error) {
            console.error('Güncel bilgi silinirken hata:', error);
            toast.error('Güncel bilgi silinirken bir hata oluştu!');
        }
    };

    const guncelBilgiTasi = async (bilgiId, yeniBilgiNo) => {
        try {
            const bilgiRef = doc(db, "guncelBilgiler", bilgiId);
            
            // Taşınacak bilginin mevcut numarasını al
            const bilgiDoc = await getDoc(bilgiRef);
            const eskiBilgiNo = bilgiDoc.data().bilgiNo;

            const batch = writeBatch(db);
            const guncelBilgilerRef = collection(db, "guncelBilgiler");

            if (yeniBilgiNo > eskiBilgiNo) {
                // Yukarı taşınıyorsa, aradaki bilgileri bir aşağı kaydır
                const q = query(guncelBilgilerRef,
                    where("bilgiNo", ">", eskiBilgiNo),
                    where("bilgiNo", "<=", yeniBilgiNo),
                    orderBy("bilgiNo")
                );
                const snapshot = await getDocs(q);
                snapshot.docs.forEach(doc => {
                    batch.update(doc.ref, {
                        bilgiNo: doc.data().bilgiNo - 1,
                        updatedAt: serverTimestamp()
                    });
                });
            } else {
                // Aşağı taşınıyorsa, aradaki bilgileri bir yukarı kaydır
                const q = query(guncelBilgilerRef,
                    where("bilgiNo", ">=", yeniBilgiNo),
                    where("bilgiNo", "<", eskiBilgiNo),
                    orderBy("bilgiNo")
                );
                const snapshot = await getDocs(q);
                snapshot.docs.forEach(doc => {
                    batch.update(doc.ref, {
                        bilgiNo: doc.data().bilgiNo + 1,
                        updatedAt: serverTimestamp()
                    });
                });
            }

            // Bilgiyi güncelle
            batch.update(bilgiRef, {
                bilgiNo: yeniBilgiNo,
                updatedAt: serverTimestamp()
            });

            await batch.commit();
            toast.success('Güncel bilgi başarıyla taşındı!');
            refreshGuncelBilgiler();
        } catch (error) {
            console.error('Güncel bilgi taşınırken hata:', error);
            toast.error('Güncel bilgi taşınırken bir hata oluştu!');
        }
    };

    const refreshGuncelBilgiler = async () => {
        try {
            const guncelBilgilerRef = collection(db, "guncelBilgiler");
            const q = query(guncelBilgilerRef, orderBy("bilgiNo", "asc"));
            const snapshot = await getDocs(q);
            const bilgiler = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setGuncelBilgiler(bilgiler);
        } catch (error) {
            console.error('Güncel bilgiler alınırken hata:', error);
            toast.error('Güncel bilgiler alınırken bir hata oluştu!');
        }
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
                        <div className="flex space-x-4">
                            {activeTab === 'mindCards' ? (
                                <>
                                    <button
                                        onClick={() => setIsAddTopicModalOpen(true)}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Yeni Konu
                                    </button>
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Yeni Kart
                                    </button>
                                    <button
                                        onClick={() => setIsDeleteModalOpen(true)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Toplu Sil
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Yeni Güncel Bilgi Ekle
                                </button>
                            )}
                        </div>
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
                                    <button
                                        onClick={() => setIsBulkVerificationOpen(true)}
                                        className="ml-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Toplu Doğrula
                                    </button>
                                    <button
                                        onClick={() => setIsBulkDownloadOpen(true)}
                                        className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                        Toplu İndir
                                    </button>
                                    <button
                                        onClick={() => setIsBulkDeleteOpen(true)}
                                        className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Toplu Sil
                                    </button>
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
                                                    <div>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">
                                                            Kart No: {card.kartNo}
                                                        </span>
                                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                            {card.altKonu}
                                                        </h3>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleKartTakasSecim(card)}
                                                            className={`text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 ${
                                                                seciliTakasKart?.id === card.id ? 'ring-2 ring-yellow-500 rounded-full' : ''
                                                            }`}
                                                            title="Kart sırasını değiştir"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
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
                    <AddMindCardModal
                        isOpen={isAddModalOpen && activeTab === 'mindCards'}
                        onClose={() => setIsAddModalOpen(false)}
                        topics={topics}
                        selectedKonu={selectedKonu}
                    />
                    {isEditModalOpen && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60]">
                            <EditMindCardModal
                                isOpen={isEditModalOpen}
                                onClose={() => setIsEditModalOpen(false)}
                                card={selectedCard}
                                onSuccess={handleEditSuccess}
                            />
                        </div>
                    )}
                    <AddCurrentInfo
                        isOpen={isAddModalOpen && activeTab === 'currentInfo'}
                        onClose={() => setIsAddModalOpen(false)}
                        onSuccess={() => {
                            if (currentInfoListRef.current) {
                                currentInfoListRef.current.refreshList();
                            }
                        }}
                    />
                    <AddTopicModal
                        isOpen={isAddTopicModalOpen}
                        onClose={() => setIsAddTopicModalOpen(false)}
                    />

                    {/* Toplu Silme Modalı */}
                    {isDeleteModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                                    Toplu Kart Silme
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    Seçtiğiniz konudaki tüm kartlar silinecektir. Bu işlem geri alınamaz.
                                </p>
                                <div className="mb-4">
                                    <select
                                        value={selectedKonuForDelete}
                                        onChange={(e) => setSelectedKonuForDelete(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="">Konu Seçin</option>
                                        {topics.map((topic) => (
                                            <option key={topic.id} value={topic.id}>
                                                {topic.baslik}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        disabled={isDeletingAll || !selectedKonuForDelete}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                    >
                                        {isDeletingAll ? 'Siliniyor...' : 'Tümünü Sil'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Toplu Doğrulama Modalı */}
                    {isBulkVerificationOpen && selectedKonu && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                                        Toplu Kart Doğrulama
                                    </h2>
                                </div>
                                
                                <div className="p-8 overflow-y-auto flex-1">
                                    <BulkMindCardVerification 
                                        ref={bulkVerificationRef}
                                        cards={cards.filter(card => card.konuId === selectedKonu)}
                                        onCardUpdate={handleCardUpdate}
                                        onUpdateSuccess={() => {
                                            setIsBulkVerificationOpen(false);
                                            // Modal kapandığında kartları yenile
                                            refreshCards();
                                        }}
                                        onUpdateClick={handleUpdateFromBulkVerification}
                                        onDeleteClick={handleDelete}
                                        konuId={selectedKonu}
                                        onClose={() => setIsBulkVerificationOpen(false)}
                                    />
                                </div>
                                
                                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                                    <button
                                        onClick={() => {
                                            setIsBulkVerificationOpen(false);
                                            // Modal kapandığında kartları yenile
                                            refreshCards();
                                        }}
                                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        Kapat
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Toplu İndirme Modalı */}
                    {isBulkDownloadOpen && selectedKonu && (
                        <BulkDownloadMindCards
                            isOpen={isBulkDownloadOpen}
                            onClose={() => setIsBulkDownloadOpen(false)}
                            konuId={selectedKonu}
                        />
                    )}

                    {/* Toplu Silme Modalı */}
                    {isBulkDeleteOpen && selectedKonu && (
                        <BulkDeleteMindCards
                            isOpen={isBulkDeleteOpen}
                            onClose={() => {
                                setIsBulkDeleteOpen(false);
                                // Modal kapandığında kartları yenile
                                refreshCards();
                            }}
                            konuId={selectedKonu}
                        />
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default NotesPage; 