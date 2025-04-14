import React, { useState, useEffect, useCallback, useRef } from "react";
import Layout from "../../components/layout";
import AddQuestion from "../../components/addQuestion";
import DeleteQuestion from "../../components/deleteQuestion";
import UpdateQuestion from "../../components/updateQuestion";
import ChangeQuestionOrder from "../../components/changeQuestionOrder";
import ExportToDocx from "../../components/ExportToDocx";
import ImportQuestionsFromDocx from "../../components/ImportQuestionsFromDocx";
import ImportQuestionsFromJSON from "../../components/ImportQuestionsFromJSON";
import BulkDeleteQuestions from "../../components/BulkDeleteQuestions";
import BulkDownloadQuestions from "../../components/BulkDownloadQuestions";
import BulkQuestionVerification from "../../components/BulkQuestionVerification";
import { useParams, useNavigate } from "react-router-dom";
import { database } from "../../firebase";
import { ref, onValue, update, get, remove, push, set, child, off } from "firebase/database";
import { getDatabase } from "firebase/database";
import { toast } from "react-hot-toast";
import { db } from "../../firebase";
import { collection, doc, getDoc, getDocs, onSnapshot, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import UpdateModal from "../../components/updateModal";

function QuestionContent() {
    const { id } = useParams();
    const [altKonular, setAltKonular] = useState({});
    const [baslik, setBaslik] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isImportJSONModalOpen, setIsImportJSONModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [selectedSoruRef, setSelectedSoruRef] = useState(null);
    const [expandedAltKonu, setExpandedAltKonu] = useState(null);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [selectedAltKonuId, setSelectedAltKonuId] = useState(null);
    const [isBulkDownloadOpen, setIsBulkDownloadOpen] = useState(false);
    const [isBulkVerificationOpen, setIsBulkVerificationOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    // BulkQuestionVerification bileşenine ref tanımlıyoruz
    const bulkVerificationRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Konu başlığını al
                const konuRef = doc(db, "konular", id);
                const konuSnap = await getDoc(konuRef);
                
                if (konuSnap.exists()) {
                    setBaslik(konuSnap.data().baslik || "Başlık Yok");
                }

                // Alt konuları al
                const altkonularRef = collection(db, "konular", id, "altkonular");
                const unsubscribe = onSnapshot(altkonularRef, (snapshot) => {
                    const altkonularData = {};
                    snapshot.forEach((doc) => {
                        altkonularData[doc.id] = {
                            id: doc.id,
                            ...doc.data(),
                            sorularYukleniyor: false,
                            sorular: null
                        };
                    });
                    setAltKonular(altkonularData);
                    setIsLoading(false);
                }, (error) => {
                    console.error("Alt konular dinlenirken hata:", error);
                    toast.error("Alt konular yüklenirken bir hata oluştu");
                    setIsLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Veri çekilirken hata:", error);
                toast.error("Veriler yüklenirken bir hata oluştu");
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const fetchSorularForAltKonu = async (altKonuId) => {
        if (!altKonuId) return;

        try {
            setAltKonular(prev => ({
                ...prev,
                [altKonuId]: {
                    ...prev[altKonuId],
                    sorularYukleniyor: true
                }
            }));

            const sorularRef = collection(db, "konular", id, "altkonular", altKonuId, "sorular");
            
            // Realtime listener ekle
            const unsubscribe = onSnapshot(sorularRef, (snapshot) => {
                const sorularData = {};
                snapshot.forEach((doc) => {
                    sorularData[doc.id] = {
                        id: doc.id,
                        ...doc.data()
                    };
                });

                setAltKonular(prev => ({
                    ...prev,
                    [altKonuId]: {
                        ...prev[altKonuId],
                        sorular: sorularData,
                        sorularYukleniyor: false
                    }
                }));
            }, (error) => {
                console.error("Sorular dinlenirken hata:", error);
                toast.error("Sorular yüklenirken bir hata oluştu");
            });

            // Cleanup function'ı döndür
            return () => unsubscribe();

        } catch (error) {
            console.error("Sorular çekilirken hata:", error);
            toast.error("Sorular yüklenirken bir hata oluştu");
            setAltKonular(prev => ({
                ...prev,
                [altKonuId]: {
                    ...prev[altKonuId],
                    sorularYukleniyor: false
                }
            }));
        }
    };

    // Alt konu açıldığında/kapandığında listener'ı yönet
    const toggleExpand = (altKonuId) => {
        setExpandedAltKonu(prev => {
            const yeni = prev === altKonuId ? null : altKonuId;
            if (yeni && (!altKonular[yeni].sorular)) {
                fetchSorularForAltKonu(yeni);
            }
            return yeni;
        });
    };

    const refreshQuestions = useCallback(async () => {
        if (expandedAltKonu) {
            await fetchSorularForAltKonu(expandedAltKonu);
        }
        return true;
    }, [expandedAltKonu, id]);

    const toggleExpandBranch = (altKonuId) => {
        navigate(`/question/${id}/${altKonuId}`);
    };

    const handleUpdateClick = (soruRef) => {
        setSelectedSoruRef(soruRef);
        setIsUpdateModalOpen(true);
    };

    const handleChangeOrderClick = (soruRef) => {
        console.log("Sıralama değiştirme modalı açılıyor, soruRef:", soruRef);
        
        // soruRef değerini kontrol et
        if (!soruRef) {
            console.error("soruRef değeri yok!");
            return;
        }
        
        // Soru referansını ayarla
        setSelectedSoruRef(soruRef);
        
        // Modalı aç
        setIsOrderModalOpen(true);
    };

    // Soruları soru numarasına göre sıralama fonksiyonu
    const sortedQuestions = (questions) => {
        if (!questions) return [];
        return Object.entries(questions).sort((a, b) => {
            const numA = a[1].soruNumarasi || 999; // Numarası olmayan soruları en sona koy
            const numB = b[1].soruNumarasi || 999;
            return numA - numB; // Küçükten büyüğe sırala
        });
    };

    // HTML etiketlerini temizleme fonksiyonu
    const stripHtml = (html) => {
        if (!html) return "";
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    // Sorunun doğru cevabını güncelleyen fonksiyon - Realtime Database için güncellendi
    const handleSoruDogruCevapGuncelle = async (soruId, yeniCevap) => {
        // Sorunun referansını bulma
        const soruRef = Object.keys(altKonular).reduce((ref, altKonuKey) => {
            if (ref) return ref;
            
            if (altKonular[altKonuKey].sorular) {
                const sorular = altKonular[altKonuKey].sorular;
                const keys = Object.keys(sorular);
                
                for (const key of keys) {
                    if (sorular[key].id === soruId) {
                        return `konular/${id}/altkonular/${altKonuKey}/sorular/${key}`;
                    }
                }
            }
            
            return null;
        }, null);
        
        if (!soruRef) {
            throw new Error('Soru referansı bulunamadı');
        }
        
        try {
            // Realtime Database güncelleme işlemi
            const updates = {};
            updates[`/${soruRef}/dogruCevap`] = yeniCevap;
            
            console.log('Güncelleme yapılıyor:', soruRef, 'Yeni değer:', yeniCevap);
            await update(ref(database), updates);
            console.log(`Doğru cevap güncellendi: ${soruRef} -> ${yeniCevap}`);
            
            // Soruları hemen yenile
            await refreshQuestions();
            
            // Konsolda mevcut verileri göster
            console.log('Güncelleme sonrası altKonular:', altKonular);
            
            return true;
        } catch (error) {
            console.error("Doğru cevap güncellenirken hata:", error);
            throw error;
        }
    };

    // Soru ID'sinden referansını bulan yardımcı fonksiyon
    const findSoruRefById = (soruId) => {
        console.log('Aranan soru ID:', soruId);
        
        // Eğer seçili alt konu varsa ve o alt konunun soruları yüklüyse öncelikle orada ara
        if (selectedAltKonuId && altKonular[selectedAltKonuId]?.sorular && typeof altKonular[selectedAltKonuId].sorular === 'object') {
            console.log('Seçili alt konuda aranıyor:', selectedAltKonuId);
            
            // Bu alt konudaki tüm soruları kontrol et
            for (const soruKey of Object.keys(altKonular[selectedAltKonuId].sorular)) {
                const soru = altKonular[selectedAltKonuId].sorular[soruKey];
                
                // Soru ID'si olarak key'i veya soru.id'yi kullan
                if (soru.id === soruId || soruKey === soruId) {
                    const soruRef = `konular/${id}/altkonular/${selectedAltKonuId}/sorular/${soruKey}`;
                    console.log('Soru bulundu (seçili alt konuda):', soruRef);
                    return soruRef;
                }
            }
        }
        
        // Seçili alt konuda bulunamazsa tüm alt konularda ara
        for (const altKonuKey of Object.keys(altKonular)) {
            // Sorular yüklenmişse ve obje ise
            if (altKonular[altKonuKey].sorular && typeof altKonular[altKonuKey].sorular === 'object') {
                // Tüm soruları kontrol et
                for (const soruKey of Object.keys(altKonular[altKonuKey].sorular)) {
                    const soru = altKonular[altKonuKey].sorular[soruKey];
                    
                    // Soru nesnesi içinde id varsa onu, yoksa key'i kullan
                    if ((soru.id && soru.id === soruId) || soruKey === soruId) {
                        const soruRef = `konular/${id}/altkonular/${altKonuKey}/sorular/${soruKey}`;
                        console.log('Soru bulundu (genel aramada):', soruRef);
                        return soruRef;
                    }
                }
            }
        }
        
        console.log('Soru bulunamadı:', soruId);
        return null;
    };

    const handleUpdateFromBulkVerification = (soru) => {
        console.log('Güncelleme isteği geldi, soru:', soru);
        
        try {
            // Sorunun yolunu belirle
            const soruRef = `konular/${id}/altkonular/${selectedAltKonuId}/sorular/${soru.id}`;
            console.log('Güncellenecek sorunun yolu:', soruRef);
            
            // Bulk verification modalını geçici olarak gizle
            document.querySelector('.bulk-verification-modal')?.classList.add('hidden');
            
            // Sorunun referansını ayarla ve modalı aç
            setSelectedSoruRef(soruRef);
            setIsUpdateModalOpen(true);

        } catch (error) {
            console.error('Güncelleme modalı açılırken hata:', error);
            toast.error('Güncelleme modalı açılırken bir hata oluştu!');
            // Hata durumunda bulk verification modalını tekrar göster
            document.querySelector('.bulk-verification-modal')?.classList.remove('hidden');
        }
    };

    // Soru güncelleme tamamlandığında çağrılacak fonksiyon
    const handleUpdateComplete = async (updatedQuestion) => {
        console.log("Soru güncellendi, veriler yenileniyor...");
        
        // Önce modalları kapat
        setIsUpdateModalOpen(false);
        
        // Bulk verification modalını tekrar göster
        document.querySelector('.bulk-verification-modal')?.classList.remove('hidden');
        
        // Kısa bir gecikme ekleyerek veritabanı işlemlerinin tamamlanmasını sağlayalım
        setTimeout(async () => {
            try {
                // Eğer bir alt konu açıksa, sadece o alt konunun sorularını yenile
                if (expandedAltKonu) {
                    await fetchSorularForAltKonu(expandedAltKonu);
                }
                
                // Güncelleme yapılan soruyu sadece doğrudan al
                if (selectedSoruRef && bulkVerificationRef.current && isBulkVerificationOpen) {
                    try {
                        // Firestore'dan güncel soruyu al
                        const guncelSoruDoc = await getDoc(doc(db, selectedSoruRef));
                        
                        if (guncelSoruDoc.exists()) {
                            const guncelSoru = { id: guncelSoruDoc.id, ...guncelSoruDoc.data() };
                            console.log("Güncel soru bulundu, bulk verification modalı güncelleniyor:", guncelSoru);
                            bulkVerificationRef.current.updateSonucWithGuncelSoru(guncelSoru);
                        } else {
                            console.log("Güncel soru bulunamadı.");
                            toast.error("Güncel soru bulunamadı!");
                        }
                    } catch (error) {
                        console.error("Güncel soru verileri alınırken hata:", error);
                        toast.error("Soru verilerini alırken bir hata oluştu!");
                    }
                }
            } catch (error) {
                console.error("Bulk verification güncelleme hatası:", error);
                toast.error("Güncelleme sırasında bir hata oluştu!");
            }
        }, 300); // 300ms bekle
    };

    // Soru silme fonksiyonu
    const handleDeleteSoru = async (soru) => {
        console.log('Silinecek soru:', soru);
        
        try {
            // Sorunun yolunu belirle
            const soruRef = `konular/${id}/altkonular/${selectedAltKonuId}/sorular/${soru.id}`;
            console.log('Soru yolu:', soruRef);
            
            // Soruyu sil
            await deleteDoc(doc(db, soruRef));
            console.log('Soru silindi:', soruRef);
            
            // Bulk verification modalındaki soruları güncelle
            if (bulkVerificationRef.current && isBulkVerificationOpen) {
                // Mevcut analiz sonuçlarını al
                const mevcutSonuclar = bulkVerificationRef.current.getSonuclar();
                
                // Silinen soruyu sonuçlardan çıkar
                delete mevcutSonuclar[soru.id];
                
                // Güncel soru listesini al
                const guncelSorular = altKonular[selectedAltKonuId]?.sorular ? 
                    Object.entries(altKonular[selectedAltKonuId].sorular)
                        .filter(([key]) => key !== soru.id) // Silinen soruyu filtrele
                        .map(([key, soru]) => ({
                            ...soru,
                            id: key,
                            ref: `konular/${id}/altkonular/${selectedAltKonuId}/sorular/${key}`
                        }))
                        .sort((a, b) => (a.soruNumarasi || 0) - (b.soruNumarasi || 0)) 
                    : [];
                
                // Bulk verification bileşenini güncelle
                bulkVerificationRef.current.updateSorularAndSonuclar(guncelSorular, mevcutSonuclar);
            }
            
            // Soruları yenile
            await refreshQuestions();
            
            toast.success('Soru başarıyla silindi!');
            return true;
        } catch (error) {
            console.error('Soru silinirken hata:', error);
            toast.error('Soru silinirken bir hata oluştu!');
            return false;
        }
    };

    const handleAltKonuEkle = async () => {
        const yeniAltKonuAdi = prompt('Alt konu adını girin:');
        if (yeniAltKonuAdi) {
            try {
                // Firestore'da yeni alt konu oluştur
                const altKonuRef = collection(db, `konular/${id}/altkonular`);
                const yeniAltKonu = {
                    ad: yeniAltKonuAdi,
                    createdAt: serverTimestamp(),
                    sorular: {}
                };
                
                // Firestore'a kaydet
                const docRef = await addDoc(altKonuRef, yeniAltKonu);
                console.log('Yeni alt konu eklendi:', docRef.id);
                
                // UI'ı güncelle
                setAltKonular(prevState => ({
                    ...prevState,
                    [docRef.id]: {
                        ...yeniAltKonu,
                        id: docRef.id
                    }
                }));
                
                toast.success('Alt konu başarıyla eklendi!');
            } catch (error) {
                console.error('Alt konu eklenirken hata:', error);
                toast.error('Alt konu eklenirken bir hata oluştu!');
            }
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-4">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{baslik}</h1>
                        <div className="flex space-x-3">
                            <ExportToDocx konuBaslik={baslik} altKonular={altKonular} />
                            <button
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-all duration-200 flex items-center"
                                onClick={() => setIsImportModalOpen(true)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                                DOCX'ten İçe Aktar
                            </button>
                            <button
                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-md transition-all duration-200 flex items-center"
                                onClick={() => setIsImportJSONModalOpen(true)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6m-6 4h6" />
                                </svg>
                                JSON'dan İçe Aktar
                            </button>
                        <button
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md transition-all duration-200 flex items-center"
                            onClick={() => setIsModalOpen(true)}
                        >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                            Soru Ekle
                        </button>
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (
                        Object.keys(altKonular).length > 0 ? (
                            <div className="space-y-6">
                                {Object.entries(altKonular).map(([key, altKonu]) => (
                                    <div key={key} className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-xl">
                                        <div className="flex items-center justify-between">
                                            <h2 
                                                className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4 cursor-pointer hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors" 
                                                onClick={() => toggleExpandBranch(key)}
                                            >
                                                {altKonu.baslik || "Alt konu yok."}
                                            </h2>
                                            <div className="flex items-center space-x-4">
                                                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                                    {altKonu.sorular && altKonu.sorular !== true 
                                                        ? Object.keys(altKonu.sorular).length 
                                                        : '?'} Soru
                                                </span>
                                                {altKonu.sorular && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                // Önce soruları yükle, sonra modali aç
                                                                setSelectedAltKonuId(key);
                                                                if (altKonu.sorular === true) {
                                                                    fetchSorularForAltKonu(key);
                                                                    setTimeout(() => {
                                                                        setIsBulkVerificationOpen(true);
                                                                    }, 500);
                                                                } else {
                                                                    setIsBulkVerificationOpen(true);
                                                                }
                                                            }}
                                                            className="text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-lg text-sm font-medium flex items-center space-x-1"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>Toplu Doğrulama</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAltKonuId(key);
                                                                if (altKonu.sorular === true) {
                                                                    fetchSorularForAltKonu(key);
                                                                    setTimeout(() => {
                                                                        setIsBulkDeleteOpen(true);
                                                                    }, 500);
                                                                } else {
                                                                    setIsBulkDeleteOpen(true);
                                                                }
                                                            }}
                                                            className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-sm font-medium flex items-center space-x-1"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                            <span>Toplu Sil</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAltKonuId(key);
                                                                if (altKonu.sorular === true) {
                                                                    fetchSorularForAltKonu(key);
                                                                    setTimeout(() => {
                                                                        setIsBulkDownloadOpen(true);
                                                                    }, 500);
                                                                } else {
                                                                    setIsBulkDownloadOpen(true);
                                                                }
                                                            }}
                                                            className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-sm font-medium flex items-center space-x-1"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                            <span>Toplu İndir</span>
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => toggleExpand(key)}
                                                    className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 transition-colors"
                                                >
                                                    {expandedAltKonu === key ? 
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                                                        </svg> 
                                                        : 
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                                        </svg>
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                        {expandedAltKonu === key && (
                                            <>
                                                {altKonu.sorularYukleniyor ? (
                                                    <div className="flex justify-center py-12">
                                                        <div className="w-12 h-12 border-4 border-t-indigo-500 border-indigo-200 rounded-full animate-spin"></div>
                                                    </div>
                                                ) : (
                                                    <ul className="space-y-5 mt-6">
                                                        {altKonu.sorular && altKonu.sorular !== true ? (
                                                            Object.keys(altKonu.sorular).length > 0 ? (
                                                                sortedQuestions(altKonu.sorular).map(([soruKey, soru], index) => (
                                                                    <li key={soruKey} className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg shadow-sm flex flex-col transition-all duration-200 hover:shadow-md">
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex flex-col p-6">
                                                                                    <div className="flex flex-col space-y-1">
                                                                                        <h3 className="text-lg font-semibold mb-2">
                                                                                            {index + 1}. Soru: 
                                                                                        </h3>
                                                                                        {soru.soruResmi && (
                                                                                            <div className="mb-4">
                                                                                                <img 
                                                                                                    src={soru.soruResmi} 
                                                                                                    alt="Soru resmi" 
                                                                                                    className="max-w-full h-auto rounded-lg shadow-md"
                                                                                                />
                                                                                            </div>
                                                                                        )}
                                                                                        <div dangerouslySetInnerHTML={{ __html: soru.soruMetni }} />
                                                                                        <div className="ml-4 space-y-1">
                                                                                            {soru.cevaplar &&
                                                                                                soru.cevaplar.map((cevap, cevapIndex) => {
                                                                                                    const isCorrect = 
                                                                                                        (/^[A-E]$/.test(soru.dogruCevap) && String.fromCharCode(65 + cevapIndex) === soru.dogruCevap) ||
                                                                                                        (!(/^[A-E]$/.test(soru.dogruCevap)) && cevap === soru.dogruCevap);
                                                                                                    
                                                                                                    return (
                                                                                                        <div 
                                                                                                            key={cevapIndex}
                                                                                                            className={`p-2 rounded-md ${
                                                                                                                isCorrect
                                                                                                                    ? "bg-green-100 dark:bg-green-900/70 text-green-800 dark:text-green-200"
                                                                                                                    : "bg-gray-50 dark:bg-gray-700"
                                                                                                            }`}
                                                                                                        >
                                                                                                            <span className="font-bold mr-2">
                                                                                                                {String.fromCharCode(65 + cevapIndex)}:
                                                                                                            </span>
                                                                                                            <span dangerouslySetInnerHTML={{ __html: cevap }} />
                                                                                                        </div>
                                                                                                    );
                                                                                                })}
                                                                                        </div>
                                                                                        <div className="mt-3 mb-1">
                                                                                            <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                                                                                Doğru Cevap: 
                                                                                                {soru.dogruCevap ? (
                                                                                                    <span>
                                                                                                        {/^[A-E]$/.test(soru.dogruCevap) ? (
                                                                                                            <>
                                                                                                                {soru.dogruCevap} Şıkkı 
                                                                                                                {soru.cevaplar && Array.isArray(soru.cevaplar) && soru.cevaplar[soru.dogruCevap.charCodeAt(0) - 65] && (
                                                                                                                    <span className="ml-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                                                                                                                        ({stripHtml(soru.cevaplar[soru.dogruCevap.charCodeAt(0) - 65])})
                                                                                                                    </span>
                                                                                                                )}
                                                                                                            </>
                                                                                                        ) : (
                                                                                                            <>
                                                                                                                {soru.cevaplar && Array.isArray(soru.cevaplar) && (
                                                                                                                    <>
                                                                                                                        {String.fromCharCode(65 + soru.cevaplar.indexOf(soru.dogruCevap))} Şıkkı
                                                                                                                        <span className="ml-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                                                                                                                            ({stripHtml(soru.dogruCevap)})
                                                                                                                        </span>
                                                                                                                    </>
                                                                                                                )}
                                                                                                            </>
                                                                                                        )}
                                                                                                    </span>
                                                                                                ) : "Belirtilmemiş"}
                                                                                            </p>
                                                                                        </div>
                                                                                        {soru.aciklama && (
                                                                                            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900 rounded-md">
                                                                                                <span className="font-semibold">Açıklama: </span>
                                                                                                <div dangerouslySetInnerHTML={{ __html: soru.aciklama }} />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="mt-4 flex justify-end text-gray-500 dark:text-gray-400 space-x-4 text-sm">
                                                                                        <p className="flex items-center"><span className="mr-1">⚠️</span> {soru.report || 0}</p>
                                                                                        <p className="flex items-center"><span className="mr-1">👍</span> {soru.liked || 0}</p>
                                                                                        <p className="flex items-center"><span className="mr-1">👎</span> {soru.unliked || 0}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex flex-col space-y-2 ml-4">
                                                                                <button
                                                                                    className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-200"
                                                                                    onClick={() => handleUpdateClick(`konular/${id}/altkonular/${key}/sorular/${soruKey}`)}
                                                                                >
                                                                                    Güncelle
                                                                                </button>
                                                                                <button
                                                                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-200"
                                                                                    onClick={() => handleChangeOrderClick(`konular/${id}/altkonular/${key}/sorular/${soruKey}`)}
                                                                                >
                                                                                    Takas Et
                                                                                </button>
                                                                                <DeleteQuestion
                                                                                    soruRef={`konular/${id}/altkonular/${key}/sorular/${soruKey}`}
                                                                                    onDelete={refreshQuestions}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                ))
                                                            ) : (
                                                                <li className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                                                    Bu alt konuda hiç soru bulunamadı.
                                                                </li>
                                                            )
                                                        ) : null}
                                                    </ul>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 text-center">
                                <p className="text-gray-600 dark:text-gray-400">Alt konular bulunamadı.</p>
                            </div>
                        ))}
                    )
                </div>
            </div>
            <AddQuestion
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                currentKonuId={id}
                altKonular={altKonular}
            />
            <ImportQuestionsFromDocx
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                currentKonuId={id}
                altKonular={altKonular}
            />
            <ImportQuestionsFromJSON
                isOpen={isImportJSONModalOpen}
                onClose={() => setIsImportJSONModalOpen(false)}
                currentKonuId={id}
                altKonular={altKonular}
            />
            {selectedSoruRef && (
                <>
                    <UpdateQuestion
                        isOpen={isUpdateModalOpen}
                        onClose={() => {
                            setIsUpdateModalOpen(false);
                            setSelectedSoruRef(null);
                            refreshQuestions();
                        }}
                        konuId={id}
                        altKonuId={expandedAltKonu}
                        soruId={selectedSoruRef.split('/').pop()}
                        onUpdateComplete={handleUpdateComplete}
                    />
                    <ChangeQuestionOrder
                        isOpen={isOrderModalOpen}
                        onClose={() => {
                            setIsOrderModalOpen(false);
                            setSelectedSoruRef(null);
                            refreshQuestions();
                        }}
                        soruRefPath={selectedSoruRef}
                        konuId={id}
                        altKonuId={expandedAltKonu}
                    />
                </>
            )}
            {selectedAltKonuId && (
                <>
                    <BulkDeleteQuestions
                        isOpen={isBulkDeleteOpen}
                        onClose={(refreshNeeded) => {
                            setIsBulkDeleteOpen(false);
                            setSelectedAltKonuId(null);
                            if (refreshNeeded) refreshQuestions();
                        }}
                        konuId={id}
                        altKonuId={selectedAltKonuId}
                    />
                    <BulkDownloadQuestions
                        isOpen={isBulkDownloadOpen}
                        onClose={() => {
                            setIsBulkDownloadOpen(false);
                            setSelectedAltKonuId(null);
                        }}
                        konuId={id}
                        altKonuId={selectedAltKonuId}
                    />
                </>
            )}
            {isBulkVerificationOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 bulk-verification-modal">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                                Toplu Soru Doğrulama
                            </h2>
                        </div>
                        
                        <div className="p-8 overflow-y-auto flex-1">
                            <BulkQuestionVerification 
                                ref={bulkVerificationRef}
                                sorular={altKonular[selectedAltKonuId]?.sorular ? Object.entries(altKonular[selectedAltKonuId].sorular).map(([key, soru]) => ({
                                    ...soru,
                                    id: key,
                                    ref: `konular/${id}/altkonular/${selectedAltKonuId}/sorular/${key}`
                                })).sort((a, b) => (a.soruNumarasi || 0) - (b.soruNumarasi || 0)) : []}
                                onSoruGuncelle={handleSoruDogruCevapGuncelle}
                                onGuncellemeSuccess={refreshQuestions}
                                onUpdateClick={handleUpdateFromBulkVerification}
                                onDeleteClick={handleDeleteSoru}
                                konuId={id}
                                altKonuId={selectedAltKonuId}
                                altDalId={expandedAltKonu}
                            />
                        </div>
                        
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                            <button
                                onClick={() => {
                                    setIsBulkVerificationOpen(false);
                                    // Modal kapandığında soruları yenile
                                    refreshQuestions();
                                }}
                                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default QuestionContent;
