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

        // Resim boyutu kontrolü (5MB)
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_FILE_SIZE) {
            alert("Resim boyutu çok büyük! Lütfen 5MB'dan küçük bir resim seçin.");
            return;
        }

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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-11/12 max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white text-center">
                        Yeni Soru Ekle
                    </h2>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sol Kolon */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Soru Metni
                                </label>
                                <div className="bg-white dark:bg-gray-700 rounded-lg">
                                    <ReactQuill 
                                        theme="snow"
                                        value={soruMetni}
                                        onChange={setSoruMetni}
                                        modules={modules}
                                        formats={formats}
                                        className="bg-white dark:bg-gray-700"
                                        style={{ height: '150px' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Açıklama
                                </label>
                                <div className="bg-white dark:bg-gray-700 rounded-lg">
                                    <ReactQuill
                                        theme="snow"
                                        value={aciklama}
                                        onChange={setAciklama}
                                        modules={modules}
                                        formats={formats}
                                        className="bg-white dark:bg-gray-700"
                                        style={{ height: '150px' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sağ Kolon */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Cevaplar
                                </label>
                                <div className="space-y-3">
                                    {cevaplar.map((cevap, index) => (
                                        <div key={index} className="flex items-center space-x-3">
                                            <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-full font-medium">
                                                {String.fromCharCode(65 + index)}
                                            </span>
                                            <textarea
                                                value={cevap}
                                                onChange={(e) => {
                                                    const newCevaplar = [...cevaplar];
                                                    newCevaplar[index] = e.target.value;
                                                    setCevaplar(newCevaplar);
                                                }}
                                                placeholder={`Cevap ${String.fromCharCode(65 + index)}`}
                                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                rows="2"
                                                maxLength={500}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Doğru Cevap
                                </label>
                                <input
                                    value={dogruCevap}
                                    onChange={(e) => setDogruCevap(e.target.value.toUpperCase())}
                                    placeholder="Doğru cevap (A, B, C, D, E)"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Soru Resmi (Opsiyonel)
                                </label>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleResimYukle}
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                        {soruResmi && (
                                            <button
                                                onClick={handleResimSil}
                                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
                                            >
                                                Resmi Sil
                                            </button>
                                        )}
                                    </div>
                                    {resimYukleniyor && (
                                        <div className="text-sm text-indigo-600 dark:text-indigo-400">
                                            Resim yükleniyor...
                                        </div>
                                    )}
                                    {soruResmi && (
                                        <div className="mt-2">
                                            <img 
                                                src={soruResmi} 
                                                alt="Soru resmi" 
                                                className="w-full h-auto rounded-lg shadow-md"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleAddQuestion}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200"
                    >
                        Soru Ekle
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddQuestion;
