import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import AddQuestionSubbranch from "../../components/addQuestionSubbranch";
import DeleteQuestion from "../../components/deleteQuestion";
import UpdateQuestion from "../../components/updateQuestion";
import ChangeQuestionOrder from "../../components/changeQuestionOrder";
import ExportSubbranchToDocx from "../../components/ExportSubbranchToDocx";
import BulkDeleteQuestions from "../../components/BulkDeleteQuestions";
import BulkDownloadQuestions from "../../components/BulkDownloadQuestions";
import { useParams } from "react-router-dom";
import { database } from "../../firebase";
import { ref, onValue, get, set, remove } from "firebase/database";

function SubbranchContent() {
    const { konuId, altKonuId } = useParams();
    const [selectedAltDal, setSelectedAltDal] = useState(null);
    const [altKonular, setAltKonular] = useState({});
    const [altDallar, setAltDallar] = useState({});
    const [sorular, setSorular] = useState({});
    const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [isBulkDownloadOpen, setIsBulkDownloadOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const altKonuRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}`);
        
        const unsubscribe = onValue(altKonuRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setAltKonular(data);
                setAltDallar(data.altdallar || {});
                setLoading(false);
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [konuId, altKonuId]);

    const refreshQuestions = async () => {
        if (selectedAltDal) {
            const soruRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}/altdallar/${selectedAltDal}/sorular`);
            const snapshot = await get(soruRef);
            if (snapshot.exists()) {
                setSorular(snapshot.val());
            } else {
                setSorular({});
            }
        }
    };

    const handleDeleteQuestion = async (soruId) => {
        if (window.confirm("Bu soruyu silmek istediğinizden emin misiniz?")) {
            try {
                const soruRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}/altdallar/${selectedAltDal}/sorular/${soruId}`);
                await remove(soruRef);
                refreshQuestions();
            } catch (error) {
                console.error("Soru silinirken hata oluştu:", error);
            }
        }
    };

    const sortedQuestions = (questions) => {
        if (!questions) return [];
        return Object.entries(questions).sort((a, b) => {
            const numA = a[1].soruNumarasi || 0;
            const numB = b[1].soruNumarasi || 0;
            return numA - numB;
        });
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        {altKonular.baslik}
                    </h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(altDallar).map(([key, altDal]) => (
                            <div
                                key={key}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-200"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                            {altDal.baslik}
                                        </h2>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedAltDal(key);
                                                    setIsAddQuestionOpen(true);
                                                }}
                                                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                                </svg>
                                                <span>Soru Ekle</span>
                                            </button>
                                            {altDal.sorular && Object.keys(altDal.sorular).length > 0 && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAltDal(key);
                                                            setIsBulkDeleteOpen(true);
                                                        }}
                                                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        <span>Toplu Sil</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAltDal(key);
                                                            setIsBulkDownloadOpen(true);
                                                        }}
                                                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                        <span>Toplu İndir</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {altDal.sorular ? (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center space-x-4">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        {Object.keys(altDal.sorular).length} Soru
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAltDal(key);
                                                            setIsBulkDeleteOpen(true);
                                                        }}
                                                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        <span>Toplu Sil</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAltDal(key);
                                                            setIsBulkDownloadOpen(true);
                                                        }}
                                                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                        <span>Toplu İndir</span>
                                                    </button>
                                                </div>
                                            </div>
                                            {sortedQuestions(altDal.sorular).map(([soruKey, soru]) => (
                                                <div key={soruKey} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="text-gray-800 dark:text-white font-medium mb-2">
                                                                {soru.soruMetni}
                                                            </p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {soru.cevaplar.map((cevap, index) => (
                                                                    <div
                                                                        key={index}
                                                                        className={`p-2 rounded ${
                                                                            index === soru.dogruCevap
                                                                                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                                                                : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                                                        }`}
                                                                    >
                                                                        {cevap}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {soru.aciklama && (
                                                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                                    Açıklama: {soru.aciklama}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteQuestion(soruKey)}
                                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600 dark:text-gray-400">Henüz soru eklenmemiş.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {isAddQuestionOpen && selectedAltDal && (
                    <AddQuestionSubbranch
                        isOpen={isAddQuestionOpen}
                        onClose={() => {
                            setIsAddQuestionOpen(false);
                            refreshQuestions();
                        }}
                        konuId={konuId}
                        altKonuId={altKonuId}
                        altDalId={selectedAltDal}
                    />
                )}
                
                {isBulkDeleteOpen && selectedAltDal && (
                    <BulkDeleteQuestions
                        isOpen={isBulkDeleteOpen}
                        onClose={(refreshNeeded) => {
                            setIsBulkDeleteOpen(false);
                            if (refreshNeeded) refreshQuestions();
                        }}
                        konuId={konuId}
                        altKonuId={altKonuId}
                        altDalId={selectedAltDal}
                    />
                )}
                
                {isBulkDownloadOpen && selectedAltDal && (
                    <BulkDownloadQuestions
                        isOpen={isBulkDownloadOpen}
                        onClose={() => {
                            setIsBulkDownloadOpen(false);
                        }}
                        konuId={konuId}
                        altKonuId={altKonuId}
                        altDalId={selectedAltDal}
                    />
                )}
            </div>
        </Layout>
    );
}

export default SubbranchContent;
