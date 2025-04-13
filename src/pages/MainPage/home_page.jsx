import React, { useEffect, useState } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
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
        const konularRef = collection(db, "konular");
        const q = query(konularRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = [];
            snapshot.forEach((doc) => {
                data.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            setKonular(data);
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
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-4">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-8">Soru Bankası Yönetimi</h1>
                    
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 mb-8 border border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4">Konu Yönetimi</h2>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setIsTopicModalOpen(true)}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Konu Ekle
                            </button>
                            <button
                                onClick={() => setIsDeleteTopicModalOpen(true)}
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Konu Sil
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 mb-8 border border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4">Alt Konu ve Dal Yönetimi</h2>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setIsModelOpen(true)}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Alt Konu Ekle
                            </button>
                            <button
                                onClick={() => setIsDeleteModelOpen(true)}
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Alt Konu Sil
                            </button>
                            <button
                                onClick={() => setIsSubbranchModalOpen(true)}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Alt Dal Ekle
                            </button>
                            <button
                                onClick={() => setIsDeleteSubbranchModalOpen(true)}
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Alt Dal Sil
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        {konular.length > 0 ? (
                            konular.map((konu) => (
                                <div key={konu.id} className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{konu.baslik || "Başlık Yok"}</h3>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => openUpdateModal(`konular/${konu.id}`, "Konu")}
                                                className="text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors flex items-center"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                                Güncelle
                                            </button>
                                            <button
                                                onClick={() => toggleExpand(konu.id)}
                                                className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 transition-colors"
                                            >
                                                {expanded === konu.id ? 
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
                                    {expanded === konu.id && konu.altkonular && (
                                        <div className="mt-4 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900">
                                            {Object.entries(konu.altkonular).map(([key, altkonu]) => (
                                                <div key={key} className="mt-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-medium text-lg text-indigo-600 dark:text-indigo-400">{altkonu.baslik || "Alt Konu Yok"}</h4>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => openUpdateModal(`konular/${konu.id}/altkonular/${key}`, "Alt Konu")}
                                                                className="text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors flex items-center text-sm"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                                </svg>
                                                                Güncelle
                                                            </button>
                                                            <button
                                                                onClick={() => toggleExpandAltKonu(key)}
                                                                className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 transition-colors"
                                                            >
                                                                {expandedAltKonu[key] ? 
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                                                                    </svg> 
                                                                    : 
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                                                    </svg>
                                                                }
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {expandedAltKonu[key] && altkonu.altdallar && (
                                                        <div className="mt-3 pl-4 space-y-2 border-l-2 border-emerald-100 dark:border-emerald-900">
                                                            {Object.entries(altkonu.altdallar).map(
                                                                ([subKey, altdal]) => (
                                                                    <div key={subKey} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                                                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{altdal.baslik || "Alt Dal Yok"}</span>
                                                                        <button
                                                                            onClick={() => openUpdateModal(
                                                                                `konular/${konu.id}/altkonular/${key}/altdallar/${subKey}`,
                                                                                "Alt Dal"
                                                                            )}
                                                                            className="text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors flex items-center text-sm"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                                            </svg>
                                                                            Güncelle
                                                                        </button>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 text-center">
                                <p className="text-gray-600 dark:text-gray-400">Henüz hiç konu eklenmemiş.</p>
                            </div>
                        )}
                    </div>
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
