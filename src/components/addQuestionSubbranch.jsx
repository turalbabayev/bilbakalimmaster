import React, { useState } from "react";
import { database } from "../firebase";
import { ref, push, get } from "firebase/database";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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

    // Quill editör modülleri ve formatları
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'font': [] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'font',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet',
        'align'
    ];

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
                report: 0,
                liked: 0,
                unliked: 0,
                soruNumarasi: soruNumarasi,
            };
            
            push(soruRef, newQuestion)
                .then(() => {
                    alert("Soru başarıyla eklendi.");
                    onClose();
                    setIsSubmitting(false);
                })
                .catch((error) => {
                    console.error("Soru eklenirken bir hata oluştu: ", error);
                    alert("Soru eklenirken bir hata oluştu!");
                    setIsSubmitting(false);
                });
        } catch (error) {
            console.error("Soru sayısı alınırken hata oluştu: ", error);
            alert("Soru eklenirken bir hata oluştu!");
            setIsSubmitting(false);
        }
    };

    // Cevapları güncellemek için yardımcı fonksiyon
    const handleCevapChange = (index, value) => {
        setCevaplar(prevCevaplar => {
            const newCevaplar = [...prevCevaplar];
            newCevaplar[index] = value;
            return newCevaplar;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-3/4 p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Alt Dal'a Soru Ekle</h2>
                
                <div className="mb-4">
                    <label className="block mb-2">
                        Soru Metni:
                        <div className="mt-1">
                            <ReactQuill 
                                theme="snow"
                                value={soruMetni}
                                onChange={setSoruMetni}
                                modules={modules}
                                formats={formats}
                                className="bg-white"
                            />
                        </div>
                    </label>
                </div>
                
                <div className="mb-4">
                    <label className="block mb-2">Cevaplar:</label>
                    {cevaplar.map((cevap, index) => (
                        <div key={index} className="mb-3">
                            <label className="block mb-1">{`Cevap ${String.fromCharCode(65 + index)}`}</label>
                            <ReactQuill
                                theme="snow"
                                value={cevap}
                                onChange={(value) => handleCevapChange(index, value)}
                                modules={modules}
                                formats={formats}
                                className="bg-white"
                            />
                        </div>
                    ))}
                </div>
                
                <div className="mb-4">
                    <label className="block mb-2">
                        Doğru Cevap:
                        <input
                            value={dogruCevap}
                            onChange={(e) => setDogruCevap(e.target.value.toUpperCase())}
                            placeholder="Doğru cevap (A, B, C, D, E)"
                            className="w-full border rounded-md p-2 mt-1"
                        />
                    </label>
                </div>
                
                <div className="mb-4">
                    <label className="block mb-2">
                        Açıklama:
                        <div className="mt-1">
                            <ReactQuill
                                theme="snow"
                                value={aciklama}
                                onChange={setAciklama}
                                modules={modules}
                                formats={formats}
                                className="bg-white h-[200px] mb-12"
                            />
                        </div>
                    </label>
                </div>
                
                <div className="flex justify-end space-x-4 mt-16">
                    <button
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400"
                        onClick={handleAddQuestion}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Ekleniyor..." : "Ekle"}
                    </button>
                    <button
                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddQuestionSubbranch;
