import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const AddSubtopics = ({ isOpen, onClose }) => {
    const [konular, setKonular] = useState([]);
    const [selectedKonu, setSelectedKonu] = useState('');
    const [baslik, setBaslik] = useState('');
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedKonu) {
            toast.error('Lütfen bir konu seçin!');
            return;
        }
        if (!baslik.trim()) {
            toast.error('Alt konu başlığı boş olamaz!');
            return;
        }

        setLoading(true);
        try {
            const konuRef = doc(db, 'konular', selectedKonu);
            const altKonuId = baslik.toLowerCase().replace(/\s+/g, '-');
            
            await updateDoc(konuRef, {
                [`altkonular.${altKonuId}`]: {
                    baslik: baslik,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            });

            toast.success('Alt konu başarıyla eklendi!');
            setBaslik('');
            setSelectedKonu('');
            onClose();
        } catch (error) {
            console.error('Alt konu eklenirken hata:', error);
            toast.error('Alt konu eklenirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Yeni Alt Konu Ekle</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                            Ana Konu
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
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                            Alt Konu Başlığı
                        </label>
                        <input
                            type="text"
                            value={baslik}
                            onChange={(e) => setBaslik(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Alt konu başlığını giriniz"
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

export default AddSubtopics;