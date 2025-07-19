import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Editor } from '@tinymce/tinymce-react';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import konuStatsService from "../services/konuStatsService";

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
            // Resmi base64'e çevir
            const reader = new FileReader();
            reader.onloadend = () => {
                setSoruResmi(reader.result);
                setResimYukleniyor(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Resim yüklenirken hata oluştu:", error);
            toast.error("Resim yüklenirken bir hata oluştu!");
            setResimYukleniyor(false);
        }
    };

    const handleResimSil = () => {
        setSoruResmi(null);
    };

    const handleImageUpload = async (blobInfo) => {
        try {
            const file = new File([blobInfo.blob()], blobInfo.filename(), { type: blobInfo.blob().type });
            const storageRef = ref(storage, `soru_resimleri/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error("Resim yükleme hatası:", error);
            throw error;
        }
    };

    const handleAddQuestion = async () => {
        if (!selectedAltKonu || !soruMetni || cevaplar.some((c) => !c) || !dogruCevap) {
            toast.error("Lütfen tüm alanları doldurun!");
            return;
        }

        setIsSaving(true);

        try {
            // Firestore koleksiyon referansı
            const sorularCollectionRef = collection(db, "konular", currentKonuId, "altkonular", selectedAltKonu, "sorular");
            
            // Yeni soru objesi
            const newQuestion = {
                soruMetni,
                cevaplar,
                dogruCevap,
                aciklama,
                liked: 0,
                unliked: 0,
                report: 0,
                soruNumarasi: Date.now(), // Geçici olarak timestamp kullanıyoruz, daha sonra düzenlenebilir
                soruResmi: soruResmi || null
            };

            // Soruyu Firestore'a ekle
            await addDoc(sorularCollectionRef, newQuestion);
            
            // Konu istatistiklerini otomatik güncelle
            try {
                await konuStatsService.updateKonuStatsOnSoruChange(currentKonuId);
                console.log("Konu istatistikleri otomatik güncellendi");
            } catch (statsError) {
                console.error("Konu istatistikleri güncellenirken hata:", statsError);
                // İstatistik hatası ana işlemi etkilemesin
            }
            
            toast.success("Soru başarıyla eklendi!");
            
            // Form alanlarını temizle
            setSelectedAltKonu("");
            setSoruMetni("");
            setCevaplar(["", "", "", "", ""]);
            setDogruCevap("");
            setAciklama("");
            setSoruResmi(null);
            
            // Modalı kapat
            onClose();

        } catch (error) {
            console.error("Soru eklenirken bir hata oluştu:", error);
            toast.error("Soru eklenirken bir hata oluştu: " + error.message);
        } finally {
            setIsSaving(false);
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
                                <Editor
                                    apiKey="83kpgxax9nnx3wf6kruxk3rhefe9xso7fgxkah69lh4eie05"
                                    value={soruMetni}
                                    onEditorChange={(content) => setSoruMetni(content)}
                                    init={{
                                        height: 300,
                                        menubar: false,
                                        plugins: [
                                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                            'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                        ],
                                        toolbar: 'undo redo | blocks | ' +
                                            'bold italic forecolor | alignleft aligncenter ' +
                                            'alignright alignjustify | bullist numlist outdent indent | ' +
                                            'removeformat | image | help',
                                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                        images_upload_handler: handleImageUpload
                                    }}
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
                                <Editor
                                    apiKey="your-tinymce-api-key"
                                    value={aciklama}
                                    onEditorChange={(content) => setAciklama(content)}
                                    init={{
                                        height: 300,
                                        menubar: false,
                                        plugins: [
                                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                            'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                        ],
                                        toolbar: 'undo redo | blocks | ' +
                                            'bold italic forecolor | alignleft aligncenter ' +
                                            'alignright alignjustify | bullist numlist outdent indent | ' +
                                            'removeformat | image | help',
                                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                        images_upload_handler: handleImageUpload
                                    }}
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

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        disabled={isSaving}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleAddQuestion}
                        disabled={isSaving}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

export default AddQuestion;