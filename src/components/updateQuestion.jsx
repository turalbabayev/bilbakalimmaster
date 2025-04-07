import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, get, set } from "firebase/database";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const UpdateQuestion = ({ isOpen, onClose, konuId, altKonuId, soruId }) => {
    const [soruMetni, setSoruMetni] = useState("");
    const [cevaplar, setCevaplar] = useState(["", "", "", "", ""]);
    const [dogruCevap, setDogruCevap] = useState("");
    const [aciklama, setAciklama] = useState("");
    const [loading, setLoading] = useState(true);

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
        clipboard: {
            matchVisual: false,
        }
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
        const fetchSoru = async () => {
            try {
                const soruRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`);
                const snapshot = await get(soruRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    setSoruMetni(data.soruMetni || "");
                    setCevaplar(data.cevaplar || ["", "", "", "", ""]);
                    setDogruCevap(data.dogruCevap || "");
                    setAciklama(data.aciklama || "");
                    setLoading(false);
                }
            } catch (error) {
                console.error("Soru yüklenirken hata oluştu:", error);
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchSoru();
        }
    }, [isOpen, konuId, altKonuId, soruId]);

    const handleUpdate = async () => {
        if (!soruMetni || cevaplar.some(cevap => !cevap) || !dogruCevap) {
            alert("Lütfen tüm alanları doldurun!");
            return;
        }

        try {
            const soruRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`);
            await set(soruRef, {
                soruMetni,
                cevaplar,
                dogruCevap: cevaplar[dogruCevap.charCodeAt(0) - 65],
                aciklama,
                report: 0,
                liked: 0,
                unliked: 0
            });
            alert("Soru başarıyla güncellendi.");
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
                <div className="overflow-y-auto max-h-[80vh] px-2">
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
                                    style={{ height: '200px' }}
                                />
                            </div>
                        </label>
                    </div>
                    
                    <div className="mb-4">
                        <label className="block mb-2">Cevaplar:</label>
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
                                    value={aciklama}
                                    onChange={setAciklama}
                                    modules={modules}
                                    formats={formats}
                                    className="bg-white"
                                    style={{ height: '200px' }}
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
