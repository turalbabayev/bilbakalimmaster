import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    ImageRun, 
    AlignmentType,
    PageBreak,
    Table,
    TableRow,
    TableCell,
    WidthType,
    Header
} from "docx";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";

const BulkDownloadMindCards = ({ isOpen, onClose, konuId }) => {
    const [kartlar, setKartlar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [indiriliyor, setIndiriliyor] = useState(false);
    const [jsonIndiriliyor, setJsonIndiriliyor] = useState(false);
    const [seciliKartlar, setSeciliKartlar] = useState(new Set());
    const [tumunuSec, setTumunuSec] = useState(false);

    useEffect(() => {
        const kartlariGetir = async () => {
            try {
                setYukleniyor(true);
                const kartlarRef = collection(db, `miniCards-konular/${konuId}/cards`);
                const snapshot = await getDocs(kartlarRef);
                const kartlarData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Kartları sırala: Önce kartNo'su olanlar, sonra olmayanlar
                const siraliKartlar = kartlarData.sort((a, b) => {
                    // Eğer her ikisinin de kartNo'su varsa
                    if (a.kartNo && b.kartNo) {
                        return a.kartNo - b.kartNo;
                    }
                    // Eğer sadece a'nın kartNo'su varsa
                    if (a.kartNo) return -1;
                    // Eğer sadece b'nin kartNo'su varsa
                    if (b.kartNo) return 1;
                    // Her ikisinin de kartNo'su yoksa createdAt'e göre sırala
                    if (a.createdAt && b.createdAt) {
                        return a.createdAt.seconds - b.createdAt.seconds;
                    }
                    return 0;
                });

                setKartlar(siraliKartlar);
                // Modal açıldığında seçimi sıfırla
                setSeciliKartlar(new Set());
                setTumunuSec(false);
            } catch (error) {
                console.error("Kartlar getirilirken hata:", error);
                toast.error("Kartlar yüklenirken bir hata oluştu!");
            } finally {
                setYukleniyor(false);
            }
        };

        if (isOpen) {
            kartlariGetir();
        }
    }, [konuId, isOpen]);

    const stripHtml = (html) => {
        if (!html) return "";
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const kartlariJsonOlarakIndir = async () => {
        try {
            setJsonIndiriliyor(true);

            const seciliKartlarData = seciliKartlariGetir();
            
            if (seciliKartlarData.length === 0) {
                toast.error("Lütfen en az bir kart seçin!");
                return;
            }

            // JSON formatını yükleme formatına uygun olarak hazırla
            const jsonData = seciliKartlarData.map(kart => ({
                altKonu: kart.altKonu || "",
                content: kart.content || ""
            }));

            // JSON dosyasını indir
            const jsonString = JSON.stringify(jsonData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            saveAs(blob, `akil_kartlari_${seciliKartlarData.length}_adet.json`);
            
            toast.success(`${seciliKartlarData.length} kart JSON formatında başarıyla indirildi!`);
        } catch (error) {
            console.error("JSON indirme hatası:", error);
            toast.error("JSON indirme sırasında bir hata oluştu!");
        } finally {
            setJsonIndiriliyor(false);
        }
    };

    // QR kod oluşturma fonksiyonu
    const generateQRCode = async (text, size = 200) => {
        try {
            // QR kod API'si kullanarak QR kod oluştur
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
            
            const response = await fetch(qrUrl);
            if (!response.ok) {
                throw new Error('QR kod oluşturulamadı');
            }
            
            const blob = await response.blob();
            return await blob.arrayBuffer();
        } catch (error) {
            console.error('QR kod hatası:', error);
            return null;
        }
    };

    const kartlariIndir = async () => {
        try {
            setIndiriliyor(true);

            const seciliKartlarData = seciliKartlariGetir();
            
            if (seciliKartlarData.length === 0) {
                toast.error("Lütfen en az bir kart seçin!");
                return;
            }

            const allChildren = [];
            
            // App Store linkları
            const iosLink = "https://apps.apple.com/tr/app/bil-bakalim/id6745025536?l=tr"; // iOS App Store linkinizi buraya yazın
            const androidLink = "https://play.google.com/store/apps/details?id=com.damlaerdogan.bilbakalim"; // Android Play Store linkinizi buraya yazın
            
            // QR kodları oluştur
            const iosQRData = await generateQRCode(iosLink, 100);
            const androidQRData = await generateQRCode(androidLink, 100);
            
            // Header için QR kodları tablosu oluştur
            let headerChildren = [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "BİLBAKALIM UYGULAMASI - QR Kodları ile İndir",
                            bold: true,
                            size: 18
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 150 }
                })
            ];

            if (iosQRData && androidQRData) {
                // iOS QR Kodu (Sol taraf)
                headerChildren.push(
                        new Paragraph({
                        children: [
                            new ImageRun({
                                data: iosQRData,
                                transformation: {
                                    width: 90,
                                    height: 90
                                }
                            }),
                            new TextRun({
                                text: "      ", // Boşluk
                                size: 12
                            }),
                            new ImageRun({
                                data: androidQRData,
                                transformation: {
                                    width: 90,
                                    height: 90
                                }
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 100 }
                    })
                );
                
                // Alt etiketler
                headerChildren.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                text: "📱 iOS App Store",
                                bold: true,
                                size: 14
                            }),
                            new TextRun({
                                text: "           ", // Boşluk
                                size: 12
                            }),
                            new TextRun({
                                text: "🤖 Android Play Store",
                                bold: true,
                                size: 14
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 80 }
                    })
                );
                
                // Header alt açıklama
                headerChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Telefonunuzla QR kodları okutarak uygulamayı indirebilirsiniz",
                                size: 12,
                                italics: true
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 50, after: 150 }
                    })
                );
            } else {
                // QR kod oluşturulamazsa alternatif metin
                headerChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "App Store ve Play Store'dan 'BilBakalım' arayarak uygulamayı indirebilirsiniz",
                                size: 14,
                                italics: true
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 150 }
                    })
                );
            }
            
            // Modern başlık - sadece temel özellikler
            allChildren.push(
                // Üstten boşluk ekle
                new Paragraph({
                    children: [
                        new TextRun({
                            text: " ",
                            size: 12
                        })
                    ],
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "AKIL KARTLARI KOLEKSIYONU",
                            bold: true,
                            size: 32
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                            text: `Toplam ${seciliKartlarData.length} Kart`,
                            bold: true,
                            size: 24
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Tarih: ${new Date().toLocaleDateString('tr-TR')}`,
                            size: 20
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                })
            );

            // Her kart için modern tasarım - sadece desteklenen özellikler
            for (let index = 0; index < seciliKartlarData.length; index++) {
                const kart = seciliKartlarData[index];
                
                // Kart başlığı - büyük ve bold
                allChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `========== KART ${kart.kartNo || (index + 1)} ==========`,
                                bold: true,
                                size: 24
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 300, after: 200 }
                    })
                );

                // Alt konu - orta boyut
                allChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "BAŞLIK: ",
                                bold: true,
                                size: 22
                            }),
                            new TextRun({
                                text: kart.altKonu || "Belirtilmemiş",
                                size: 22
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 150 }
                    })
                );

                // İçerik başlığı
                allChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "ICERIK:",
                                bold: true,
                                size: 22
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 100, after: 100 }
                    })
                );

                // İçerik metni - büyük font
                const temizMetin = stripHtml(kart.content) || "İçerik bulunamadı";
                allChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: temizMetin,
                                size: 22
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 100, after: 200 }
                    })
                );

                // Resimler için basit işleme
                if (kart.content) {
                    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
                    let match;
                    const imgUrls = [];
                    
                    while ((match = imgRegex.exec(kart.content)) !== null) {
                        imgUrls.push(match[1]);
                    }

                    // Her resim için
                    for (const imgUrl of imgUrls) {
                        try {
                            let finalUrl = imgUrl.replace(/&amp;/g, '&');
                            
                            const response = await fetch(finalUrl, {
                                method: 'GET',
                                mode: 'cors',
                                headers: { 'Accept': 'image/*' }
                            });
                            
                            if (!response.ok) {
                                throw new Error(`HTTP ${response.status}`);
                            }
                            
                            const blob = await response.blob();
                            if (!blob || blob.size === 0) {
                                throw new Error('Boş resim');
                            }
                            
                            const arrayBuffer = await blob.arrayBuffer();
                            
                            // Basit resim ekleme
                            allChildren.push(
                                new Paragraph({
                                    children: [
                                        new ImageRun({
                                            data: arrayBuffer,
                                            transformation: {
                                                width: 400,
                                                height: 300
                                            }
                                        })
                                    ],
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 100, after: 100 }
                                })
                            );
                            
                        } catch (error) {
                            // Basit hata mesajı
                            allChildren.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "[Resim yüklenemedi]",
                                            italics: true,
                                            size: 14
                                        })
                                    ],
                                    spacing: { before: 50, after: 50 }
                                })
                            );
                        }
                    }
                }

                

                // Ayırıcı (son kart hariç)
                if (index < seciliKartlarData.length - 1) {
                    allChildren.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "_______________________________________________",
                                    size: 12
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 200, after: 200 }
                        })
                    );
                }
            }

            // Footer - basit
            allChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "BILBAKALIM - AKIL KARTLARI",
                            bold: true,
                            size: 20
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400, after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${seciliKartlarData.length} kart basariyla islendi`,
                            size: 16
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                })
            );

            const doc = new Document({
                sections: [{
                    headers: {
                        default: new Header({
                            children: headerChildren
                        })
                    },
                    children: allChildren,
                }],
            });

            const buffer = await Packer.toBlob(doc);
            saveAs(buffer, `akil_kartlari_${seciliKartlarData.length}_adet_modern.docx`);
            toast.success(`${seciliKartlarData.length} kart modern tasarımla başarıyla indirildi!`);
        } catch (error) {
            console.error("Kartlar indirilirken hata:", error);
            toast.error("Kartlar indirilirken bir hata oluştu!");
        } finally {
            setIndiriliyor(false);
        }
    };

    // Hızlı seçim fonksiyonu
    const hizliSec = (sayi) => {
        const yeniSeciliKartlar = new Set();
        for (let i = 0; i < Math.min(sayi, kartlar.length); i++) {
            yeniSeciliKartlar.add(kartlar[i].id);
        }
        setSeciliKartlar(yeniSeciliKartlar);
        setTumunuSec(yeniSeciliKartlar.size === kartlar.length);
    };

    // Tek kart seç/seçme
    const kartSecimDegistir = (kartId) => {
        const yeniSeciliKartlar = new Set(seciliKartlar);
        if (yeniSeciliKartlar.has(kartId)) {
            yeniSeciliKartlar.delete(kartId);
        } else {
            yeniSeciliKartlar.add(kartId);
        }
        setSeciliKartlar(yeniSeciliKartlar);
        setTumunuSec(yeniSeciliKartlar.size === kartlar.length);
    };

    // Tümünü seç/seçme
    const tumunuSecDegistir = () => {
        if (tumunuSec) {
            setSeciliKartlar(new Set());
            setTumunuSec(false);
        } else {
            const tumKartIds = new Set(kartlar.map(kart => kart.id));
            setSeciliKartlar(tumKartIds);
            setTumunuSec(true);
        }
    };

    // Seçili kartları filtrele
    const seciliKartlariGetir = () => {
        return kartlar.filter(kart => seciliKartlar.has(kart.id));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                        Akıl Kartlarını İndir
                    </h2>
                </div>

                <div className="p-8 overflow-y-auto flex-1">
                    {yukleniyor ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (
                        <>
                            {kartlar.length > 0 ? (
                                <div className="space-y-6">
                                    {/* Seçim Kontrolleri */}
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <div className="flex flex-col space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                                                    Kart Seçimi ({seciliKartlar.size}/{kartlar.length})
                                                </h3>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={tumunuSec}
                                                        onChange={tumunuSecDegistir}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                                        Tümünü Seç
                                                    </span>
                                                </label>
                                            </div>
                                            
                                            {/* Hızlı Seçim Butonları */}
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Hızlı Seçim:</span>
                                                {[5, 10, 15, 20, 50, 100].map(sayi => (
                                                    <button
                                                        key={sayi}
                                                        onClick={() => hizliSec(sayi)}
                                                        disabled={kartlar.length < sayi}
                                                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                                            kartlar.length >= sayi
                                                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {sayi}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-gray-600 dark:text-gray-400 text-center">
                                        Toplam {kartlar.length} kart bulundu. İndirmek istediğiniz kartları seçin.
                                    </p>
                                    
                                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                        {kartlar.map((kart) => (
                                            <div 
                                                key={kart.id} 
                                                className={`relative bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                                                    seciliKartlar.has(kart.id)
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-transparent hover:border-gray-300'
                                                }`}
                                                onClick={() => kartSecimDegistir(kart.id)}
                                            >
                                                {/* Seçim Checkbox */}
                                                <div className="absolute top-2 right-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={seciliKartlar.has(kart.id)}
                                                        onChange={() => kartSecimDegistir(kart.id)}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                </div>
                                                
                                                <div className="flex justify-between items-start mb-2 pr-6">
                                                    <span className="inline-flex items-center justify-center bg-blue-600 text-white font-semibold rounded-full w-6 h-6 text-sm">
                                                        {kart.kartNo || '-'}
                                                    </span>
                                                </div>
                                                <div className="mb-2">
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                        Alt Konu: {kart.altKonu}
                                                    </p>
                                                    <div 
                                                        className="text-sm line-clamp-3"
                                                        dangerouslySetInnerHTML={{ __html: kart.content }} 
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    Henüz kart bulunmamaktadır.
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end space-x-4">
                    {kartlar.length > 0 && !yukleniyor && (
                        <>
                            <button
                                onClick={kartlariJsonOlarakIndir}
                                disabled={jsonIndiriliyor || seciliKartlar.size === 0}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {jsonIndiriliyor ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                        İndiriliyor...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                        JSON Olarak İndir {seciliKartlar.size > 0 && `(${seciliKartlar.size})`}
                                    </>
                                )}
                            </button>
                        <button
                            onClick={kartlariIndir}
                                disabled={indiriliyor || seciliKartlar.size === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {indiriliyor ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                    İndiriliyor...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                        DOCX Olarak İndir {seciliKartlar.size > 0 && `(${seciliKartlar.size})`}
                                </>
                            )}
                        </button>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkDownloadMindCards; 