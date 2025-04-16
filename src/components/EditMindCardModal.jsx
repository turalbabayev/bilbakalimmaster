import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTopics } from '../hooks/useTopics';
import Modal from './Modal';

const EditMindCardModal = ({ isOpen, onClose, card, konuId, onSuccess }) => {
    const { topics, loading: topicsLoading } = useTopics();
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const cardRef = doc(db, 'mindCards', card.id);
            const updateData = {
                konuId: formData.selectedKonu,
                altKonu: formData.altKonu,
                content: formData.content,
            };

            if (formData.resim) {
                const storageRef = ref(storage, `mindCards/${card.id}`);
                const snapshot = await uploadBytes(storageRef, formData.resim);
                const downloadURL = await getDownloadURL(snapshot.ref);

                updateData.resim = downloadURL;
                updateData.resimTuru = formData.resim.type;
            }

            await updateDoc(cardRef, updateData);
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

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
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
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        >
                            <option value="">Konu Seçin</option>
                            {topics.map((topic) => (
                                <option key={topic.id} value={topic.id}>
                                    {topic.baslik}
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
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            İçerik
                        </label>
                        <ReactQuill
                            value={formData.content}
                            onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                            className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Resim (Opsiyonel)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        {card.resim && !formData.resim && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Mevcut resim korunacak. Yeni bir resim seçmek için yukarıdaki alana tıklayın.
                            </p>
                        )}
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-4 py-2 bg-blue-600 text-white rounded-md ${
                                loading
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-blue-700'
                            } transition-colors duration-200`}
                        >
                            {loading ? 'Güncelleniyor...' : 'Güncelle'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default EditMindCardModal; 