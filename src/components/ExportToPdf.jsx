import React, { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';

const ExportToPdf = ({ konuBaslik, altKonular }) => {
  const [loading, setLoading] = useState(false);

  const exportToPdf = async () => {
    setLoading(true);
    try {
      // PDF oluştur
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Varsayılan fontu kullan
      doc.setFont("Helvetica");
      
      // Başlık bilgisi
      doc.setFontSize(18);
      doc.text(`${konuBaslik} - Soru Bankasi`, 14, 20);
      doc.setLineWidth(0.5);
      doc.line(14, 25, 196, 25);
      
      let yPos = 35;
      
      // Tüm alt konular için dön
      Object.entries(altKonular).forEach(([altKonuId, altKonu]) => {
        // Alt konu başlığını ekle
        doc.setFontSize(14);
        doc.setFont("Helvetica", "bold");
        doc.text(`${altKonu.baslik}`, 14, yPos);
        yPos += 10;
        
        // Alt konuya ait soruları işle
        if (altKonu.sorular) {
          Object.entries(altKonu.sorular).sort((a, b) => {
            const numA = a[1].soruNumarasi || 0;
            const numB = b[1].soruNumarasi || 0;
            return numA - numB;
          }).forEach(([soruId, soru], index) => {
            if (yPos > 270) { // Sayfa sonuna yaklaşıldıysa yeni sayfa oluştur
              doc.addPage();
              yPos = 20;
            }
            
            // Soru numarası ve metni
            doc.setFontSize(12);
            doc.setFont("Helvetica", "bold");
            const soruNumarasi = soru.soruNumarasi || index + 1;
            doc.text(`Soru #${soruNumarasi}:`, 14, yPos);
            doc.setFont("Helvetica", "normal");
            
            // Soru metnini ekle
            const soruMetni = doc.splitTextToSize(soru.soruMetni || "", 180);
            doc.text(soruMetni, 14, yPos + 6);
            yPos += 10 + (soruMetni.length * 5);
            
            // Şıkları ekle
            if (Array.isArray(soru.cevaplar)) {
              soru.cevaplar.forEach((cevap, cevapIndex) => {
                if (yPos > 270) {
                  doc.addPage();
                  yPos = 20;
                }
                
                const sik = String.fromCharCode(65 + cevapIndex);
                const sikMetni = doc.splitTextToSize(`${sik}. ${cevap}`, 170);
                
                // Doğru cevapsa vurgula
                if (cevap === soru.dogruCevap) {
                  doc.setFont("Helvetica", "bold");
                  doc.text(`✓ ${sikMetni.join('\n')}`, 20, yPos);
                  doc.setFont("Helvetica", "normal");
                } else {
                  doc.text(sikMetni, 20, yPos);
                }
                
                yPos += sikMetni.length * 5 + 2;
              });
            }
            
            // Doğru cevap ve açıklama
            if (yPos > 250) {
              doc.addPage();
              yPos = 20;
            }
            
            // Doğru cevap
            doc.setFont("Helvetica", "bold");
            const dogruCevapSik = soru.cevaplar && Array.isArray(soru.cevaplar) ? 
              String.fromCharCode(65 + soru.cevaplar.indexOf(soru.dogruCevap)) : "";
            
            doc.text(`Dogru Cevap: ${soru.dogruCevap || ""} (${dogruCevapSik} sikki)`, 14, yPos);
            yPos += 6;
            
            // Açıklama
            if (soru.aciklama) {
              doc.setFont("Helvetica", "italic");
              const aciklama = doc.splitTextToSize(`Aciklama: ${soru.aciklama}`, 180);
              doc.text(aciklama, 14, yPos);
              yPos += aciklama.length * 5 + 5;
            }
            
            // Sorular arasına çizgi ekle
            doc.setLineWidth(0.2);
            doc.line(14, yPos, 196, yPos);
            yPos += 10;
          });
        }
        
        // Alt dallar varsa onları da işle
        if (altKonu.altdallar) {
          Object.entries(altKonu.altdallar).forEach(([altDalId, altDal]) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            
            // Alt dal başlığı
            doc.setFontSize(13);
            doc.setFont("Helvetica", "bold");
            doc.text(`${altDal.baslik}`, 20, yPos);
            yPos += 10;
            
            // Alt dala ait soruları işle
            if (altDal.sorular) {
              Object.entries(altDal.sorular).sort((a, b) => {
                const numA = a[1].soruNumarasi || 0;
                const numB = b[1].soruNumarasi || 0;
                return numA - numB;
              }).forEach(([soruId, soru], index) => {
                if (yPos > 270) {
                  doc.addPage();
                  yPos = 20;
                }
                
                // Soru numarası ve metni
                doc.setFontSize(12);
                doc.setFont("Helvetica", "bold");
                const soruNumarasi = soru.soruNumarasi || index + 1;
                doc.text(`Soru #${soruNumarasi}:`, 20, yPos);
                doc.setFont("Helvetica", "normal");
                
                // Soru metnini ekle
                const soruMetni = doc.splitTextToSize(soru.soruMetni || "", 170);
                doc.text(soruMetni, 20, yPos + 6);
                yPos += 10 + (soruMetni.length * 5);
                
                // Şıkları ekle
                if (Array.isArray(soru.cevaplar)) {
                  soru.cevaplar.forEach((cevap, cevapIndex) => {
                    if (yPos > 270) {
                      doc.addPage();
                      yPos = 20;
                    }
                    
                    const sik = String.fromCharCode(65 + cevapIndex);
                    const sikMetni = doc.splitTextToSize(`${sik}. ${cevap}`, 160);
                    
                    // Doğru cevapsa vurgula
                    if (cevap === soru.dogruCevap) {
                      doc.setFont("Helvetica", "bold");
                      doc.text(`✓ ${sikMetni.join('\n')}`, 26, yPos);
                      doc.setFont("Helvetica", "normal");
                    } else {
                      doc.text(sikMetni, 26, yPos);
                    }
                    
                    yPos += sikMetni.length * 5 + 2;
                  });
                }
                
                // Doğru cevap ve açıklama
                if (yPos > 250) {
                  doc.addPage();
                  yPos = 20;
                }
                
                // Doğru cevap
                doc.setFont("Helvetica", "bold");
                const dogruCevapSik = soru.cevaplar && Array.isArray(soru.cevaplar) ? 
                  String.fromCharCode(65 + soru.cevaplar.indexOf(soru.dogruCevap)) : "";
                
                doc.text(`Dogru Cevap: ${soru.dogruCevap || ""} (${dogruCevapSik} sikki)`, 20, yPos);
                yPos += 6;
                
                // Açıklama
                if (soru.aciklama) {
                  doc.setFont("Helvetica", "italic");
                  const aciklama = doc.splitTextToSize(`Aciklama: ${soru.aciklama}`, 170);
                  doc.text(aciklama, 20, yPos);
                  yPos += aciklama.length * 5 + 5;
                }
                
                // Sorular arasına çizgi ekle
                doc.setLineWidth(0.2);
                doc.line(20, yPos, 190, yPos);
                yPos += 10;
              });
            }
          });
        }
        
        // Alt konular arasında boşluk
        yPos += 5;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      // PDF dosyasını güvenli dosya adıyla indir
      const sanitizedTitle = turkishToEnglish(konuBaslik).replace(/[^\w\s]/gi, ''); // Özel karakterleri temizle
      doc.save(`${sanitizedTitle}_Soru_Bankasi.pdf`);
    } catch (error) {
      console.error("PDF oluşturma hatası:", error);
      alert("PDF oluşturulurken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Türkçe karakterleri İngilizce karakterlere çeviren yardımcı fonksiyon
  const turkishToEnglish = (text) => {
    return text
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U');
  };

  return (
    <button
      onClick={exportToPdf}
      disabled={loading}
      className={`px-4 py-2 ${loading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white rounded-md flex items-center`}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          PDF İndir
        </>
      )}
    </button>
  );
};

export default ExportToPdf; 