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
                setSoru({ ...soru, soruResmi: reader.result });
                setResimYukleniyor(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Resim yüklenirken hata oluştu:", error);
            setResimYukleniyor(false);
        }
    };

    const handleResimSil = () => {
        setSoru({ ...soru, soruResmi: null });
    };

    const handleUpdate = async () => {
        if (!soru) {
            console.error("Güncellenecek soru bulunamadı!");
            alert("Güncellenecek soru bulunamadı!");
            return;
        }

        try {
            console.log("=== Güncelleme Başlangıç ===");
            console.log("Güncellenecek soru:", soru);
            console.log("Cevaplar:", cevaplar);
            console.log("Doğru cevap:", dogruCevap);
            console.log("Seçili alt konu:", selectedAltKonu);

            // Doğru cevap kontrolü
            const dogruCevapIndex = cevaplar.findIndex(cevap => cevap === dogruCevap);
            if (dogruCevapIndex === -1) {
                console.error("Doğru cevap bulunamadı! Cevaplar:", cevaplar, "Seçilen cevap:", dogruCevap);
                throw new Error("Doğru cevap bulunamadı!");
            }

            const timestamp = Date.now();
            const newPath = `konular/${konuId}/altkonular/${selectedAltKonu}/sorular/${timestamp}`;
            console.log("Yeni yol:", newPath);
            
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
                soruNumarasi: mevcutSoruNumarasi,
                soruResmi: soru.soruResmi || null
            };
            console.log("Güncellenecek veri:", updatedSoru);

            console.log("Yeni soru ekleniyor...");
            await set(newSoruRef, updatedSoru);
            console.log("Yeni soru başarıyla eklendi");

            // Eski soruyu sil
            const oldSoruRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`);
            console.log("Eski soru siliniyor...");
            await remove(oldSoruRef);
            console.log("Eski soru başarıyla silindi");

            console.log("=== Güncelleme Başarılı ===");
            alert("Soru başarıyla güncellendi ve taşındı.");
            onClose();
        } catch (error) {
            console.error("=== Güncelleme Hatası ===");
            console.error("Hata detayı:", error);
            console.error("Hata mesajı:", error.message);
            console.error("Hata yığını:", error.stack);
            console.error("Güncelleme sırasındaki durum:", {
                soru,
                cevaplar,
                dogruCevap,
                selectedAltKonu,
                konuId,
                altKonuId,
                soruId
            });
            console.error("=== Güncelleme Hatası Sonu ===");
            alert(`Soru güncellenirken bir hata oluştu! Hata: ${error.message}`);
        }
    };

    if (!isOpen || loading) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-11/12 max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white text-center">
                        Soruyu Güncelle
                    </h2>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sol Kolon */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Soru Konumu
                                </label>
                                <select
                                    value={selectedAltKonu}
                                    onChange={(e) => setSelectedAltKonu(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">Alt Konu Seçin</option>
                                    {Object.entries(altKonular).map(([key, konu]) => (
                                        <option key={key} value={key}>
                                            {konu.baslik}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Soru Metni
                                </label>
                                <div className="bg-white dark:bg-gray-700 rounded-lg">
                                    <ReactQuill 
                                        theme="snow"
                                        value={soru.soruMetni}
                                        onChange={(value) => setSoru({ ...soru, soruMetni: value })}
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
                                        value={soru.aciklama}
                                        onChange={(value) => setSoru({ ...soru, aciklama: value })}
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
                                        {soru?.soruResmi && (
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
                                    {soru?.soruResmi && (
                                        <div className="mt-2">
                                            <img 
                                                src={soru.soruResmi} 
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
                        onClick={handleUpdate}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200"
                    >
                        Güncelle
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateQuestion;
