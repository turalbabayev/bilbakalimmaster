import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, get, set, remove } from "firebase/database";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const UpdateQuestion = ({ isOpen, onClose, konuId, altKonuId, soruId }) => {
    const [soru, setSoru] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cevaplar, setCevaplar] = useState(soru.cevaplar || ["", "", "", "", ""]);
    const [dogruCevap, setDogruCevap] = useState(soru.dogruCevap || "");
    const [aciklama, setAciklama] = useState(soru.aciklama || "");
    const [soruResmi, setSoruResmi] = useState(soru.soruResmi || null);
    const [resimYukleniyor, setResimYukleniyor] = useState(false);
    const [zenginMetinCevaplar, setZenginMetinCevaplar] = useState(false);
    const [altKonular, setAltKonular] = useState({});
    const [selectedAltKonu, setSelectedAltKonu] = useState(altKonuId || "");
    const [mevcutSoruNumarasi, setMevcutSoruNumarasi] = useState(null);
    const [modalKey, setModalKey] = useState(0);

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

    const handleUpdate = async () => {
        if (!soru) {
            console.error("Güncellenecek soru bulunamadı!");
            return;
        }

        // Alt konu seçimi kontrolü ekle
        if (!selectedAltKonu) {
            alert("Lütfen bir alt konu seçin!");
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
        
        setLoading(true);
        
        try {
            console.log("=== Güncelleme Başlangıç ===");
            console.log("Güncellenecek soru:", guncellenecekSoru);
            console.log("Cevaplar:", guncellenecekCevaplar);
            console.log("Doğru cevap şıkkı:", guncellenecekDogruCevap);
            console.log("Seçili alt konu:", guncellenecekAltKonu);

            // Doğru cevap kontrolü
            if (!guncellenecekDogruCevap) {
                console.error("Doğru cevap seçilmemiş!");
                setLoading(false);
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
            setLoading(false);
            alert("Soru başarıyla güncellendi" + (suAnkiAltKonuId !== guncellenecekAltKonu ? " ve taşındı" : "") + ".");
            
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
            setLoading(false);
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

                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                        <button
                            onClick={() => {
                                setLoading(false);
                                onClose();
                            }}
                            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                        >
                            İptal
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Soru verisi yüklenmedi veya hatalı
    if (!soru) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                    <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                            Hata
                        </h2>
                    </div>
                    
                    <div className="p-8 flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-lg text-gray-700 dark:text-gray-300">
                                Soru verisi yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.
                            </p>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-center">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 font-medium"
                        >
                            Kapat
                        </button>
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
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-base font-semibold text-gray-900 dark:text-white">
                                    Cevaplar
                                </label>
                                <button
                                    onClick={() => setZenginMetinCevaplar(!zenginMetinCevaplar)}
                                    className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all duration-200 font-medium flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                    {zenginMetinCevaplar ? 'Normal Metin' : 'Zengin Metin'}
                                </button>
                            </div>
                            <div className="space-y-4">
                                {['A', 'B', 'C', 'D', 'E'].map((harf, index) => (
                                    <div key={harf} className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg font-medium text-gray-900 dark:text-white">
                                            {harf}
                                        </div>
                                        <div className="flex-1">
                                            {zenginMetinCevaplar ? (
                                                <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                                    <ReactQuill
                                                        theme="snow"
                                                        value={cevaplar[index]}
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
                                                    value={cevaplar[index]}
                                                    onChange={(e) => {
                                                        const newCevaplar = [...cevaplar];
                                                        newCevaplar[index] = e.target.value;
                                                        setCevaplar(newCevaplar);
                                                    }}
                                                    placeholder={`${harf} şıkkı`}
                                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                />
                                            )}
                                        </div>
                                        <div className="flex-shrink-0">
                                            <input
                                                type="radio"
                                                name="dogruCevap"
                                                value={harf}
                                                checked={dogruCevap === harf}
                                                onChange={(e) => setDogruCevap(e.target.value)}
                                                className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                                            />
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
