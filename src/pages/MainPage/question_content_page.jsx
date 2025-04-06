import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import AddQuestion from "../../components/addQuestion";
import DeleteQuestion from "../../components/deleteQuestion";
import UpdateQuestion from "../../components/updateQuestion";
import ExportToDocx from "../../components/ExportToDocx";
import { useParams, useNavigate } from "react-router-dom";
import { database } from "../../firebase";
import { ref, onValue } from "firebase/database";

function QuestionContent() {
    const { id } = useParams();
    const [altKonular, setAltKonular] = useState([]);
    const [baslik, setBaslik] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false); // Güncelleme modali için state
    const [selectedSoruRef, setSelectedSoruRef] = useState(null)
    const [expandedAltKonu, setExpandedAltKonu] = useState(null); // Açık olan alt konuyu takip eder
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

    const refreshQuestions = () => {
        const konuRef = ref(database, `konular/${id}`);
        onValue(konuRef, (snapshot) => {
            const data = snapshot.val();
            setAltKonular(data.altkonular || []);
        });
    };

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

    // Soruları soru numarasına göre sıralama fonksiyonu
    const sortedQuestions = (questions) => {
        if (!questions) return [];
        return Object.entries(questions).sort((a, b) => {
            const numA = a[1].soruNumarasi || 999; // Numarası olmayan soruları en sona koy
            const numB = b[1].soruNumarasi || 999;
            return numA - numB; // Küçükten büyüğe sırala
        });
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
                                                sortedQuestions(altKonu.sorular).map(([soruKey, soru]) => (
                                                    <li key={soruKey} className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg shadow-sm flex flex-col transition-all duration-200 hover:shadow-md">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-3 break-words">
                                                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2">#{soru.soruNumarasi || "?"}</span>
                                                                    {soru.soruMetni || "Soru yok"}
                                                                </p>
                                                                <ul className="space-y-2 mb-4">
                                                                    {Array.isArray(soru.cevaplar)
                                                                        ? soru.cevaplar.map((cevap, index) => (
                                                                            <li key={index} className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                                                                                <span className="font-bold bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white w-6 h-6 flex items-center justify-center rounded-full">{String.fromCharCode(65 + index)}</span>
                                                                                <p className="break-words">{cevap}</p>
                                                                            </li>
                                                                        ))
                                                                        : "Cevaplar bulunamadı."}
                                                                </ul>
                                                                <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">
                                                                    Doğru Cevap: {soru.dogruCevap || "Belirtilmemiş"} 
                                                                    {soru.dogruCevap && soru.cevaplar && Array.isArray(soru.cevaplar) && (
                                                                        <span className="ml-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                                                                            ({String.fromCharCode(65 + soru.cevaplar.indexOf(soru.dogruCevap))} şıkkı)
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-base text-gray-700 dark:text-gray-300 mt-3 break-words">
                                                                    <span className="font-semibold">Açıklama:</span> {soru.aciklama || "Belirtilmemiş"}
                                                                </p>
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
                                                                <DeleteQuestion
                                                                    soruRef={`konular/${id}/altkonular/${key}/sorular/${soruKey}`}
                                                                    onDelete={refreshQuestions}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 flex justify-end text-gray-500 dark:text-gray-400 space-x-4 text-sm">
                                                            <p className="flex items-center"><span className="mr-1">⚠️</span> {soru.report || 0}</p>
                                                            <p className="flex items-center"><span className="mr-1">👍</span> {soru.liked || 0}</p>
                                                            <p className="flex items-center"><span className="mr-1">👎</span> {soru.unliked || 0}</p>
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
            {isUpdateModalOpen && (
                <UpdateQuestion
                    isOpen={isUpdateModalOpen}
                    onClose={() => setIsUpdateModalOpen(false)}
                    soruRefPath={selectedSoruRef}
                    konuId={id}
                />
            )}
        </Layout>
    );
}

export default QuestionContent;
