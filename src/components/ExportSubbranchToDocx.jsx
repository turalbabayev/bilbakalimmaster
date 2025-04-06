import React, { useState } from "react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

const ExportSubbranchToDocx = ({ konuBaslik, altKonuBaslik, altDallar }) => {
  const [loading, setLoading] = useState(false);

  const exportToDocx = async () => {
    setLoading(true);
    try {
      // Soruları DOCX formatında hazırla
      const doc = new Document({
        styles: {
          paragraphStyles: [
            {
              id: "Normal",
              name: "Normal",
              run: {
                font: "Calibri",
                size: 24, // 12pt
              },
            },
          ],
        },
      });

      const sections = [];
      
      // Başlık paragrafı
      sections.push(
        new Paragraph({
          text: `${konuBaslik} - ${altKonuBaslik}`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        })
      );
      
      // Boşluk
      sections.push(new Paragraph(""));
      
      // Tüm alt dallar için dön
      Object.entries(altDallar).forEach(([altDalId, altDal]) => {
        // Alt dal başlığı
        sections.push(
          new Paragraph({
            text: altDal.baslik,
            heading: HeadingLevel.HEADING_2,
            spacing: {
              before: 400,
              after: 200,
            },
          })
        );
        
        // Alt dala ait soruları ekle
        if (altDal.sorular) {
          Object.entries(altDal.sorular)
            .sort((a, b) => {
              const numA = a[1].soruNumarasi || 0;
              const numB = b[1].soruNumarasi || 0;
              return numA - numB;
            })
            .forEach(([soruId, soru]) => {
              // Soru numarası ve metni
              const soruNumarasi = soru.soruNumarasi || 0;
              sections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Soru #${soruNumarasi}: `,
                      bold: true,
                    }),
                    new TextRun({
                      text: soru.soruMetni || "",
                    }),
                  ],
                  spacing: {
                    before: 300,
                    after: 120,
                  },
                })
              );
              
              // Şıkları ekle
              if (Array.isArray(soru.cevaplar)) {
                soru.cevaplar.forEach((cevap, cevapIndex) => {
                  const isDogruCevap = cevap === soru.dogruCevap;
                  const sik = String.fromCharCode(65 + cevapIndex);
                  
                  sections.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `${sik}. `,
                          bold: true,
                        }),
                        new TextRun({
                          text: cevap,
                          bold: isDogruCevap,
                          color: isDogruCevap ? "008800" : "000000",
                        }),
                        isDogruCevap ? new TextRun({
                          text: " ✓",
                          bold: true,
                          color: "008800",
                        }) : new TextRun(""),
                      ],
                      indent: {
                        left: 360, // 0.25 inç
                      },
                      spacing: {
                        after: 80,
                      },
                    })
                  );
                });
              }
              
              // Doğru cevap
              const dogruCevapSik = soru.cevaplar && Array.isArray(soru.cevaplar) ? 
                String.fromCharCode(65 + soru.cevaplar.indexOf(soru.dogruCevap)) : "";
                
              sections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Doğru Cevap: `,
                      bold: true,
                    }),
                    new TextRun({
                      text: `${soru.dogruCevap || ""} (${dogruCevapSik} şıkkı)`,
                    }),
                  ],
                  spacing: {
                    before: 160,
                    after: 80,
                  },
                })
              );
              
              // Açıklama
              if (soru.aciklama) {
                sections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `Açıklama: `,
                        bold: true,
                        italics: true,
                      }),
                      new TextRun({
                        text: soru.aciklama,
                        italics: true,
                      }),
                    ],
                    spacing: {
                      after: 240,
                    },
                  })
                );
              }
              
              // Ayırıcı çizgi
              sections.push(
                new Paragraph({
                  border: {
                    bottom: {
                      color: "999999",
                      space: 1,
                      style: BorderStyle.SINGLE,
                      size: 6,
                    },
                  },
                  spacing: {
                    after: 240,
                  },
                })
              );
            });
        }
      });
      
      // Sektierleri dokümana ekle
      doc.addSection({
        children: sections,
      });
      
      // DOCX dosyasını oluştur ve indir
      const buffer = await Packer.toBuffer(doc);
      saveAs(new Blob([buffer]), `${konuBaslik}_${altKonuBaslik}_Soru_Bankasi.docx`);
      
    } catch (error) {
      console.error("DOCX oluşturma hatası:", error);
      alert("DOCX oluşturulurken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button
      onClick={exportToDocx}
      disabled={loading}
      className={`px-4 py-2 ml-2 ${loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md flex items-center`}
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
          DOCX İndir
        </>
      )}
    </button>
  );
};

export default ExportSubbranchToDocx; 