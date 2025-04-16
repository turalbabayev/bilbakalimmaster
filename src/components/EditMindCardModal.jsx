import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTopics } from '../hooks/useTopics';

const EditMindCardModal = ({ isOpen, onClose, card, konuId, onSuccess }) => {
    const { topics } = useTopics();
    const [formData, setFormData] = useState({
        selectedKonu: '',
        altKonu: '',
        content: '',
        resim: null,
        resimTuru: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (card) {
            setFormData({
                selectedKonu: konuId || '',
                altKonu: card.altKonu || '',
                content: card.content || '',
                resim: null,
                resimTuru: card.resimTuru || '',
            });
        }
    }, [card, konuId]);

    const handleImageUpload = async (file) => {
        try {
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const storageRef = ref(storage, `mindCards/${fileName}`);
            
            // Metadata ayarlarını ekleyelim
            const metadata = {
                contentType: file.type,
                customMetadata: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            };
            
            // Upload the file with metadata
            const uploadTask = await uploadBytes(storageRef, file, metadata);
            const downloadURL = await getDownloadURL(uploadTask.ref);
            return downloadURL;
        } catch (error) {
            console.error("Resim yükleme hatası:", error);
            throw error;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let imageUrl = formData.resim;

            // Eğer yeni bir resim seçildiyse
            if (formData.resim instanceof File) {
                imageUrl = await handleImageUpload(formData.resim);
            }

            const cardRef = doc(db, 'miniCards-konular', formData.selectedKonu, 'cards', card.id);
            const updatedData = {
                konuId: formData.selectedKonu,
                altKonu: formData.altKonu,
                content: formData.content,
                updatedAt: serverTimestamp(),
            };

            // Eğer resim varsa veya yeni resim yüklendiyse
            if (imageUrl) {
                updatedData.resim = imageUrl;
                updatedData.resimTuru = formData.resim.type;
            }

            await updateDoc(cardRef, updatedData);
            toast.success('Akıl kartı başarıyla güncellendi!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating mind card:', error);
            toast.error('Akıl kartı güncellenirken bir hata oluştu.');
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
            setFormData(prev => ({
                ...prev,
                resim: file,
                resimTuru: file.type
            }));
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Alt Konu
                                </label>
                                <input
                                    type="text"
                                    value={formData.altKonu}
                                    onChange={(e) => setFormData(prev => ({ ...prev, altKonu: e.target.value }))}
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
                                        onChange={(content) => setFormData(prev => ({ ...prev, content }))}
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