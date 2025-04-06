import React from "react";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';

const ExportSubbranchToPdf = ({ konuBaslik, altKonuBaslik, altDallar }) => {
  const exportToPdf = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica");
    
    // Başlık bilgisi
    doc.setFontSize(18);
    doc.text(`${konuBaslik} - ${altKonuBaslik}`, 14, 20);
    doc.setLineWidth(0.5);
    doc.line(14, 25, 196, 25);
    
    let yPos = 35;
    
    // Tüm alt dallar için dön
    Object.entries(altDallar).forEach(([altDalId, altDal]) => {
      // Alt dal başlığını ekle
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`${altDal.baslik}`, 14, yPos);
      yPos += 10;
      
      // Alt dala ait soruları işle
      if (altDal.sorular) {
        Object.entries(altDal.sorular).sort((a, b) => {
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
          doc.setFont("helvetica", "bold");
          const soruNumarasi = soru.soruNumarasi || index + 1;
          doc.text(`Soru #${soruNumarasi}:`, 14, yPos);
          doc.setFont("helvetica", "normal");
          
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
                doc.setFont("helvetica", "bold");
                doc.text(`✓ ${sikMetni.join('\n')}`, 20, yPos);
                doc.setFont("helvetica", "normal");
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
          doc.setFont("helvetica", "bold");
          const dogruCevapSik = soru.cevaplar && Array.isArray(soru.cevaplar) ? 
            String.fromCharCode(65 + soru.cevaplar.indexOf(soru.dogruCevap)) : "";
          
          doc.text(`Doğru Cevap: ${soru.dogruCevap || ""} (${dogruCevapSik} şıkkı)`, 14, yPos);
          yPos += 6;
          
          // Açıklama
          if (soru.aciklama) {
            doc.setFont("helvetica", "italic");
            const aciklama = doc.splitTextToSize(`Açıklama: ${soru.aciklama}`, 180);
            doc.text(aciklama, 14, yPos);
            yPos += aciklama.length * 5 + 5;
          }
          
          // Sorular arasına çizgi ekle
          doc.setLineWidth(0.2);
          doc.line(14, yPos, 196, yPos);
          yPos += 10;
        });
      }
      
      // Alt dallar arasında boşluk
      yPos += 5;
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });
    
    // PDF'i indir
    doc.save(`${konuBaslik}_${altKonuBaslik}_Soru_Bankasi.pdf`);
  };

  return (
    <button
      onClick={exportToPdf}
      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      PDF İndir
    </button>
  );
};

export default ExportSubbranchToPdf; 