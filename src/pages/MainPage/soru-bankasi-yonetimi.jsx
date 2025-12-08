import React, { useEffect, useState } from "react";
import Layout from "../../components/layout";
import { database, db } from "../../firebase";
import { collection, onSnapshot, query, orderBy, doc, getDoc, getDocs } from "firebase/firestore";
import AddTopics from "../../components/addTopics";
import DeleteTopics from "../../components/deleteTopics";
import AddSubtopics from "../../components/addSubtopics";
import DeleteSubtopics from "../../components/deleteSubtopics";
import AddSubbranch from "../../components/addSubbranch";
import DeleteSubbranch from "../../components/deleteSubbranch";
import UpdateModal from "../../components/updateModal";
import NumberQuestions from "../../components/numberQuestions";
import { toast } from "react-hot-toast";
import { FaBook, FaPlus, FaTrash, FaEdit, FaChevronDown, FaChevronUp, FaQuestionCircle } from 'react-icons/fa';

function SoruBankasiYonetimiPage() {
    const [konular, setKonular] = useState([]);
    const [expanded, setExpanded] = useState(null);
    const [altKonular, setAltKonular] = useState({});
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
        try {
            const konularRef = collection(db, "konular");
            const q = query(konularRef);

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = [];
                snapshot.forEach((doc) => {
                    data.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                setKonular(data);
            }, (error) => {
                console.error("Firestore dinleme hatası:", error);
                toast.error("Konular yüklenirken bir hata oluştu");
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Firestore bağlantı hatası:", error);
            toast.error("Veritabanına bağlanırken bir hata oluştu");
        }
    }, []);

    const toggleExpand = async (konuId) => {
        if (expanded === konuId) {
            setExpanded(null);
            setAltKonular({});
            return;
        }

        try {
            const altkonularRef = collection(db, "konular", konuId, "altkonular");
            const altkonularSnap = await getDocs(altkonularRef);
            
            const altkonularData = {};
            altkonularSnap.forEach((doc) => {
                altkonularData[doc.id] = doc.data();
            });

            setAltKonular({
                [konuId]: altkonularData
            });
            setExpanded(konuId);
        } catch (error) {
            console.error("Alt konular çekilirken hata oluştu:", error);
            toast.error("Alt konular yüklenirken bir hata oluştu");
        }
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
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 flex items-center gap-3">
                            <FaBook className="text-indigo-600" />
                            Soru Bankası Yönetimi
                        </h1>

                        {/* Yönetim Kartları */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Konu Yönetimi Kartı */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-100 dark:border-gray-700">
                                <div className="h-2 bg-indigo-500" />
                                <div className="p-6">
                                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <FaBook className="text-indigo-600" />
                                        Konu Yönetimi
                                    </h2>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => setIsTopicModalOpen(true)}
                                            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2"
                                        >
                                            <FaPlus className="h-4 w-4" />
                                            Konu Ekle
                                        </button>
                                        <button
                                            onClick={() => setIsDeleteTopicModalOpen(true)}
                                            className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2"
                                        >
                                            <FaTrash className="h-4 w-4" />
                                            Konu Sil
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Alt Konu Yönetimi Kartı */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-100 dark:border-gray-700">
                                <div className="h-2 bg-emerald-500" />
                                <div className="p-6">
                                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <FaQuestionCircle className="text-emerald-600" />
                                        Alt Konu Yönetimi
                                    </h2>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => setIsModelOpen(true)}
                                            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2"
                                        >
                                            <FaPlus className="h-4 w-4" />
                                            Alt Konu Ekle
                                        </button>
                                        <button
                                            onClick={() => setIsDeleteModelOpen(true)}
                                            className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2"
                                        >
                                            <FaTrash className="h-4 w-4" />
                                            Alt Konu Sil
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Konular Listesi */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
                            {konular.length > 0 ? (
                                konular.map((konu) => (
                                    <div 
                                        key={konu.id} 
                                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 h-fit"
                                    >
                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                                                    {konu.baslik || "Başlık Yok"}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openUpdateModal(`konular/${konu.id}`, "Konu")}
                                                        className="p-2 text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                        title="Güncelle"
                                                    >
                                                        <FaEdit className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleExpand(konu.id)}
                                                        className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                                        title={expanded === konu.id ? "Daralt" : "Genişlet"}
                                                    >
                                                        {expanded === konu.id ? 
                                                            <FaChevronUp className="h-5 w-5" /> : 
                                                            <FaChevronDown className="h-5 w-5" />
                                                        }
                                                    </button>
                                                </div>
                                            </div>

                                            {expanded === konu.id && altKonular[konu.id] && Object.keys(altKonular[konu.id]).length > 0 && (
                                                <div className="mt-4 space-y-3">
                                                    {Object.entries(altKonular[konu.id]).map(([altKonuId, altKonu]) => (
                                                        <div 
                                                            key={altKonuId}
                                                            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-700 dark:text-gray-200">
                                                                    {altKonu.baslik || "Alt Konu Başlığı Yok"}
                                                                </span>
                                                                <button
                                                                    onClick={() => openUpdateModal(`konular/${konu.id}/altkonular/${altKonuId}`, "Alt Konu")}
                                                                    className="p-1 text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                                    title="Güncelle"
                                                                >
                                                                    <FaEdit className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
                                    <p className="text-gray-600 dark:text-gray-400">Henüz hiç konu eklenmemiş.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
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
                    updatePath={updatePath}
                    itemType={updateType}
                    closeModal={() => setIsUpdateModalOpen(false)}
                />
            )}
        </Layout>
    );
}

export default SoruBankasiYonetimiPage;

