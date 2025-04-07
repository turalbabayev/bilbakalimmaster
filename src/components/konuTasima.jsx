import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, get, set, push, remove } from "firebase/database";

const KonuTasima = ({ closeModal }) => {
    const [konular, setKonular] = useState([]);
    const [seciliKonular, setSeciliKonular] = useState([]);
    const [yeniAnaKonuAdi, setYeniAnaKonuAdi] = useState("Katılım Bankacılığı");
    const [isLoading, setIsLoading] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [logMessages, setLogMessages] = useState([]);

    useEffect(() => {
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
    }, []);

    const handleCheckboxChange = (konuId) => {
        setSeciliKonular((prev) =>
            prev.includes(konuId)
                ? prev.filter((id) => id !== konuId)
                : [...prev, konuId]
        );
    };

    const addLog = (message) => {
        setLogMessages((prev) => [...prev, message]);
    };

    const handleTasima = async () => {
        if (seciliKonular.length === 0) {
            alert("Lütfen taşınacak konuları seçin.");
            return;
        }

        if (!yeniAnaKonuAdi.trim()) {
            alert("Lütfen yeni ana konu adını girin.");
            return;
        }

        const confirm = window.confirm(
            `${seciliKonular.length} adet konuyu '${yeniAnaKonuAdi}' ana başlığı altına taşımak istediğinize emin misiniz? Bu işlem geri alınamaz.`
        );

        if (!confirm) return;

        setIsLoading(true);
        addLog("İşlem başlatılıyor...");

        try {
            // Yeni ana konuyu oluştur
            addLog("Yeni ana konu oluşturuluyor: " + yeniAnaKonuAdi);
            const konularRef = ref(database, "konular");
            const newKonuRef = push(konularRef);
            const newKonuId = newKonuRef.key;

            await set(newKonuRef, {
                baslik: yeniAnaKonuAdi,
                altkonular: {}
            });
            addLog("Ana konu oluşturuldu: " + newKonuId);

            // Seçili konuları yeni ana konu altına taşı
            const altkonularRef = ref(database, `konular/${newKonuId}/altkonular`);

            for (const konuId of seciliKonular) {
                const secilenKonu = konular.find((konu) => konu.id === konuId);
                if (!secilenKonu) continue;

                addLog(`'${secilenKonu.baslik}' konusu taşınıyor...`);
                
                // Mevcut konunun verilerini al (alt konular dahil)
                const konuRef = ref(database, `konular/${konuId}`);
                const konuSnapshot = await get(konuRef);
                const konuData = konuSnapshot.val();

                if (!konuData) {
                    addLog(`HATA: '${secilenKonu.baslik}' konusu bulunamadı!`);
                    continue;
                }

                // Alt konu olarak ekle
                const newAltKonuRef = push(altkonularRef);
                const newAltKonuId = newAltKonuRef.key;

                // Alt konunun tüm verilerini kopyala
                await set(newAltKonuRef, {
                    baslik: konuData.baslik,
                    altkonular: konuData.altkonular || {},
                    altdallar: konuData.altdallar || {}
                });

                // Alt dalları ve soruları kopyala
                if (konuData.altdallar) {
                    for (const [altDalKey, altDalData] of Object.entries(konuData.altdallar)) {
                        const altDalRef = ref(database, `konular/${newKonuId}/altkonular/${newAltKonuId}/altdallar/${altDalKey}`);
                        await set(altDalRef, altDalData);

                        // Alt dalın sorularını kopyala
                        if (altDalData.sorular) {
                            for (const [soruKey, soruData] of Object.entries(altDalData.sorular)) {
                                const soruRef = ref(database, `konular/${newKonuId}/altkonular/${newAltKonuId}/altdallar/${altDalKey}/sorular/${soruKey}`);
                                await set(soruRef, soruData);
                            }
                        }
                    }
                }

                addLog(`'${secilenKonu.baslik}' konusu ve tüm alt dalları/soruları başarıyla taşındı.`);
            }

            // İşlemi tamamla
            setIsCompleted(true);
            addLog("İşlem başarıyla tamamlandı.");
            
            alert("Konular başarıyla taşındı. Eski konuları silmek için ana sayfadaki 'Konu Sil' butonunu kullanabilirsiniz.");

        } catch (error) {
            addLog("HATA: " + error.message);
            alert("İşlem sırasında bir hata oluştu: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-[600px] max-h-[80vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                    Konuları Taşıma İşlemi
                </h2>

                <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                        Yeni Ana Konu Adı:
                    </label>
                    <input
                        type="text"
                        value={yeniAnaKonuAdi}
                        onChange={(e) => setYeniAnaKonuAdi(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        disabled={isLoading || isCompleted}
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                        Taşınacak Konular:
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                        {konular.map((konu) => (
                            <div key={konu.id} className="flex items-center mb-2 last:mb-0">
                                <input
                                    type="checkbox"
                                    id={konu.id}
                                    checked={seciliKonular.includes(konu.id)}
                                    onChange={() => handleCheckboxChange(konu.id)}
                                    className="mr-2 h-5 w-5"
                                    disabled={isLoading || isCompleted}
                                />
                                <label
                                    htmlFor={konu.id}
                                    className="text-gray-700 dark:text-gray-300"
                                >
                                    {konu.baslik}
                                </label>
                            </div>
                        ))}
                    </div>
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
                    {!isCompleted ? (
                        <>
                            <button
                                onClick={handleTasima}
                                disabled={isLoading || seciliKonular.length === 0}
                                className={`px-4 py-2 rounded-lg shadow-sm transition-all ${
                                    isLoading || seciliKonular.length === 0
                                        ? "bg-gray-400 text-gray-100 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700 text-white"
                                }`}
                            >
                                {isLoading ? "İşlem yapılıyor..." : "Konuları Taşı"}
                            </button>
                            <button
                                onClick={closeModal}
                                disabled={isLoading}
                                className={`px-4 py-2 rounded-lg shadow-sm transition-all ${
                                    isLoading
                                        ? "bg-gray-400 text-gray-100 cursor-not-allowed"
                                        : "bg-gray-500 hover:bg-gray-600 text-white"
                                }`}
                            >
                                İptal
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={closeModal}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all"
                        >
                            Kapat
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KonuTasima; 