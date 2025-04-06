import React, { useEffect, useState } from "react";
import Layout from "../../components/layout";
import { database } from "../../firebase";
import { ref, onValue } from "firebase/database";
import AddTopics from "../../components/addTopics";
import DeleteTopics from "../../components/deleteTopics";
import AddSubtopics from "../../components/addSubtopics";
import DeleteSubtopics from "../../components/deleteSubtopics";
import AddSubbranch from "../../components/addSubbranch";
import DeleteSubbranch from "../../components/deleteSubbranch";
import UpdateModal from "../../components/updateModal";
import NumberQuestions from "../../components/numberQuestions";

function HomePage() {
    const [konular, setKonular] = useState([]);
    const [expanded, setExpanded] = useState(null);
    const [expandedAltKonu, setExpandedAltKonu] = useState({});
    const [isModelOpen, setIsModelOpen] = useState(false);
    const [isDeleteModelOpen, setIsDeleteModelOpen] = useState(false);
    const [isSubbranchModalOpen, setIsSubbranchModalOpen] = useState(false);
    const [isDeleteSubbranchModalOpen, setIsDeleteSubbranchModalOpen] = useState(false);
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [updatePath, setUpdatePath] = useState("");
    const [updateType, setUpdateType] = useState("");
    const [isDeleteTopicModalOpen, setIsDeleteTopicModalOpen] = useState(false);

    useEffect(() => {
        const konularRef = ref(database, "konular");
        const unsubscribe = onValue(konularRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const formattedData = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));
                setKonular(formattedData);
            } else {
                setKonular([]);
            }
        });
        return () => unsubscribe();
    }, []);

    const toggleExpand = (id) => {
        setExpanded((prev) => (prev === id ? null : id));
    };

    const toggleExpandAltKonu = (altKonuId) => {
        setExpandedAltKonu((prev) => ({
            ...prev,
            [altKonuId]: !prev[altKonuId],
        }));
    };

    const openUpdateModal = (path, type) => {
        setUpdatePath(path);
        setUpdateType(type);
        setIsUpdateModalOpen(true);
    };

    return (
        <Layout>
            <div className="flex flex-col items-center justify-center bg-gray-400 min-h-screen">
                <div className="w-full max-w-2xl p-4">
                    <div className="space-y-4">
                        <div className="flex items-center justify-center">
                           <div className="space-x-4">
                            <button
                                    onClick={() => setIsTopicModalOpen(true)}
                                    className="mb-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
                                >
                                    Konu Ekle
                                </button>
                                <button
                                    onClick={() => setIsDeleteTopicModalOpen(true)}
                                    className="mb-4 px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800"
                                >
                                    Konu Sil
                                </button>
                           </div>
                        </div>
                        <div className="flex items-center justify-center">
                            <div className="space-x-4">
                                <button
                                    onClick={() => setIsModelOpen(true)}
                                    className="mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                    Alt Konu Ekle
                                </button>
                                <button
                                    onClick={() => setIsDeleteModelOpen(true)}
                                    className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    Alt Konu Sil
                                </button>
                                <button
                                    onClick={() => setIsSubbranchModalOpen(true)}
                                    className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Alt Dal Ekle
                                </button>
                                <button
                                    onClick={() => setIsDeleteSubbranchModalOpen(true)}
                                    className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    Alt Dal Sil
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-center">
                            <div className="space-x-4">
                                <button
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md"
                                    onClick={() => setIsTopicModalOpen(true)}
                                >
                                    Konu Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                    {konular.map((konu) => (
                        <div key={konu.id} className="mb-4 p-4 border rounded shadow bg-white">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-xl">{konu.baslik || "Başlık Yok"}</h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => openUpdateModal(`konular/${konu.id}`, "Konu")}
                                        className="text-orange-500 hover:underline"
                                    >
                                        Güncelle
                                    </button>
                                    <button
                                        onClick={() => toggleExpand(konu.id)}
                                        className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                    >
                                        {expanded === konu.id ? "-" : "+"}
                                    </button>
                                </div>
                            </div>
                            {expanded === konu.id && konu.altkonular && (
                                <ul className="list-disc pl-5 mt-2 text-gray-600">
                                    {Object.entries(konu.altkonular).map(([key, altkonu]) => (
                                        <li key={key} className="mt-2">
                                            <div className="flex items-center justify-between">
                                                <span className="flex-1">{altkonu.baslik || "Alt Konu Yok"}</span>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() =>
                                                            openUpdateModal(`konular/${konu.id}/altkonular/${key}`, "Alt Konu")
                                                        }
                                                        className="text-orange-500 hover:underline"
                                                    >
                                                        Güncelle
                                                    </button>
                                                    <button
                                                        onClick={() => toggleExpandAltKonu(key)}
                                                        className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                                    >
                                                        {expandedAltKonu[key] ? "-" : "+"}
                                                    </button>
                                                </div>
                                            </div>
                                            {expandedAltKonu[key] && altkonu.altdallar && (
                                                <ul className="list-disc list-inside mt-2 ml-8 text-gray-500">
                                                    {Object.entries(altkonu.altdallar).map(
                                                        ([subKey, altdal]) => (
                                                            <li key={subKey} className="mt-1 flex items-center justify-between">
                                                                <span className="before:content-['•'] before:mr-2 before:text-gray-500">{altdal.baslik || "Alt Dal Yok"}</span>
                                                                <button
                                                                    onClick={() =>
                                                                        openUpdateModal(
                                                                            `konular/${konu.id}/altkonular/${key}/altdallar/${subKey}`,
                                                                            "Alt Dal"
                                                                        )
                                                                    }
                                                                    className="text-orange-500 hover:underline"
                                                                >
                                                                    Güncelle
                                                                </button>
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            {isTopicModalOpen && (
                <AddTopics 
                    closeModal={() => setIsTopicModalOpen(false)}
                />
            )}
            {isDeleteTopicModalOpen && (
                <DeleteTopics 
                    konular={konular}
                    closeModal={() => setIsDeleteTopicModalOpen(false)}
                />
            )}
            {isModelOpen && (
                <AddSubtopics
                    konular={konular}
                    closeModal={() => setIsModelOpen(false)}
                />
            )}
            {isDeleteModelOpen && (
                <DeleteSubtopics
                    konular={konular}
                    closeModal={() => setIsDeleteModelOpen(false)}
                />
            )}
            {isSubbranchModalOpen && (
                <AddSubbranch
                    konular={konular}
                    closeModal={() => setIsSubbranchModalOpen(false)}
                />
            )}
            {isDeleteSubbranchModalOpen && (
                <DeleteSubbranch 
                    konular={konular}
                    closeModal={() => setIsDeleteSubbranchModalOpen(false)}
                />
            )}
            {isUpdateModalOpen && (
                <UpdateModal 
                    isOpen={isUpdateModalOpen}
                    closeModal={() => setIsUpdateModalOpen(false)}
                    updatePath={updatePath}
                    itemType={updateType}
                />
            )}
        </Layout>
    );
}

export default HomePage;
