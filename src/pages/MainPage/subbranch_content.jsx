import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import AddQuestionSubbranch from "../../components/addQuestionSubbranch";
import DeleteQuestion from "../../components/deleteQuestion";
import UpdateQuestion from "../../components/updateQuestion"; // Güncelleme bileşenini içe aktarın
import { useParams } from "react-router-dom";
import { database } from "../../firebase";
import { ref, onValue } from "firebase/database";

function SubbranchContent() {
    const { konuId, altKonuId } = useParams();
    const [altDalBaslik, setAltDalBaslik] = useState("");
    const [altDallar, setAltDallar] = useState([]);
    const [expandedAltDal, setExpandedAltDal] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false); // Güncelleme modal state
    const [selectedAltDal, setSelectedAltDal] = useState(null);
    const [selectedSoruRefPath, setSelectedSoruRefPath] = useState(""); // Güncellenecek sorunun referansı

    useEffect(() => {
        const altDalRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}`);
        const unsubscribe = onValue(altDalRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setAltDalBaslik(data.baslik || "Alt Dal Başlık Yok");
                setAltDallar(data.altdallar || []);
            }
        });
        return () => unsubscribe();
    }, [konuId, altKonuId]);

    const toggleExpand = (altDalKey) => {
        setExpandedAltDal((prev) => (prev === altDalKey ? null : altDalKey));
    };

    const openModal = (altDalKey) => {
        setSelectedAltDal(altDalKey);
        setIsModalOpen(true);
    };

    const openUpdateModal = (soruRefPath) => {
        setSelectedSoruRefPath(soruRefPath);
        setIsUpdateModalOpen(true);
    };

    const refreshQuestions = () => {
        const altDalRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}`);
        onValue(altDalRef, (snapshot) => {
            const data = snapshot.val();
            setAltDallar(data.altdallar || []);
        });
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gray-400">
                <div className="container mx-auto py-6 px-4">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">{altDalBaslik}</h1>
                    </div>
                    {Object.keys(altDallar).length > 0 ? (
                        <div className="space-y-6">
                            {Object.entries(altDallar).map(([key, altDal]) => (
                                <div key={key} className="bg-white shadow-md rounded-lg p-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-medium text-indigo-600">
                                            {altDal.baslik || "Alt Dal Yok"}
                                        </h2>
                                        <div className="space-x-2">
                                            <span className="text-gray-500 text-sm font-bold">
                                                {altDal.sorular ? Object.keys(altDal.sorular).length : 0} Soru
                                            </span>
                                            <button
                                                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                                onClick={() => toggleExpand(key)}
                                            >
                                                {expandedAltDal === key ? "-" : "+"}
                                            </button>
                                            <button
                                                className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"
                                                onClick={() => openModal(key)}
                                            >
                                                Soru Ekle
                                            </button>
                                        </div>
                                    </div>
                                    {expandedAltDal === key && (
                                        <div className="mt-4">
                                            {altDal.sorular ? (
                                                <ul className="space-y-4">
                                                    {Object.entries(altDal.sorular).map(([soruKey, soru]) => (
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
                                                                    </p>
                                                                    <p className="text-lg font-bold text-gray-700 mt-2 break-words">
                                                                        Açıklama: {soru.aciklama || "Belirtilmemiş"}
                                                                    </p>
                                                                </div>
                                                                <div className="flex flex-col space-y-2 ml-4">
                                                                    <button
                                                                        className="bg-yellow-500 text-white px-2 py-1 rounded-md hover:bg-yellow-600"
                                                                        onClick={() =>
                                                                            openUpdateModal(`konular/${konuId}/altkonular/${altKonuId}/altdallar/${key}/sorular/${soruKey}`)
                                                                        }
                                                                    >
                                                                        Güncelle
                                                                    </button>
                                                                    <DeleteQuestion
                                                                        soruRef={`konular/${konuId}/altkonular/${altKonuId}/altdallar/${key}/sorular/${soruKey}`}
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
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-gray-600">Soru bulunamadı.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-700">Alt dallar bulunamadı.</p>
                    )}
                </div>
            </div>
            {isModalOpen && (
                <AddQuestionSubbranch
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    konuId={konuId}
                    altKonuId={altKonuId}
                    selectedAltDal={selectedAltDal}
                />
            )}
            {isUpdateModalOpen && (
                <UpdateQuestion
                    isOpen={isUpdateModalOpen}
                    onClose={() => setIsUpdateModalOpen(false)}
                    soruRefPath={selectedSoruRefPath}
                    konuId={konuId}
                    altKonuId={altKonuId}
                />
            )}
        </Layout>
    );
}

export default SubbranchContent;
