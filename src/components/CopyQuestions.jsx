import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, get, set, push } from "firebase/database";

const CopyQuestions = ({ isOpen, onClose, konuId, altKonuId, altDalId }) => {
    const [konular, setKonular] = useState([]);
    const [seciliAltKonu, setSeciliAltKonu] = useState("");
    const [seciliAltDal, setSeciliAltDal] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [logMessages, setLogMessages] = useState([]);

    useEffect(() => {
        if (isOpen) {
            // Mevcut konuları yükle
            const konularRef = ref(database, "konular");
            get(konularRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const formattedData = Object.entries(data).map(([key, value]) => ({
                        id: key,
                        ...value,
                    }));
                    setKonular(formattedData);
                }
            });
        }
    }, [isOpen]);

    const addLog = (message) => {
        setLogMessages((prev) => [...prev, message]);
    };

    const handleCopy = async () => {
        if (!seciliAltKonu || !seciliAltDal) {
            alert("Lütfen hedef alt konu ve alt dalı seçin.");
            return;
        }

        setIsLoading(true);
        addLog("İşlem başlatılıyor...");

        try {
            // Kaynak soruları al
            const kaynakRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}/altdallar/${altDalId}/sorular`);
            const kaynakSnapshot = await get(kaynakRef);
            const kaynakSorular = kaynakSnapshot.val();

            if (!kaynakSorular) {
                addLog("HATA: Kaynak sorular bulunamadı!");
                return;
            }

            // Hedef konumunu al
            const [hedefKonuId, hedefAltKonuId, hedefAltDalId] = seciliAltDal.split("/");
            const hedefRef = ref(database, `konular/${hedefKonuId}/altkonular/${hedefAltKonuId}/altdallar/${hedefAltDalId}/sorular`);

            // Her soruyu kopyala
            for (const [soruKey, soruData] of Object.entries(kaynakSorular)) {
                const yeniSoruRef = push(hedefRef);
                await set(yeniSoruRef, {
                    ...soruData,
                    soruNumarasi: soruData.soruNumarasi || 0,
                    liked: 0,
                    unliked: 0,
                    report: 0
                });
                addLog(`Soru kopyalandı: ${soruData.soruMetni?.substring(0, 30)}...`);
            }

            addLog("Tüm sorular başarıyla kopyalandı.");
            alert("Sorular başarıyla kopyalandı!");
            onClose();

        } catch (error) {
            addLog("HATA: " + error.message);
            alert("İşlem sırasında bir hata oluştu: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-[600px] max-h-[80vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                    Soruları Kopyala
                </h2>

                <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                        Hedef Alt Konu:
                    </label>
                    <select
                        value={seciliAltKonu}
                        onChange={(e) => {
                            setSeciliAltKonu(e.target.value);
                            setSeciliAltDal("");
                        }}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        disabled={isLoading}
                    >
                        <option value="">Seçiniz</option>
                        {konular.map((konu) => (
                            konu.altkonular && Object.entries(konu.altkonular).map(([altKonuKey, altKonu]) => (
                                <option key={`${konu.id}-${altKonuKey}`} value={`${konu.id}/${altKonuKey}`}>
                                    {konu.baslik} - {altKonu.baslik}
                                </option>
                            ))
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                        Hedef Alt Dal:
                    </label>
                    <select
                        value={seciliAltDal}
                        onChange={(e) => setSeciliAltDal(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        disabled={isLoading || !seciliAltKonu}
                    >
                        <option value="">Seçiniz</option>
                        {seciliAltKonu && konular
                            .find(k => k.id === seciliAltKonu.split("/")[0])?.altkonular?.[seciliAltKonu.split("/")[1]]?.altdallar
                            && Object.entries(konular
                                .find(k => k.id === seciliAltKonu.split("/")[0])
                                .altkonular[seciliAltKonu.split("/")[1]]
                                .altdallar
                            ).map(([altDalKey, altDal]) => (
                                <option key={altDalKey} value={`${seciliAltKonu}/${altDalKey}`}>
                                    {altDal.baslik}
                                </option>
                            ))}
                    </select>
                </div>

                {logMessages.length > 0 && (
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                            İşlem Günlüğü:
                        </label>
                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-900 text-xs font-mono text-gray-800 dark:text-gray-200 h-[150px] overflow-y-auto">
                            {logMessages.map((log, index) => (
                                <div key={index} className="mb-1">
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        onClick={handleCopy}
                        disabled={isLoading || !seciliAltKonu || !seciliAltDal}
                        className={`px-4 py-2 rounded-lg shadow-sm transition-all ${
                            isLoading || !seciliAltKonu || !seciliAltDal
                                ? "bg-gray-400 text-gray-100 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                    >
                        {isLoading ? "Kopyalanıyor..." : "Soruları Kopyala"}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-lg shadow-sm transition-all ${
                            isLoading
                                ? "bg-gray-400 text-gray-100 cursor-not-allowed"
                                : "bg-gray-500 hover:bg-gray-600 text-white"
                        }`}
                    >
                        İptal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CopyQuestions; 