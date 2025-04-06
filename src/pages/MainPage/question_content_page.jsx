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

    return (
        <Layout>
            <div className="min-h-screen bg-gray-400">
                <div className="container mx-auto py-6 px-4">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-800 mb-6">{baslik}</h1>
                        <div className="flex space-x-2">
                            <ExportToDocx konuBaslik={baslik} altKonular={altKonular} />
                            <button
                                className="px-4 py-2 bg-blue-500 text-white rounded-md mb-6"
                                onClick={() => setIsModalOpen(true)}
                            >
                                Soru Ekle
                            </button>
                        </div>
                    </div>
                    {Object.keys(altKonular).length > 0 ? (
                        <div className="space-y-6">
                            {Object.entries(altKonular).map(([key, altKonu]) => (
                                <div key={key} className="bg-white shadow-md rounded-lg p-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-semibold text-indigo-600 mb-4" onClick={() => toggleExpandBranch(key)}>
                                            {altKonu.baslik || "Alt konu yok."}
                                        </h2>
                                        <div className="flex items-center space-x-4">
                                            <span className="text-gray-500 text-sm font-bold">
                                                {altKonu.sorular ? Object.keys(altKonu.sorular).length : 0} Soru
                                            </span>
                                            <button
                                                onClick={() => toggleExpand(key)}
                                                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                            >
                                                {expandedAltKonu === key ? "-" : "+"}
                                            </button>
                                        </div>
                                    </div>
                                    {expandedAltKonu === key && (
                                        <ul className="space-y-4">
                                            {altKonu.sorular ? (
                                                Object.entries(altKonu.sorular).map(([soruKey, soru]) => (
                                                    <li key={soruKey} className="bg-gray-100 p-4 rounded-md shadow-sm flex flex-col">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-lg font-medium text-gray-700 mb-2 break-words">
                                                                    <span className="font-bold text-blue-700 mr-2">#{soru.soruNumarasi || "?"}</span>
                                                                    {soru.soruMetni || "Soru yok"}
                                                                </p>
                                                                <ul className="space-y-2">
                                                                    {Array.isArray(soru.cevaplar)
                                                                        ? soru.cevaplar.map((cevap, index) => (
                                                                            <li key={index} className="flex items-center space-x-2">
                                                                                <span className="font-bold text-gray-800">{String.fromCharCode(65 + index)}.</span>
                                                                                <p className="text-gray-700 break-words">{cevap}</p>
                                                                            </li>
                                                                        ))
                                                                        : "Cevaplar bulunamadı."}
                                                                </ul>
                                                                <p className="text-sm font-bold text-green-600 mt-2">
                                                                    Doğru Cevap: {soru.dogruCevap || "Belirtilmemiş"} 
                                                                    {soru.dogruCevap && soru.cevaplar && Array.isArray(soru.cevaplar) && (
                                                                        <span className="ml-2 bg-green-100 px-2 py-1 rounded-full">
                                                                            ({String.fromCharCode(65 + soru.cevaplar.indexOf(soru.dogruCevap))} şıkkı)
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-lg font-bold text-gray-700 mt-2 break-words">
                                                                    Açıklama: {soru.aciklama || "Belirtilmemiş"}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col space-y-2 ml-4">
                                                                <button
                                                                    className="bg-yellow-500 text-white px-2 py-1 rounded-md hover:bg-yellow-600"
                                                                    onClick={() => handleUpdateClick(`konular/${id}/altkonular/${key}/sorular/${soruKey}`)}
                                                                >
                                                                    Güncelle
                                                                </button>
                                                                <DeleteQuestion
                                                                    soruRef={`konular/${id}/altkonular/${key}/sorular/${soruKey}`}
                                                                    onDelete={refreshQuestions}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 flex justify-end text-gray-600 space-x-4">
                                                            <p>⚠️ Bildirilme: {soru.report || 0}</p>
                                                            <p>👍 Beğenme: {soru.liked || 0}</p>
                                                            <p>👎 Beğenilmeme: {soru.unliked || 0}</p>
                                                        </div>
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-gray-700">Soru bulunamadı.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-700">Alt konular bulunamadı.</p>
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
