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