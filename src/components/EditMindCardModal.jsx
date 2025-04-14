import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { toast } from "react-hot-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const EditMindCardModal = ({ isOpen, onClose, onSuccess, card }) => {
    const [topic, setTopic] = useState('');
    const [subtopic, setSubtopic] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [currentImageUrl, setCurrentImageUrl] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (card) {
            setTopic(card.topic || '');
            setSubtopic(card.subtopic || '');
            setContent(card.content || '');
            setCurrentImageUrl(card.imageUrl || '');
        }
    }, [card]);

    const handleImageChange = (e) => {
        if (e.target.files[0]) {
            setImage(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!topic.trim()) {
            toast.error('Konu başlığı boş olamaz');
            return;
        }

        setLoading(true);
        try {
            const cardRef = doc(db, 'mindCards', card.id);
            let updateData = {
                topic,
                subtopic: subtopic.trim() || null,
                content,
                updatedAt: new Date(),
            };

            // Eğer yeni bir resim yüklendiyse
            if (image) {
                // Eski resmi sil
                if (currentImageUrl) {
                    const oldImageRef = ref(storage, currentImageUrl);
                    try {
                        await deleteObject(oldImageRef);
                    } catch (error) {
                        console.error('Eski resim silinirken hata:', error);
                    }
                }

                // Yeni resmi yükle
                const storageRef = ref(storage, `mind-cards/${card.id}/${image.name}`);
                const snapshot = await uploadBytes(storageRef, image);
                const downloadURL = await getDownloadURL(snapshot.ref);
                updateData.imageUrl = downloadURL;
            }

            await updateDoc(cardRef, updateData);
            toast.success('Kart başarıyla güncellendi');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Kart güncellenirken hata:', error);
            toast.error('Kart güncellenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="mb-4">
                            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Konu Başlığı
                            </label>
                            <input
                                type="text"
                                id="topic"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="subtopic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Alt Konu (İsteğe bağlı)
                            </label>
                            <input
                                type="text"
                                id="subtopic"
                                value={subtopic}
                                onChange={(e) => setSubtopic(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                İçerik
                            </label>
                            <ReactQuill
                                theme="snow"
                                value={content}
                                onChange={setContent}
                                className="bg-white dark:bg-gray-700"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Resim
                            </label>
                            {currentImageUrl && (
                                <div className="mb-2">
                                    <img
                                        src={currentImageUrl}
                                        alt="Mevcut resim"
                                        className="max-h-40 rounded"
                                    />
                                </div>
                            )}
                            <input
                                type="file"
                                onChange={handleImageChange}
                                accept="image/*"
                                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300"
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                    loading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                {loading ? 'Güncelleniyor...' : 'Güncelle'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditMindCardModal; 