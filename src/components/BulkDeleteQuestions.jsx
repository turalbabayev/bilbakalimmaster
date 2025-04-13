import React, { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

function BulkDeleteQuestions({ selectedKonu, selectedAltKonu, selectedAltDal, closeModal }) {
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const start = parseInt(baslangic);
    const end = parseInt(bitis);

    if (isNaN(start) || isNaN(end)) {
      toast.error("Başlangıç ve bitiş değerleri sayı olmalıdır!");
      return;
    }

    if (start > end) {
      toast.error("Başlangıç değeri bitiş değerinden büyük olamaz!");
      return;
    }

    try {
      const konuRef = doc(db, "konular", selectedKonu);
      const konuDoc = await getDoc(konuRef);
      
      if (!konuDoc.exists()) {
        toast.error("Konu bulunamadı!");
        return;
      }

      const konuData = konuDoc.data();
      const sorular = konuData.altkonular?.[selectedAltKonu]?.altdallar?.[selectedAltDal]?.sorular || {};
      
      const updates = {};
      Object.entries(sorular).forEach(([key, soru]) => {
        if (soru.soruNumarasi >= start && soru.soruNumarasi <= end) {
          updates[`altkonular.${selectedAltKonu}.altdallar.${selectedAltDal}.sorular.${key}`] = null;
        }
      });

      if (Object.keys(updates).length === 0) {
        toast.error("Belirtilen aralıkta soru bulunamadı!");
        return;
      }

      await updateDoc(konuRef, updates);
      
      setBaslangic("");
      setBitis("");
      closeModal();
      toast.success("Sorular başarıyla silindi!");
    } catch (error) {
      toast.error("Sorular silinirken bir hata oluştu: " + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-md w-full">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Toplu Soru Sil</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="baslangic" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Başlangıç Soru Numarası
            </label>
            <input
              type="number"
              id="baslangic"
              value={baslangic}
              onChange={(e) => setBaslangic(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
              min="1"
            />
          </div>
          <div>
            <label htmlFor="bitis" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Bitiş Soru Numarası
            </label>
            <input
              type="number"
              id="bitis"
              value={bitis}
              onChange={(e) => setBitis(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
              min="1"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
            >
              Sil
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BulkDeleteQuestions; 