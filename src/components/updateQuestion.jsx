import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, get, set, remove } from "firebase/database";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from "react-toastify";

const UpdateQuestion = ({ isOpen, onClose, konuId, altKonuId, soruId, onUpdateComplete }) => {
    const [soru, setSoru] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cevaplar, setCevaplar] = useState(["", "", "", "", ""]);
    const [dogruCevap, setDogruCevap] = useState("");
    const [altKonular, setAltKonular] = useState({});
    const [selectedAltKonu, setSelectedAltKonu] = useState(altKonuId || "");
    const [mevcutSoruNumarasi, setMevcutSoruNumarasi] = useState(null);
    const [resimYukleniyor, setResimYukleniyor] = useState(false);
    const [modalKey, setModalKey] = useState(0);
    const [soruResmi, setSoruResmi] = useState(null);
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
        if (isOpen) {
            setModalKey(prev => prev + 1);
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log("Modal açıldı, veri yükleme başlıyor:", { konuId, altKonuId, soruId, isOpen });
                
                if (!konuId || !altKonuId || !soruId) {
                    console.error("Eksik parametreler:", { konuId, altKonuId, soruId });
                    alert("Soru güncelleme için gerekli parametreler eksik!");
                    setLoading(false);
                    onClose();
                    return;
                }
                
                // State'i sıfırla
                setSoru(null);
                setCevaplar(["", "", "", "", ""]);
                setDogruCevap("");
                setSelectedAltKonu("");
                setMevcutSoruNumarasi(null);
                
                // Önce veri tabanı referanslarını oluştur
                const konularRef = ref(database, `konular/${konuId}`);
                const soruRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`);
                
                // Promise.all ile tüm verileri paralel olarak yükle
                const [konularSnapshot, soruSnapshot] = await Promise.all([
                    get(konularRef),
                    get(soruRef)
                ]);
                
                // Konu kontrolü
                if (!konularSnapshot.exists()) {
                    console.error("Konu bulunamadı:", konuId);
                    alert("Belirtilen konu bulunamadı! Modal kapatılacak.");
                    setLoading(false);
                    onClose();
                    return;
                }
                
                // Alt konular varsa yükle
                const altKonularData = konularSnapshot.val().altkonular || {};
                setAltKonular(altKonularData);
                
                // Soru kontrolü
                if (!soruSnapshot.exists()) {
                    console.error("Soru bulunamadı:", { konuId, altKonuId, soruId });
                    // Alert kaldırıldı
                    setLoading(false);
                    onClose();
                    return;
                }
                
                // Soru verilerini yükle
                const soruData = soruSnapshot.val();
                console.log("Soru verisi başarıyla yüklendi:", soruData);
                
                // Soru temel verilerini doğrula
                if (!soruData) {
                    console.error("Soru verisi boş:", { konuId, altKonuId, soruId });
                    // Alert kaldırıldı
                    setLoading(false);
                    onClose();
                    return;
                }
                
                // State'leri güvenli bir şekilde güncelle
                setSoru(soruData);
                
                // Cevapları güvenli bir şekilde ayarla (undefined veya eksik değerler olabilir)
                const cevaplarData = Array.isArray(soruData.cevaplar) ? 
                    soruData.cevaplar : 
                    ["", "", "", "", ""];
                    
                // Array uzunluğunu 5'e tamamla (eksik elementler varsa)
                const normalizedCevaplar = [...cevaplarData];
                while (normalizedCevaplar.length < 5) {
                    normalizedCevaplar.push("");
                }
                
                setCevaplar(normalizedCevaplar);
                
                // Alt konu seçimini güncelle
                setSelectedAltKonu(altKonuId);
                
                // Doğru cevap şıkkını güvenli bir şekilde belirle
                if (soruData.dogruCevap) {
                    // Eğer dogruCevap zaten bir harf ise (A, B, C, D, E), direkt kullan
                    if (/^[A-E]$/.test(soruData.dogruCevap)) {
                        setDogruCevap(soruData.dogruCevap);
                        console.log("Doğru cevap harfi bulundu:", soruData.dogruCevap);
                    } 
                    // Eski sistemden gelen veri yapısı (cevabın kendisi)
                    else if (Array.isArray(soruData.cevaplar)) {
                        // Cevaplar içerisinde doğru cevabı ara
                        const index = soruData.cevaplar.findIndex(cevap => 
                            cevap === soruData.dogruCevap && cevap !== "" && cevap !== null && cevap !== undefined
                        );
                        
                        if (index !== -1) {
                            // Bulunan index'e göre harf belirle (A, B, C, D, E)
                            const dogruCevapHarfi = String.fromCharCode(65 + index);
                            setDogruCevap(dogruCevapHarfi);
                            console.log("Doğru cevap hesaplandı:", dogruCevapHarfi, "index:", index);
                        } else {
                            console.warn("Doğru cevap array içinde bulunamadı, varsayılan 'A' ayarlanıyor");
                            setDogruCevap("A");
                        }
                    } else {
                        console.warn("Doğru cevap için geçerli bir değer bulunamadı, varsayılan 'A' ayarlanıyor");
                        setDogruCevap("A");
                    }
                } else {
                    console.warn("dogruCevap alanı eksik, varsayılan 'A' ayarlanıyor");
                    setDogruCevap("A");
                }
                
                // Soru numarasını ayarla (null olabilir)
                setMevcutSoruNumarasi(soruData.soruNumarasi || null);
                
                // Yükleme tamamlandı
                setLoading(false);
                console.log("Veri yükleme işlemi başarıyla tamamlandı");
                
            } catch (error) {
                console.error("Veri yüklenirken kritik bir hata oluştu:", error);
                console.error("Hata sırasındaki parametreler:", { konuId, altKonuId, soruId });
                alert("Veri yüklenirken bir hata oluştu! Modal kapatılacak.");
                
                // Hatadan sonra state'i temizle
                setSoru(null);
                setCevaplar(["", "", "", "", ""]);
                setDogruCevap("");
                setSelectedAltKonu("");
                setMevcutSoruNumarasi(null);
                
                // Loading'i kapat ve modal'ı kapat
                setLoading(false);
                setTimeout(() => {
                    onClose();
                }, 100);
            }
        };

        if (isOpen) {
            // State'i sıfırla ve loading'i başlat
            setLoading(true);
            
            // Veri yükleme işlemini başlat
            fetchData();
        }
        
        // Cleanup fonksiyonu
        return () => {
            // Modal kapandığında state'i temizle
            if (!isOpen) {
                setSoru(null);
                setCevaplar(["", "", "", "", ""]);
                setDogruCevap("");
                setSelectedAltKonu("");
                setMevcutSoruNumarasi(null);
                setLoading(false);
                console.log("Modal kapandı, state temizlendi");
            }
        };
    }, [isOpen, konuId, altKonuId, soruId, onClose, modalKey]);

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

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        if (!soru) {
            console.error("Güncellenecek soru bulunamadı!");
            setIsSaving(false);
            return;
        }

        // Alt konu seçimi kontrolü ekle
        if (!selectedAltKonu) {
            alert("Lütfen bir alt konu seçin!");
            setIsSaving(false);
            return;
        }

        // Güncellenecek soru için bir kopyasını sakla (loading durumunda state sıfırlanabiliyor)
        const guncellenecekSoru = {...soru};
        const guncellenecekCevaplar = [...cevaplar];
        const guncellenecekDogruCevap = dogruCevap;
        const guncellenecekAltKonu = selectedAltKonu;
        const suAnkiKonuId = konuId;
        const suAnkiAltKonuId = altKonuId;
        const suAnkiSoruId = soruId;
        
        try {
            console.log("=== Güncelleme Başlangıç ===");
            console.log("Güncellenecek soru:", guncellenecekSoru);
            console.log("Cevaplar:", guncellenecekCevaplar);
            console.log("Doğru cevap şıkkı:", guncellenecekDogruCevap);
            console.log("Seçili alt konu:", guncellenecekAltKonu);

            // Doğru cevap kontrolü
            if (!guncellenecekDogruCevap) {
                console.error("Doğru cevap seçilmemiş!");
                setIsSaving(false);
                throw new Error("Lütfen doğru cevabı seçin!");
            }

            // Önce yeni konumdaki soruların numaralarını kontrol et
            const yeniKonumSorularRef = ref(database, `konular/${suAnkiKonuId}/altkonular/${guncellenecekAltKonu}/sorular`);
            const yeniKonumSnapshot = await get(yeniKonumSorularRef);
            const yeniKonumSorular = yeniKonumSnapshot.val() || {};
            
            // Mevcut soru numaralarını ve maksimum soru numarasını bul
            const mevcutSoruNumaralari = Object.values(yeniKonumSorular).map(s => s.soruNumarasi || 0);
            const maksimumSoruNumarasi = mevcutSoruNumaralari.length > 0 ? Math.max(...mevcutSoruNumaralari) : 0;
            
            // Mevcut soru numarası yoksa veya başka bir alt konuya taşınıyorsa, yeni numara ata
            let kullanilacakSoruNumarasi = mevcutSoruNumarasi;
            if (!kullanilacakSoruNumarasi || suAnkiAltKonuId !== guncellenecekAltKonu) {
                kullanilacakSoruNumarasi = maksimumSoruNumarasi + 1;
                console.log("Yeni soru numarası atandı:", kullanilacakSoruNumarasi);
            }

            const timestamp = Date.now();
            const newPath = `konular/${suAnkiKonuId}/altkonular/${guncellenecekAltKonu}/sorular/${suAnkiSoruId}_${timestamp}`;
            console.log("Yeni yol:", newPath);
            
            // Yeni konuma soruyu ekle
            const newSoruRef = ref(database, newPath);
            const updatedSoru = {
                soruMetni: guncellenecekSoru.soruMetni,
                cevaplar: guncellenecekCevaplar,
                dogruCevap: guncellenecekDogruCevap, // Artık doğru cevap şıkkı olarak saklanıyor
                aciklama: guncellenecekSoru.aciklama,
                report: guncellenecekSoru.report || 0,
                liked: guncellenecekSoru.liked || 0,
                unliked: guncellenecekSoru.unliked || 0,
                soruNumarasi: kullanilacakSoruNumarasi,
                soruResmi: guncellenecekSoru.soruResmi || null
            };
            console.log("Güncellenecek veri:", updatedSoru);

            console.log("Yeni soru ekleniyor...");
            await set(newSoruRef, updatedSoru);
            console.log("Yeni soru başarıyla eklendi");

            // Eski soruyu sil
            const oldSoruRef = ref(database, `konular/${suAnkiKonuId}/altkonular/${suAnkiAltKonuId}/sorular/${suAnkiSoruId}`);
            console.log("Eski soru siliniyor...");
            await remove(oldSoruRef);
            console.log("Eski soru başarıyla silindi");

            console.log("=== Güncelleme Başarılı ===");
            
            // Tüm işlemler başarılı olduktan sonra state'i sıfırla
            setSoru(null);
            setCevaplar(["", "", "", "", ""]);
            setDogruCevap("");
            setSelectedAltKonu("");
            setMevcutSoruNumarasi(null);
            
            // Kullanıcıya bilgi ver
            setIsSaving(false);
            toast.success("Soru başarıyla güncellendi!");
            
            // Eğer onUpdateComplete fonksiyonu tanımlanmışsa çağır
            if (onUpdateComplete && typeof onUpdateComplete === 'function') {
                onUpdateComplete();
            } else {
                onClose(); // Tanımlanmamışsa normal kapatma işlemi
            }
        } catch (error) {
            console.error("=== Güncelleme Hatası ===");
            console.error("Hata detayı:", error);
            console.error("Hata mesajı:", error.message);
            console.error("Hata yığını:", error.stack);
            console.error("Güncelleme sırasındaki durum:", {
                guncellenecekSoru,
                guncellenecekCevaplar,
                guncellenecekDogruCevap,
                guncellenecekAltKonu,
                suAnkiKonuId,
                suAnkiAltKonuId,
                suAnkiSoruId
            });
            console.error("=== Güncelleme Hatası Sonu ===");
            
            // Hata durumunda da loading'i kapat
            setIsSaving(false);
            toast.error("Soru güncellenirken bir hata oluştu");
        }
    };

    if (!isOpen) return null;

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-60 p-4">
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                    <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                            Soru Yükleniyor...
                        </h2>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="w-16 h-16 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!soru) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-60 p-4">
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                    <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                            Hata!
                        </h2>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-8">
                        <p className="text-lg text-red-500">Soru bulunamadı veya yüklenirken bir hata oluştu!</p>
                    </div>
                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-60 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                        Soru Güncelle
                    </h2>
                </div>
                
                <form onSubmit={handleUpdate} className="flex flex-col flex-1 overflow-hidden">
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
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center ml-4"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <div className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Güncelleniyor...
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Güncelle
                                </div>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateQuestion;
