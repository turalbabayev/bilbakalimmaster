import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const useTopics = () => {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'konular'));
                const topicsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    baslik: doc.data().baslik || '',
                    ...doc.data()
                }));

                // Katılım Bankacılığı konularını birleştir
                const katilimBankaciligiIds = [
                    'OMwqcmZd1wBykLhWy2X',
                    'OMxIqn_AbJuMHAXQcMl',
                    'OMxKME94u1eKgCtQjsg',
                    'OMxOQiPA8iue7tcF71O',
                    'OMxObWfMWK_gl7F4fYN'
                ];

                // Katılım Bankacılığı konusunu oluştur
                const katilimBankaciligiTopic = {
                    id: 'katilim-bankaciligi',
                    baslik: 'Katılım Bankacılığı',
                    type: 'special',
                    originalIds: katilimBankaciligiIds
                };

                // Diğer konuları filtrele (Katılım Bankacılığı konularını çıkar)
                const filteredTopics = topicsData.filter(topic => 
                    !katilimBankaciligiIds.includes(topic.id)
                );

                // Birleştirilmiş konuyu ekle
                const allTopics = [katilimBankaciligiTopic, ...filteredTopics];

                setTopics(allTopics);
            } catch (err) {
                console.error('Error fetching topics:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTopics();
    }, []);

    return { topics, loading, error };
}; 