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
                // Hariç tutulacak ID'ler
                const excludedIds = [
                    'OMwqcmZd1wBykLhWy2X',
                    'OMxIqn_AbJuMHAXQcMl',
                    'OMxKME94u1eKgCtQjsg',
                    'OMxOQiPA8iue7tcF71O',
                    'OMxObWfMWK_gl7F4fYN'
                ];

                const querySnapshot = await getDocs(collection(db, 'konular'));
                
                // Sadece hariç tutulmayan konuları al
                const topicsData = querySnapshot.docs
                    .filter(doc => !excludedIds.includes(doc.id))
                    .map(doc => ({
                        id: doc.id,
                        baslik: doc.data().baslik || '',
                        ...doc.data()
                    }));

                setTopics(topicsData);
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