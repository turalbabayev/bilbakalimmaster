import React, { useState } from "react";
import { Document, Packer, Paragraph } from "docx";
import { saveAs } from "file-saver";

const ExportToDocx = ({ konuBaslik, altKonular }) => {
  const [loading, setLoading] = useState(false);
  const [loadingSimple, setLoadingSimple] = useState(false);

  const exportToDocx = async (includeAnswers = true) => {
    if (includeAnswers) {
      setLoading(true);
    } else {
      setLoadingSimple(true);
    }
    
    try {
      console.log("DOCX oluşturma başladı...", {konuBaslik, altKonular, includeAnswers});
      
      // Temel bir doküman oluştur (minimum yapılandırma)
      const children = [];
      
      // Başlık ekle
      children.push(
        new Paragraph({
          text: includeAnswers 
            ? konuBaslik || "Soru Bankası" 
            : `${konuBaslik || "Soru Bankası"} - Yalnızca Sorular`,
        })
      );
      
      // Boşluk
      children.push(new Paragraph(""));
      
      // Her alt konu için basit bir paragraf ekle
      if (altKonular && typeof altKonular === 'object') {
        Object.entries(altKonular).forEach(([altKonuId, altKonu]) => {
          if (!altKonu) return;
          
          // Alt konu başlığı
          children.push(
            new Paragraph({
              text: altKonu.baslik || "Alt Konu",
            })
          );
          
          // Her soru için basit bir paragraf ekle
          if (altKonu.sorular && typeof altKonu.sorular === 'object') {
            Object.entries(altKonu.sorular).forEach(([soruId, soru]) => {
              if (!soru) return;
              
              // Soru metni
              children.push(new Paragraph(`Soru: ${soru.soruMetni || ""}`));
              
              // Şıklar
              if (Array.isArray(soru.cevaplar)) {
                soru.cevaplar.forEach((cevap, idx) => {
                  if (cevap === null || cevap === undefined) return;
                  const sik = String.fromCharCode(65 + idx);
                  children.push(new Paragraph(`${sik}. ${cevap}`));
                });
              }
              
              // Eğer cevaplar dahil edilecekse doğru cevap ve açıklamayı da ekle
              if (includeAnswers) {
                // Doğru cevap
                if (soru.dogruCevap) {
                  children.push(new Paragraph(`Doğru Cevap: ${soru.dogruCevap}`));
                }
                
                // Açıklama
                if (soru.aciklama) {
                  children.push(new Paragraph(`Açıklama: ${soru.aciklama}`));
                }
              }
              
              // Boşluk
              children.push(new Paragraph("---"));
            });
          }
        });
      }
      
      // Doküman oluştur
      const doc = new Document({
        sections: [
          {
            children: children
          }
        ]
      });
      
      console.log("Doküman oluşturuldu, blob'a dönüştürülüyor...");
      
      // DOCX dosyasını oluştur ve indir - tarayıcıda çalışacak şekilde
      // Blob kullanarak (NodeBuffer yerine)
      const blob = await Packer.toBlob(doc);
      
      // Türkçe karakterleri temizle
      const sanitizedKonuBaslik = konuBaslik
        ? konuBaslik
            .replace(/ç/g, 'c').replace(/Ç/g, 'C')
            .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
            .replace(/ı/g, 'i').replace(/İ/g, 'I')
            .replace(/ö/g, 'o').replace(/Ö/g, 'O')
            .replace(/ş/g, 's').replace(/Ş/g, 'S')
            .replace(/ü/g, 'u').replace(/Ü/g, 'U')
            .replace(/[^\w\s]/gi, '')
        : "SoruBankasi";
      
      // Dosyayı indir
      const fileName = includeAnswers 
        ? `${sanitizedKonuBaslik}_Soru_Bankasi.docx`
        : `${sanitizedKonuBaslik}_YalnızcaSorular.docx`;
        
      saveAs(blob, fileName);
      
    } catch (error) {
      console.error("DOCX oluşturma hatası:", error);
      alert(`DOCX oluşturulurken bir hata oluştu: ${error.message}`);
    } finally {
      if (includeAnswers) {
        setLoading(false);
      } else {
        setLoadingSimple(false);
      }
    }
  };
  
  return (
    <div className="flex space-x-2">
      <button
        onClick={() => exportToDocx(true)}
        disabled={loading}
        className={`px-4 py-2 ${loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md flex items-center`}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            İşleniyor...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            DOCX İndir (Tam)
          </>
        )}
      </button>
      
      <button
        onClick={() => exportToDocx(false)}
        disabled={loadingSimple}
        className={`px-4 py-2 ${loadingSimple ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white rounded-md flex items-center`}
      >
        {loadingSimple ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            İşleniyor...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            DOCX İndir (Sadece Sorular)
          </>
        )}
      </button>
    </div>
  );
};

export default ExportToDocx; 