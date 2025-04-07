import React, { useState } from "react";
import { database } from "../firebase";
import { ref, remove, get, update } from "firebase/database";

const DeleteQuestion = ({ soruRef, onDelete }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (window.confirm("Bu soruyu silmek istediğinize emin misiniz?")) {
            setIsDeleting(true);
            try {
                // Silinecek sorunun verilerini al
                const soruSnapshot = await get(ref(database, soruRef));
                if (!soruSnapshot.exists()) {
                    alert("Soru bulunamadı!");
                    setIsDeleting(false);
                    return;
                }
                
                const silinecekSoru = soruSnapshot.val();
                const silinecekSoruNumarasi = silinecekSoru?.soruNumarasi;
                
                console.log("Silinecek soru:", soruRef);
                console.log("Silinecek soru numarası:", silinecekSoruNumarasi);

                if (!silinecekSoruNumarasi) {
                    // Soru numarası yoksa sadece sil
                    await remove(ref(database, soruRef));
                    alert("Bu soru başarıyla silindi.");
                    onDelete();
                    return;
                }

                // Sorunun bulunduğu koleksiyonu belirle (ana yolu)
                const pathParts = soruRef.split('/');
                const soruId = pathParts.pop(); // Son elemanı (soru ID) çıkar
                const sorularYolu = pathParts.join('/'); // Sorular koleksiyonunun yolu
                
                console.log("Sorular yolu:", sorularYolu);

                // Tüm soruları al
                const sorularSnapshot = await get(ref(database, sorularYolu));
                if (!sorularSnapshot.exists()) {
                    console.log("Sorular koleksiyonu bulunamadı");
                    await remove(ref(database, soruRef));
                    alert("Bu soru başarıyla silindi.");
                    onDelete();
                    return;
                }
                
                const sorular = sorularSnapshot.val() || {};
                console.log("Mevcut sorular:", Object.keys(sorular).length);

                // Soruyu sil
                await remove(ref(database, soruRef));
                console.log("Soru silindi:", soruRef);
                
                // Diğer soruların numaralarını güncelle
                const updates = {};
                let güncellenenSoruSayisi = 0;
                
                Object.entries(sorular).forEach(([key, soru]) => {
                    // Silinecek ID'yi atla
                    if (key === soruId) {
                        console.log("Silinen soru atlandı:", key);
                        return;
                    }
                    
                    // Soru numarası kontrolü
                    if (!soru.soruNumarasi && soru.soruNumarasi !== 0) {
                        console.log("Soru numarası olmayan soru:", key);
                        return;
                    }
                    
                    // Sadece silinen sorudan yüksek numaralı soruları güncelle
                    if (soru.soruNumarasi > silinecekSoruNumarasi) {
                        const yeniNumara = soru.soruNumarasi - 1;
                        updates[`${sorularYolu}/${key}/soruNumarasi`] = yeniNumara;
                        console.log(`Soru ${key} numarası güncelleniyor: ${soru.soruNumarasi} -> ${yeniNumara}`);
                        güncellenenSoruSayisi++;
                    }
                });

                console.log("Güncellenecek soru sayısı:", güncellenenSoruSayisi);
                console.log("Updates nesnesi:", updates);

                // Numaraları güncelle (eğer güncellenecek soru varsa)
                if (Object.keys(updates).length > 0) {
                    await update(ref(database), updates);
                    console.log("Sorular güncellendi");
                } else {
                    console.log("Güncellenecek soru bulunamadı");
                }

                alert("Bu soru başarıyla silindi ve numaralar yeniden düzenlendi.");
                onDelete();
            } catch (error) {
                console.error("Soru silinirken bir hata oluştu:", error);
                alert("Soru silinirken bir hata oluştu: " + error.message);
            } finally {
                setIsDeleting(false);
            }
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