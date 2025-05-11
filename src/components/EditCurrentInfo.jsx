import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'react-hot-toast';

const EditCurrentInfo = ({ isOpen, onClose, bilgi, onSuccess }) => {
    const [formData, setFormData] = useState({
        baslik: "",
        icerik: "",
        image: null,
        resimPreview: null
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (bilgi) {
            setFormData({
                baslik: bilgi.baslik || "",
                icerik: bilgi.icerik || "",
                image: null,
                resimPreview: bilgi.resim || null
            });
        }
    }, [bilgi]);

    // Quill editör modülleri
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

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
            if (file.size > MAX_FILE_SIZE) {
                toast.error("Resim boyutu çok büyük! Maksimum 5MB olmalıdır.", {
                    duration: 4000,
                    style: {
                        background: '#ef4444',
                        color: '#fff',
                        fontWeight: 'bold',
                    },
                });
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
            toast.success("Resim başarıyla yüklendi!", {
                duration: 2000,
                style: {
                    background: '#22c55e',
                    color: '#fff',
                }
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.baslik.trim() || !formData.icerik.trim()) {
            toast.error("Lütfen başlık ve içerik alanlarını doldurun!");
            return;
        }

        setIsSaving(true);

        try {
            let imageBase64 = formData.resimPreview;
            if (formData.image) {
                // Yeni resim yüklendiyse base64'e çevir
                const reader = new FileReader();
                imageBase64 = await new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(formData.image);
                });
            }

            // Firestore'da güncelle
            const docRef = doc(db, "guncelBilgiler", bilgi.id);
            await updateDoc(docRef, {
                baslik: formData.baslik,
                icerik: formData.icerik,
                resim: imageBase64,
                bilgiNo: bilgi.bilgiNo
            });

            toast.success("Güncel bilgi başarıyla güncellendi!");
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Güncel bilgi güncellenirken hata:", error);
            toast.error("Güncel bilgi güncellenirken bir hata oluştu!");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                        Güncel Bilgiyi Düzenle
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-8 overflow-y-auto flex-1">
                        <div className="space-y-8">
                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    Başlık
                                </label>
                                <input
                                    type="text"
                                    value={formData.baslik}
                                    onChange={(e) => setFormData(prev => ({ ...prev, baslik: e.target.value }))}
                                    placeholder="Başlık girin"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                />
                            </div>

                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    İçerik
                                </label>
                                <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                    <ReactQuill
                                        theme="snow"
                                        value={formData.icerik}
                                        onChange={(value) => setFormData(prev => ({ ...prev, icerik: value }))}
                                        modules={modules}
                                        formats={formats}
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        style={{ height: '200px' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    Resim (Opsiyonel)
                                </label>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40"
                                            />
                                        </div>
                                        {formData.resimPreview && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, image: null, resimPreview: null }))}
                                                className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 font-medium"
                                            >
                                                Resmi Sil
                                            </button>
                                        )}
                                    </div>
                                    {formData.resimPreview && (
                                        <div className="mt-4 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                            <img
                                                src={formData.resimPreview}
                                                alt="Önizleme"
                                                className="w-full h-auto"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            disabled={isSaving}
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Güncelleniyor...
                                </>
                            ) : (
                                "Güncelle"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCurrentInfo; 