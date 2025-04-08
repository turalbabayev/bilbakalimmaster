import React, { useState, useEffect } from 'react';

const BulkQuestionVerification = ({ sorular }) => {
    const [sonuclar, setSonuclar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [apiKey, setApiKey] = useState(null);

    useEffect(() => {
        // Component yüklendiğinde API anahtarını al
        const key = process.env.REACT_APP_OPENAI_API_KEY;
        console.log('API Key (useEffect):', key);
        setApiKey(key);
    }, []);

    const sorulariDogrula = async () => {
        if (!apiKey) {
            console.error('API anahtarı henüz yüklenmedi');
            return;
        }

        setYukleniyor(true);
        const yeniSonuclar = [];

        for (const soru of sorular) {
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
                    
                    Lütfen şunları kontrol et:
                    1. Soru mantıklı ve anlaşılır mı?
                    2. Cevaplar mantıklı ve anlaşılır mı?
                    3. Cevaplar arasında tekrar var mı?
                    4. Doğru cevap (${soru.dogruCevap}) mantıklı mı?
                    5. Bu soru daha önce sorulmuş olabilir mi?
                    
                    Detaylı bir analiz yap ve sonuçları maddeler halinde belirt.
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
                                content: "Sen bir eğitim uzmanısın ve soruları analiz ediyorsun. Soruların mantıklı olup olmadığını, cevapların doğruluğunu ve tekrar edip etmediğini kontrol ediyorsun."
                            },
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000
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
                    analiz: text
                });
            } catch (error) {
                console.error('Hata:', error);
                yeniSonuclar.push({
                    soru: soru,
                    analiz: `Analiz sırasında bir hata oluştu: ${error.message}`
                });
            }
        }

        setSonuclar(yeniSonuclar);
        setYukleniyor(false);
    };

    return (
        <div className="space-y-6">
            <button
                onClick={sorulariDogrula}
                disabled={yukleniyor || !apiKey}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {!apiKey ? 'API Anahtarı Yükleniyor...' : yukleniyor ? 'Analiz Ediliyor...' : 'Soruları Doğrula'}
            </button>

            {sonuclar.length > 0 && (
                <div className="space-y-4">
                    {sonuclar.map((sonuc, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold mb-2">Soru {index + 1}:</h3>
                            <div className="mb-4">
                                <p className="font-medium">Soru Metni:</p>
                                <p className="text-gray-700 dark:text-gray-300">{sonuc.soru.soruMetni}</p>
                            </div>
                            <div className="mb-4">
                                <p className="font-medium">Cevaplar:</p>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                                    {sonuc.soru.cevaplar.map((cevap, i) => (
                                        <li key={i}>
                                            {String.fromCharCode(65 + i)}) {cevap}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="mb-4">
                                <p className="font-medium">Doğru Cevap:</p>
                                <p className="text-green-600 dark:text-green-400">{sonuc.soru.dogruCevap}</p>
                            </div>
                            <div>
                                <p className="font-medium">Analiz Sonucu:</p>
                                <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                        {sonuc.analiz}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BulkQuestionVerification; 