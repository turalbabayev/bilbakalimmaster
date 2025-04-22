import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { toast } from 'react-hot-toast';

const BulkMindCardVerification = forwardRef(({ cards, onCardUpdate, onUpdateSuccess, onUpdateClick, onDeleteClick, konuId }, ref) => {
    const [sonuclar, setSonuclar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [geminiApiKey, setGeminiApiKey] = useState(null);
    const [seciliKartlar, setSeciliKartlar] = useState([]);
    const [dogrulamaSecenegi, setDogrulamaSecenegi] = useState('secili');

    useEffect(() => {
        // Component yüklendiğinde API anahtarını al
        const geminiKey = process.env.REACT_APP_GEMINI_API_KEY;
        
        if (!geminiKey) {
            console.error('Gemini API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.');
            toast.error('Gemini API anahtarı bulunamadı. Lütfen sistem yöneticisi ile iletişime geçin.');
        } else {
            console.log('Gemini API anahtarı yüklendi');
        }
        
        setGeminiApiKey(geminiKey);
    }, []);
    
    useEffect(() => {
        // Kartlar değiştiğinde seçili kartları ve sonuçları koru
        const siraliKartlar = [...cards].sort((a, b) => {
            if (a.kartNo && b.kartNo) {
                return a.kartNo - b.kartNo;
            }
            return 0;
        });
        
        // Mevcut sonuçları koru ve sadece yeni kartları ekle
        setSonuclar(prevSonuclar => {
            // Mevcut sonuçları ID'ye göre map'le
            const mevcutSonucMap = new Map(prevSonuclar.map(sonuc => [sonuc.kart.id, sonuc]));
            
            return siraliKartlar.map(kart => {
                // Eğer bu kart için mevcut bir sonuç varsa, onu kullan
                const mevcutSonuc = mevcutSonucMap.get(kart.id);
                if (mevcutSonuc) {
                    return {
                        ...mevcutSonuc,
                        kart: {
                            ...kart
                        }
                    };
                }
                // Yoksa yeni bir sonuç oluştur
                return {
                    kart,
                    analiz: '',
                    iyilestirmeOnerisi: '',
                    model: null
                };
            });
        });
    }, [cards]);

    const handleKartSecim = (kartId) => {
        setSeciliKartlar(prev => {
            if (prev.includes(kartId)) {
                return prev.filter(id => id !== kartId);
            } else {
                return [...prev, kartId];
            }
        });
    };

    const handleDogrulamaSecenegi = (secenek) => {
        setDogrulamaSecenegi(secenek);
        
        // Kartları sırala
        const siraliKartlar = [...cards].sort((a, b) => {
            if (a.kartNo && b.kartNo) {
                return a.kartNo - b.kartNo;
            }
            return 0;
        });
        
        if (secenek === 'ilk10') {
            // İlk 10 kartı seç
            const ilk10 = siraliKartlar.slice(0, 10).map(kart => kart.id);
            setSeciliKartlar(ilk10);
        } else if (secenek === 'ilk20') {
            // İlk 20 kartı seç
            const ilk20 = siraliKartlar.slice(0, 20).map(kart => kart.id);
            setSeciliKartlar(ilk20);
        } else if (secenek === 'hepsi') {
            // Tüm kartları seç
            const tumKartlar = siraliKartlar.map(kart => kart.id);
            setSeciliKartlar(tumKartlar);
        } else if (secenek === 'secili') {
            // Seçili kartları temizle
            setSeciliKartlar([]);
        }
    };

    const kartlariDogrula = async () => {
        if (!geminiApiKey) {
            toast.error('Gemini API anahtarı bulunamadı!');
            return;
        }

        if (seciliKartlar.length === 0) {
            toast.error('Lütfen doğrulanacak kartları seçin!');
            return;
        }

        setYukleniyor(true);

        const dogrulanacakKartlar = cards.filter(kart => seciliKartlar.includes(kart.id));
        const yeniSonuclar = [...sonuclar];

        for (const kart of dogrulanacakKartlar) {
            try {
                const prompt = `
                Sen bir eğitim uzmanısın. Sana vereceğim akıl kartını analiz etmeni istiyorum. Bu kart öğrencilerin çalışırken kullanacağı bir özet bilgi kartı.

                Kart İçeriği:
                ${kart.content}
                
                Lütfen cevabını TAM OLARAK aşağıdaki formatta ver. Format dışına ASLA çıkma:

                İçerik Analizi: [İçeriğin kalitesi, anlaşılırlığı ve doğruluğu hakkında kısa analiz]
                İyileştirme Önerileri: [Varsa eksik noktalar ve iyileştirme önerileri]
                Tekrarlanan Bilgi: [Var/Yok]
                Genel Değerlendirme: [Çok İyi/İyi/Orta/Geliştirilmeli]

                ÖNEMLİ NOTLAR:
                1. Değerlendirmeni öğrenci seviyesine uygunluk açısından yap.
                2. İçeriğin kısa ve öz olmasına dikkat et.
                3. Bu formatın dışına ASLA çıkma ve başka bir şey ekleme.
                `;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': geminiApiKey
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: prompt
                            }]
                        }]
                    })
                });

                if (!response.ok) {
                    throw new Error(`API yanıt hatası: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                    throw new Error('API yanıtında beklenen veri bulunamadı');
                }

                const analiz = data.candidates[0].content.parts[0].text;
                
                // Genel değerlendirmeyi çıkar
                const genelDegerlendirmeMatch = analiz.match(/Genel Değerlendirme: (Çok İyi|İyi|Orta|Geliştirilmeli)/i);
                const genelDegerlendirme = genelDegerlendirmeMatch ? genelDegerlendirmeMatch[1] : null;

                // Sonuçları güncelle
                const kartIndex = yeniSonuclar.findIndex(s => s.kart.id === kart.id);
                if (kartIndex !== -1) {
                    yeniSonuclar[kartIndex] = {
                        ...yeniSonuclar[kartIndex],
                        analiz,
                        genelDegerlendirme,
                        model: 'gemini'
                    };
                } else {
                    yeniSonuclar.push({
                        kart,
                        analiz,
                        genelDegerlendirme,
                        model: 'gemini'
                    });
                }

                // Her başarılı analiz sonrası state'i güncelle
                setSonuclar([...yeniSonuclar]);
                
                // Kısa bir bekleme ekle
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error('Kart doğrulanırken hata:', error);
                toast.error(`${kart.kartNo || 'Bilinmeyen'} numaralı kart doğrulanırken hata oluştu: ${error.message}`);
            }
        }

        setYukleniyor(false);
        toast.success('Seçili kartlar başarıyla doğrulandı!');
    };

    const sonuclariIndir = async () => {
        try {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            text: "Akıl Kartları Doğrulama Raporu",
                            heading: HeadingLevel.HEADING_1,
                            spacing: {
                                after: 200,
                            },
                        }),
                        ...sonuclar.map((sonuc) => [
                            new Paragraph({
                                text: `Kart ${sonuc.kart.kartNo || 'No'}`,
                                heading: HeadingLevel.HEADING_2,
                                spacing: {
                                    before: 200,
                                    after: 80,
                                },
                            }),
                            new Paragraph({
                                text: "İçerik:",
                                heading: HeadingLevel.HEADING_3,
                                spacing: {
                                    after: 80,
                                },
                            }),
                            new Paragraph({
                                text: sonuc.kart.content.replace(/<[^>]*>/g, ''),
                                spacing: { after: 80 },
                            }),
                            new Paragraph({
                                text: "Analiz:",
                                heading: HeadingLevel.HEADING_3,
                                spacing: {
                                    after: 80,
                                },
                            }),
                            ...sonuc.analiz.split('\n')
                                .filter(line => line.trim() !== '')
                                .map(line => {
                                    let props = {};
                                    
                                    if (line.toLowerCase().includes('genel değerlendirme:')) {
                                        props.children = [
                                            new TextRun({
                                                text: line,
                                                bold: true,
                                                color: line.toLowerCase().includes('çok iyi') || line.toLowerCase().includes('iyi') ? 
                                                    "008000" : line.toLowerCase().includes('orta') ? 
                                                    "FFA500" : "FF0000"
                                            }),
                                        ];
                                    }
                                    
                                    return new Paragraph({
                                        text: line,
                                        ...props,
                                    });
                                }),
                        ]).flat(),
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, "akil-kartlari-dogrulama-raporu.docx");
            toast.success('Rapor başarıyla indirildi!');
        } catch (error) {
            console.error('Rapor oluşturulurken hata:', error);
            toast.error('Rapor oluşturulurken bir hata oluştu!');
        }
    };

    useImperativeHandle(ref, () => ({
        updateSonucWithGuncelKart: (guncelKart) => {
            setSonuclar(prevSonuclar => {
                return prevSonuclar.map(sonuc => {
                    if (sonuc.kart.id === guncelKart.id) {
                        return {
                            ...sonuc,
                            kart: guncelKart
                        };
                    }
                    return sonuc;
                });
            });
        },
        getSonuclar: () => sonuclar,
        updateKartlarAndSonuclar: (yeniKartlar, yeniSonuclar) => {
            // Seçili kartları güncelle
            setSeciliKartlar(prevSeciliKartlar => {
                // Sadece hala var olan kartları tut
                return prevSeciliKartlar.filter(id => 
                    yeniKartlar.some(kart => kart.id === id)
                );
            });
            
            // Sonuçları güncelle
            setSonuclar(yeniSonuclar);
        }
    }));

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Doğrulama Seçenekleri</h2>
                
                <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Doğrulanacak Kartlar:</span>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => handleDogrulamaSecenegi('secili')}
                                className={`px-3 py-1 rounded-full text-sm font-medium ${dogrulamaSecenegi === 'secili' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                Seçili Kartlar
                            </button>
                            <button 
                                onClick={() => handleDogrulamaSecenegi('ilk10')}
                                className={`px-3 py-1 rounded-full text-sm font-medium ${dogrulamaSecenegi === 'ilk10' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                İlk 10 Kart
                            </button>
                            <button 
                                onClick={() => handleDogrulamaSecenegi('ilk20')}
                                className={`px-3 py-1 rounded-full text-sm font-medium ${dogrulamaSecenegi === 'ilk20' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                İlk 20 Kart
                            </button>
                            <button 
                                onClick={() => handleDogrulamaSecenegi('hepsi')}
                                className={`px-3 py-1 rounded-full text-sm font-medium ${dogrulamaSecenegi === 'hepsi' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                Tüm Kartlar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {dogrulamaSecenegi === 'secili' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Kartlar</h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {cards
                            .sort((a, b) => (a.kartNo || 0) - (b.kartNo || 0))
                            .map((kart, index) => (
                            <div key={kart.id} className="flex items-start space-x-3">
                                <input 
                                    type="checkbox" 
                                    id={`kart-${kart.id}`}
                                    checked={seciliKartlar.includes(kart.id)}
                                    onChange={() => handleKartSecim(kart.id)}
                                    className="mt-1"
                                />
                                <label htmlFor={`kart-${kart.id}`} className="flex-1 cursor-pointer">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                        <p className="font-medium text-gray-800 dark:text-gray-200">
                                            {kart.kartNo || index + 1}. {kart.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            Alt Konu: {kart.altKonu}
                                        </p>
                                    </div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {seciliKartlar.length} kart seçildi
                </span>
                <div className="flex space-x-4">
                    <button
                        onClick={kartlariDogrula}
                        disabled={yukleniyor || !geminiApiKey || seciliKartlar.length === 0}
                        className="w-48 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {!geminiApiKey ? 'Gemini API Anahtarı Yükleniyor...' : yukleniyor ? 
                            <div className="flex items-center justify-center">
                                <span className="animate-pulse mr-2">🧠</span>
                                <span className="animate-bounce delay-75">A</span>
                                <span className="animate-bounce delay-100">n</span>
                                <span className="animate-bounce delay-150">a</span>
                                <span className="animate-bounce delay-200">l</span>
                                <span className="animate-bounce delay-250">i</span>
                                <span className="animate-bounce delay-300">z</span>
                                <span className="animate-pulse ml-2">🔍</span>
                            </div> 
                            : 'Kartları Doğrula'}
                    </button>
                </div>
            </div>

            {yukleniyor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl max-w-md w-full">
                        <div className="flex justify-center mb-6">
                            <div className="relative w-48 h-48">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-full h-full border-4 border-blue-200 dark:border-blue-800 rounded-full animate-[spin_3s_linear_infinite]"></div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-3/4 h-3/4 border-4 border-blue-300 dark:border-blue-700 rounded-full animate-[spin_2s_linear_infinite]"></div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-1/2 h-1/2 border-4 border-blue-400 dark:border-blue-600 rounded-full animate-[spin_1s_linear_infinite]"></div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-bounce">
                                        <span className="text-4xl">🤖</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mt-6 space-y-4">
                            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                                Gemini düşünüyor... 🤔
                            </p>
                            <div className="flex justify-center space-x-3">
                                <span className="animate-bounce text-2xl">🔍</span>
                                <span className="animate-bounce delay-75 text-2xl">📚</span>
                                <span className="animate-bounce delay-150 text-2xl">💡</span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                <p>Kartlar analiz ediliyor...</p>
                                <p>Lütfen bekleyin...</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {sonuclar.length > 0 && sonuclar.some(sonuc => sonuc.analiz) && (
                <div className="space-y-6 mt-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Analiz Sonuçları</h2>
                        <button
                            onClick={sonuclariIndir}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Sonuçları İndir (DOCX)
                        </button>
                    </div>
                    <div className="space-y-8">
                        {sonuclar.map((sonuc, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                                        Kart {sonuc.kart.kartNo || index + 1}
                                    </span>
                                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                                        Gemini AI
                                    </span>
                                </div>
                                
                                <div className="mb-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">İçerik:</p>
                                    <div className="text-gray-700 dark:text-gray-300 mt-1" dangerouslySetInnerHTML={{ __html: sonuc.kart.content }} />
                                </div>
                                
                                <div className="mt-6">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Analiz Sonucu:</p>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border-l-4 border-blue-500">
                                        <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 prose prose-sm max-w-none">
                                            {sonuc.analiz.split('\n').map((line, i) => {
                                                if (line.toLowerCase().includes('genel değerlendirme:')) {
                                                    const degerlendirme = line.split(':')[1].trim().toLowerCase();
                                                    let textColor = 'text-yellow-600 dark:text-yellow-400';
                                                    
                                                    if (degerlendirme.includes('çok iyi') || degerlendirme.includes('iyi')) {
                                                        textColor = 'text-green-600 dark:text-green-400';
                                                    } else if (degerlendirme.includes('geliştirilmeli')) {
                                                        textColor = 'text-red-600 dark:text-red-400';
                                                    }
                                                    
                                                    return (
                                                        <p key={i} className={`font-bold mt-3 ${textColor}`}>
                                                            {line}
                                                        </p>
                                                    );
                                                }
                                                
                                                if (line.toLowerCase().includes('içerik analizi:')) {
                                                    return (
                                                        <p key={i} className="font-medium text-blue-600 dark:text-blue-400 mt-3">
                                                            {line}
                                                        </p>
                                                    );
                                                }
                                                
                                                if (line.toLowerCase().includes('iyileştirme önerileri:')) {
                                                    return (
                                                        <p key={i} className="font-medium text-purple-600 dark:text-purple-400 mt-3">
                                                            {line}
                                                        </p>
                                                    );
                                                }
                                                
                                                if (line.toLowerCase().includes('tekrarlanan bilgi:')) {
                                                    const tekrarDurumu = line.split(':')[1].trim().toLowerCase();
                                                    const textColor = tekrarDurumu.includes('var') 
                                                        ? 'text-red-600 dark:text-red-400'
                                                        : 'text-green-600 dark:text-green-400';
                                                    
                                                    return (
                                                        <p key={i} className={`font-medium ${textColor} mt-3`}>
                                                            {line}
                                                        </p>
                                                    );
                                                }
                                                
                                                return <p key={i} className="mt-2">{line}</p>;
                                            })}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 flex justify-between items-center">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => onUpdateClick(sonuc.kart)}
                                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                                            >
                                                Güncelle
                                            </button>
                                            <button
                                                onClick={() => onDeleteClick(sonuc.kart)}
                                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

export default BulkMindCardVerification; 