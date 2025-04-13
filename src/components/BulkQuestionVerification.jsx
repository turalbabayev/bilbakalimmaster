import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx';
import { toast } from 'react-toastify';

const BulkQuestionVerification = forwardRef(({ sorular, onSoruGuncelle, onGuncellemeSuccess, onUpdateClick, onDeleteClick }, ref) => {
    const [sonuclar, setSonuclar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [openaiApiKey, setOpenaiApiKey] = useState(null);
    const [geminiApiKey, setGeminiApiKey] = useState(null);
    const [seciliSorular, setSeciliSorular] = useState([]);
    const [dogrulamaSecenegi, setDogrulamaSecenegi] = useState('secili');
    const [aktifModel, setAktifModel] = useState(null);
    const [gundemBilgisi, setGundemBilgisi] = useState(null);

    useEffect(() => {
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
    
    useEffect(() => {
        setSeciliSorular([]);
    }, [sorular]);

    useImperativeHandle(ref, () => ({
        updateSonucWithGuncelSoru: (guncelSoru) => {
            setSonuclar(prev => prev.map(sonuc => {
                if (sonuc.soru.id === guncelSoru.id) {
                    return { ...sonuc, soru: guncelSoru };
                }
                return sonuc;
            }));
        }
    }));

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
        
        const siraliSorular = [...sorular].sort((a, b) => {
            if (a.soruNumarasi && b.soruNumarasi) {
                return a.soruNumarasi - b.soruNumarasi;
            }
            return 0;
        });
        
        if (secenek === 'ilk10') {
            const ilk10 = siraliSorular.slice(0, 10).map(soru => soru.id);
            setSeciliSorular(ilk10);
        } else if (secenek === 'ilk20') {
            const ilk20 = siraliSorular.slice(0, 20).map(soru => soru.id);
            setSeciliSorular(ilk20);
        } else if (secenek === 'hepsi') {
            const tumSorular = siraliSorular.map(soru => soru.id);
            setSeciliSorular(tumSorular);
        } else if (secenek === 'secili') {
            setSeciliSorular([]);
        }
    };

    const getGundemBilgisi = async () => {
        if (gundemBilgisi) {
            console.log('Gündem bilgisi zaten mevcut, tekrar alınmıyor');
            return;
        }
        
        try {
            const bugununTarihi = new Date().toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const gundemSablonlari = [
                `[${bugununTarihi}] SON DAKİKA: Merkez Bankası bugünkü toplantısında faiz oranlarını değiştirmeme kararı aldı. Ekonomistler, bu kararın enflasyonla mücadele politikalarının devam ettiğinin bir göstergesi olduğunu belirtti.`,
                `[${bugununTarihi}] SON DAKİKA: Eğitim Bakanlığı, yeni eğitim-öğretim yılı için müfredat güncellemelerini açıkladı. Temel bilimlere daha fazla ağırlık verilecek yeni müfredat önümüzdeki dönemde uygulanacak.`,
                `[${bugununTarihi}] SON DAKİKA: Türkiye'nin önemli turizm merkezlerinde bu yıl rekor sayıda turist ağırlandı. Sektör temsilcileri, gelecek sezon için rezervasyonların şimdiden dolmaya başladığını belirtiyor.`,
                `[${bugununTarihi}] SON DAKİKA: Teknoloji şirketleri arasındaki yapay zeka yarışı hızlanıyor. Yerli bir teknoloji şirketi, yeni geliştirdiği Türkçe dil modeli ile global pazara açılma kararı aldı.`,
                `[${bugununTarihi}] SON DAKİKA: Sağlık Bakanlığı, mevsimsel hastalıklara karşı koruyucu önlem kampanyası başlattı. Uzmanlar vatandaşlara aşı olmalarını tavsiye ediyor.`
            ];
            
            const rastgeleSablon = gundemSablonlari[Math.floor(Math.random() * gundemSablonlari.length)];
            setGundemBilgisi(rastgeleSablon);
        } catch (error) {
            console.error('Gündem bilgisi alınırken hata:', error);
            setGundemBilgisi('Gündem bilgisi şu anda alınamıyor.');
        }
    };

    const getGeminiDogruCevap = (analiz) => {
        const match = analiz.match(/Doğru Cevap Şıkkı: ([A-E]) ✅/);
        return match ? match[1] : null;
    };

    const sorulariDogrula = async (model) => {
        if (!openaiApiKey && model === 'gpt') {
            toast.error('OpenAI API anahtarı bulunamadı!');
            return;
        }
        
        if (!geminiApiKey && model === 'gemini') {
            toast.error('Gemini API anahtarı bulunamadı!');
            return;
        }

        if (seciliSorular.length === 0) {
            toast.warning('Lütfen doğrulanacak soruları seçin!');
            return;
        }

        setYukleniyor(true);
        setAktifModel(model);
        
        const dogrulanacakSorular = sorular.filter(soru => seciliSorular.includes(soru.id));
        const yeniSonuclar = [];

        try {
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

                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const data = await response.json();
                        const analiz = data.choices[0].message.content;

                        // Doğru cevabı bul
                        const dogruCevapMatch = analiz.match(/(?:doğru cevap|cevap)[^\w]*(A|B|C|D|E)/i);
                        const sistemDogruCevap = dogruCevapMatch ? dogruCevapMatch[1] : null;

                        yeniSonuclar.push({
                            soru,
                            analiz,
                            sistemDogruCevap,
                            model: 'gpt'
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
                        
                        Lütfen cevabını TAM OLARAK aşağıdaki formatta ver. Format dışına ASLA çıkma:

                        Doğru Cevap Şıkkı: [A/B/C/D/E] ✅
                        Açıklama: [Kısa ve öz açıklama]
                        Şıklarda Tekrarlanan Cevap: [Var/Yok, varsa hangi şıklar]
                        Tekrarlanan Soru: [Evet/Hayır]

                        ÖNEMLİ NOTLAR:
                        1. Doğru Cevap Şıkkı formatını ASLA değiştirme. Tam olarak "Doğru Cevap Şıkkı: X ✅" şeklinde olmalı.
                        2. Tekrarlanan cevap varsa mutlaka hangi şıklar olduğunu belirt.
                        3. Bu formatın dışına ASLA çıkma ve başka bir şey ekleme.
                        `;

                        response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent', {
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
                                }],
                                safetySettings: [
                                    {
                                        category: "HARM_CATEGORY_HARASSMENT",
                                        threshold: "BLOCK_NONE"
                                    },
                                    {
                                        category: "HARM_CATEGORY_HATE_SPEECH",
                                        threshold: "BLOCK_NONE"
                                    },
                                    {
                                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                        threshold: "BLOCK_NONE"
                                    },
                                    {
                                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                                        threshold: "BLOCK_NONE"
                                    }
                                ],
                                generationConfig: {
                                    temperature: 0.7,
                                    maxOutputTokens: 500,
                                    topP: 0.8,
                                    topK: 40
                                }
                            })
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('Gemini API Hatası:', errorText);
                            throw new Error(`Gemini API Hatası (${response.status}): ${errorText}`);
                        }

                        const data = await response.json();
                        
                        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                            throw new Error('Gemini API geçersiz yanıt döndürdü');
                        }

                        const analiz = data.candidates[0].content.parts[0].text;

                        if (!analiz) {
                            throw new Error('Gemini API analiz sonucu döndürmedi');
                        }

                        const dogruCevapMatch = analiz.match(/Doğru Cevap Şıkkı: (A|B|C|D|E) ✅/);
                        const sistemDogruCevap = dogruCevapMatch ? dogruCevapMatch[1] : null;

                        if (!sistemDogruCevap) {
                            console.warn('Doğru cevap formatı bulunamadı, ham analiz:', analiz);
                        }

                        yeniSonuclar.push({
                            soru,
                            analiz,
                            sistemDogruCevap,
                            model: 'gemini'
                        });
                    }
                } catch (error) {
                    console.error(`Soru analiz edilirken hata: ${error.message}`);
                    toast.error(`Soru analiz edilirken hata: ${error.message}`);
                }
            }

            setSonuclar(yeniSonuclar);
            toast.success('Sorular başarıyla analiz edildi!');
        } catch (error) {
            console.error('Sorular doğrulanırken hata:', error);
            toast.error('Sorular doğrulanırken bir hata oluştu!');
        } finally {
            setYukleniyor(false);
            setAktifModel(null);
        }
    };

    const handleDogruCevapGuncelle = async (soru, yeniDogruCevap) => {
        try {
            const soruRef = doc(db, "konular", soru.konuId, "altkonular", soru.altKonuId, "sorular", soru.id);
            await updateDoc(soruRef, {
                dogruCevap: yeniDogruCevap
            });
            
            toast.success('Doğru cevap başarıyla güncellendi!');
            onSoruGuncelle(soru.id, yeniDogruCevap);
        } catch (error) {
            console.error('Doğru cevap güncellenirken hata:', error);
            toast.error('Doğru cevap güncellenirken bir hata oluştu!');
        }
    };

    const sonuclariIndir = async () => {
        try {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            text: "Soru Analiz Raporu",
                            heading: HeadingLevel.HEADING_1,
                            spacing: { after: 200 }
                        }),
                        ...sonuclar.flatMap(sonuc => [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Soru ${sonuc.soru.soruNumarasi}`,
                                        bold: true,
                                        size: 28
                                    })
                                ],
                                spacing: { before: 200, after: 100 }
                            }),
                            new Paragraph({
                                text: sonuc.soru.soruMetni,
                                spacing: { after: 200 }
                            }),
                            ...sonuc.soru.cevaplar.map((cevap, index) => 
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `${String.fromCharCode(65 + index)}) ${cevap}`,
                                            bold: String.fromCharCode(65 + index) === sonuc.sistemDogruCevap
                                        })
                                    ],
                                    spacing: { after: 100 }
                                })
                            ),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Mevcut Doğru Cevap: ${sonuc.soru.dogruCevap}`,
                                        bold: true,
                                        color: "000088"
                                    })
                                ],
                                spacing: { before: 100, after: 100 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Sistem Önerisi: ${sonuc.sistemDogruCevap}`,
                                        bold: true,
                                        color: sonuc.sistemDogruCevap === sonuc.soru.dogruCevap ? "008800" : "880000"
                                    })
                                ],
                                spacing: { before: 100, after: 200 }
                            }),
                            new Paragraph({
                                text: "Analiz Sonuçları:",
                                bold: true,
                                spacing: { before: 100, after: 100 }
                            }),
                            ...sonuc.analiz.split('\n')
                                .filter(line => line.trim() !== '')
                                .map(line => new Paragraph({
                                    text: line,
                                    spacing: { after: 100 }
                                }))
                        ])
                    ]
                }]
            });

            const buffer = await Packer.toBuffer(doc);
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            saveAs(blob, 'soru_analiz_raporu.docx');
            
            toast.success('Analiz raporu başarıyla indirildi!');
        } catch (error) {
            console.error('Rapor oluşturulurken hata:', error);
            toast.error('Rapor oluşturulurken bir hata oluştu!');
        }
    };

    const handleSoruSil = async (soru) => {
        try {
            if (!soru) {
                throw new Error('Geçersiz soru verisi: Soru nesnesi bulunamadı');
            }
            
            if (!soru.soruMetni) {
                throw new Error('Geçersiz soru verisi: Soru metni bulunamadı');
            }
            
            if (!soru.id) {
                const hash = Math.random().toString(36).substring(2, 15);
                console.log('Soru ID bulunamadı, geçici ID oluşturuluyor:', hash);
                soru.id = hash;
            }
            
            if (onDeleteClick && typeof onDeleteClick === 'function') {
                console.log('Silme talep edilen soru:', soru);
                
                const soruMetniOzet = stripHtml(soru.soruMetni || '').substring(0, 50);
                if (window.confirm(`"${soruMetniOzet}..." sorusunu silmek istediğinize emin misiniz?`)) {
                    onDeleteClick(soru);
                }
                return;
            } else {
                throw new Error('Silme fonksiyonu tanımlanmamış');
            }
        } catch (error) {
            console.error('Soru silinirken hata:', error);
            alert(`Soru silinirken bir hata oluştu: ${error.message}`);
        }
    };

    const stripHtml = (html) => {
        if (!html) return "";
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const updateSonucWithGuncelSoru = (guncelSoru) => {
        console.log('Güncel soru alındı, sonuçlar güncelleniyor:', guncelSoru);

        setSonuclar(prevSonuclar => {
            return prevSonuclar.map(sonuc => {
                let eslesme = false;
                
                if (sonuc.soru.id && guncelSoru.id && sonuc.soru.id === guncelSoru.id) {
                    eslesme = true;
                }
                
                if (!eslesme && sonuc.soru.soruMetni === guncelSoru.soruMetni) {
                    const cevaplarAyni = () => {
                        if (sonuc.soru.cevaplar && guncelSoru.cevaplar &&
                            sonuc.soru.cevaplar.length === guncelSoru.cevaplar.length) {
                            let ayniCevapSayisi = 0;
                            for (let i = 0; i < sonuc.soru.cevaplar.length; i++) {
                                if (sonuc.soru.cevaplar[i] === guncelSoru.cevaplar[i]) {
                                    ayniCevapSayisi++;
                                }
                            }
                            return (ayniCevapSayisi / sonuc.soru.cevaplar.length) >= 0.8;
                        }
                        return false;
                    };
                    
                    if (cevaplarAyni()) {
                        eslesme = true;
                    }
                }
                
                if (eslesme) {
                    console.log('Eşleşen soru bulundu, doğru cevap güncelleniyor:', guncelSoru.dogruCevap);
                    
                    return {
                        ...sonuc,
                        sistemDogruCevap: guncelSoru.dogruCevap,
                        soru: {
                            ...sonuc.soru,
                            dogruCevap: guncelSoru.dogruCevap
                        },
                        cevapUyumsuz: sonuc.geminiDogruCevap && sonuc.geminiDogruCevap !== guncelSoru.dogruCevap
                    };
                }
                
                return sonuc;
            });
        });

        console.log('Sonuçlar güncellendi');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Doğrulama Seçenekleri</h2>
                
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
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Sorular</h2>
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
                                            {soru.soruNumarasi}. {soru.soruMetni.length > 100 ? soru.soruMetni.substring(0, 100) + '...' : soru.soruMetni}
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
                            : 'Gemini ile Doğrula'}
                    </button>
                </div>
            </div>

            {yukleniyor && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl text-center space-y-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            Sorular Analiz Ediliyor
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Lütfen bekleyin, bu işlem biraz zaman alabilir...
                        </p>
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
                    </div>
                </div>
            )}

            {sonuclar.length > 0 && (
                <div className="space-y-6 mt-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analiz Sonuçları</h2>
                        <button
                            onClick={sonuclariIndir}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span>Sonuçları İndir (DOCX)</span>
                        </button>
                    </div>
                    <div className="space-y-8">
                        {sonuclar.map((sonuc, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-medium">
                                        Soru {sonuc.soru.soruNumarasi}
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
                                    <p className="text-gray-700 dark:text-gray-300 mt-1">{sonuc.soru.soruMetni}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    {sonuc.soru.cevaplar.map((cevap, i) => (
                                        <div 
                                            key={i} 
                                            className={`p-3 rounded-lg ${
                                                String.fromCharCode(65 + i) === sonuc.soru.dogruCevap
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                                    : String.fromCharCode(65 + i) === sonuc.sistemDogruCevap
                                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                            }`}
                                        >
                                            <span className="font-medium">{String.fromCharCode(65 + i)})</span> {cevap}
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="flex items-center justify-between mb-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Mevcut Doğru Cevap: 
                                            <span className="ml-1 text-blue-600 dark:text-blue-400 font-bold">
                                                {sonuc.soru.dogruCevap}
                                            </span>
                                        </p>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Sistem Önerisi: 
                                            <span className={`ml-1 font-bold ${
                                                sonuc.sistemDogruCevap === sonuc.soru.dogruCevap
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-red-600 dark:text-red-400'
                                            }`}>
                                                {sonuc.sistemDogruCevap}
                                            </span>
                                        </p>
                                    </div>
                                    
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleDogruCevapGuncelle(sonuc.soru, sonuc.sistemDogruCevap)}
                                            className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors flex items-center space-x-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                            <span>Sistem Önerisini Kabul Et</span>
                                        </button>
                                        <button
                                            onClick={() => onUpdateClick(sonuc.soru)}
                                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                            </svg>
                                            <span>Soruyu Düzenle</span>
                                        </button>
                                        <button
                                            onClick={() => onDeleteClick(sonuc.soru)}
                                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center space-x-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            <span>Soruyu Sil</span>
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Analiz:</p>
                                    <div className="space-y-2 text-gray-700 dark:text-gray-300">
                                        {sonuc.analiz.split('\n').map((line, i) => {
                                            if (line.trim() === '') return null;
                                            
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
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

const BulkQuestionVerificationWithRef = React.forwardRef((props, ref) => {
    return <BulkQuestionVerification {...props} ref={ref} />;
});

export default BulkQuestionVerificationWithRef;