import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, serverTimestamp, getDocs, query, orderBy, limit, where, writeBatch } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import { Editor } from '@tinymce/tinymce-react';
import { useTopics } from '../hooks/useTopics';

const AddMindCardModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        content: "",
    });
    const { topics } = useTopics();
    const [selectedKonu, setSelectedKonu] = useState("");
    const [altKonu, setAltKonu] = useState("");
    const [kartNo, setKartNo] = useState(1);
    const [maxKartNo, setMaxKartNo] = useState(1);
    const [jsonData, setJsonData] = useState("");
    const [showJsonInput, setShowJsonInput] = useState(false);
    const editorRef = useRef(null);

    useEffect(() => {
        if (selectedKonu) {
            const konuRef = doc(db, "miniCards-konular", selectedKonu);
            const cardsRef = collection(konuRef, "cards");
            const q = query(cardsRef, orderBy("kartNo", "desc"), limit(1));
            
            getDocs(q).then((snapshot) => {
                if (!snapshot.empty) {
                    const highestKartNo = snapshot.docs[0].data().kartNo;
                    setMaxKartNo(highestKartNo + 1);
                    setKartNo(highestKartNo + 1);
                } else {
                    setMaxKartNo(1);
                    setKartNo(1);
                }
            });
        }
    }, [selectedKonu]);

    const handleEditorChange = (content) => {
        setFormData(prev => ({
            ...prev,
            content: content
        }));
    };

    const handleImageUpload = async (blobInfo) => {
        try {
            setLoading(true);
            const storage = getStorage();
            const timestamp = Date.now();
            const fileExtension = blobInfo.filename().split('.').pop();
            const fileName = `${timestamp}.${fileExtension}`;
            const imageRef = storageRef(storage, `mind-cards-images/${fileName}`);
            
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedKonu || !altKonu.trim() || !formData.content.trim()) {
            toast.error('Lütfen tüm alanları doldurun!');
            return;
        }

        setLoading(true);
        try {
            const konuRef = doc(db, "miniCards-konular", selectedKonu);
            const cardsRef = collection(konuRef, "cards");

            const q = query(cardsRef, where("kartNo", ">=", kartNo), orderBy("kartNo", "desc"));
            const snapshot = await getDocs(q);
            
            const batch = writeBatch(db);
            
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    kartNo: doc.data().kartNo + 1,
                    updatedAt: serverTimestamp()
                });
            });

            const newCardRef = doc(cardsRef);
            batch.set(newCardRef, {
                altKonu,
                content: formData.content,
                kartNo,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            await batch.commit();
            toast.success('Kart başarıyla eklendi!');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Kart eklenirken hata:', error);
            toast.error('Kart eklenirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    const handleJsonImport = async () => {
        if (!selectedKonu || !jsonData) {
            toast.error('Lütfen konu seçin ve JSON verisi girin!');
            return;
        }

        try {
            const cards = JSON.parse(jsonData);
            if (!Array.isArray(cards)) {
                toast.error('Geçersiz JSON formatı! Dizi bekleniyor.');
                return;
            }

            setLoading(true);
            const konuRef = doc(db, "miniCards-konular", selectedKonu);
            const cardsRef = collection(konuRef, "cards");
            const batch = writeBatch(db);

            // Mevcut en yüksek kart numarasını bul
            const q = query(cardsRef, orderBy("kartNo", "desc"), limit(1));
            const snapshot = await getDocs(q);
            let startingKartNo = 1;
            if (!snapshot.empty) {
                startingKartNo = snapshot.docs[0].data().kartNo + 1;
            }

            // Kartları ekle
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                const newCardRef = doc(cardsRef);
                batch.set(newCardRef, {
                    altKonu: card.altKonu,
                    content: card.content,
                    kartNo: startingKartNo + i,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            await batch.commit();
            toast.success(`${cards.length} kart başarıyla eklendi!`);
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('JSON import hatası:', error);
            toast.error('JSON verisi işlenirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div 
                        className="absolute inset-0 bg-gray-500 opacity-75"
                        onClick={onClose}
                    ></div>
                </div>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Yeni Akıl Kartı Ekle
                            </h2>
                            <button
                                onClick={() => setShowJsonInput(!showJsonInput)}
                                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none"
                            >
                                {showJsonInput ? 'Normal Mod' : 'JSON ile Yükle'}
                            </button>
                        </div>

                        {showJsonInput ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Konu
                                    </label>
                                    <select
                                        value={selectedKonu}
                                        onChange={(e) => setSelectedKonu(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    >
                                        <option value="">Konu Seçin</option>
                                        {topics.map((konu) => (
                                            <option key={konu.id} value={konu.id}>
                                                {konu.baslik}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        JSON Verisi
                                    </label>
                                    <textarea
                                        value={jsonData}
                                        onChange={(e) => setJsonData(e.target.value)}
                                        className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder='[{"altKonu": "Alt Konu 1", "content": "İçerik 1"}, ...]'
                                    />
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleJsonImport}
                                        disabled={loading}
                                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {loading ? "İçe Aktarılıyor..." : "İçe Aktar"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Konu
                                    </label>
                                    <select
                                        value={selectedKonu}
                                        onChange={(e) => setSelectedKonu(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    >
                                        <option value="">Konu Seçin</option>
                                        {topics.map((konu) => (
                                            <option key={konu.id} value={konu.id}>
                                                {konu.baslik}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Alt Konu
                                    </label>
                                    <input
                                        type="text"
                                        value={altKonu}
                                        onChange={(e) => setAltKonu(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Alt konu başlığı"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        İçerik
                                    </label>
                                    <Editor
                                        apiKey="83kpgxax9nnx3wf6kruxk3rhefe9xso7fgxkah69lh4eie05"
                                        onInit={(evt, editor) => editorRef.current = editor}
                                        value={formData.content}
                                        onEditorChange={handleEditorChange}
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
                                                'bold italic underline forecolor | alignleft aligncenter ' +
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
                                
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {loading ? "Ekleniyor..." : "Ekle"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddMindCardModal; 