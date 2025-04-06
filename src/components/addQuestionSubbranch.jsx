import React, { useState } from "react";
import { database } from "../firebase";
import { ref, push, get } from "firebase/database";

const AddQuestionSubbranch = ({
    isOpen,
    onClose,
    konuId,
    altKonuId,
    selectedAltDal,
}) => {
    const [soruMetni, setSoruMetni] = useState("");
    const [cevaplar, setCevaplar] = useState(["", "", "", "", ""]);
    const [dogruCevap, setDogruCevap] = useState("");
    const [aciklama, setAciklama] = useState("");

    const handleAddQuestion = async () => {
        if (!soruMetni || cevaplar.some((c) => !c) || !dogruCevap) {
            alert("Tüm alanları doldurmalısınız.");
            return;
        }

        // Mevcut soruların sayısını alıp, yeni soru numarasını belirle
        const soruRef = ref(
            database,
            `konular/${konuId}/altkonular/${altKonuId}/altdallar/${selectedAltDal}/sorular`
        );
        
        try {
            const snapshot = await get(soruRef);
            const sorular = snapshot.val() || {};
            const soruSayisi = Object.keys(sorular).length;
            const soruNumarasi = soruSayisi + 1;
            
            const newQuestion = {
                soruMetni,
                cevaplar,
                dogruCevap: cevaplar[dogruCevap.charCodeAt(0) - 65],
                aciklama,
                liked: 0,
                unliked: 0,
                report: 0,
                soruNumarasi: soruNumarasi, // Soru numarası eklendi
            };

            push(soruRef, newQuestion)
                .then(() => {
                    alert("Soru başarıyla eklendi.");
                    onClose();
                    setSoruMetni("");
                    setCevaplar(["", "", "", "", ""]);
                    setDogruCevap("");
                    setAciklama("");
                })
                .catch((error) => {
                    console.error("Soru eklenirken bir hata oluştu: ", error);
                    alert("Soru eklenirken bir hata oluştu!");
                });
        } catch (error) {
            console.error("Soru sayısı alınırken hata oluştu: ", error);
            alert("Soru eklenirken bir hata oluştu!");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-1/2 p-6 max-h-[100vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Alt Dal'a Soru Ekle</h2>
                <div className="overflow-y-auto max-h-[80vh] px-2">
                    <label className="block mb-2">
                        Soru Metni:
                        <textarea
                            rows="3"
                            value={soruMetni}
                            onChange={(e) =>
                                setSoruMetni(e.target.value.replace(/□/g, ""))
                            }
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
                                        const newCevaplar = [...prev];
                                        newCevaplar[index] = e.target.value.replace(
                                            /□/g,
                                            ""
                                        );
                                        return newCevaplar;
                                    })
                                }
                                placeholder={`Cevap ${String.fromCharCode(
                                    65 + index
                                )}`}
                                className="w-full border rounded-md p-2 mt-1 mb-1"
                            />
                        ))}
                    </label>
                    <label className="block mb-4">
                        Doğru Cevap:
                        <input
                            value={dogruCevap}
                            onChange={(e) =>
                                setDogruCevap(
                                    e.target.value.toUpperCase().replace(/□/g, "")
                                )
                            }
                            placeholder="Doğru cevap (A, B, C, D, E)"
                            className="w-full border rounded-md p-2 mt-1"
                        />
                    </label>
                    <label className="block mb-4">
                        Açıklama:
                        <textarea 
                            value={aciklama}
                            onChange={(e) =>
                                setAciklama(e.target.value.replace(/□/g, ""))
                            }
                            placeholder="Doğru cevabın açıklamasını giriniz."
                            className="w-full border rounded-md p-2 mt-1 h-[200px]"
                        />
                    </label>
                </div>
                <div className="flex justify-end space-x-4 mt-4">
                    <button
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                        onClick={handleAddQuestion}
                    >
                        Ekle
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

export default AddQuestionSubbranch;
