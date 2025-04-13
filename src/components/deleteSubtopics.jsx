import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const DeleteSubtopics = ({ isOpen, onClose }) => {
    const [konular, setKonular] = useState([]);
    const [selectedKonu, setSelectedKonu] = useState('');
    const [selectedAltKonu, setSelectedAltKonu] = useState('');
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
            setSelectedKonu('');
            setSelectedAltKonu('');
        }
    }, [isOpen]);

    const handleDelete = async () => {
        if (!selectedKonu || !selectedAltKonu) {
            toast.error('Lütfen bir konu ve alt konu seçin!');
            return;
        }

        if (!window.confirm('Bu alt konuyu silmek istediğinizden emin misiniz?')) {
            return;
        }

        setLoading(true);
        try {
            const konuRef = doc(db, 'konular', selectedKonu);
            const selectedKonuData = konular.find(k => k.id === selectedKonu);
            
            const updatedAltkonular = { ...selectedKonuData.altkonular };
            delete updatedAltkonular[selectedAltKonu];
            
            await updateDoc(konuRef, {
                altkonular: updatedAltkonular
            });

            toast.success('Alt konu başarıyla silindi!');
            setSelectedAltKonu('');
            onClose();
        } catch (error) {
            console.error('Alt konu silinirken hata:', error);
            toast.error('Alt konu silinirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    const selectedKonuData = konular.find(k => k.id === selectedKonu);
    const altKonular = selectedKonuData?.altkonular || {};

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Alt Konu Sil</h2>
                <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                        Ana Konu
                    </label>
                    <select
                        value={selectedKonu}
                        onChange={(e) => {
                            setSelectedKonu(e.target.value);
                            setSelectedAltKonu('');
                        }}
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
                        Alt Konu
                    </label>
                    <select
                        value={selectedAltKonu}
                        onChange={(e) => setSelectedAltKonu(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        disabled={!selectedKonu || loading}
                    >
                        <option value="">Alt konu seçin</option>
                        {Object.entries(altKonular).map(([id, altkonu]) => (
                            <option key={id} value={id}>
                                {altkonu.baslik}
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
                        disabled={!selectedKonu || !selectedAltKonu || loading}
                    >
                        {loading ? 'Siliniyor...' : 'Sil'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteSubtopics;