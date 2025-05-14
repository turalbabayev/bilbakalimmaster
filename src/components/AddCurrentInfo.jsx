import React, { useState, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import JoditEditor from 'jodit-react';
import { toast } from 'react-hot-toast';

const AddCurrentInfo = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        baslik: "",
        icerik: "",
        image: null,
        resimPreview: null
    });
    const [isSaving, setIsSaving] = useState(false);
    const editorRef = useRef(null);

    const config = {
        readonly: false,
        height: 400,
        uploader: {
            insertImageAsBase64URI: true,
        },
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
            '|',
            'image',
        ],
    };

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
            let imageBase64 = null;
            if (formData.image) {
                // Resmi base64'e çevir
                const reader = new FileReader();
                imageBase64 = await new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(formData.image);
                });
            }

            // Mevcut bilgileri al ve sıra numarasını belirle
            const bilgilerRef = collection(db, "guncelBilgiler");
            const q = query(bilgilerRef, orderBy("bilgiNo", "desc"));
            const snapshot = await getDocs(q);
            const lastBilgi = snapshot.docs[0];
            const nextBilgiNo = lastBilgi ? lastBilgi.data().bilgiNo + 1 : 1;

            // Yeni bilgiyi ekle
            await addDoc(bilgilerRef, {
                baslik: formData.baslik,
                icerik: formData.icerik,
                resim: imageBase64,
                bilgiNo: nextBilgiNo,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            toast.success("Güncel bilgi başarıyla eklendi!");
            onSuccess?.();
            onClose();
            setFormData({
                baslik: "",
                icerik: "",
                image: null,
                resimPreview: null
            });
        } catch (error) {
            console.error("Güncel bilgi eklenirken hata:", error);
            toast.error("Güncel bilgi eklenirken bir hata oluştu!");
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
                        Yeni Güncel Bilgi
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-8 overflow-y-auto flex-1 space-y-6">
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
                                <JoditEditor
                                    ref={editorRef}
                                    value={formData.icerik}
                                    config={config}
                                    onChange={(newContent) => setFormData(prev => ({ ...prev, icerik: newContent }))}
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
                                    Ekleniyor...
                                </>
                            ) : (
                                "Ekle"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCurrentInfo; 