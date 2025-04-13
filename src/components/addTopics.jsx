import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const AddTopics = ({ isOpen, onClose }) => {
    const [baslik, setBaslik] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!baslik.trim()) {
            toast.error('Konu başlığı boş olamaz!');
            return;
        }

        setLoading(true);
        try {
            const konuRef = doc(db, 'konular', baslik.toLowerCase().replace(/\s+/g, '-'));
            await setDoc(konuRef, {
                baslik: baslik,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            toast.success('Konu başarıyla eklendi!');
            setBaslik('');
            onClose();
        } catch (error) {
            console.error('Konu eklenirken hata:', error);
            toast.error('Konu eklenirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Yeni Konu Ekle</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                            Konu Başlığı
                        </label>
                        <input
                            type="text"
                            value={baslik}
                            onChange={(e) => setBaslik(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Konu başlığını giriniz"
                            disabled={loading}
                        />
                    </div>
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            disabled={loading}
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            disabled={loading}
                        >
                            {loading ? 'Ekleniyor...' : 'Ekle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTopics;