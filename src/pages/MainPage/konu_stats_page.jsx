import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { toast } from "react-hot-toast";
import { FaCalculator, FaSync, FaDownload, FaChartBar, FaList } from "react-icons/fa";
import konuStatsService from "../../services/konuStatsService";

const KonuStatsPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [konuStats, setKonuStats] = useState([]);
    const [selectedKonu, setSelectedKonu] = useState(null);

    useEffect(() => {
        loadKonuStats();
    }, []);

    const loadKonuStats = async () => {
        setIsLoading(true);
        try {
            const stats = await konuStatsService.getAllKonuStats();
            setKonuStats(stats);
        } catch (error) {
            console.error('Konu istatistikleri yüklenirken hata:', error);
            toast.error('Konu istatistikleri yüklenirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const calculateAllStats = async () => {
        setIsCalculating(true);
        try {
            toast.loading('Tüm konuların istatistikleri hesaplanıyor...', { duration: 2000 });
            await konuStatsService.calculateAllKonuStats();
            await loadKonuStats();
            toast.success('Tüm konuların istatistikleri başarıyla hesaplandı!');
        } catch (error) {
            console.error('İstatistikler hesaplanırken hata:', error);
            toast.error('İstatistikler hesaplanırken hata oluştu');
        } finally {
            setIsCalculating(false);
        }
    };

    const calculateSingleKonuStats = async (konuId) => {
        try {
            toast.loading(`${konuId} konusunun istatistikleri hesaplanıyor...`, { duration: 2000 });
            await konuStatsService.calculateKonuStats(konuId);
            await loadKonuStats();
            toast.success(`${konuId} konusunun istatistikleri güncellendi!`);
        } catch (error) {
            console.error(`${konuId} konusu için hata:`, error);
            toast.error(`${konuId} konusu için hata oluştu`);
        }
    };

    const exportStats = () => {
        const dataStr = JSON.stringify(konuStats, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `konu-stats-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('İstatistikler JSON dosyası olarak indirildi');
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <FaChartBar className="text-blue-600" />
                        Konu İstatistikleri
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Her konunun alt konularının soru sayılarını görüntüleyin ve yönetin
                    </p>
                </div>

                {/* Kontrol Butonları */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={calculateAllStats}
                            disabled={isCalculating}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            {isCalculating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Hesaplanıyor...
                                </>
                            ) : (
                                <>
                                    <FaCalculator />
                                    Tüm İstatistikleri Hesapla
                                </>
                            )}
                        </button>

                        <button
                            onClick={loadKonuStats}
                            disabled={isLoading}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <FaSync />
                            Yenile
                        </button>

                        <button
                            onClick={exportStats}
                            disabled={konuStats.length === 0}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <FaDownload />
                            JSON İndir
                        </button>
                    </div>
                </div>

                {/* İstatistikler Listesi */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <FaList className="text-blue-600" />
                        Konu İstatistikleri
                    </h2>

                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600 dark:text-gray-400">İstatistikler yükleniyor...</p>
                        </div>
                    ) : konuStats.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 dark:text-gray-400">
                                Henüz konu istatistiği bulunmuyor. "Tüm İstatistikleri Hesapla" butonuna basın.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {konuStats.map((stat) => (
                                <div key={stat.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {stat.konuAdi || stat.konuId}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                ID: {stat.konuId} | Toplam Soru: {stat.toplamSoru} | Alt Konu Sayısı: {stat.altKonuSayisi}
                                            </p>
                                            {stat.lastUpdated && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Son Güncelleme: {new Date(stat.lastUpdated.toDate()).toLocaleString('tr-TR')}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => calculateSingleKonuStats(stat.konuId)}
                                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm"
                                        >
                                            Yeniden Hesapla
                                        </button>
                                    </div>

                                    {/* Alt Konular Listesi */}
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Alt Konular:</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {stat.altKonular?.map((altKonu, index) => (
                                                <div key={index} className="bg-white dark:bg-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-500">
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                        {altKonu.altKonuAdi}
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        ID: {altKonu.altKonuId}
                                                    </p>
                                                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                                        {altKonu.soruSayisi} Geçerli Soru
                                                    </p>
                                                    {altKonu.toplamSoru !== altKonu.soruSayisi && (
                                                        <p className="text-xs text-gray-500">
                                                            Toplam: {altKonu.toplamSoru} (Boş: {altKonu.toplamSoru - altKonu.soruSayisi})
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default KonuStatsPage; 