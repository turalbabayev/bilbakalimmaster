import React, { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

function ChangeQuestionOrder({ selectedKonu, selectedAltKonu, selectedAltDal, selectedSoru, closeModal }) {
  const [yeniSira, setYeniSira] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const yeniSiraNo = parseInt(yeniSira);
    if (isNaN(yeniSiraNo) || yeniSiraNo < 1) {
      toast.error("Geçerli bir sıra numarası giriniz!");
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
      
      // Seçili sorunun mevcut sıra numarasını al
      const mevcutSira = sorular[selectedSoru]?.soruNumarasi;
      if (!mevcutSira) {
        toast.error("Soru bulunamadı!");
        return;
      }

      // Tüm soruların sıra numaralarını güncelle
      const updates = {};
      Object.entries(sorular).forEach(([key, soru]) => {
        let yeniNumara = soru.soruNumarasi;
        
        if (mevcutSira < yeniSiraNo) {
          // Soru yukarı taşınıyor
          if (soru.soruNumarasi > mevcutSira && soru.soruNumarasi <= yeniSiraNo) {
            yeniNumara = soru.soruNumarasi - 1;
          }
        } else if (mevcutSira > yeniSiraNo) {
          // Soru aşağı taşınıyor
          if (soru.soruNumarasi >= yeniSiraNo && soru.soruNumarasi < mevcutSira) {
            yeniNumara = soru.soruNumarasi + 1;
          }
        }

        if (key === selectedSoru) {
          yeniNumara = yeniSiraNo;
        }

        updates[`altkonular.${selectedAltKonu}.altdallar.${selectedAltDal}.sorular.${key}.soruNumarasi`] = yeniNumara;
      });

      await updateDoc(konuRef, updates);
      
      setYeniSira("");
      closeModal();
      toast.success("Soru sırası başarıyla değiştirildi!");
    } catch (error) {
      toast.error("Soru sırası değiştirilirken bir hata oluştu: " + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-md w-full">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Soru Sırasını Değiştir</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="yeniSira" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Yeni Sıra Numarası
            </label>
            <input
              type="number"
              id="yeniSira"
              value={yeniSira}
              onChange={(e) => setYeniSira(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
              min="1"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            >
              Değiştir
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

export default ChangeQuestionOrder; 