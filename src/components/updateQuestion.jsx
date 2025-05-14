import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { Editor } from '@tinymce/tinymce-react';
import { toast } from 'react-hot-toast';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const UpdateQuestion = ({ isOpen, onClose, konuId, altKonuId, soruId, onUpdateComplete }) => {
    const [soru, setSoru] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cevaplar, setCevaplar] = useState(["", "", "", "", ""]);
    const [dogruCevap, setDogruCevap] = useState("");
    const [altKonular, setAltKonular] = useState({});
    const [selectedAltKonu, setSelectedAltKonu] = useState(altKonuId || "");
    const [mevcutSoruNumarasi, setMevcutSoruNumarasi] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const editorRef = useRef(null);

    const handleImageUpload = async (blobInfo) => {
        try {
            setLoading(true);
            const storage = getStorage();
            const timestamp = Date.now();
            const fileExtension = blobInfo.filename().split('.').pop();
            const fileName = `${timestamp}.${fileExtension}`;
            const imageRef = storageRef(storage, `questions-images/${fileName}`);
            
            // Blob'u File'a çeviriyoruz
            const file = new File([blobInfo.blob()], fileName, { type: blobInfo.blob().type });
            
            // Metadata ekliyoruz
            const metadata = {
                contentType: file.type,
                customMetadata: {
                    originalName: blobInfo.filename()
                }
            };
            
            await uploadBytes(imageRef, file, metadata);
            const downloadUrl = await getDownloadURL(imageRef);
            
            return downloadUrl;
        } catch (error) {
            console.error('Resim yüklenirken hata:', error);
            toast.error('Resim yüklenirken bir hata oluştu!');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
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
                    setCevaplar(soruData.cevaplar || ["", "", "", "", ""]);
                    setDogruCevap(soruData.dogruCevap || "");
                    setSelectedAltKonu(altKonuId);
                    setMevcutSoruNumarasi(soruData.soruNumarasi || null);
                    
                } catch (error) {
                    console.error("Veri yüklenirken hata:", error);
                    toast.error("Veri yüklenirken bir hata oluştu: " + error.message);
                } finally {
                    setLoading(false);
                }
            };
            
            fetchData();
        }
    }, [isOpen, konuId, altKonuId, soruId]);

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
                        <div className="space-y-6">
                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    Alt Konu
                                </label>
                                <select
                                    value={selectedAltKonu}
                                    onChange={(e) => setSelectedAltKonu(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                >
                                    <option value="">Alt Konu Seçin</option>
                                    {Object.entries(altKonular).map(([id, altKonu]) => (
                                        <option key={id} value={id}>
                                            {altKonu.baslik}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    Soru Metni
                                </label>
                                <Editor
                                    apiKey="bbelkz83knafk8x2iv6h5i7d64o6k5os6ms07wt010605yby"
                                    onInit={(evt, editor) => editorRef.current = editor}
                                    value={soru?.soruMetni || ''}
                                    onEditorChange={(content) => setSoru({ ...soru, soruMetni: content })}
                                    init={{
                                        height: 300,
                                        menubar: false,
                                        plugins: [
                                            'advlist', 'autolink', 'lists', 'link', 'image', 
                                            'charmap', 'preview', 'anchor', 'searchreplace', 'visualblocks', 
                                            'code', 'fullscreen', 'insertdatetime', 'media', 'table', 
                                            'help', 'wordcount'
                                        ],
                                        toolbar: 'undo redo | blocks | ' +
                                            'bold italic forecolor | alignleft aligncenter ' +
                                            'alignright alignjustify | bullist numlist outdent indent | ' +
                                            'removeformat | image',
                                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                        images_upload_handler: handleImageUpload,
                                        automatic_uploads: true,
                                        images_reuse_filename: true,
                                        paste_data_images: true,
                                        paste_as_text: false,
                                        paste_enable_default_filters: true,
                                        paste_word_valid_elements: "p,b,strong,i,em,h1,h2,h3,h4,h5,h6",
                                        paste_retain_style_properties: "color,background-color,font-size",
                                        convert_urls: false,
                                        relative_urls: false,
                                        remove_script_host: false
                                    }}
                                />
                            </div>

                            {cevaplar.map((cevap, index) => (
                                <div key={index}>
                                    <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                        {String.fromCharCode(65 + index)}. Şık
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
                            ))}

                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    Doğru Cevap
                                </label>
                                <select
                                    value={dogruCevap}
                                    onChange={(e) => setDogruCevap(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                >
                                    <option value="">Doğru Cevabı Seçin</option>
                                    {cevaplar.map((_, index) => (
                                        <option key={index} value={String.fromCharCode(65 + index)}>
                                            {String.fromCharCode(65 + index)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    Açıklama
                                </label>
                                <Editor
                                    apiKey="bbelkz83knafk8x2iv6h5i7d64o6k5os6ms07wt010605yby"
                                    onInit={(evt, editor) => editorRef.current = editor}
                                    value={soru?.aciklama || ''}
                                    onEditorChange={(content) => setSoru({ ...soru, aciklama: content })}
                                    init={{
                                        height: 200,
                                        menubar: false,
                                        plugins: [
                                            'advlist', 'autolink', 'lists', 'link', 'image', 
                                            'charmap', 'preview', 'anchor', 'searchreplace', 'visualblocks', 
                                            'code', 'fullscreen', 'insertdatetime', 'media', 'table', 
                                            'help', 'wordcount'
                                        ],
                                        toolbar: 'undo redo | blocks | ' +
                                            'bold italic forecolor | alignleft aligncenter ' +
                                            'alignright alignjustify | bullist numlist outdent indent | ' +
                                            'removeformat | image',
                                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                        images_upload_handler: handleImageUpload,
                                        automatic_uploads: true,
                                        images_reuse_filename: true,
                                        paste_data_images: true,
                                        paste_as_text: false,
                                        paste_enable_default_filters: true,
                                        paste_word_valid_elements: "p,b,strong,i,em,h1,h2,h3,h4,h5,h6",
                                        paste_retain_style_properties: "color,background-color,font-size",
                                        convert_urls: false,
                                        relative_urls: false,
                                        remove_script_host: false
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || loading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {isSaving ? "Güncelleniyor..." : "Güncelle"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateQuestion;
