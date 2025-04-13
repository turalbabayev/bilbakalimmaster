import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const DeleteTopics = ({ isOpen, onClose }) => {
    const [konular, setKonular] = useState([]);
    const [selectedKonu, setSelectedKonu] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchKonular = async () => {
            try {
                const konularSnapshot = await getDocs(collection(db, 'konular'));
                const konularData = konularSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setKonular(konularData);
            } catch (error) {
                console.error('Konular yüklenirken hata:', error);
                toast.error('Konular yüklenirken bir hata oluştu!');
            }
        };

        if (isOpen) {
            fetchKonular();
        }
    }, [isOpen]);

    const handleDelete = async () => {
        if (!selectedKonu) {
            toast.error('Lütfen bir konu seçin!');
            return;
        }

        if (!window.confirm('Bu konuyu silmek istediğinizden emin misiniz?')) {
            return;
        }

        setLoading(true);
        try {
            await deleteDoc(doc(db, 'konular', selectedKonu));
            toast.success('Konu başarıyla silindi!');
            setSelectedKonu('');
            onClose();
        } catch (error) {
            console.error('Konu silinirken hata:', error);
            toast.error('Konu silinirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Konu Sil</h2>
                <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                        Silinecek Konu
                    </label>
                    <select
                        value={selectedKonu}
                        onChange={(e) => setSelectedKonu(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        disabled={loading}
                    >
                        <option value="">Konu seçin</option>
                        {konular.map((konu) => (
                            <option key={konu.id} value={konu.id}>
                                {konu.baslik}
                            </option>
                        ))}
                    </select>
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
                        type="button"
                        onClick={handleDelete}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        disabled={loading}
                    >
                        {loading ? 'Siliniyor...' : 'Sil'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteTopics;