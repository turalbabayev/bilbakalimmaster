import React, { useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import mammoth from "mammoth";

export default function ImportQuestionsFromDocx({ konular, closeModal }) {
  const [selectedKonu, setSelectedKonu] = useState("");
  const [selectedAltKonu, setSelectedAltKonu] = useState("");
  const [selectedSubbranch, setSelectedSubbranch] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !selectedKonu || !selectedAltKonu || !selectedSubbranch) {
      toast.error("Lütfen tüm alanları doldurun!");
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async function(e) {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
          const text = result.value;
          const questions = parseQuestionsFromText(text);

          const konuRef = doc(db, "konular", selectedKonu);
          const konuDoc = await getDoc(konuRef);
          
          if (!konuDoc.exists()) {
            throw new Error("Konu bulunamadı!");
          }

          const konuData = konuDoc.data();
          const altKonular = konuData.altkonular || {};
          const subbranches = altKonular[selectedAltKonu]?.subbranches || {};
          const currentQuestions = subbranches[selectedSubbranch]?.questions || {};

          // Mevcut soru sayısını bul
          const currentQuestionCount = Object.keys(currentQuestions).length;

          // Yeni soruları ekle
          const updatedQuestions = { ...currentQuestions };
          questions.forEach((question, index) => {
            const questionNumber = currentQuestionCount + index + 1;
            updatedQuestions[questionNumber] = {
              soru: question.text,
              cevaplar: question.answers,
              dogruCevap: question.correctAnswer,
              aciklama: question.explanation || "",
              resim: "",
            };
          });

          // Firestore'u güncelle
          const updatedSubbranches = {
            ...subbranches,
            [selectedSubbranch]: {
              ...subbranches[selectedSubbranch],
              questions: updatedQuestions,
            },
          };

          const updatedAltKonular = {
            ...altKonular,
            [selectedAltKonu]: {
              ...altKonular[selectedAltKonu],
              subbranches: updatedSubbranches,
            },
          };

          await updateDoc(konuRef, {
            altkonular: updatedAltKonular,
          });

          toast.success("Sorular başarıyla içe aktarıldı!");
          closeModal();
        } catch (error) {
          console.error("Dosya işleme hatası:", error);
          toast.error("Dosya işlenirken bir hata oluştu!");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Hata:", error);
      toast.error("Bir hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  const parseQuestionsFromText = (text) => {
    // Metin içindeki soruları ayrıştır
    const questions = [];
    const lines = text.split("\n").map(line => line.trim()).filter(line => line);
    
    let currentQuestion = null;
    
    for (let line of lines) {
      if (line.match(/^\d+\./)) { // Yeni soru başlangıcı
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          text: line.replace(/^\d+\./, "").trim(),
          answers: [],
          correctAnswer: "",
          explanation: "",
        };
      } else if (currentQuestion) {
        if (line.match(/^[A-E]\)/)) { // Cevap seçeneği
          currentQuestion.answers.push(line.replace(/^[A-E]\)/, "").trim());
        } else if (line.startsWith("Doğru Cevap:")) { // Doğru cevap
          currentQuestion.correctAnswer = line.replace("Doğru Cevap:", "").trim();
        } else if (line.startsWith("Açıklama:")) { // Açıklama
          currentQuestion.explanation = line.replace("Açıklama:", "").trim();
        } else if (currentQuestion.text) { // Soru metninin devamı
          currentQuestion.text += " " + line;
        }
      }
    }
    
    if (currentQuestion) {
      questions.push(currentQuestion);
    }
    
    return questions;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">DOCX'ten Soru İçe Aktar</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Konu
            </label>
            <select
              value={selectedKonu}
              onChange={(e) => setSelectedKonu(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            >
              <option value="">Konu Seçin</option>
              {Object.entries(konular).map(([id, konu]) => (
                <option key={id} value={id}>
                  {konu.baslik}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Alt Konu
            </label>
            <select
              value={selectedAltKonu}
              onChange={(e) => setSelectedAltKonu(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            >
              <option value="">Alt Konu Seçin</option>
              {selectedKonu &&
                Object.entries(konular[selectedKonu]?.altkonular || {}).map(([id, altkonu]) => (
                  <option key={id} value={id}>
                    {altkonu.baslik}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Alt Dal
            </label>
            <select
              value={selectedSubbranch}
              onChange={(e) => setSelectedSubbranch(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            >
              <option value="">Alt Dal Seçin</option>
              {selectedAltKonu &&
                Object.entries(
                  konular[selectedKonu]?.altkonular[selectedAltKonu]?.subbranches || {}
                ).map(([id, subbranch]) => (
                  <option key={id} value={id}>
                    {subbranch.baslik}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              DOCX Dosyası
            </label>
            <input
              type="file"
              accept=".docx"
              onChange={handleFileChange}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "İçe Aktarılıyor..." : "İçe Aktar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 