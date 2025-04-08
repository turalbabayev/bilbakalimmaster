import React, { useState, useEffect, useCallback } from "react";
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
import { ref, onValue, update, get } from "firebase/database";

function QuestionContent() {
    const { id } = useParams();
    const [altKonular, setAltKonular] = useState([]);
    const [baslik, setBaslik] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isImportJSONModalOpen, setIsImportJSONModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false); // Güncelleme modali için state
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [selectedSoruRef, setSelectedSoruRef] = useState(null);
    const [expandedAltKonu, setExpandedAltKonu] = useState(null); // Açık olan alt konuyu takip eder
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [selectedAltKonuId, setSelectedAltKonuId] = useState(null);
    const [isBulkDownloadOpen, setIsBulkDownloadOpen] = useState(false);
    const [isBulkVerificationOpen, setIsBulkVerificationOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const konuRef = ref(database, `konular/${id}`);
        const unsubscribe = onValue(konuRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setAltKonular(data.altkonular || []);
                setBaslik(data.baslik || "Başlık Yok");
            }
        });
        return () => unsubscribe();
    }, [id]);

    const refreshQuestions = useCallback(() => {
        const konuRef = ref(database, `konular/${id}`);
        get(konuRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setAltKonular(data.altkonular || []);
                setBaslik(data.baslik || "Başlık Yok");
                console.log('Sorular başarıyla yenilendi');
            } else {
                console.log('Konu bulunamadı');
            }
        }).catch((error) => {
            console.error('Veri yenilenirken hata:', error);
        });
    }, [id]);

    const toggleExpand = (altKonuKey) => {
        setExpandedAltKonu((prev) => (prev === altKonuKey ? null : altKonuKey));
    };
    
    const toggleExpandBranch = (altKonuKey) => {
        navigate(`/question/${id}/${altKonuKey}`);
    };

    const handleUpdateClick = (soruRef) => {
        setSelectedSoruRef(soruRef);
        setIsUpdateModalOpen(true);
    };

    const handleChangeOrderClick = (soruRef) => {
        setSelectedSoruRef(soruRef);
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
            updates[`${soruRef}/dogruCevap`] = yeniCevap;
            
            await update(ref(database), updates);
            console.log(`Doğru cevap güncellendi: ${soruRef} -> ${yeniCevap}`);
            
            // Soruları yenile
            refreshQuestions();
            
            return true;
        } catch (error) {
            console.error("Doğru cevap güncellenirken hata:", error);
            throw error;
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
                    {Object.keys(altKonular).length > 0 ? (
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
                                                {altKonu.sorular ? Object.keys(altKonu.sorular).length : 0} Soru
                                            </span>
                                            {altKonu.sorular && Object.keys(altKonu.sorular).length > 0 && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAltKonuId(key);
                                                            setIsBulkVerificationOpen(true);
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
                                                            setIsBulkDeleteOpen(true);
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
                                                            setIsBulkDownloadOpen(true);
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
                                        <ul className="space-y-5 mt-6">
                                            {altKonu.sorular ? (
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
                                                                                    // Doğru cevap kontrolü
                                                                                    const isCorrect = 
                                                                                        // Yeni format (A, B, C, D, E)
                                                                                        (/^[A-E]$/.test(soru.dogruCevap) && String.fromCharCode(65 + cevapIndex) === soru.dogruCevap) ||
                                                                                        // Eski format (cevabın kendisi)
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
                                                                        {/* Doğru cevap göstergesi */}
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
                                                                    <div className="flex items-center">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                                        </svg>
                                                                    Güncelle
                                                                    </div>
                                                                </button>
                                                                <button
                                                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-200"
                                                                    onClick={() => handleChangeOrderClick(`konular/${id}/altkonular/${key}/sorular/${soruKey}`)}
                                                                >
                                                                    <div className="flex items-center">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                                                                        </svg>
                                                                        Takas Et
                                                                    </div>
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
                                                <li className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">Soru bulunamadı.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 text-center">
                            <p className="text-gray-600 dark:text-gray-400">Alt konular bulunamadı.</p>
                        </div>
                    )}
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
                <UpdateQuestion
                    isOpen={isUpdateModalOpen}
                    onClose={() => setIsUpdateModalOpen(false)}
                konuId={id}
                altKonuId={selectedSoruRef ? selectedSoruRef.split("/")[3] : ""}
                soruId={selectedSoruRef ? selectedSoruRef.split("/")[5] : ""}
            />
            <ChangeQuestionOrder
                isOpen={isOrderModalOpen}
                onClose={() => setIsOrderModalOpen(false)}
                soruRef={selectedSoruRef}
            />
            {isBulkDeleteOpen && selectedAltKonuId && (
                <BulkDeleteQuestions
                    isOpen={isBulkDeleteOpen}
                    onClose={(refreshNeeded) => {
                        setIsBulkDeleteOpen(false);
                        if (refreshNeeded) refreshQuestions();
                    }}
                    konuId={id}
                    altKonuId={selectedAltKonuId}
                />
            )}
            {isBulkDownloadOpen && selectedAltKonuId && (
                <BulkDownloadQuestions
                    isOpen={isBulkDownloadOpen}
                    onClose={() => {
                        setIsBulkDownloadOpen(false);
                    }}
                    konuId={id}
                    altKonuId={selectedAltKonuId}
                />
            )}
            {isBulkVerificationOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                                Toplu Soru Doğrulama
                            </h2>
                        </div>
                        
                        <div className="p-8 overflow-y-auto flex-1">
                            <BulkQuestionVerification 
                                sorular={Object.values(altKonular[selectedAltKonuId]?.sorular || {})} 
                                onSoruGuncelle={handleSoruDogruCevapGuncelle}
                                onGuncellemeSuccess={refreshQuestions}
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
