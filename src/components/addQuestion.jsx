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
    const [zenginMetinAktif, setZenginMetinAktif] = useState(false);
    const [dogruCevapSecimi, setDogruCevapSecimi] = useState(false);

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

    // HTML etiketlerini temizleme fonksiyonu
    const stripHtml = (html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

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

    const handleResimSil = () => {
        setSoruResmi(null);
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
                dogruCevap,
                aciklama,
                liked: 0,
                unliked: 0,
                report: 0,
                soruNumarasi: soruNumarasi,
                soruResmi: soruResmi || null
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                        Yeni Soru Ekle
                    </h2>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1">
                    <div className="space-y-8">
                        <div>
                            <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Alt Konu Seçin
                            </label>
                            <select
                                value={selectedAltKonu}
                                onChange={(e) => setSelectedAltKonu(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            >
                                <option value="">Alt konu seçin</option>
                                {Object.entries(altKonular).map(([key, altKonu]) => (
                                    <option key={key} value={key}>
                                        {altKonu.baslik}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Soru Metni
                            </label>
                            <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                <ReactQuill 
                                    theme="snow"
                                    value={soruMetni}
                                    onChange={setSoruMetni}
                                    modules={modules}
                                    formats={formats}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    style={{ height: '200px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-base font-semibold text-gray-900 dark:text-white">
                                    Cevaplar
                                </label>
                                <button
                                    onClick={() => {
                                        setZenginMetinAktif(!zenginMetinAktif);
                                        if (zenginMetinAktif) {
                                            // Basit editöre geçerken HTML etiketlerini temizle
                                            const temizCevaplar = cevaplar.map(cevap => stripHtml(cevap));
                                            setCevaplar(temizCevaplar);
                                        }
                                    }}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                                        zenginMetinAktif 
                                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' 
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    {zenginMetinAktif ? 'Basit Metin Editörüne Geç' : 'Zengin Metin Editörüne Geç'}
                                </button>
                            </div>
                            <div className="space-y-4">
                                {cevaplar.map((cevap, index) => (
                                    <div key={index} className="flex items-start gap-4">
                                        <div className="flex-shrink-0 pt-3">
                                            <button
                                                onClick={() => setDogruCevap(String.fromCharCode(65 + index))}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-all duration-200 ${
                                                    dogruCevap === String.fromCharCode(65 + index)
                                                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 ring-2 ring-green-500'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                {String.fromCharCode(65 + index)}
                                            </button>
                                        </div>
                                        <div className="flex-1">
                                            {zenginMetinAktif ? (
                                                <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                                    <ReactQuill
                                                        theme="snow"
                                                        value={cevap}
                                                        onChange={(value) => {
                                                            const newCevaplar = [...cevaplar];
                                                            newCevaplar[index] = value;
                                                            setCevaplar(newCevaplar);
                                                        }}
                                                        modules={modules}
                                                        formats={formats}
                                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                    />
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={cevap}
                                                    onChange={(e) => {
                                                        const newCevaplar = [...cevaplar];
                                                        newCevaplar[index] = e.target.value;
                                                        setCevaplar(newCevaplar);
                                                    }}
                                                    placeholder={`${String.fromCharCode(65 + index)} şıkkının cevabını girin`}
                                                    className={`w-full px-4 py-3 rounded-xl border-2 ${
                                                        dogruCevap === String.fromCharCode(65 + index)
                                                            ? 'border-green-200 dark:border-green-800'
                                                            : 'border-gray-200 dark:border-gray-700'
                                                    } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Açıklama
                            </label>
                            <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                <ReactQuill
                                    theme="snow"
                                    value={aciklama}
                                    onChange={setAciklama}
                                    modules={modules}
                                    formats={formats}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    style={{ height: '200px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Soru Resmi (Opsiyonel)
                            </label>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleResimYukle}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40"
                                        />
                                    </div>
                                    {soruResmi && (
                                        <button
                                            onClick={handleResimSil}
                                            className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 font-medium"
                                        >
                                            Resmi Sil
                                        </button>
                                    )}
                                </div>
                                {resimYukleniyor && (
                                    <div className="text-sm text-blue-600 dark:text-blue-400 animate-pulse">
                                        Resim yükleniyor...
                                    </div>
                                )}
                                {soruResmi && (
                                    <div className="mt-4 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                        <img 
                                            src={soruResmi} 
                                            alt="Soru resmi" 
                                            className="w-full h-auto"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleAddQuestion}
                        className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 font-medium"
                    >
                        Soru Ekle
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddQuestion;
