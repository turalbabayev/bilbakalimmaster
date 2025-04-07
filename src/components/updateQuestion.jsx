import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, get, set, remove } from "firebase/database";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const UpdateQuestion = ({ isOpen, onClose, konuId, altKonuId, soruId }) => {
    const [soru, setSoru] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cevaplar, setCevaplar] = useState(["", "", "", "", ""]);
    const [dogruCevap, setDogruCevap] = useState("");
    const [altKonular, setAltKonular] = useState({});
    const [selectedAltKonu, setSelectedAltKonu] = useState(altKonuId);
    const [mevcutSoruNumarasi, setMevcutSoruNumarasi] = useState(null);

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
        ]
    };

    const formats = [
        'header',
        'font',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet',
        'align'
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Alt konuları yükle
                const konularRef = ref(database, `konular/${konuId}`);
                const konularSnapshot = await get(konularRef);
                if (konularSnapshot.exists()) {
                    setAltKonular(konularSnapshot.val().altkonular || {});
                }

                // Mevcut soruyu yükle
                const soruRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`);
                const soruSnapshot = await get(soruRef);
                if (soruSnapshot.exists()) {
                    const data = soruSnapshot.val();
                    setSoru(data);
                    setCevaplar(data.cevaplar || ["", "", "", "", ""]);
                    setDogruCevap(data.dogruCevap || "");
                    setMevcutSoruNumarasi(data.soruNumarasi || null);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Veri yüklenirken hata oluştu:", error);
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchData();
        }
    }, [isOpen, konuId, altKonuId, soruId]);

    const handleUpdate = async () => {
        if (!soru) return;

        try {
            console.log("Güncellenecek soru:", soru);
            console.log("Cevaplar:", cevaplar);
            console.log("Doğru cevap:", dogruCevap);
            console.log("Seçili alt konu:", selectedAltKonu);

            const timestamp = Date.now();
            const newPath = `konular/${konuId}/altkonular/${selectedAltKonu}/sorular/${timestamp}`;
            console.log("Yeni yol:", newPath);
            
            // Doğru cevabın indeksini bul
            const dogruCevapIndex = cevaplar.findIndex(cevap => cevap === dogruCevap);
            if (dogruCevapIndex === -1) {
                throw new Error("Doğru cevap bulunamadı!");
            }
            
            // Yeni konuma soruyu ekle
            const newSoruRef = ref(database, newPath);
            const updatedSoru = {
                soruMetni: soru.soruMetni,
                cevaplar: cevaplar,
                dogruCevap: cevaplar[dogruCevapIndex],
                aciklama: soru.aciklama,
                report: soru.report || 0,
                liked: soru.liked || 0,
                unliked: soru.unliked || 0,
                soruNumarasi: mevcutSoruNumarasi
            };
            console.log("Güncellenecek veri:", updatedSoru);

            await set(newSoruRef, updatedSoru);

            // Eski soruyu sil
            const oldSoruRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`);
            await remove(oldSoruRef);

            alert("Soru başarıyla güncellendi ve taşındı.");
            onClose();
        } catch (error) {
            console.error("Soru güncellenirken hata oluştu:", error);
            alert("Soru güncellenirken bir hata oluştu!");
        }
    };

    if (!isOpen || loading) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-3/4 p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 flex items-center justify-center">
                    Soruyu Güncelle
                </h2>
                <div className="mb-4">
                    <label className="block mb-2">
                        Soru Konumu:
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
                    </label>
                </div>
                <div className="overflow-y-auto max-h-[80vh] px-2">
                    <div className="mb-2">
                        <label className="block mb-1">
                            Soru Metni:
                            <div className="mt-1">
                                <ReactQuill 
                                    theme="snow"
                                    value={soru.soruMetni}
                                    onChange={(value) => setSoru({ ...soru, soruMetni: value })}
                                    modules={modules}
                                    formats={formats}
                                    className="bg-white mb-4"
                                    style={{ height: '100px' }}
                                />
                            </div>
                        </label>
                    </div>
                    
                    <div className="mb-2">
                        <label className="block mb-1">Cevaplar:</label>
                        {cevaplar.map((cevap, index) => (
                            <div key={index} className="mb-3">
                                <label className="block mb-1">{`Cevap ${String.fromCharCode(65 + index)}`}</label>
                                <textarea
                                    value={cevap}
                                    onChange={(e) => {
                                        const newCevaplar = [...cevaplar];
                                        newCevaplar[index] = e.target.value;
                                        setCevaplar(newCevaplar);
                                    }}
                                    placeholder={`Cevap ${String.fromCharCode(65 + index)}`}
                                    className="w-full border rounded-md p-2 mt-1 mb-1"
                                    rows="2"
                                    maxLength={500}
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
                                    value={soru.aciklama}
                                    onChange={(value) => setSoru({ ...soru, aciklama: value })}
                                    modules={modules}
                                    formats={formats}
                                    className="bg-white"
                                    style={{ height: '120px' }}
                                />
                            </div>
                        </label>
                    </div>
                </div>
                <div className="flex justify-end space-x-4 mt-16">
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
