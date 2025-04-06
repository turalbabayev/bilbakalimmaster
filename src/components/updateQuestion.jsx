import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, update, onValue, remove } from "firebase/database";

const UpdateQuestion = ({ isOpen, onClose, soruRefPath, konuId, altKonuId }) => {
    const [soruMetni, setSoruMetni] = useState("");
    const [cevaplar, setCevaplar] = useState(["", "", "", "", ""]);
    const [dogruCevap, setDogruCevap] = useState("");
    const [aciklama, setAciklama] = useState("");
    const [altKonular, setAltKonular] = useState({});
    const [altDallar, setAltDallar] = useState({});
    const [selectedAltKonu, setSelectedAltKonu] = useState("");
    const [selectedAltDal, setSelectedAltDal] = useState("");
    const [isAltDal, setIsAltDal] = useState(false);
    const [mevcutSoruNumarasi, setMevcutSoruNumarasi] = useState(null);

    useEffect(() => {
        // Mevcut sorunun verilerini yükle
        if (soruRefPath) {
            const soruRef = ref(database, soruRefPath);
            onValue(soruRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setSoruMetni(data.soruMetni || "");
                    setCevaplar(data.cevaplar || ["", "", "", "", ""]);
                    setDogruCevap(
                        data.dogruCevap
                            ? String.fromCharCode(data.cevaplar.indexOf(data.dogruCevap) + 65)
                            : ""
                    );
                    setAciklama(data.aciklama || "");
                    // Soru numarasını saklayalım
                    setMevcutSoruNumarasi(data.soruNumarasi || null);
                }
            });
        }

        // Alt konuları yükle
        const konularRef = ref(database, `konular/${konuId}`);
        onValue(konularRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.altkonular) {
                setAltKonular(data.altkonular);
            }
        });

        // Eğer altKonuId varsa, alt dalları yükle
        if (altKonuId) {
            setIsAltDal(true);
            const altDallarRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}/altdallar`);
            onValue(altDallarRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setAltDallar(data);
                }
            });
        }
    }, [soruRefPath, konuId, altKonuId]);

    const handleUpdate = () => {
        if (!soruMetni || cevaplar.some((cevap) => !cevap) || !dogruCevap) {
            alert("Tüm alanları doldurmalısınız.");
            return;
        }

        const updatedQuestion = {
            soruMetni,
            cevaplar,
            dogruCevap: cevaplar[dogruCevap.charCodeAt(0) - 65],
            aciklama,
            report: 0,
            liked: 0,
            unliked: 0
        };

        // Mevcut soru numarası varsa, onu da ekleyelim
        if (mevcutSoruNumarasi) {
            updatedQuestion.soruNumarasi = mevcutSoruNumarasi;
        }

        let newPath;
        const timestamp = Date.now();

        if (isAltDal) {
            if (!selectedAltDal) {
                alert("Lütfen bir alt dal seçin.");
                return;
            }
            newPath = `konular/${konuId}/altkonular/${altKonuId}/altdallar/${selectedAltDal}/sorular/${timestamp}`;
        } else {
            if (!selectedAltKonu) {
                alert("Lütfen bir alt konu seçin.");
                return;
            }
            newPath = `konular/${konuId}/altkonular/${selectedAltKonu}/sorular/${timestamp}`;
        }

        // Önce yeni konuma soruyu ekle
        const newSoruRef = ref(database, newPath);
        update(newSoruRef, updatedQuestion)
            .then(() => {
                // Başarılı olduktan sonra eski soruyu sil
                const oldSoruRef = ref(database, soruRefPath);
                return remove(oldSoruRef);
            })
            .then(() => {
                alert("Soru başarıyla güncellendi ve taşındı.");
                onClose();
            })
            .catch((error) => {
                console.error("Soru güncellenirken bir hata oluştu: ", error);
                alert("Soru güncellenirken bir hata oluştu!");
            });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-1/2 p-6 max-h-[100vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Soruyu Güncelle</h2>

                {/* Konum Seçimi */}
                <div className="mb-4">
                    <label className="block mb-2">
                        Soru Konumu:
                        {isAltDal ? (
                            <select
                                value={selectedAltDal}
                                onChange={(e) => setSelectedAltDal(e.target.value)}
                                className="w-full border rounded-md p-2 mt-1"
                            >
                                <option value="">Alt Dal Seçin</option>
                                {Object.entries(altDallar).map(([key, dal]) => (
                                    <option key={key} value={key}>
                                        {dal.baslik}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <select
                                value={selectedAltKonu}
                                onChange={(e) => setSelectedAltKonu(e.target.value)}
                                className="w-full border rounded-md p-2 mt-1"
                            >
                                <option value="">Alt Konu Seçin</option>
                                {Object.entries(altKonular).map(([key, konu]) => (
                                    <option key={key} value={key}>
                                        {konu.baslik}
                                    </option>
                                ))}
                            </select>
                        )}
                    </label>
                </div>

                <label className="block mb-2">
                    Soru Metni:
                    <textarea
                        rows="3"
                        value={soruMetni}
                        onChange={(e) => setSoruMetni(e.target.value)}
                        className="w-full border rounded-md p-2 mt-1"
                    ></textarea>
                </label>
                <label className="block mb-2">
                    Cevaplar:
                    {cevaplar.map((cevap, index) => (
                        <textarea
                            key={index}
                            value={cevap}
                            onChange={(e) =>
                                setCevaplar((prev) => {
                                    const updatedCevaplar = [...prev];
                                    updatedCevaplar[index] = e.target.value;
                                    return updatedCevaplar;
                                })
                            }
                            placeholder={`Cevap ${String.fromCharCode(65 + index)}`}
                            className="w-full border rounded-md p-2 mt-1 mb-1"
                        />
                    ))}
                </label>
                <label className="block mb-4">
                    Doğru Cevap:
                    <input
                        value={dogruCevap}
                        onChange={(e) => setDogruCevap(e.target.value.toUpperCase())}
                        placeholder="Doğru cevap (A, B, C, D, E)"
                        className="w-full border rounded-md p-2 mt-1"
                    />
                </label>
                <label className="block mb-4">
                    Açıklama:
                    <textarea
                        value={aciklama}
                        onChange={(e) => setAciklama(e.target.value)}
                        placeholder="Doğru cevabın açıklamasını yazınız"
                        className="w-full border rounded-md p-2 mt-1 h-[200px]"
                    />
                </label>
                <div className="flex justify-end space-x-4">
                    <button
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                        onClick={handleUpdate}
                    >
                        Güncelle
                    </button>
                    <button
                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                        onClick={onClose}
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateQuestion;
