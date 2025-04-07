import React, { useState, useEffect } from "react";
import { database, messaging } from "../firebase";
import { ref, push, get } from "firebase/database";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const AddQuestion = ({ isOpen, onClose, currentKonuId, altKonular }) => {
    const [selectedAltKonu, setSelectedAltKonu] = useState("");
    const [soruMetni, setSoruMetni] = useState("");
    const [cevaplar, setCevaplar] = useState(["", "", "", "", ""]);
    const [dogruCevap, setDogruCevap] = useState("");
    const [aciklama, setAciklama] = useState("");
    const [liked, setLiked] = useState(0);
    const [unliked, setUnliked] = useState(0);
    const [soruResmi, setSoruResmi] = useState(null);
    const [resimYukleniyor, setResimYukleniyor] = useState(false);

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

    const handleResimYukle = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setResimYukleniyor(true);
        try {
            // Resmi base64'e çevir
            const reader = new FileReader();
            reader.onloadend = () => {
                setSoruResmi(reader.result);
                setResimYukleniyor(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Resim yüklenirken hata oluştu:", error);
            setResimYukleniyor(false);
        }
    };

    const handleAddQuestion = async () => {
        if (
            !selectedAltKonu ||
            !soruMetni ||
            cevaplar.some((c) => !c) ||
            !dogruCevap
        ) {
            alert("Tüm alanları doldurmalısınız.");
            return;
        }

        // Mevcut soruların sayısını alıp, yeni soru numarasını belirle
        const soruRef = ref(
            database,
            `konular/${currentKonuId}/altkonular/${selectedAltKonu}/sorular`
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
                soruNumarasi: soruNumarasi,
                soruResmi: soruResmi || null // Resim alanını ekle
            };
            
            push(soruRef, newQuestion)
                .then(() => {
                    alert("Soru başarıyla eklendi.");
                    sendNotification("Yeni soru eklendi", `Soru: ${soruMetni.replace(/<[^>]*>?/gm, '')}`);
                    onClose();
                    setSelectedAltKonu("");
                    setSoruMetni("");
                    setCevaplar(["", "", "", "", ""]);
                    setDogruCevap("");
                    setAciklama("");
                    setLiked(0);
                    setUnliked(0);
                    setSoruResmi(null);
                })
                .catch((error) => {
                    console.error("Soru eklenirken bir hata oluştu:  ", error);
                    alert("Soru eklenirken bir hata oluştu!");
                });
        } catch (error) {
            console.error("Soru sayısı alınırken hata oluştu: ", error);
            alert("Soru eklenirken bir hata oluştu!");
        }
    };
  
    const sendNotification = async (title, body) => {
        const messagePayload = {
            title: title, // Backend'in beklediği parametre adı
            body: body, // Backend'in beklediği parametre adı
            topic: "bilbakalim", // Topic adı
        };
        try {
            const response = await fetch(
                "http://localhost:5000/send-notification",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json", // JSON formatı
                    },
                    body: JSON.stringify(messagePayload), // JSON olarak gönder
                }
            );

            if (response.ok) {
                console.log("Bildirim başarıyla gönderildi.");
            } else {
                console.error(
                    "Bildirim gönderimi başarısız oldu.",
                    await response.text()
                );
            }
        } catch (error) {
            console.error(
                "Bildirim gönderimi sırasında bir hata oluştu: ",
                error
            );
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
                <h2 className="text-xl font-bold mb-4 flex items-center justify-center">
                    Soru Ekle
                </h2>
                <div className="overflow-y-auto max-h-[80vh] px-2">
                    <div className="mb-4">
                        <label className="block mb-2">
                            Alt Konu Seçin:
                            <select
                                value={selectedAltKonu}
                                onChange={(e) => setSelectedAltKonu(e.target.value)}
                                className="w-full border rounded-md p-2 mt-1"
                            >
                                <option value="">Alt konu seçin</option>
                                {Object.entries(altKonular).map(([key, altKonu]) => (
                                    <option key={key} value={key}>
                                        {altKonu.baslik}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    
                    <div className="mb-2">
                        <label className="block mb-1">
                            Soru Metni:
                            <div className="mt-1">
                                <ReactQuill 
                                    theme="snow"
                                    value={soruMetni}
                                    onChange={setSoruMetni}
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
                                        newCevaplar[index] = e.target.value.replace(/□/g, "");
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
                                onChange={(e) => {
                                    setDogruCevap(
                                        e.target.value.toUpperCase().replace(/□/g, "")
                                    );
                                }}
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
                                    style={{ height: '120px' }}
                                />
                            </div>
                        </label>
                    </div>
                    
                    <div className="mb-4">
                        <label className="block mb-2">
                            Soru Resmi (Opsiyonel):
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleResimYukle}
                                className="w-full border rounded-md p-2 mt-1"
                            />
                            {resimYukleniyor && <p className="text-sm text-gray-500">Resim yükleniyor...</p>}
                            {soruResmi && (
                                <div className="mt-2">
                                    <img 
                                        src={soruResmi} 
                                        alt="Soru resmi" 
                                        className="max-w-full h-auto rounded-md"
                                    />
                                </div>
                            )}
                        </label>
                    </div>
                </div>
                <div className="flex justify-end space-x-4 mt-16">
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

export default AddQuestion;
