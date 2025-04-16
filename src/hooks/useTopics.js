import { useState, useEffect } from 'react';

export const useTopics = () => {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Sabit konular listesi
        const staticTopics = [
            { id: 'bankacilik', baslik: 'BANKACILIK' },
            { id: 'muhasebe', baslik: 'MUHASEBE' },
            { id: 'matematik', baslik: 'MATEMATİK' },
            { id: 'turkce', baslik: 'TÜRKÇE' },
            { id: 'tarih', baslik: 'TARİH' },
            { id: 'cografya', baslik: 'COĞRAFYA' },
            { id: 'katilim-bankaciligi', baslik: 'Katılım Bankacılığı' },
            { id: 'halkbank', baslik: 'HALKBANK ÜRÜN VE HİZMETLERİ' },
            { id: 'ziraat', baslik: 'ZİRAAT BANKASI ÜRÜN VE HİZMETLERİ' },
            { id: 'ekonomi', baslik: 'EKONOMİ' },
            { id: 'hukuk', baslik: 'HUKUK' },
            { id: 'krediler', baslik: 'KREDİLER' },
            { id: 'genel-kultur', baslik: 'GENEL KÜLTÜR' },
            { id: 'onemli-terimler', baslik: 'ÖNEMLİ TERİMLER' }
        ];

        setTopics(staticTopics);
        setLoading(false);
    }, []);

    return { topics, loading, error };
}; 