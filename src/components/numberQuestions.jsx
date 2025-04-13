import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const NumberQuestions = ({ isOpen, onClose }) => {
    const [konular, setKonular] = useState([]);
    const [selectedKonu, setSelectedKonu] = useState('');
    const [selectedAltKonu, setSelectedAltKonu] = useState('');
    const [selectedAltDal, setSelectedAltDal] = useState('');
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
            setSelectedAltDal('');
        }
    }, [isOpen]);

    const handleNumberQuestions = async () => {
        if (!selectedKonu || !selectedAltKonu || !selectedAltDal) {
            toast.error('Lütfen bir konu, alt konu ve alt dal seçin!');
            return;
        }

        setLoading(true);
        try {
            const konuRef = doc(db, 'konular', selectedKonu);
            const selectedKonuData = konular.find(k => k.id === selectedKonu);
            const altKonuData = selectedKonuData.altkonular[selectedAltKonu];
            const altDalData = altKonuData.altdallar[selectedAltDal];
            
            if (!altDalData.sorular) {
                toast.error('Bu alt dalda soru bulunmamaktadır!');
                return;
            }

            const sorular = Object.entries(altDalData.sorular);
            const yeniSorular = {};
            
            sorular.forEach(([_, soru], index) => {
                const yeniSoruNumarasi = (index + 1).toString().padStart(3, '0');
                yeniSorular[yeniSoruNumarasi] = soru;
            });

            const updatedAltDal = {
                ...altDalData,
                sorular: yeniSorular
            };

            const updatedAltKonu = {
                ...altKonuData,
                altdallar: {
                    ...altKonuData.altdallar,
                    [selectedAltDal]: updatedAltDal
                }
            };

            await updateDoc(konuRef, {
                [`altkonular.${selectedAltKonu}`]: updatedAltKonu
            });

            toast.success('Sorular başarıyla numaralandırıldı!');
            onClose();
        } catch (error) {
            console.error('Sorular numaralandırılırken hata:', error);
            toast.error('Sorular numaralandırılırken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    const selectedKonuData = konular.find(k => k.id === selectedKonu);
    const altKonular = selectedKonuData?.altkonular || {};
    const selectedAltKonuData = altKonular[selectedAltKonu];
    const altDallar = selectedAltKonuData?.altdallar || {};

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Soruları Numaralandır</h2>
                <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                        Ana Konu
                    </label>
                    <select
                        value={selectedKonu}
                        onChange={(e) => {
                            setSelectedKonu(e.target.value);
                            setSelectedAltKonu('');
                            setSelectedAltDal('');
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
                        onChange={(e) => {
                            setSelectedAltKonu(e.target.value);
                            setSelectedAltDal('');
                        }}
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
                <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                        Alt Dal
                    </label>
                    <select
                        value={selectedAltDal}
                        onChange={(e) => setSelectedAltDal(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        disabled={!selectedKonu || !selectedAltKonu || loading}
                    >
                        <option value="">Alt dal seçin</option>
                        {Object.entries(altDallar).map(([id, altdal]) => (
                            <option key={id} value={id}>
                                {altdal.baslik}
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
                        onClick={handleNumberQuestions}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        disabled={!selectedKonu || !selectedAltKonu || !selectedAltDal || loading}
                    >
                        {loading ? 'Numaralandırılıyor...' : 'Numaralandır'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NumberQuestions; 