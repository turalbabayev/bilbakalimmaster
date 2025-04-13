import React from 'react';
import { db } from '../firebase';
import { doc, deleteDoc, collection, query, orderBy, getDocs, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const DeleteQuestion = ({ konuId, altKonuId, altDalId, soruId, onDeleteSuccess }) => {
    const handleDelete = async () => {
        if (!window.confirm('Bu soruyu silmek istediğinize emin misiniz?')) {
            return;
        }

        try {
            // Sorunun yolunu belirle
            const soruPath = altDalId 
                ? `konular/${konuId}/altkonular/${altKonuId}/altdallar/${altDalId}/sorular/${soruId}`
                : `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`;

            // Soruyu sil
            await deleteDoc(doc(db, soruPath));

            // Koleksiyon yolunu belirle
            const koleksiyonPath = altDalId 
                ? `konular/${konuId}/altkonular/${altKonuId}/altdallar/${altDalId}/sorular`
                : `konular/${konuId}/altkonular/${altKonuId}/sorular`;

            // Kalan soruların numaralarını güncelle
            const soruRef = collection(db, koleksiyonPath);
            const q = query(soruRef, orderBy("soruNumarasi", "asc"));
            const querySnapshot = await getDocs(q);
            
            let yeniNumara = 1;
            const updatePromises = [];
            
            querySnapshot.forEach((doc) => {
                if (doc.id !== soruId) { // Silinen soruyu hariç tut
                    updatePromises.push(updateDoc(doc.ref, {
                        soruNumarasi: yeniNumara
                    }));
                    yeniNumara++;
                }
            });

            // Tüm güncelleme işlemlerini bekle
            await Promise.all(updatePromises);

            toast.success('Soru başarıyla silindi ve sıralama güncellendi.');
            
            // Parent componenti bilgilendir
            if (onDeleteSuccess) {
                onDeleteSuccess();
            }
        } catch (error) {
            console.error('Soru silinirken hata:', error);
            toast.error('Soru silinirken bir hata oluştu!');
        }
    };

    return (
        <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            title="Soruyu Sil"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
        </button>
    );
};

export default DeleteQuestion;