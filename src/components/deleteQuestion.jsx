import React, { useState } from "react";
import { db } from "../firebase";
import { doc, deleteDoc, collection, getDocs, updateDoc, query, where, orderBy } from "firebase/firestore";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const DeleteQuestion = ({ soruRef, onDelete }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!window.confirm("Bu soruyu silmek istediğinize emin misiniz?")) {
            return;
        }

        setIsDeleting(true);

        try {
            // soruRef'ten path bilgilerini al
            const [, , konuId, , altKonuId, , soruId] = soruRef.split('/');
            
            // Firestore referansları
            const soruDocRef = doc(db, "konular", konuId, "altkonular", altKonuId, "sorular", soruId);
            const sorularCollectionRef = collection(db, "konular", konuId, "altkonular", altKonuId, "sorular");

            // Tüm soruları sıralı şekilde al
            const q = query(sorularCollectionRef, orderBy("soruNumarasi", "asc"));
            const querySnapshot = await getDocs(q);
            
            // Silinecek sorunun numarasını bul
            let silinecekSoruNumarasi = null;
            let sorular = [];
            
            querySnapshot.forEach((doc) => {
                const soru = { id: doc.id, ...doc.data() };
                sorular.push(soru);
                if (doc.id === soruId) {
                    silinecekSoruNumarasi = soru.soruNumarasi;
                }
            });

            // Soruyu sil
            await deleteDoc(soruDocRef);

            // Diğer soruların numaralarını güncelle
            const updatePromises = sorular
                .filter(soru => soru.id !== soruId && soru.soruNumarasi > silinecekSoruNumarasi)
                .map(soru => {
                    const soruRef = doc(db, "konular", konuId, "altkonular", altKonuId, "sorular", soru.id);
                    return updateDoc(soruRef, {
                        soruNumarasi: soru.soruNumarasi - 1
                    });
                });

            // Tüm güncellemeleri bekle
            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
            }

            toast.success("Soru başarıyla silindi ve numaralar yeniden düzenlendi.");
            onDelete();

        } catch (error) {
            console.error("Soru silinirken bir hata oluştu:", error);
            toast.error("Soru silinirken bir hata oluştu: " + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button
            className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center"
            onClick={handleDelete}
            disabled={isDeleting}
        >
            {isDeleting ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Siliniyor...
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Sil
                </>
            )}
        </button>
    );
};

export default DeleteQuestion;