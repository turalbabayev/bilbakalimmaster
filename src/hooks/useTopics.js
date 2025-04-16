import { useState, useEffect } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
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
        const initializeTopics = async () => {
            try {
                // Her konu için Firestore'da bir döküman oluştur (eğer yoksa)
                const konularRef = collection(db, 'miniCards-konular');
                
                for (const topic of staticTopics) {
                    const topicRef = doc(konularRef, topic.id);
                    await setDoc(topicRef, {
                        baslik: topic.baslik,
                        id: topic.id
                    }, { merge: true }); // merge: true sayesinde varsa güncellenmez
                }

                setTopics(staticTopics);
            } catch (err) {
                console.error('Error initializing topics:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        initializeTopics();
    }, []);

    return { topics, loading, error };
}; 