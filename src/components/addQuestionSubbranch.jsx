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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddQuestion = async () => {
        if (!soruMetni || cevaplar.some((c) => !c) || !dogruCevap) {
            alert("Tüm alanları doldurmalısınız.");
            return;
        }

        setIsSubmitting(true);

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
                }).finally(() => {
                    setIsSubmitting(false);
                });
        } catch (error) {
            console.error("Soru sayısı alınırken hata oluştu: ", error);
            alert("Soru eklenirken bir hata oluştu!");
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b pb-3 border-gray-200 dark:border-gray-700">Alt Dal'a Soru Ekle</h2>
                <div className="overflow-y-auto max-h-[70vh] pr-2">
                    <div className="space-y-5">
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Soru Metni:
                            </label>
                            <textarea
                                rows="4"
                                value={soruMetni}
                                onChange={(e) =>
                                    setSoruMetni(e.target.value.replace(/□/g, ""))
                                }
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                                placeholder="Soru metnini buraya yazın..."
                            ></textarea>
                        </div>

                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Cevaplar:
                            </label>
                            <div className="space-y-3">
                                {cevaplar.map((cevap, index) => (
                                    <div key={index} className="flex items-center">
                                        <span className="bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 font-bold w-8 h-8 rounded-full flex items-center justify-center mr-3">
                                            {String.fromCharCode(65 + index)}
                                        </span>
                                        <textarea
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
                                            placeholder={`${String.fromCharCode(65 + index)} şıkkı için cevap yazın`}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Doğru Cevap:
                            </label>
                            <div className="flex space-x-2 mb-2">
                                {["A", "B", "C", "D", "E"].map((harf) => (
                                    <button
                                        key={harf}
                                        type="button"
                                        onClick={() => setDogruCevap(harf)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                                            dogruCevap === harf 
                                                ? "bg-green-500 text-white" 
                                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                        }`}
                                    >
                                        {harf}
                                    </button>
                                ))}
                            </div>
                            <input
                                value={dogruCevap}
                                onChange={(e) =>
                                    setDogruCevap(
                                        e.target.value.toUpperCase().replace(/□/g, "")
                                    )
                                }
                                placeholder="Doğru cevap (A, B, C, D, E)"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Açıklama:
                            </label>
                            <textarea 
                                value={aciklama}
                                onChange={(e) =>
                                    setAciklama(e.target.value.replace(/□/g, ""))
                                }
                                placeholder="Doğru cevabın açıklamasını giriniz"
                                rows="5"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        İptal
                    </button>
                    <button
                        className={`bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all font-medium flex items-center justify-center ${
                            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                        onClick={handleAddQuestion}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Ekleniyor...
                            </>
                        ) : (
                            "Soru Ekle"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddQuestionSubbranch;
