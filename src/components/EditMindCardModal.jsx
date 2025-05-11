import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp, collection, query, orderBy, limit, where, writeBatch, getDocs } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTopics } from '../hooks/useTopics';

const EditMindCardModal = ({ isOpen, onClose, card, konuId, onSuccess }) => {
    const { topics } = useTopics();
    const [formData, setFormData] = useState({
        selectedKonu: '',
        altKonu: '',
        content: '',
        resim: null,
        resimTuru: '',
        resimPreview: null,
        titleColor: '',
        contentColor: ''
    });
    const [loading, setLoading] = useState(false);
    const [kartNo, setKartNo] = useState(card?.kartNo || 1);
    const [maxKartNo, setMaxKartNo] = useState(1);

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ]
    };

    const quillFormats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet',
        'link', 'image'
    ];

    useEffect(() => {
        if (card) {
            setFormData({
                selectedKonu: card.konuId || '',
                altKonu: card.altKonu || '',
                content: card.content || '',
                resim: null,
                resimTuru: card.resimTuru || '',
                resimPreview: card.resim || null,
                titleColor: card.titleColor || '',
                contentColor: card.contentColor || ''
            });
        }
    }, [card]);

    useEffect(() => {
        if (card?.konuId) {
            // Seçili konudaki en yüksek kart numarasını bul
            const konuRef = doc(db, "miniCards-konular", card.konuId);
            const cardsRef = collection(konuRef, "cards");
            const q = query(cardsRef, orderBy("kartNo", "desc"), limit(1));
            
            getDocs(q).then((snapshot) => {
                if (!snapshot.empty) {
                    const highestKartNo = snapshot.docs[0].data().kartNo;
                    setMaxKartNo(highestKartNo);
                }
            });
        }
    }, [card?.konuId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.altKonu.trim() || !formData.content.trim()) {
            toast.error("Lütfen tüm alanları doldurun!");
            return;
        }

        setLoading(true);
        try {
            let imageBase64 = formData.resimPreview;
            if (formData.resim) {
                const reader = new FileReader();
                imageBase64 = await new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(formData.resim);
                });
            }

            const konuRef = doc(db, "miniCards-konular", card.konuId);
            const cardRef = doc(konuRef, "cards", card.id);

            await updateDoc(cardRef, {
                altKonu: formData.altKonu,
                content: formData.content,
                resim: imageBase64,
                resimTuru: formData.resimTuru,
                updatedAt: serverTimestamp(),
                titleColor: formData.titleColor,
                contentColor: formData.contentColor
            });

            toast.success("Kart başarıyla güncellendi!");
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Kart güncellenirken hata:", error);
            toast.error("Kart güncellenirken bir hata oluştu!");
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Resim boyutu 5MB\'dan küçük olmalıdır.');
                return;
            }

            // Resim önizleme için URL oluştur
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    resim: file,
                    resimTuru: file.type,
                    resimPreview: reader.result
                }));
            };
            reader.readAsDataURL(file);
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
                            Akıl Kartını Düzenle
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Konu
                                </label>
                                <select
                                    value={formData.selectedKonu}
                                    onChange={(e) => setFormData(prev => ({ ...prev, selectedKonu: e.target.value }))}
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
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    Alt Konu
                                </label>
                                <input
                                    type="text"
                                    value={formData.altKonu}
                                    onChange={(e) => setFormData(prev => ({ ...prev, altKonu: e.target.value }))}
                                    placeholder="Alt konu girin"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    style={{ color: formData.titleColor || 'inherit' }}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    Başlık Rengi
                                </label>
                                <input
                                    type="color"
                                    value={formData.titleColor || '#000000'}
                                    onChange={(e) => setFormData(prev => ({ ...prev, titleColor: e.target.value }))}
                                    className="w-full h-12 rounded-lg cursor-pointer"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    İçerik
                                </label>
                                <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                    <ReactQuill
                                        theme="snow"
                                        value={formData.content}
                                        onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
                                        modules={quillModules}
                                        formats={quillFormats}
                                        className="bg-white dark:bg-gray-800"
                                        style={{ color: formData.contentColor || 'inherit' }}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    İçerik Rengi
                                </label>
                                <input
                                    type="color"
                                    value={formData.contentColor || '#000000'}
                                    onChange={(e) => setFormData(prev => ({ ...prev, contentColor: e.target.value }))}
                                    className="w-full h-12 rounded-lg cursor-pointer"
                                />
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
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Kart No
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max={maxKartNo}
                                            value={kartNo}
                                            onChange={(e) => setKartNo(parseInt(e.target.value))}
                                            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            (Maksimum: {maxKartNo})
                                        </span>
                                    </div>
                                </div>
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
                                    {loading ? "Güncelleniyor..." : "Güncelle"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditMindCardModal; 