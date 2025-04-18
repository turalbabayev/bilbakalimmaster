import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { Link } from "react-router-dom";
import { db } from "../../firebase";
import { collection, onSnapshot, query, getDocs, collectionGroup } from "firebase/firestore";
import { toast } from "react-hot-toast";

function QuestionsPage() {
    const [konular, setKonular] = useState([]);
    const [konuIstatistikleri, setKonuIstatistikleri] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            // Konuları dinle
            const konularRef = collection(db, "konular");
            const unsubscribeKonular = onSnapshot(konularRef, (snapshot) => {
                const konularData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setKonular(konularData);
            }, (error) => {
                console.error("Konular dinlenirken hata:", error);
                toast.error("Konular yüklenirken bir hata oluştu");
            });

            // Alt konuları ve soruları dinle
            const updateIstatistikler = async () => {
                try {
                    const altKonularGroup = query(collectionGroup(db, "altkonular"));
                    const sorularGroup = query(collectionGroup(db, "sorular"));

                    const [altKonularSnap, sorularSnap] = await Promise.all([
                        getDocs(altKonularGroup),
                        getDocs(sorularGroup)
                    ]);

                    // Alt konuları konulara göre grupla
                    const altKonuSayilari = {};
                    altKonularSnap.forEach(doc => {
                        const konuId = doc.ref.parent.parent.id;
                        altKonuSayilari[konuId] = (altKonuSayilari[konuId] || 0) + 1;
                    });

                    // Soruları konulara göre grupla
                    const soruSayilari = {};
                    sorularSnap.forEach(doc => {
                        const konuId = doc.ref.parent.parent.parent.parent.id;
                        soruSayilari[konuId] = (soruSayilari[konuId] || 0) + 1;
                    });

                    // İstatistikleri güncelle
                    const yeniIstatistikler = {};
                    Object.keys({ ...altKonuSayilari, ...soruSayilari }).forEach(konuId => {
                        yeniIstatistikler[konuId] = {
                            altKonuSayisi: altKonuSayilari[konuId] || 0,
                            soruSayisi: soruSayilari[konuId] || 0
                        };
                    });

                    setKonuIstatistikleri(yeniIstatistikler);
                    setIsLoading(false);
                } catch (error) {
                    console.error("İstatistikler hesaplanırken hata:", error);
                    toast.error("İstatistikler yüklenirken bir hata oluştu");
                    setIsLoading(false);
                }
            };

            // İlk yükleme ve değişikliklerde istatistikleri güncelle
            updateIstatistikler();
            const interval = setInterval(updateIstatistikler, 30000); // Her 30 saniyede bir güncelle

            return () => {
                unsubscribeKonular();
                clearInterval(interval);
            };
        } catch (error) {
            console.error("Sayfa yüklenirken hata:", error);
            toast.error("Sayfa yüklenirken bir hata oluştu");
            setIsLoading(false);
        }
    }, []);

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-4">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-8">Soru Bankası</h1>
                    
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (
                        konular.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {konular.map((konu) => {
                                    const istatistik = konuIstatistikleri[konu.id] || { altKonuSayisi: 0, soruSayisi: 0 };
                                    return (
                                        <Link
                                            to={`/question/${konu.id}`}
                                            key={konu.id}
                                            className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 group"
                                        >
                                            <h2 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-3 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                                                {konu.baslik || "Başlık Yok"}
                                            </h2>
                                            <div className="mt-4 flex justify-between items-center">
                                                <div className="flex space-x-3">
                                                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                                                        </svg>
                                                        {istatistik.altKonuSayisi} Alt Konu
                                                    </span>
                                                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                                        </svg>
                                                        {istatistik.soruSayisi} Soru
                                                    </span>
                                                </div>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 dark:text-indigo-400 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 text-center">
                                <p className="text-gray-600 dark:text-gray-400">Henüz hiç konu eklenmemiş.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default QuestionsPage;