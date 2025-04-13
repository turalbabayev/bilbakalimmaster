import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import 'react-toastify/dist/ReactToastify.css';

const UpdateQuestion = ({ isOpen, onClose, konuId, altKonuId, soruId, onUpdateComplete }) => {
    const [loading, setLoading] = useState(false);
    const [soruMetni, setSoruMetni] = useState("");
    const [cevaplar, setCevaplar] = useState(["", "", "", "", ""]);
    const [dogruCevap, setDogruCevap] = useState("");
    const [aciklama, setAciklama] = useState("");
    const [soruResmi, setSoruResmi] = useState("");
    const [soruNumarasi, setSoruNumarasi] = useState("");
    const [zenginMetinAktif, setZenginMetinAktif] = useState(false);
    const [dogruCevapSecimi, setDogruCevapSecimi] = useState(false);
    const [altKonular, setAltKonular] = useState({});
    const [selectedAltKonu, setSelectedAltKonu] = useState(altKonuId || "");
    const [mevcutSoruNumarasi, setMevcutSoruNumarasi] = useState(null);
    const [resimYukleniyor, setResimYukleniyor] = useState(false);
    const [modalKey, setModalKey] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

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

    // HTML etiketlerini temizleme fonksiyonu
    const stripHtml = (html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    useEffect(() => {
        const fetchSoru = async () => {
            if (!isOpen || !konuId || !altKonuId || !soruId) return;

            try {
                const soruRef = doc(db, `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`);
                const soruDoc = await getDoc(soruRef);

                if (soruDoc.exists()) {
                    const soru = soruDoc.data();
                    setSoruMetni(soru.soruMetni || "");
                    setCevaplar(soru.cevaplar || ["", "", "", "", ""]);
                    setDogruCevap(soru.dogruCevap || "");
                    setAciklama(soru.aciklama || "");
                    setSoruResmi(soru.soruResmi || "");
                    setSoruNumarasi(soru.soruNumarasi || "");
                }
            } catch (error) {
                console.error("Soru yüklenirken hata:", error);
                toast.error("Soru yüklenirken bir hata oluştu!");
            }
        };

        fetchSoru();
    }, [isOpen, konuId, altKonuId, soruId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const soruRef = doc(db, `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`);
            
            await updateDoc(soruRef, {
                soruMetni,
                cevaplar,
                dogruCevap,
                aciklama,
                soruResmi,
                soruNumarasi: soruNumarasi || 0,
                updatedAt: new Date()
            });

            toast.success("Soru başarıyla güncellendi!");
            if (onUpdateComplete) {
                onUpdateComplete({
                    id: soruId,
                    soruMetni,
                    cevaplar,
                    dogruCevap,
                    aciklama,
                    soruResmi,
                    soruNumarasi
                });
            }
            onClose();
        } catch (error) {
            console.error("Soru güncellenirken hata:", error);
            toast.error(`Soru güncellenirken bir hata oluştu: ${error.message}`);
        } finally {
            setLoading(false);
        }
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
        setSoruResmi("");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                        Soru Güncelle
                    </h2>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Alt Konu Seçin
                            </label>
                            <select
                                value={selectedAltKonu}
                                onChange={(e) => setSelectedAltKonu(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl border-2 ${!selectedAltKonu ? 'border-red-400 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`}
                            >
                                <option value="">Alt konu seçin</option>
                                {Object.entries(altKonular).map(([key, altKonu]) => (
                                    <option key={key} value={key}>
                                        {altKonu.baslik}
                                    </option>
                                ))}
                            </select>
                            {!selectedAltKonu && (
                                <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                                    Lütfen bir alt konu seçin. Bu alanın doldurulması zorunludur.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Soru Metni
                            </label>
                            <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                <ReactQuill 
                                    theme="snow"
                                    value={soruMetni}
                                    onChange={(value) => setSoruMetni(value)}
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
                                    onClick={(e) => {
                                        e.preventDefault();
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
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setDogruCevap(String.fromCharCode(65 + index));
                                                }}
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
                                    onChange={(value) => setAciklama(value)}
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
                    </form>
                </div>
                
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        {loading ? "Güncelleniyor..." : "Güncelle"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateQuestion;
