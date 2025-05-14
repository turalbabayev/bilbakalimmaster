import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from 'react-hot-toast';
import JoditEditor from 'jodit-react';

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
    const [zenginMetinAktif, setZenginMetinAktif] = useState(false);
    const [dogruCevapSecimi, setDogruCevapSecimi] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const editorRef = useRef(null);

    const config = {
        readonly: false,
        height: 400,
        buttons: [
            'source',
            '|',
            'bold',
            'italic',
            'underline',
            'strikethrough',
            '|',
            'font',
            'fontsize',
            'brush',
            'paragraph',
            '|',
            'superscript',
            'subscript',
            '|',
            'ul',
            'ol',
            '|',
            'outdent',
            'indent',
            '|',
            'align',
            'undo',
            'redo',
            '\n',
            'selectall',
            'cut',
            'copy',
            'paste',
            '|',
            'hr',
            'eraser',
            'copyformat',
            '|',
            'symbol',
            'fullsize',
            'print',
            'about',
        ],
    };

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
                    toast.error("Soru güncelleme için gerekli parametreler eksik!");
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
                
                // Firestore referanslarını oluştur
                const konuRef = doc(db, "konular", konuId);
                const altKonularCollectionRef = collection(konuRef, "altkonular");
                
                // Önce normal sorular koleksiyonunda ara
                let soruRef = doc(db, "konular", konuId, "altkonular", altKonuId, "sorular", soruId);
                let soruSnapshot = await getDoc(soruRef);
                
                // Eğer normal sorularda bulunamazsa, alt dallarda ara
                if (!soruSnapshot.exists()) {
                    // Alt konunun alt dallarını kontrol et
                    const altKonuRef = doc(db, "konular", konuId, "altkonular", altKonuId);
                    const altDallarCollectionRef = collection(altKonuRef, "altdallar");
                    const altDallarSnapshot = await getDocs(altDallarCollectionRef);
                    
                    // Her alt dalı kontrol et
                    for (const altDal of altDallarSnapshot.docs) {
                        const altDalSoruRef = doc(db, "konular", konuId, "altkonular", altKonuId, "altdallar", altDal.id, "sorular", soruId);
                        const altDalSoruSnapshot = await getDoc(altDalSoruRef);
                        
                        if (altDalSoruSnapshot.exists()) {
                            soruRef = altDalSoruRef;
                            soruSnapshot = altDalSoruSnapshot;
                            break;
                        }
                    }
                }
                
                // Alt konuları yükle
                const altKonularSnapshot = await getDocs(altKonularCollectionRef);
                const altKonularData = {};
                altKonularSnapshot.forEach((doc) => {
                    altKonularData[doc.id] = doc.data();
                });
                setAltKonular(altKonularData);
                
                // Soru kontrolü
                if (!soruSnapshot.exists()) {
                    console.error("Soru bulunamadı:", { konuId, altKonuId, soruId });
                    toast.error("Soru bulunamadı!");
                    setLoading(false);
                    onClose();
                    return;
                }
                
                // Soru verilerini yükle
                const soruData = soruSnapshot.data();
                console.log("Soru verisi başarıyla yüklendi:", soruData);
                
                setSoru(soruData);
                
                // Cevapları güvenli bir şekilde ayarla
                const cevaplarData = Array.isArray(soruData.cevaplar) ? 
                    soruData.cevaplar : 
                    ["", "", "", "", ""];
                    
                // Array uzunluğunu 5'e tamamla
                const normalizedCevaplar = [...cevaplarData];
                while (normalizedCevaplar.length < 5) {
                    normalizedCevaplar.push("");
                }
                
                setCevaplar(normalizedCevaplar);
                setDogruCevap(soruData.dogruCevap || "A");
                setSelectedAltKonu(altKonuId);
                setMevcutSoruNumarasi(soruData.soruNumarasi || null);
                
                setLoading(false);
            } catch (error) {
                console.error("Veri yüklenirken hata:", error);
                toast.error("Veri yüklenirken bir hata oluştu!");
                setLoading(false);
            }
        };
        
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, konuId, altKonuId, soruId]);

    const handleImageUpload = async (file) => {
        try {
            setLoading(true);
            const storageRef = ref(storage, `question_images/${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            setLoading(false);
            return downloadURL;
        } catch (error) {
            console.error('Resim yükleme hatası:', error);
            setLoading(false);
            return null;
        }
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
                const base64String = reader.result;
                setSoru(prevSoru => ({
                    ...prevSoru,
                    soruResmi: base64String
                }));
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
        setSoru(prevSoru => ({
            ...prevSoru,
            soruResmi: null
        }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        if (!soru) {
            console.error("Güncellenecek soru bulunamadı!");
            toast.error("Güncellenecek soru bulunamadı!");
            setIsSaving(false);
            return;
        }

        if (!selectedAltKonu) {
            toast.error("Lütfen bir alt konu seçin!");
            setIsSaving(false);
            return;
        }

        try {
            // Önce normal sorular koleksiyonunda ara
            let soruRef = doc(db, "konular", konuId, "altkonular", altKonuId, "sorular", soruId);
            let soruSnapshot = await getDoc(soruRef);
            let soruBulundu = false;
            
            // Normal sorularda bulunduysa güncelle
            if (soruSnapshot.exists()) {
                soruBulundu = true;
                console.log("Soru normal koleksiyonda bulundu, güncelleniyor...");
            } else {
                // Alt dallarda ara
                const altKonuRef = doc(db, "konular", konuId, "altkonular", altKonuId);
                const altDallarCollectionRef = collection(altKonuRef, "altdallar");
                const altDallarSnapshot = await getDocs(altDallarCollectionRef);
                
                for (const altDal of altDallarSnapshot.docs) {
                    const altDalSoruRef = doc(db, "konular", konuId, "altkonular", altKonuId, "altdallar", altDal.id, "sorular", soruId);
                    const altDalSoruSnapshot = await getDoc(altDalSoruRef);
                    
                    if (altDalSoruSnapshot.exists()) {
                        soruRef = altDalSoruRef;
                        soruBulundu = true;
                        console.log("Soru alt dalda bulundu, güncelleniyor...", altDal.id);
                        break;
                    }
                }
            }

            if (!soruBulundu) {
                throw new Error("Soru veritabanında bulunamadı!");
            }

            // Veri kontrolü ve temizleme
            const cleanData = (data) => {
                if (data === undefined) return null;
                if (typeof data === 'string' && data.trim() === '') return null;
                return data;
            };
            
            const updatedSoru = {
                soruMetni: cleanData(soru.soruMetni) || '',
                cevaplar: cevaplar.map(cevap => cleanData(cevap) || ''),
                dogruCevap: cleanData(dogruCevap) || 'A',
                aciklama: cleanData(soru.aciklama) || '',
                report: cleanData(soru.report) || 0,
                liked: cleanData(soru.liked) || 0,
                unliked: cleanData(soru.unliked) || 0,
                soruNumarasi: cleanData(mevcutSoruNumarasi) || 0
            };

            // soruResmi sadece varsa ekle
            if (soru.soruResmi) {
                updatedSoru.soruResmi = soru.soruResmi;
            }

            console.log("Güncellenecek soru:", { ref: soruRef.path, data: updatedSoru });

            await updateDoc(soruRef, updatedSoru);
            console.log("Soru başarıyla güncellendi");
            
            toast.success("Soru başarıyla güncellendi!");
            
            if (onUpdateComplete && typeof onUpdateComplete === 'function') {
                onUpdateComplete(updatedSoru);
            }
            onClose();
        } catch (error) {
            console.error("Güncelleme sırasında hata:", error);
            toast.error("Soru güncellenirken bir hata oluştu: " + error.message);
            setIsSaving(false);
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-4xl max-h-[calc(100vh-40px)] overflow-hidden">
                <div className="p-8 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Soruyu Düzenle
                    </h2>
                </div>

                <form onSubmit={handleUpdate} className="p-8 space-y-6">
                    <div>
                        <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                            Soru Metni
                        </label>
                        <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <JoditEditor
                                ref={editorRef}
                                value={soru?.soruMetni || ''}
                                config={config}
                                onChange={(newContent) => setSoru(prev => ({ ...prev, soruMetni: newContent }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                            Açıklama
                        </label>
                        <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <JoditEditor
                                ref={editorRef}
                                value={soru?.aciklama || ''}
                                config={config}
                                onChange={(newContent) => setSoru(prev => ({ ...prev, aciklama: newContent }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                            Cevaplar
                        </label>
                        <div className="space-y-4">
                            {cevaplar.map((cevap, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {`${String.fromCharCode(65 + index)} Şıkkı`}
                                        </label>
                                        <input
                                            type="text"
                                            value={cevap}
                                            onChange={(e) => {
                                                const newCevaplar = [...cevaplar];
                                                newCevaplar[index] = e.target.value;
                                                setCevaplar(newCevaplar);
                                            }}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            name="dogruCevap"
                                            value={String.fromCharCode(65 + index)}
                                            checked={dogruCevap === String.fromCharCode(65 + index)}
                                            onChange={(e) => setDogruCevap(e.target.value)}
                                            className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Doğru Cevap
                                        </label>
                                    </div>
                                </div>
                            ))}
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
                                        type="button"
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
                </form>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        disabled={isSaving}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleUpdate}
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Güncelleniyor...
                            </>
                        ) : (
                            'Güncelle'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateQuestion;
