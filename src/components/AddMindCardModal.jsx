import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, serverTimestamp, getDocs, query, orderBy, limit, where, writeBatch } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTopics } from '../hooks/useTopics';

const AddMindCardModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        content: "",
        image: null,
        imageUrl: null
    });
    const { topics } = useTopics();
    const [selectedKonu, setSelectedKonu] = useState("");
    const [altKonu, setAltKonu] = useState("");
    const [isJsonMode, setIsJsonMode] = useState(false);
    const [jsonData, setJsonData] = useState("");
    const [content, setContent] = useState('');
    const [explanation, setExplanation] = useState('');
    const [selectedKonuId, setSelectedKonuId] = useState(selectedKonu || '');
    const [kartNo, setKartNo] = useState(1);
    const [maxKartNo, setMaxKartNo] = useState(1);

    useEffect(() => {
        if (selectedKonu) {
            // Seçili konudaki en yüksek kart numarasını bul
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

    const modules = {
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        }
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet',
        'align',
        'link',
        'image'
    ];

    async function imageHandler() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                try {
                    setLoading(true);
                    // Firebase Storage'a yükle
                    const storage = getStorage();
                    const timestamp = Date.now();
                    const imageRef = storageRef(storage, `mind-cards-images/${timestamp}-${file.name}`);
                    
                    await uploadBytes(imageRef, file);
                    const downloadUrl = await getDownloadURL(imageRef);

                    // Quill editörüne resmi ekle
                    const quill = document.querySelector('.ql-editor').parentNode.querySelector('.ql-editor').__quill;
                    const range = quill.getSelection(true);
                    quill.insertEmbed(range.index, 'image', downloadUrl);

                    toast.success("Resim başarıyla yüklendi!");
                } catch (error) {
                    console.error('Resim yüklenirken hata:', error);
                    toast.error('Resim yüklenirken bir hata oluştu!');
                } finally {
                    setLoading(false);
                }
            }
        };
    }

    const handleEditorChange = (content) => {
        setFormData(prev => ({
            ...prev,
            content: content
        }));
    };

    const getNextCardNumber = async (konuId) => {
        try {
            const konuRef = doc(db, "miniCards-konular", konuId);
            const cardsRef = collection(konuRef, "cards");
            const q = query(cardsRef);
            const snapshot = await getDocs(q);
            return snapshot.size + 1;
        } catch (error) {
            console.error("Kart numarası alınırken hata:", error);
            return 1;
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

            // Seçilen kartNo'dan büyük veya eşit numaralı kartları bir artır
            const q = query(cardsRef, where("kartNo", ">=", kartNo), orderBy("kartNo", "desc"));
            const snapshot = await getDocs(q);
            
            const batch = writeBatch(db);
            
            // Mevcut kartların numaralarını güncelle
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    kartNo: doc.data().kartNo + 1,
                    updatedAt: serverTimestamp()
                });
            });

            // Yeni kartı ekle
            const newCardRef = doc(cardsRef);
            batch.set(newCardRef, {
                altKonu,
                content: formData.content,
                imageUrl: formData.imageUrl,
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

            // Mevcut kart sayısını al
            let nextCardNumber = await getNextCardNumber(selectedKonu);
            
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
                        updatedAt: serverTimestamp(),
                        kartNo: nextCardNumber++
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
                                    {formData.imageUrl && (
                                        <div className="mt-2">
                                            <img 
                                                src={formData.imageUrl} 
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