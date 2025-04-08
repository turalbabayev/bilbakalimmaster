import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const QuestionVerification = ({ soru, dogruCevap, cevaplar, onUpdateQuestion }) => {
    const [verificationStatus, setVerificationStatus] = useState('idle');
    const [geminiAnaliz, setGeminiAnaliz] = useState(null);
    const [error, setError] = useState(null);

    const verifyQuestion = async () => {
        try {
            setVerificationStatus('loading');
            setError(null);

            const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            const prompt = `
                Aşağıdaki soruyu ve cevapları analiz et:

                Soru: ${soru}
                
                Cevaplar:
                A) ${cevaplar[0]}
                B) ${cevaplar[1]}
                C) ${cevaplar[2]}
                D) ${cevaplar[3]}
                E) ${cevaplar[4]}
                
                Lütfen aşağıdaki analizleri yap ve JSON formatında yanıt ver:
                1. Doğru cevap şıkkı (A, B, C, D veya E)
                2. Soru hakkında kısa bir açıklama
                3. Şıklarda tekrarlanan cevap var mı? (true/false)
                4. Eğer tekrarlanan cevap varsa, hangi şıklar tekrarlanıyor?
                5. Bu sorunun daha önce sorulmuş olma ihtimali var mı? (true/false)
                6. Eğer daha önce sorulmuş olma ihtimali varsa, neden?

                Yanıtı şu formatta ver:
                {
                    "dogruCevap": "A",
                    "aciklama": "...",
                    "tekrarlananCevapVar": true/false,
                    "tekrarlananSiklar": ["A", "B"],
                    "dahaOnceSorulmus": true/false,
                    "dahaOnceSorulmaNedeni": "..."
                }
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            try {
                const analiz = JSON.parse(text);
                setGeminiAnaliz(analiz);
                setVerificationStatus('completed');
            } catch (parseError) {
                throw new Error('Gemini yanıtı geçerli JSON formatında değil');
            }
        } catch (err) {
            setError('Doğrulama sırasında bir hata oluştu: ' + err.message);
            setVerificationStatus('error');
        }
    };

    const handleUpdateQuestion = () => {
        if (onUpdateQuestion && geminiAnaliz) {
            onUpdateQuestion(cevaplar[geminiAnaliz.dogruCevap.charCodeAt(0) - 65]);
        }
    };

    // Mevcut doğru cevabın şıkkını bul
    const currentAnswerIndex = cevaplar.indexOf(dogruCevap);
    const currentAnswerLetter = String.fromCharCode(65 + currentAnswerIndex);

    return (
        <div className="p-4 border rounded-lg shadow-sm">
            <button
                onClick={verifyQuestion}
                disabled={verificationStatus === 'loading'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
                {verificationStatus === 'loading' ? 'Doğrulanıyor...' : 'Soruyu Doğrula'}
            </button>

            {verificationStatus === 'loading' && (
                <div className="mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            {verificationStatus === 'completed' && geminiAnaliz && (
                <div className="mt-4 space-y-4">
                    <div className="p-4 bg-gray-50 rounded">
                        <h3 className="font-semibold mb-2">Doğrulama Sonucu:</h3>
                        <div className="space-y-2">
                            <p className="font-medium">Sistemdeki Doğru Cevap: {currentAnswerLetter}) {dogruCevap}</p>
                            <p className="font-medium">Gemini'nin Önerdiği Cevap: {geminiAnaliz.dogruCevap}) {cevaplar[geminiAnaliz.dogruCevap.charCodeAt(0) - 65]}</p>
                            
                            <div className="mt-4">
                                <h4 className="font-medium mb-2">Soru Analizi:</h4>
                                <p className="text-gray-700">{geminiAnaliz.aciklama}</p>
                            </div>

                            {geminiAnaliz.tekrarlananCevapVar && (
                                <div className="mt-4 p-3 bg-yellow-50 rounded">
                                    <p className="text-yellow-800">
                                        ⚠️ Tekrarlanan cevaplar tespit edildi: {geminiAnaliz.tekrarlananSiklar.join(', ')}
                                    </p>
                                </div>
                            )}

                            {geminiAnaliz.dahaOnceSorulmus && (
                                <div className="mt-4 p-3 bg-orange-50 rounded">
                                    <p className="text-orange-800">
                                        ⚠️ Bu soru daha önce sorulmuş olabilir: {geminiAnaliz.dahaOnceSorulmaNedeni}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {geminiAnaliz.dogruCevap !== currentAnswerLetter && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-yellow-800 mb-2">
                                Gemini'nin önerdiği cevap ile sistemdeki cevap farklı. Soruyu güncellemek ister misiniz?
                            </p>
                            <button
                                onClick={handleUpdateQuestion}
                                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                            >
                                Soruyu Güncelle
                            </button>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 rounded">
                    {error}
                </div>
            )}
        </div>
    );
};

export default QuestionVerification; 