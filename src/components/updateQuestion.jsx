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
    const [selectedAltKonu, setSelectedAltKonu] = useState(altKonuId || "");
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
                console.log("Soru yükleme işlemi başladı:", { konuId, altKonuId, soruId });
                
                // Gerekli parametreleri kontrol et
                if (!konuId || !altKonuId || !soruId) {
                    console.error("Eksik parametreler:", { konuId, altKonuId, soruId });
                    alert("Soru güncelleme için gerekli parametreler eksik!");
                    setLoading(false);
                    onClose();
                    return;
                }
                
                // Alt konuları yükle
                const konularRef = ref(database, `konular/${konuId}`);
                const konularSnapshot = await get(konularRef);
                if (konularSnapshot.exists()) {
                    setAltKonular(konularSnapshot.val().altkonular || {});
                } else {
                    console.error("Konu bulunamadı:", konuId);
                    alert("Belirtilen konu bulunamadı! Modal kapatılacak.");
                    setLoading(false);
                    onClose();
                    return;
                }

                // Mevcut soruyu yükle
                const soruRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`);
                const soruSnapshot = await get(soruRef);
                
                if (soruSnapshot.exists()) {
                    const data = soruSnapshot.val();
                    console.log("Soru verisi yüklendi:", data);
                    setSoru(data);
                    setCevaplar(data.cevaplar || ["", "", "", "", ""]);
                    
                    // Alt konu seçimini mevcut alt konu ile güncelle
                    setSelectedAltKonu(altKonuId);
                    
                    // Doğru cevap şıkkını belirle (A, B, C, D, E vs.)
                    if (data.dogruCevap) {
                        // Eğer dogruCevap zaten bir harf ise (A, B, C, D, E), direkt kullan
                        if (/^[A-E]$/.test(data.dogruCevap)) {
                            setDogruCevap(data.dogruCevap);
                        } 
                        // Eski sistemden gelen veri yapısı (cevabın kendisi)
                        else {
                            // Cevaplar içerisinde doğru cevabı ara
                            const index = data.cevaplar.findIndex(cevap => cevap === data.dogruCevap);
                            if (index !== -1) {
                                // Bulunan index'e göre harf belirle (A, B, C, D, E)
                                setDogruCevap(String.fromCharCode(65 + index));
                            } else {
                                setDogruCevap("");
                            }
                        }
                    } else {
                        setDogruCevap("");
                    }
                    
                    setMevcutSoruNumarasi(data.soruNumarasi || null);
                    setLoading(false);
                } else {
                    // Soru bulunamadıysa hata durumu
                    console.error("Güncellenecek soru bulunamadı! Parametre bilgileri:", { konuId, altKonuId, soruId });
                    alert("Güncellenecek soru bulunamadı! Modal kapatılacak.");
                    setLoading(false);
                    onClose();
                    return;
                }
            } catch (error) {
                console.error("Veri yüklenirken hata oluştu:", error);
                console.error("Hata sırasındaki parametreler:", { konuId, altKonuId, soruId });
                alert("Veri yüklenirken bir hata oluştu! Modal kapatılacak.");
                setLoading(false);
                onClose();
            }
        };

        if (isOpen) {
            setLoading(true); // Yeni soru yüklenirken loading durumunu aktif et
            fetchData();
        } else {
            // Modal kapandığında tüm form verilerini sıfırla
            setSoru(null);
            setCevaplar(["", "", "", "", ""]);
            setDogruCevap("");
            setSelectedAltKonu("");
            setMevcutSoruNumarasi(null);
            setLoading(false);
        }
        
        // Modal kapatıldığında cleanup işlemi
        return () => {
            if (!isOpen) {
                setSoru(null);
                setCevaplar(["", "", "", "", ""]);
                setDogruCevap("");
                setSelectedAltKonu("");
                setMevcutSoruNumarasi(null);
                setLoading(false);
            }
        };
    }, [isOpen, konuId, altKonuId, soruId, onClose]);

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

        // Alt konu seçimi kontrolü ekle
        if (!selectedAltKonu) {
            alert("Lütfen bir alt konu seçin!");
            return;
        }

        try {
            console.log("=== Güncelleme Başlangıç ===");
            console.log("Güncellenecek soru:", soru);
            console.log("Cevaplar:", cevaplar);
            console.log("Doğru cevap şıkkı:", dogruCevap);
            console.log("Seçili alt konu:", selectedAltKonu);

            // Doğru cevap kontrolü
            if (!dogruCevap) {
                console.error("Doğru cevap seçilmemiş!");
                throw new Error("Lütfen doğru cevabı seçin!");
            }

            // Önce yeni konumdaki soruların numaralarını kontrol et
            const yeniKonumSorularRef = ref(database, `konular/${konuId}/altkonular/${selectedAltKonu}/sorular`);
            const yeniKonumSnapshot = await get(yeniKonumSorularRef);
            const yeniKonumSorular = yeniKonumSnapshot.val() || {};
            
            // Mevcut soru numaralarını ve maksimum soru numarasını bul
            const mevcutSoruNumaralari = Object.values(yeniKonumSorular).map(s => s.soruNumarasi || 0);
            const maksimumSoruNumarasi = mevcutSoruNumaralari.length > 0 ? Math.max(...mevcutSoruNumaralari) : 0;
            
            // Mevcut soru numarası yoksa veya başka bir alt konuya taşınıyorsa, yeni numara ata
            let kullanilacakSoruNumarasi = mevcutSoruNumarasi;
            if (!kullanilacakSoruNumarasi || altKonuId !== selectedAltKonu) {
                kullanilacakSoruNumarasi = maksimumSoruNumarasi + 1;
                console.log("Yeni soru numarası atandı:", kullanilacakSoruNumarasi);
            }

            const timestamp = Date.now();
            const newPath = `konular/${konuId}/altkonular/${selectedAltKonu}/sorular/${soruId}_${timestamp}`;
            console.log("Yeni yol:", newPath);
            
            // Yeni konuma soruyu ekle
            const newSoruRef = ref(database, newPath);
            const updatedSoru = {
                soruMetni: soru.soruMetni,
                cevaplar: cevaplar,
                dogruCevap: dogruCevap, // Artık doğru cevap şıkkı olarak saklanıyor
                aciklama: soru.aciklama,
                report: soru.report || 0,
                liked: soru.liked || 0,
                unliked: soru.unliked || 0,
                soruNumarasi: kullanilacakSoruNumarasi,
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
            
            // Kullanıcıya bilgi ver
            alert("Soru başarıyla güncellendi" + (altKonuId !== selectedAltKonu ? " ve taşındı" : "") + ".");
            
            // İşlem tamamlandığında tüm form verilerini sıfırla
            setSoru(null);
            setCevaplar(["", "", "", "", ""]);
            setDogruCevap("");
            setSelectedAltKonu("");
            setMevcutSoruNumarasi(null);
            setLoading(false);
            
            // En son modalı gecikmeli kapat (kullanıcının alert'i görmesi için)
            setTimeout(() => {
                onClose();
            }, 300);
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

    if (!isOpen) return null;

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                    <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                            Soruyu Güncelle
                        </h2>
                    </div>
                    
                    <div className="p-8 flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
                            <p className="text-lg text-gray-700 dark:text-gray-300">Soru yükleniyor...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                        Soruyu Güncelle
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
                                <ReactQuill 
                                    theme="snow"
                                    value={soru.soruMetni}
                                    onChange={(value) => setSoru({ ...soru, soruMetni: value })}
                                    modules={modules}
                                    formats={formats}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    style={{ height: '200px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Cevaplar
                            </label>
                            <div className="space-y-4">
                                {cevaplar.map((cevap, index) => (
                                    <div key={index} className="flex items-center gap-4 group">
                                        <div 
                                            className={`w-10 h-10 flex items-center justify-center rounded-xl font-semibold text-lg transition-all duration-200
                                                ${dogruCevap === String.fromCharCode(65 + index) 
                                                    ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 ring-2 ring-green-500'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30'}`}
                                            onClick={() => setDogruCevap(String.fromCharCode(65 + index))}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {String.fromCharCode(65 + index)}
                                        </div>
                                        <textarea
                                            value={cevap}
                                            onChange={(e) => {
                                                const newCevaplar = [...cevaplar];
                                                newCevaplar[index] = e.target.value;
                                                setCevaplar(newCevaplar);
                                            }}
                                            placeholder={`${String.fromCharCode(65 + index)} şıkkının cevabı`}
                                            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                            rows="2"
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Doğru cevabı seçmek için şık harfine tıklayın
                            </p>
                        </div>

                        <div>
                            <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Açıklama
                            </label>
                            <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                <ReactQuill
                                    theme="snow"
                                    value={soru.aciklama}
                                    onChange={(value) => setSoru({ ...soru, aciklama: value })}
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
                                    {soru?.soruResmi && (
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
                                {soru?.soruResmi && (
                                    <div className="mt-4 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                        <img 
                                            src={soru.soruResmi} 
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
                        onClick={handleUpdate}
                        className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 font-medium"
                    >
                        Güncelle
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateQuestion;
