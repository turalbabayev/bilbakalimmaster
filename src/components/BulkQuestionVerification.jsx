import React, { useState } from 'react';

const BulkQuestionVerification = ({ sorular }) => {
    const [sonuclar, setSonuclar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);

    const sorulariDogrula = async () => {
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

                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            contents: [{
                                role: "user",
                                parts: [{
                                    text: prompt
                                }]
                            }],
                            generationConfig: {
                                temperature: 0.7,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: 1024,
                            },
                            safetySettings: [
                                {
                                    category: "HARM_CATEGORY_HARASSMENT",
                                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                                },
                                {
                                    category: "HARM_CATEGORY_HATE_SPEECH",
                                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                                },
                                {
                                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                                },
                                {
                                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                                }
                            ]
                        })
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
                }

                const data = await response.json();
                const text = data.candidates[0].content.parts[0].text;

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
                disabled={yukleniyor}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {yukleniyor ? 'Analiz Ediliyor...' : 'Soruları Doğrula'}
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