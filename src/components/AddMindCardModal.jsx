import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTopics } from '../hooks/useTopics';

const AddMindCardModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        content: "",
        image: null,
        resimPreview: null
    });
    const { topics } = useTopics();
    const [selectedKonu, setSelectedKonu] = useState("");
    const [altKonu, setAltKonu] = useState("");
    const [isJsonMode, setIsJsonMode] = useState(false);
    const [jsonData, setJsonData] = useState("");

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link'],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet',
        'align',
        'link'
    ];

    const handleEditorChange = (content) => {
        setFormData(prev => ({
            ...prev,
            content: content
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
            if (file.size > MAX_FILE_SIZE) {
                toast.error("Resim boyutu çok büyük! Maksimum 5MB olmalıdır.");
                e.target.value = '';
                setFormData(prev => ({
                    ...prev,
                    image: null,
                    resimPreview: null
                }));
                return;
            }

            // Resim önizleme için URL oluştur
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    image: file,
                    resimPreview: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedKonu || !altKonu || !formData.content) {
            toast.error("Lütfen tüm alanları doldurun!");
            return;
        }

        setLoading(true);
        try {
            let imageBase64 = null;
            let resimTuru = null;

            // Eğer resim seçildiyse
            if (formData.image) {
                // Resmi base64'e çevir
                const reader = new FileReader();
                imageBase64 = await new Promise((resolve) => {
                    reader.onloadend = () => {
                        // data:image/png;base64, gibi önek kısmını kaldır
                        const fullBase64 = reader.result;
                        const base64WithoutPrefix = fullBase64.split(',')[1];
                        resolve(base64WithoutPrefix);
                    };
                    reader.readAsDataURL(formData.image);
                });
                resimTuru = formData.image.type;
            }

            const konuRef = doc(db, "miniCards-konular", selectedKonu);
            const cardsRef = collection(konuRef, "cards");

            const cardData = {
                altKonu: altKonu,
                content: formData.content,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Eğer resim yüklendiyse
            if (imageBase64) {
                cardData.resim = imageBase64;
                cardData.resimTuru = resimTuru;
            }

            await addDoc(cardsRef, cardData);
            toast.success("Kart başarıyla eklendi!");
            onSuccess();
            onClose();
            
            // Formu sıfırla
            setFormData({
                content: "",
                image: null,
                resimPreview: null
            });
            setSelectedKonu("");
            setAltKonu("");
        } catch (error) {
            console.error("Kart eklenirken hata:", error);
            toast.error("Kart eklenirken bir hata oluştu!");
        } finally {
            setLoading(false);
        }
    };

    const handleJsonSubmit = async (e) => {
        e.preventDefault();
        if (!selectedKonu) {
            toast.error("Lütfen bir konu seçin!");
            return;
        }

        if (!jsonData.trim()) {
            toast.error("Lütfen JSON verisi girin!");
            return;
        }

        try {
            const parsedData = JSON.parse(jsonData);
            if (!Array.isArray(parsedData)) {
                toast.error("JSON verisi bir dizi olmalıdır!");
                return;
            }

            setLoading(true);
            const konuRef = doc(db, "miniCards-konular", selectedKonu);
            const cardsRef = collection(konuRef, "cards");
            let successCount = 0;
            let errorCount = 0;

            for (const item of parsedData) {
                if (!item.altKonu || !item.content) {
                    errorCount++;
                    continue;
                }

                try {
                    await addDoc(cardsRef, {
                        altKonu: item.altKonu,
                        content: item.content,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    successCount++;
                } catch (error) {
                    console.error("Kart eklenirken hata:", error);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`${successCount} kart başarıyla eklendi!`);
                if (errorCount > 0) {
                    toast.error(`${errorCount} kart eklenemedi.`);
                }
                onSuccess();
                onClose();
            } else {
                toast.error("Hiçbir kart eklenemedi!");
            }
        } catch (error) {
            console.error("JSON işlenirken hata:", error);
            toast.error("JSON verisi geçerli değil!");
        } finally {
            setLoading(false);
        }
    };

    const jsonExample = `[
    {
        "altKonu": "Alt Konu 1",
        "content": "<p>Kart içeriği 1</p>"
    },
    {
        "altKonu": "Alt Konu 2",
        "content": "<p>Kart içeriği 2</p>"
    }
]`;

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
                                {isJsonMode ? "JSON ile Toplu Yükle" : "Yeni Akıl Kartı Ekle"}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsJsonMode(!isJsonMode)}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                            >
                                {isJsonMode ? "Tekli Ekleme Modu" : "JSON ile Yükle"}
                            </button>
                        </div>

                        {isJsonMode ? (
                            <form onSubmit={handleJsonSubmit} className="space-y-4">
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
                                    <div className="mb-2">
                                        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mb-2">
                                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                JSON Formatı:
                                            </h3>
                                            <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                                                {jsonExample}
                                            </pre>
                                        </div>
                                    </div>
                                    <textarea
                                        value={jsonData}
                                        onChange={(e) => setJsonData(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white h-64 font-mono"
                                        placeholder="JSON verisini buraya yapıştırın..."
                                        required
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
                                        {loading ? "Yükleniyor..." : "Toplu Yükle"}
                                    </button>
                                </div>
                            </form>
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
                                    <div className="border border-gray-300 rounded-md dark:border-gray-600">
                                        <ReactQuill
                                            value={formData.content}
                                            onChange={handleEditorChange}
                                            modules={modules}
                                            formats={formats}
                                            className="h-64 mb-12 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Resim (Opsiyonel)
                                    </label>
                                    <input
                                        type="file"
                                        onChange={handleImageChange}
                                        accept="image/*"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                    {formData.resimPreview && (
                                        <div className="mt-2">
                                            <img 
                                                src={formData.resimPreview} 
                                                alt="Önizleme" 
                                                className="max-h-40 rounded-md"
                                            />
                                        </div>
                                    )}
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