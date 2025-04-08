import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx';

const BulkQuestionVerification = ({ sorular }) => {
    const [sonuclar, setSonuclar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [openaiApiKey, setOpenaiApiKey] = useState(null);
    const [geminiApiKey, setGeminiApiKey] = useState(null);
    const [seciliSorular, setSeciliSorular] = useState([]);
    const [dogrulamaSecenegi, setDogrulamaSecenegi] = useState('secili');
    const [aktifModel, setAktifModel] = useState(null);
    const [gundemBilgisi, setGundemBilgisi] = useState(null);

    useEffect(() => {
        // Component yüklendiğinde API anahtarlarını al
        const openaiKey = process.env.REACT_APP_OPENAI_API_KEY;
        const geminiKey = process.env.REACT_APP_GEMINI_API_KEY;
        
        if (!openaiKey) {
            console.error('OpenAI API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.');
        }
        
        if (!geminiKey) {
            console.error('Gemini API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.');
        }
        
        setOpenaiApiKey(openaiKey);
        setGeminiApiKey(geminiKey);
    }, []);

    const handleSoruSecim = (soruId) => {
        setSeciliSorular(prev => {
            if (prev.includes(soruId)) {
                return prev.filter(id => id !== soruId);
            } else {
                return [...prev, soruId];
            }
        });
    };

    const handleDogrulamaSecenegi = (secenek) => {
        setDogrulamaSecenegi(secenek);
        
        // Önce soruları sırala (varsa soruNumarasi'na göre, yoksa varsayılan sıra)
        const siraliSorular = [...sorular].sort((a, b) => {
            if (a.soruNumarasi && b.soruNumarasi) {
                return a.soruNumarasi - b.soruNumarasi;
            }
            return 0;
        });
        
        if (secenek === 'ilk10') {
            // İlk 10 soruyu seç
            const ilk10 = siraliSorular.slice(0, 10).map(soru => soru.id);
            setSeciliSorular(ilk10);
        } else if (secenek === 'ilk20') {
            // İlk 20 soruyu seç
            const ilk20 = siraliSorular.slice(0, 20).map(soru => soru.id);
            setSeciliSorular(ilk20);
        } else if (secenek === 'hepsi') {
            // Tüm soruları seç
            const tumSorular = siraliSorular.map(soru => soru.id);
            setSeciliSorular(tumSorular);
        } else if (secenek === 'secili') {
            // Seçili soruları temizle
            setSeciliSorular([]);
        }
    };

    const getGundemBilgisi = async () => {
        try {
            const bugununTarihi = new Date().toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const prompt = `
            Bugünün tarihi: ${bugununTarihi}

            Sen bir haber spikerisin. Aşağıdaki konulardan biriyle ilgili BUGÜNÜN tarihine ait güncel ve önemli bir haberi, haber formatında kısaca anlat:
            - Döviz kurları ve ekonomik gelişmeler
            - Önemli devlet açıklamaları ve kararlar
            - Eğitim ve sınav haberleri
            - Spor haberleri
            - Hava durumu
            - Teknoloji ve bilim haberleri
            - Önemli toplumsal gelişmeler

            Lütfen haberi tek paragraf halinde, "Son Dakika" formatında ve tarih/saat belirterek anlat.
            Örnek format:
            [${bugununTarihi}] SON DAKİKA: [Haber içeriği...]

            NOT: Kesinlikle 2023 yılına ait haber verme, sadece bugünün tarihine ait güncel bir haber ver.
            `;

            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
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
                throw new Error('Gündem bilgisi alınamadı');
            }

            const data = await response.json();
            setGundemBilgisi(data.candidates[0].content.parts[0].text);
        } catch (error) {
            console.error('Gündem bilgisi alınırken hata:', error);
            setGundemBilgisi('Gündem bilgisi şu anda alınamıyor.');
        }
    };

    const sorulariDogrula = async (model) => {
        if (!openaiApiKey && !geminiApiKey) {
            console.error('API anahtarları henüz yüklenmedi');
            return;
        }

        if (seciliSorular.length === 0) {
            alert('Lütfen doğrulamak için en az bir soru seçin.');
            return;
        }

        setYukleniyor(true);
        setAktifModel(model);
        getGundemBilgisi(); // Gündem bilgisini al
        const yeniSonuclar = [];

        // Seçili soruları sıralı olarak filtrele
        const dogrulanacakSorular = sorular
            .filter(soru => seciliSorular.includes(soru.id))
            .sort((a, b) => {
                if (a.soruNumarasi && b.soruNumarasi) {
                    return a.soruNumarasi - b.soruNumarasi;
                }
                return 0;
            });
        
        for (const soru of dogrulanacakSorular) {
            try {
                let response;
                if (model === 'gpt') {
                    response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${openaiApiKey}`
                        },
                        body: JSON.stringify({
                            model: "gpt-3.5-turbo",
                            messages: [
                                {
                                    role: "system",
                                    content: "Sen bir eğitim uzmanısın. Soruları analiz ederken her madde için 1-2 cümlelik açıklama yap. Çok uzun olma ama gerekli bilgiyi ver. Son madde için doğru cevabın harfini belirt."
                                },
                                {
                                    role: "user",
                                    content: `
                                        Aşağıdaki soruyu ve cevapları analiz et:
                                        
                                        Soru: ${soru.soruMetni}
                                        
                                        Cevaplar:
                                        A) ${soru.cevaplar[0]}
                                        B) ${soru.cevaplar[1]}
                                        C) ${soru.cevaplar[2]}
                                        D) ${soru.cevaplar[3]}
                                        E) ${soru.cevaplar[4]}
                                        
                                        Lütfen şunları kontrol et ve kısa bir açıklama yap:
                                        1. Soru mantıklı mı? Neden?
                                        2. Cevaplar mantıklı mı? Herhangi bir sorun var mı?
                                        3. Cevaplar arasında tekrar var mı? Varsa hangileri?
                                        4. Senin düşüncene göre doğru cevap nedir? (A, B, C, D veya E)
                                        5. Bu soru diğer sorularla aynı mı? Benzerlik varsa ne kadar?
                                    `
                                }
                            ],
                            temperature: 0.7,
                            max_tokens: 500
                        })
                    });
                } else if (model === 'gemini') {
                    const prompt = `
                    Merhaba, sen bir üniversitede akademisyensin ve sana vereceğim soruların cevaplarını kontrol etmeni istiyorum. Bu sorular banka terfi sınavına girecek kişiler için hazırlandı, senin dikkatin çok önemli.

                    Soru: ${soru.soruMetni}
                    
                    Cevaplar:
                    A) ${soru.cevaplar[0]}
                    B) ${soru.cevaplar[1]}
                    C) ${soru.cevaplar[2]}
                    D) ${soru.cevaplar[3]}
                    E) ${soru.cevaplar[4]}
                    
                    Lütfen aşağıdaki formatta yanıt ver:

                    Doğru Cevap Şıkkı: [A/B/C/D/E] ✅
                    Açıklama: [Kısa ve öz açıklama]
                    Şıklarda Tekrarlanan Cevap: [Var/Yok, varsa hangi şıklar]
                    Tekrarlanan Soru: [Evet/Hayır]
                    `;

                    response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
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
                }

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
                }

                const data = await response.json();
                let text;
                
                if (model === 'gpt') {
                    text = data.choices[0].message.content;
                } else if (model === 'gemini') {
                    text = data.candidates[0].content.parts[0].text;
                }

                yeniSonuclar.push({
                    soru: soru,
                    analiz: text,
                    sistemDogruCevap: soru.dogruCevap,
                    model: model
                });
            } catch (error) {
                console.error('Hata:', error);
                yeniSonuclar.push({
                    soru: soru,
                    analiz: `Analiz sırasında bir hata oluştu: ${error.message}`,
                    sistemDogruCevap: soru.dogruCevap,
                    model: model
                });
            }
        }

        setSonuclar(yeniSonuclar);
        setYukleniyor(false);
        setAktifModel(null);
    };

    const sonuclariIndir = () => {
        if (sonuclar.length === 0) return;
        
        // DOCX dosyası oluştur
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: "Soru Analiz Sonuçları",
                        heading: HeadingLevel.HEADING_1,
                        thematicBreak: true,
                    }),
                    
                    ...sonuclar.flatMap((sonuc, index) => {
                        return [
                            new Paragraph({
                                text: `SORU ${index + 1}`,
                                heading: HeadingLevel.HEADING_2,
                                thematicBreak: true,
                                spacing: {
                                    before: 400,
                                    after: 200,
                                },
                            }),
                            new Paragraph({
                                text: "Soru Metni:",
                                heading: HeadingLevel.HEADING_3,
                                spacing: {
                                    after: 80,
                                },
                            }),
                            new Paragraph({
                                text: stripHtml(sonuc.soru.soruMetni),
                                spacing: {
                                    after: 200,
                                },
                            }),
                            
                            new Paragraph({
                                text: "Cevaplar:",
                                heading: HeadingLevel.HEADING_3,
                                spacing: {
                                    after: 80,
                                },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "A) " + stripHtml(sonuc.soru.cevaplar[0]),
                                        bold: sonuc.sistemDogruCevap === "A",
                                    }),
                                ],
                                spacing: { after: 80 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "B) " + stripHtml(sonuc.soru.cevaplar[1]),
                                        bold: sonuc.sistemDogruCevap === "B",
                                    }),
                                ],
                                spacing: { after: 80 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "C) " + stripHtml(sonuc.soru.cevaplar[2]),
                                        bold: sonuc.sistemDogruCevap === "C",
                                    }),
                                ],
                                spacing: { after: 80 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "D) " + stripHtml(sonuc.soru.cevaplar[3]),
                                        bold: sonuc.sistemDogruCevap === "D",
                                    }),
                                ],
                                spacing: { after: 80 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "E) " + stripHtml(sonuc.soru.cevaplar[4]),
                                        bold: sonuc.sistemDogruCevap === "E",
                                    }),
                                ],
                                spacing: { after: 200 },
                            }),
                            
                            new Paragraph({
                                text: "Sistemdeki Doğru Cevap:",
                                heading: HeadingLevel.HEADING_3,
                                spacing: {
                                    after: 80,
                                },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `${sonuc.sistemDogruCevap}) ${stripHtml(sonuc.soru.cevaplar[sonuc.sistemDogruCevap.charCodeAt(0) - 65])}`,
                                        bold: true,
                                        color: "0000FF",
                                    }),
                                ],
                                spacing: {
                                    after: 200,
                                },
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
                                    
                                    if (line.includes('1.') || line.includes('2.') || line.includes('3.') || 
                                        line.includes('4.') || line.includes('5.')) {
                                        props.heading = HeadingLevel.HEADING_4;
                                        props.spacing = { before: 120, after: 80 };
                                    }
                                    else if (line.toLowerCase().includes('doğru cevap')) {
                                        props.children = [
                                            new TextRun({
                                                text: line,
                                                bold: true,
                                                color: "008000",
                                            }),
                                        ];
                                    }
                                    
                                    return new Paragraph({
                                        text: line,
                                        ...props,
                                    });
                                }),
                            
                            new Paragraph({
                                text: "------------------------------------------------------",
                                spacing: {
                                    before: 400,
                                    after: 400,
                                },
                                border: {
                                    bottom: {
                                        color: "999999",
                                        style: BorderStyle.SINGLE,
                                        size: 6,
                                    },
                                },
                            }),
                        ];
                    }),
                ],
            }],
        });
        
        // DOCX dosyasını oluştur ve indir
        Packer.toBlob(doc).then(blob => {
            saveAs(blob, `soru-analiz-sonuclari-${new Date().toISOString().slice(0, 10)}.docx`);
        });
    };

    // HTML etiketlerini temizleme fonksiyonu
    const stripHtml = (html) => {
        if (!html) return "";
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Doğrulama Seçenekleri</h2>
                
                <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Doğrulanacak Sorular:</span>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => handleDogrulamaSecenegi('secili')}
                                className={`px-3 py-1 rounded-full text-sm font-medium ${dogrulamaSecenegi === 'secili' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                Seçili Sorular
                            </button>
                            <button 
                                onClick={() => handleDogrulamaSecenegi('ilk10')}
                                className={`px-3 py-1 rounded-full text-sm font-medium ${dogrulamaSecenegi === 'ilk10' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                İlk 10 Soru
                            </button>
                            <button 
                                onClick={() => handleDogrulamaSecenegi('ilk20')}
                                className={`px-3 py-1 rounded-full text-sm font-medium ${dogrulamaSecenegi === 'ilk20' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                İlk 20 Soru
                            </button>
                            <button 
                                onClick={() => handleDogrulamaSecenegi('hepsi')}
                                className={`px-3 py-1 rounded-full text-sm font-medium ${dogrulamaSecenegi === 'hepsi' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                Tüm Sorular
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {dogrulamaSecenegi === 'secili' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Sorular</h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {sorular.map((soru, index) => (
                            <div key={soru.id} className="flex items-start space-x-3">
                                <input 
                                    type="checkbox" 
                                    id={`soru-${soru.id}`}
                                    checked={seciliSorular.includes(soru.id)}
                                    onChange={() => handleSoruSecim(soru.id)}
                                    className="mt-1"
                                />
                                <label htmlFor={`soru-${soru.id}`} className="flex-1 cursor-pointer">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                        <p className="font-medium text-gray-800 dark:text-gray-200">
                                            {index + 1}. {stripHtml(soru.soruMetni).length > 100 ? stripHtml(soru.soruMetni).substring(0, 100) + '...' : stripHtml(soru.soruMetni)}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            Doğru Cevap: {soru.dogruCevap}
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
                    {seciliSorular.length} soru seçildi
                </span>
                <div className="flex space-x-4">
                    <button
                        onClick={() => sorulariDogrula('gpt')}
                        disabled={yukleniyor || !openaiApiKey || seciliSorular.length === 0}
                        className={`w-48 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${aktifModel === 'gpt' ? 'ring-2 ring-offset-2 ring-purple-500' : ''}`}
                    >
                        {!openaiApiKey ? 'OpenAI API Anahtarı Yükleniyor...' : yukleniyor && aktifModel === 'gpt' ? 
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
                            : 'GPT ile Doğrula'}
                    </button>
                    <button
                        onClick={() => sorulariDogrula('gemini')}
                        disabled={yukleniyor || !geminiApiKey || seciliSorular.length === 0}
                        className={`w-48 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${aktifModel === 'gemini' ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                    >
                        {!geminiApiKey ? 'Gemini API Anahtarı Yükleniyor...' : yukleniyor && aktifModel === 'gemini' ? 
                            <div className="flex items-center justify-center">
                                <span className="animate-pulse mr-2">🤖</span>
                                <span className="animate-bounce delay-75">A</span>
                                <span className="animate-bounce delay-100">n</span>
                                <span className="animate-bounce delay-150">a</span>
                                <span className="animate-bounce delay-200">l</span>
                                <span className="animate-bounce delay-250">i</span>
                                <span className="animate-bounce delay-300">z</span>
                                <span className="animate-pulse ml-2">🔍</span>
                            </div> 
                            : 'Gemini AI ile Doğrula'}
                    </button>
                </div>
            </div>

            {yukleniyor && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex flex-col items-center">
                        <div className="text-2xl font-bold mb-4 text-purple-600 dark:text-purple-400">
                            {aktifModel === 'gpt' ? 'GPT Analiz Yapıyor' : 'Gemini AI Analiz Yapıyor'}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                            <div className="flex flex-col items-center">
                                {aktifModel === 'gpt' ? (
                                    <div className="relative w-48 h-48">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-full h-full border-4 border-purple-200 dark:border-purple-800 rounded-full animate-[spin_3s_linear_infinite]"></div>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-3/4 h-3/4 border-4 border-purple-300 dark:border-purple-700 rounded-full animate-[spin_2s_linear_infinite]"></div>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-1/2 h-1/2 border-4 border-purple-400 dark:border-purple-600 rounded-full animate-[spin_1s_linear_infinite]"></div>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="animate-bounce">
                                                <span className="text-4xl">🧠</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
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
                                )}

                                <div className="text-center mt-6 space-y-4">
                                    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                                        {aktifModel === 'gpt' ? 'GPT düşünüyor... 🤔' : 'Gemini düşünüyor... 🤔'}
                                    </p>
                                    <div className="flex justify-center space-x-3">
                                        <span className="animate-bounce text-2xl">🔍</span>
                                        <span className="animate-bounce delay-75 text-2xl">📚</span>
                                        <span className="animate-bounce delay-150 text-2xl">💡</span>
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                        <p>Sorular karmaşıksa biraz zaman alabilir.</p>
                                        <p>Lütfen bekleyin...</p>
                                    </div>
                                </div>
                            </div>

                            {gundemBilgisi && (
                                <div className="flex flex-col justify-center">
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                                        <div className="flex items-center mb-4">
                                            <span className="text-2xl mr-2">📰</span>
                                            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-300 dark:to-purple-300">
                                                Gündemden Haberler
                                            </h3>
                                        </div>
                                        <div className="prose prose-sm max-w-none">
                                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                                {gundemBilgisi}
                                            </p>
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <span className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                                                Canlı Haber 🔴
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {sonuclar.length > 0 && (
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
                                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-medium">
                                        Soru {index + 1}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        sonuc.model === 'gpt' 
                                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' 
                                            : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                    }`}>
                                        {sonuc.model === 'gpt' ? 'GPT-3.5' : 'Gemini AI'}
                                    </span>
                                </div>
                                
                                <div className="mb-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">Soru Metni:</p>
                                    <p className="text-gray-700 dark:text-gray-300 mt-1">{stripHtml(sonuc.soru.soruMetni)}</p>
                                </div>
                                
                                <div className="mb-4">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">Cevaplar:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                        {sonuc.soru.cevaplar.map((cevap, i) => {
                                            let dogruCevapHarfi = sonuc.sistemDogruCevap;
                                            if (!/^[A-E]$/.test(dogruCevapHarfi)) {
                                                const index = sonuc.soru.cevaplar.findIndex(c => c === sonuc.sistemDogruCevap);
                                                if (index !== -1) {
                                                    dogruCevapHarfi = String.fromCharCode(65 + index);
                                                }
                                            }
                                            
                                            const isDogruCevap = dogruCevapHarfi === String.fromCharCode(65 + i);
                                            return (
                                                <div 
                                                    key={i} 
                                                    className={`p-2 rounded-lg ${
                                                        isDogruCevap 
                                                            ? 'bg-green-100 dark:bg-green-900 border-l-4 border-green-500' 
                                                            : 'bg-gray-50 dark:bg-gray-700'
                                                    }`}
                                                >
                                                    <span className={`font-medium ${
                                                        isDogruCevap 
                                                            ? 'text-green-800 dark:text-green-200' 
                                                            : 'text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {String.fromCharCode(65 + i)})
                                                    </span>{' '}
                                                    <span className={`${
                                                        isDogruCevap 
                                                            ? 'text-green-800 dark:text-green-200' 
                                                            : 'text-gray-700 dark:text-gray-300'
                                                    }`}>{stripHtml(cevap)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                <div className="mt-6">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Analiz Sonucu:</p>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border-l-4 border-purple-500">
                                        <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 prose prose-sm max-w-none">
                                            {sonuc.analiz.split('\n').map((line, i) => {
                                                if (line.includes('1.') || line.includes('2.') || line.includes('3.') || 
                                                    line.includes('4.') || line.includes('5.')) {
                                                    return (
                                                        <p key={i} className="font-medium text-gray-900 dark:text-gray-100 mt-3">{line}</p>
                                                    );
                                                }
                                                if (line.toLowerCase().includes('doğru cevap')) {
                                                    return (
                                                        <p key={i} className="font-bold text-green-600 dark:text-green-400 mt-3">{line}</p>
                                                    );
                                                }
                                                return <p key={i}>{line}</p>;
                                            })}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border-l-4 border-blue-500">
                                        <p className="font-semibold text-blue-900 dark:text-blue-100">Sistemdeki Doğru Cevap:</p>
                                        <div className="flex items-center mt-2">
                                            <span className="text-blue-700 dark:text-blue-300">
                                                {sonuc.sistemDogruCevap}) {stripHtml(sonuc.soru.cevaplar[sonuc.sistemDogruCevap.charCodeAt(0) - 65])}
                                            </span>
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
};

export default BulkQuestionVerification;