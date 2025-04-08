import React, { useState, useEffect } from 'react';

const BulkQuestionVerification = ({ sorular }) => {
    const [sonuclar, setSonuclar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [apiKey, setApiKey] = useState(null);
    const [seciliSorular, setSeciliSorular] = useState([]);
    const [dogrulamaSecenegi, setDogrulamaSecenegi] = useState('secili');

    useEffect(() => {
        // Component yüklendiğinde API anahtarını al
        const key = process.env.REACT_APP_OPENAI_API_KEY;
        console.log('API Key (useEffect):', key);
        
        if (!key) {
            console.error('API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.');
            return;
        }
        
        setApiKey(key);
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
        
        if (secenek === 'ilk10') {
            const ilk10 = sorular.slice(0, 10).map(soru => soru.id);
            setSeciliSorular(ilk10);
        } else if (secenek === 'ilk20') {
            const ilk20 = sorular.slice(0, 20).map(soru => soru.id);
            setSeciliSorular(ilk20);
        } else if (secenek === 'hepsi') {
            const tumSorular = sorular.map(soru => soru.id);
            setSeciliSorular(tumSorular);
        } else if (secenek === 'secili') {
            setSeciliSorular([]);
        }
    };

    const sorulariDogrula = async () => {
        if (!apiKey) {
            console.error('API anahtarı henüz yüklenmedi');
            return;
        }

        if (seciliSorular.length === 0) {
            alert('Lütfen doğrulamak için en az bir soru seçin.');
            return;
        }

        setYukleniyor(true);
        const yeniSonuclar = [];

        // Seçili soruları filtrele
        const dogrulanacakSorular = sorular.filter(soru => seciliSorular.includes(soru.id));
        console.log('Dogrulanacak sorular:', dogrulanacakSorular.length);
        
        for (const soru of dogrulanacakSorular) {
            try {
                const prompt = `
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
                `;

                console.log('API Key (sorulariDogrula):', apiKey);

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
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
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 500
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
                }

                const data = await response.json();
                const text = data.choices[0].message.content;

                yeniSonuclar.push({
                    soru: soru,
                    analiz: text,
                    sistemDogruCevap: soru.dogruCevap // Sistemdeki doğru cevabı da ekle
                });
            } catch (error) {
                console.error('Hata:', error);
                yeniSonuclar.push({
                    soru: soru,
                    analiz: `Analiz sırasında bir hata oluştu: ${error.message}`,
                    sistemDogruCevap: soru.dogruCevap
                });
            }
        }

        setSonuclar(yeniSonuclar);
        setYukleniyor(false);
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
                                            {index + 1}. {soru.soruMetni.length > 100 ? soru.soruMetni.substring(0, 100) + '...' : soru.soruMetni}
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
                <button
                    onClick={sorulariDogrula}
                    disabled={yukleniyor || !apiKey || seciliSorular.length === 0}
                    className="w-48 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {!apiKey ? 'API Anahtarı Yükleniyor...' : yukleniyor ? 'Analiz Ediliyor...' : 'Soruları Doğrula'}
                </button>
            </div>

            {sonuclar.length > 0 && (
                <div className="space-y-6 mt-8">
                    <h2 className="text-xl font-bold">Analiz Sonuçları</h2>
                    <div className="space-y-8">
                        {sonuclar.map((sonuc, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <div className="flex items-center mb-4">
                                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-medium">
                                        Soru {index + 1}
                                    </span>
                                </div>
                                
                                <div className="mb-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">Soru Metni:</p>
                                    <p className="text-gray-700 dark:text-gray-300 mt-1">{sonuc.soru.soruMetni}</p>
                                </div>
                                
                                <div className="mb-4">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">Cevaplar:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                        {sonuc.soru.cevaplar.map((cevap, i) => (
                                            <div 
                                                key={i} 
                                                className={`p-2 rounded-lg ${sonuc.soru.dogruCevap === String.fromCharCode(65 + i) ? 'bg-green-100 dark:bg-green-900 border-l-4 border-green-500' : 'bg-gray-50 dark:bg-gray-700'}`}
                                            >
                                                <span className={`font-medium ${sonuc.soru.dogruCevap === String.fromCharCode(65 + i) ? 'text-green-800 dark:text-green-200' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {String.fromCharCode(65 + i)})
                                                </span>{' '}
                                                <span className="text-gray-700 dark:text-gray-300">{cevap}</span>
                                            </div>
                                        ))}
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
                                        <p className="text-blue-700 dark:text-blue-300 mt-1">
                                            {sonuc.sistemDogruCevap}
                                        </p>
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