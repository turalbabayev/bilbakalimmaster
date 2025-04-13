import React, { useState } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const AddQuestion = ({ isOpen, onClose, currentKonuId, altKonular }) => {
    const [selectedAltKonu, setSelectedAltKonu] = useState("");
    const [selectedSubbranch, setSelectedSubbranch] = useState("");
    const [soru, setSoru] = useState("");
    const [cevaplar, setCevaplar] = useState(["", "", "", "", ""]);
    const [dogruCevap, setDogruCevap] = useState("");
    const [aciklama, setAciklama] = useState("");
    const [resim, setResim] = useState(null);
    const [resimYukleniyor, setResimYukleniyor] = useState(false);
    const [zenginMetinAktif, setZenginMetinAktif] = useState(true);
    const [loading, setLoading] = useState(false);
    const [resimUrl, setResimUrl] = useState("");

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
            toast.error("Resim boyutu çok büyük! Lütfen 5MB'dan küçük bir resim seçin.");
            return;
        }

        setResimYukleniyor(true);
        try {
            setResim(file);
            setResimUrl(URL.createObjectURL(file));
        } catch (error) {
            console.error("Resim yüklenirken hata oluştu:", error);
            toast.error("Resim yüklenirken bir hata oluştu!");
        } finally {
            setResimYukleniyor(false);
        }
    };

    const handleResimSil = () => {
        setResim(null);
        setResimUrl("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedAltKonu || !selectedSubbranch || !soru || !dogruCevap) {
            toast.error("Lütfen tüm gerekli alanları doldurun!");
            return;
        }

        setLoading(true);
        try {
            let imageUrl = "";
            if (resim) {
                const storageRef = ref(storage, `sorular/${currentKonuId}/${selectedAltKonu}/${Date.now()}_${resim.name}`);
                await uploadBytes(storageRef, resim);
                imageUrl = await getDownloadURL(storageRef);
            }

            const konuRef = doc(db, "konular", currentKonuId);
            const konuDoc = await getDoc(konuRef);
            
            if (!konuDoc.exists()) {
                throw new Error("Konu bulunamadı!");
            }

            const konuData = konuDoc.data();
            const altKonularData = konuData.altkonular || {};
            const subbranches = altKonularData[selectedAltKonu]?.subbranches || {};
            const currentQuestions = subbranches[selectedSubbranch]?.questions || {};

            // Yeni soru numarası
            const questionNumber = Object.keys(currentQuestions).length + 1;

            // Yeni soruyu ekle
            const updatedQuestions = {
                ...currentQuestions,
                [questionNumber]: {
                    soru,
                    cevaplar,
                    dogruCevap,
                    aciklama,
                    resim: imageUrl,
                    soruNumarasi: questionNumber,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
            };

            // Firestore'u güncelle
            const updatedSubbranches = {
                ...subbranches,
                [selectedSubbranch]: {
                    ...subbranches[selectedSubbranch],
                    questions: updatedQuestions,
                },
            };

            const updatedAltKonular = {
                ...altKonularData,
                [selectedAltKonu]: {
                    ...altKonularData[selectedAltKonu],
                    subbranches: updatedSubbranches,
                },
            };

            await updateDoc(konuRef, {
                altkonular: updatedAltKonular,
            });

            toast.success("Soru başarıyla eklendi!");
            
            // Form alanlarını temizle
            setSoru("");
            setCevaplar(["", "", "", "", ""]);
            setDogruCevap("");
            setAciklama("");
            setResim(null);
            setResimUrl("");
            setSelectedSubbranch("");
            setSelectedAltKonu("");
            
            onClose();
        } catch (error) {
            console.error("Hata:", error);
            toast.error("Soru eklenirken bir hata oluştu!");
        } finally {
            setLoading(false);
        }
    };

    const handleCevapChange = (index, value) => {
        const newCevaplar = [...cevaplar];
        newCevaplar[index] = value;
        setCevaplar(newCevaplar);
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
                                Alt Dal Seçin
                            </label>
                            <select
                                value={selectedSubbranch}
                                onChange={(e) => setSelectedSubbranch(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            >
                                <option value="">Alt dal seçin</option>
                                {selectedAltKonu &&
                                    Object.entries(altKonular[selectedAltKonu]?.subbranches || {}).map(([key, subbranch]) => (
                                        <option key={key} value={key}>
                                            {subbranch.baslik}
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
                                    value={soru}
                                    onChange={setSoru}
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
                                                        onChange={(value) => handleCevapChange(index, value)}
                                                        modules={modules}
                                                        formats={formats}
                                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                    />
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={cevap}
                                                    onChange={(e) => handleCevapChange(index, e.target.value)}
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
                                    {resim && (
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
                                {resimUrl && (
                                    <div className="mt-4 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                        <img 
                                            src={resimUrl} 
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
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Ekleniyor..." : "Soru Ekle"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddQuestion;
