import React, { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

function AddQuestionSubbranch({ selectedKonu, selectedAltKonu, selectedAltDal, closeModal }) {
  const [soru, setSoru] = useState("");
  const [cevaplar, setCevaplar] = useState(["", "", "", ""]);
  const [dogruCevap, setDogruCevap] = useState(0);
  const [aciklama, setAciklama] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!soru.trim()) {
      toast.error("Soru metni boş olamaz!");
      return;
    }

    if (cevaplar.some(cevap => !cevap.trim())) {
      toast.error("Tüm cevap seçenekleri doldurulmalıdır!");
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
      const altdallar = konuData.altkonular?.[selectedAltKonu]?.altdallar || {};
      const sorular = altdallar[selectedAltDal]?.sorular || {};
      const yeniSoruNumarasi = Object.keys(sorular).length + 1;

      await updateDoc(konuRef, {
        [`altkonular.${selectedAltKonu}.altdallar.${selectedAltDal}.sorular.${Date.now()}`]: {
          soru: soru.trim(),
          cevaplar: cevaplar.map(cevap => cevap.trim()),
          dogruCevap,
          aciklama: aciklama.trim(),
          soruNumarasi: yeniSoruNumarasi
        }
      });

      setSoru("");
      setCevaplar(["", "", "", ""]);
      setDogruCevap(0);
      setAciklama("");
      closeModal();
      toast.success("Soru başarıyla eklendi!");
    } catch (error) {
      toast.error("Soru eklenirken bir hata oluştu: " + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-2xl w-full m-4">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Soru Ekle</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Soru Metni
            </label>
            <ReactQuill
              value={soru}
              onChange={setSoru}
              className="bg-white dark:bg-gray-700"
              theme="snow"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cevap Seçenekleri
            </label>
            {cevaplar.map((cevap, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="dogruCevap"
                  checked={dogruCevap === index}
                  onChange={() => setDogruCevap(index)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={cevap}
                  onChange={(e) => {
                    const yeniCevaplar = [...cevaplar];
                    yeniCevaplar[index] = e.target.value;
                    setCevaplar(yeniCevaplar);
                  }}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  placeholder={`${index + 1}. seçenek`}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Açıklama
            </label>
            <ReactQuill
              value={aciklama}
              onChange={setAciklama}
              className="bg-white dark:bg-gray-700"
              theme="snow"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            >
              Ekle
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
            >
              Kapat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddQuestionSubbranch;
