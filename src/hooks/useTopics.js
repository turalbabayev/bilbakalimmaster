import { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

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

export const useTopics = () => {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Konuları gerçek zamanlı dinle
        const konularRef = collection(db, 'miniCards-konular');
        const q = query(konularRef, orderBy('baslik', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            try {
                const topicsList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setTopics(topicsList);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching topics:', err);
                setError(err);
                setLoading(false);
            }
        }, (err) => {
            console.error('Error in topics snapshot:', err);
            setError(err);
            setLoading(false);
        });

        // Cleanup function
        return () => unsubscribe();
    }, []);

    return { topics, loading, error };
}; 