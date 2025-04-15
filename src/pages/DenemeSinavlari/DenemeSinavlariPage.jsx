import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const DenemeSinavlariPage = () => {
    const [konular, setKonular] = useState([]);
    const [selectedKonu, setSelectedKonu] = useState('');
    const [altKonular, setAltKonular] = useState([]);
    const [selectedAltKonular, setSelectedAltKonular] = useState([]);
    const [soruSayisi, setSoruSayisi] = useState(20);
    const [sure, setSure] = useState(30);
    const [denemeSinavlari, setDenemeSinavlari] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchKonular();
        fetchDenemeSinavlari();
    }, []);

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
            toast.error('Konular yüklenirken bir hata oluştu');
        }
    };

    const fetchAltKonular = async (konuId) => {
        try {
            const altKonularSnapshot = await getDocs(collection(db, `konular/${konuId}/altKonular`));
            const altKonularData = altKonularSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAltKonular(altKonularData);
        } catch (error) {
            console.error('Alt konular yüklenirken hata:', error);
            toast.error('Alt konular yüklenirken bir hata oluştu');
        }
    };

    const fetchDenemeSinavlari = async () => {
        try {
            const q = query(collection(db, 'denemeSinavlari'), orderBy('olusturulmaTarihi', 'desc'));
            const snapshot = await getDocs(q);
            const sinavlar = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setDenemeSinavlari(sinavlar);
        } catch (error) {
            console.error('Deneme sınavları yüklenirken hata:', error);
            toast.error('Deneme sınavları yüklenirken bir hata oluştu');
        }
    };

    const handleKonuChange = (e) => {
        const konuId = e.target.value;
        setSelectedKonu(konuId);
        setSelectedAltKonular([]);
        if (konuId) {
            fetchAltKonular(konuId);
        } else {
            setAltKonular([]);
        }
    };

    const handleAltKonuChange = (altKonuId) => {
        setSelectedAltKonular(prev => {
            if (prev.includes(altKonuId)) {
                return prev.filter(id => id !== altKonuId);
            }
            return [...prev, altKonuId];
        });
    };

    const handleDenemeSinaviOlustur = async () => {
        if (!selectedKonu || selectedAltKonular.length === 0) {
            toast.error('Lütfen en az bir konu ve alt konu seçin');
            return;
        }

        setLoading(true);
        try {
            const secilenKonu = konular.find(k => k.id === selectedKonu);
            const secilenAltKonular = altKonular.filter(ak => selectedAltKonular.includes(ak.id));

            const yeniDenemeSinavi = {
                konuId: selectedKonu,
                konuAdi: secilenKonu.baslik,
                altKonular: secilenAltKonular.map(ak => ({
                    id: ak.id,
                    baslik: ak.baslik
                })),
                soruSayisi,
                sure,
                olusturulmaTarihi: new Date(),
                aktif: true
            };

            await addDoc(collection(db, 'denemeSinavlari'), yeniDenemeSinavi);
            toast.success('Deneme sınavı başarıyla oluşturuldu');
            fetchDenemeSinavlari();

            // Form'u sıfırla
            setSelectedKonu('');
            setSelectedAltKonular([]);
            setAltKonular([]);
            setSoruSayisi(20);
            setSure(30);
        } catch (error) {
            console.error('Deneme sınavı oluşturulurken hata:', error);
            toast.error('Deneme sınavı oluşturulurken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sol Taraf - Deneme Sınavı Oluşturma Formu */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                        Yeni Deneme Sınavı Oluştur
                    </h2>
                    <div className="space-y-6">
                        {/* Konu Seçimi */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Konu Seçin
                            </label>
                            <select
                                value={selectedKonu}
                                onChange={handleKonuChange}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">Konu Seçin</option>
                                {konular.map(konu => (
                                    <option key={konu.id} value={konu.id}>
                                        {konu.baslik}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Alt Konu Seçimi */}
                        {altKonular.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Alt Konular
                                </label>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {altKonular.map(altKonu => (
                                        <label key={altKonu.id} className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedAltKonular.includes(altKonu.id)}
                                                onChange={() => handleAltKonuChange(altKonu.id)}
                                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">
                                                {altKonu.baslik}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Soru Sayısı */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Soru Sayısı
                            </label>
                            <input
                                type="number"
                                value={soruSayisi}
                                onChange={(e) => setSoruSayisi(Number(e.target.value))}
                                min="1"
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        {/* Süre */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Süre (Dakika)
                            </label>
                            <input
                                type="number"
                                value={sure}
                                onChange={(e) => setSure(Number(e.target.value))}
                                min="1"
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        {/* Oluştur Butonu */}
                        <button
                            onClick={handleDenemeSinaviOlustur}
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                                loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            } transition-colors duration-200`}
                        >
                            {loading ? 'Oluşturuluyor...' : 'Deneme Sınavı Oluştur'}
                        </button>
                    </div>
                </div>

                {/* Sağ Taraf - Mevcut Deneme Sınavları Listesi */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                        Mevcut Deneme Sınavları
                    </h2>
                    <div className="space-y-4">
                        {denemeSinavlari.map(sinav => (
                            <div
                                key={sinav.id}
                                className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                            >
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {sinav.konuAdi}
                                </h3>
                                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                    <p>Alt Konular: {sinav.altKonular.map(ak => ak.baslik).join(', ')}</p>
                                    <p>Soru Sayısı: {sinav.soruSayisi}</p>
                                    <p>Süre: {sinav.sure} dakika</p>
                                    <p>
                                        Oluşturulma Tarihi:{' '}
                                        {sinav.olusturulmaTarihi?.toDate().toLocaleDateString('tr-TR')}
                                    </p>
                                </div>
                                <div className="mt-3 flex items-center space-x-2">
                                    <span
                                        className={`px-2 py-1 text-xs font-medium rounded ${
                                            sinav.aktif
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}
                                    >
                                        {sinav.aktif ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {denemeSinavlari.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                Henüz deneme sınavı oluşturulmamış
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DenemeSinavlariPage; 