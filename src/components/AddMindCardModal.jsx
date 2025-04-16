import React, { useState } from "react";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, doc } from "firebase/firestore";
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

            setFormData(prev => ({
                ...prev,
                image: file,
                resimPreview: URL.createObjectURL(file)
            }));
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
            // Konu referansını al
            const konuRef = doc(db, "miniCards-konular", selectedKonu);
            
            // Kartları koleksiyonunu al
            const cardsRef = collection(konuRef, "cards");
            
            // Kart verilerini hazırla
            const cardData = {
                altKonu: altKonu,
                content: formData.content,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Eğer resim varsa yükle
            if (formData.image) {
                const storageRef = ref(storage, `mindCards/${Date.now()}_${formData.image.name}`);
                const snapshot = await uploadBytes(storageRef, formData.image);
                const downloadURL = await getDownloadURL(snapshot.ref);
                
                cardData.resim = downloadURL;
                cardData.resimTuru = formData.image.type;
            }
            
            // Kartı ekle
            await addDoc(cardsRef, cardData);
            
            toast.success("Akıl kartı başarıyla eklendi!");
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
            console.error("Akıl kartı eklenirken hata:", error);
            toast.error("Akıl kartı eklenirken bir hata oluştu!");
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
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                            Yeni Akıl Kartı Ekle
                        </h2>
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddMindCardModal; 