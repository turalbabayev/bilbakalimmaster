import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from "docx";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";

const BulkDownloadMindCards = ({ isOpen, onClose, konuId }) => {
    const [kartlar, setKartlar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [indiriliyor, setIndiriliyor] = useState(false);
    const [jsonIndiriliyor, setJsonIndiriliyor] = useState(false);

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

            // JSON formatını yükleme formatına uygun olarak hazırla
            const jsonData = kartlar.map(kart => ({
                altKonu: kart.altKonu || "",
                content: kart.content || ""
            }));

            // JSON dosyasını indir
            const jsonString = JSON.stringify(jsonData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            saveAs(blob, "akil_kartlari.json");
            
            toast.success("Kartlar JSON formatında başarıyla indirildi!");
        } catch (error) {
            console.error("JSON indirme hatası:", error);
            toast.error("JSON indirme sırasında bir hata oluştu!");
        } finally {
            setJsonIndiriliyor(false);
        }
    };

    const kartlariIndir = async () => {
        try {
            setIndiriliyor(true);

            // Önce tüm kartları işle
            const allChildren = [];
            
            // Başlık ekle
            allChildren.push(
                new Paragraph({
                    text: "Akıl Kartları",
                    heading: HeadingLevel.HEADING_1,
                    spacing: {
                        after: 200,
                    },
                })
            );

            // Her kart için işle
            for (const kart of kartlar) {
                const children = [
                    new Paragraph({
                        text: `Kart ${kart.kartNo || (kartlar.indexOf(kart) + 1)}`,
                        heading: HeadingLevel.HEADING_2,
                        spacing: {
                            before: 200,
                            after: 100,
                        },
                    }),
                    new Paragraph({
                        text: "Alt Konu:",
                        heading: HeadingLevel.HEADING_3,
                        spacing: {
                            after: 80,
                        },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: kart.altKonu || "",
                            }),
                        ],
                        spacing: { after: 80 },
                    }),
                    new Paragraph({
                        text: "İçerik:",
                        heading: HeadingLevel.HEADING_3,
                        spacing: {
                            after: 80,
                        },
                    })
                ];

                // Content'ten resim URL'lerini çıkar ve docx'e ekle
                if (kart.content) {
                    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
                    let match;
                    const imgUrls = [];
                    
                    while ((match = imgRegex.exec(kart.content)) !== null) {
                        imgUrls.push(match[1]);
                    }

                    // Her resim için docx'e ekle
                    for (const imgUrl of imgUrls) {
                        try {
                            // Resmi canvas üzerinden base64'e çevir
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            
                            await new Promise((resolve, reject) => {
                                img.onload = () => {
                                    try {
                                        const canvas = document.createElement('canvas');
                                        canvas.width = img.width;
                                        canvas.height = img.height;
                                        const ctx = canvas.getContext('2d');
                                        ctx.drawImage(img, 0, 0);
                                        
                                        // Canvas'tan base64'e çevir
                                        const base64Data = canvas.toDataURL('image/png');
                                        
                                        // Base64'ten blob'a çevir
                                        fetch(base64Data)
                                            .then(response => response.blob())
                                            .then(blob => blob.arrayBuffer())
                                            .then(arrayBuffer => {
                                                children.push(
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
                                                        spacing: { before: 100, after: 100 }
                                                    })
                                                );
                                                resolve();
                                            })
                                            .catch(reject);
                                    } catch (error) {
                                        reject(error);
                                    }
                                };
                                
                                img.onerror = () => {
                                    console.warn("Resim yüklenemedi:", imgUrl);
                                    // Resim yüklenemezse URL'yi metin olarak ekle
                                    children.push(
                                        new Paragraph({
                                            children: [
                                                new TextRun({
                                                    text: "Resim yüklenemedi: ",
                                                    bold: true,
                                                    color: "ff0000"
                                                }),
                                                new TextRun({
                                                    text: imgUrl,
                                                    color: "666666"
                                                })
                                            ],
                                            spacing: { before: 100, after: 100 }
                                        })
                                    );
                                    resolve();
                                };
                                
                                img.src = imgUrl;
                            });
                        } catch (error) {
                            console.error("Resim eklenirken hata:", error);
                            // Hata durumunda URL'yi metin olarak ekle
                            children.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "Resim hatası: ",
                                            bold: true,
                                            color: "ff0000"
                                        }),
                                        new TextRun({
                                            text: imgUrl,
                                            color: "666666"
                                        })
                                    ],
                                    spacing: { before: 100, after: 100 }
                                })
                            );
                        }
                    }
                }

                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: stripHtml(kart.content),
                            }),
                        ],
                        spacing: { after: 200 },
                    })
                );

                allChildren.push(...children);
            }

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: allChildren,
                }],
            });

            const buffer = await Packer.toBlob(doc);
            saveAs(buffer, "akil_kartlari.docx");
            toast.success("Kartlar başarıyla indirildi!");
        } catch (error) {
            console.error("Kartlar indirilirken hata:", error);
            toast.error("Kartlar indirilirken bir hata oluştu!");
        } finally {
            setIndiriliyor(false);
        }
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
                                <div className="space-y-4">
                                    <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                                        Toplam {kartlar.length} kart bulundu. DOCX veya JSON formatında indirebilirsiniz.
                                    </p>
                                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                        {kartlar.map((kart) => (
                                            <div key={kart.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="inline-flex items-center justify-center bg-blue-600 text-white font-semibold rounded-full w-6 h-6 text-sm">
                                                        {kart.kartNo || '-'}
                                                    </span>
                                                </div>
                                                <div className="mb-2">
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                        Alt Konu: {kart.altKonu}
                                                    </p>
                                                    <div dangerouslySetInnerHTML={{ __html: kart.content }} />
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
                                disabled={jsonIndiriliyor}
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
                                        JSON Olarak İndir
                                    </>
                                )}
                            </button>
                            <button
                                onClick={kartlariIndir}
                                disabled={indiriliyor}
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
                                        DOCX Olarak İndir
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