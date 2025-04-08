import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const BulkQuestionVerification = ({ sorular }) => {
    const [verificationStatus, setVerificationStatus] = useState('idle');
    const [sonuclar, setSonuclar] = useState([]);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);

    const verifyAllQuestions = async () => {
        try {
            setVerificationStatus('loading');
            setError(null);
            setSonuclar([]);
            setProgress(0);

            const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            const yeniSonuclar = [];

            for (let i = 0; i < sorular.length; i++) {
                const soru = sorular[i];
                setProgress(Math.round((i / sorular.length) * 100));

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
                        const currentAnswerIndex = soru.cevaplar.indexOf(soru.dogruCevap);
                        const currentAnswerLetter = String.fromCharCode(65 + currentAnswerIndex);

                        yeniSonuclar.push({
                            soruId: soru.id,
                            soruMetni: soru.soruMetni,
                            sistemCevap: currentAnswerLetter,
                            geminiCevap: analiz.dogruCevap,
                            analiz: analiz,
                            farkliCevap: analiz.dogruCevap !== currentAnswerLetter
                        });
                    } catch (parseError) {
                        yeniSonuclar.push({
                            soruId: soru.id,
                            soruMetni: soru.soruMetni,
                            hata: 'Gemini yanıtı geçerli JSON formatında değil'
                        });
                    }
                } catch (err) {
                    yeniSonuclar.push({
                        soruId: soru.id,
                        soruMetni: soru.soruMetni,
                        hata: err.message
                    });
                }
            }

            setSonuclar(yeniSonuclar);
            setVerificationStatus('completed');
        } catch (err) {
            setError('Toplu doğrulama sırasında bir hata oluştu: ' + err.message);
            setVerificationStatus('error');
        }
    };

    const farkliCevapSayisi = sonuclar.filter(s => s.farkliCevap).length;
    const hataSayisi = sonuclar.filter(s => s.hata).length;
    const tekrarlananCevapSayisi = sonuclar.filter(s => s.analiz?.tekrarlananCevapVar).length;
    const dahaOnceSorulmusSayisi = sonuclar.filter(s => s.analiz?.dahaOnceSorulmus).length;

    return (
        <div className="p-4 border rounded-lg shadow-sm">
            <button
                onClick={verifyAllQuestions}
                disabled={verificationStatus === 'loading'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
                {verificationStatus === 'loading' ? 'Doğrulanıyor...' : 'Tüm Soruları Doğrula'}
            </button>

            {verificationStatus === 'loading' && (
                <div className="mt-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                                className="bg-blue-600 h-2.5 rounded-full" 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600">{progress}%</span>
                    </div>
                </div>
            )}

            {verificationStatus === 'completed' && (
                <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{farkliCevapSayisi}</div>
                            <div className="text-sm text-red-600">Farklı Cevap</div>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600">{tekrarlananCevapSayisi}</div>
                            <div className="text-sm text-yellow-600">Tekrarlanan Cevap</div>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">{dahaOnceSorulmusSayisi}</div>
                            <div className="text-sm text-orange-600">Daha Önce Sorulmuş</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-600">{hataSayisi}</div>
                            <div className="text-sm text-gray-600">Hata</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {sonuclar.map((sonuc, index) => (
                            <div key={sonuc.soruId} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-medium">Soru {index + 1}</h3>
                                    {sonuc.farkliCevap && (
                                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-sm">
                                            Farklı Cevap
                                        </span>
                                    )}
                                </div>
                                
                                <p className="mt-2 text-gray-700">{sonuc.soruMetni}</p>
                                
                                {sonuc.hata ? (
                                    <div className="mt-2 p-2 bg-red-50 text-red-600 rounded">
                                        Hata: {sonuc.hata}
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-2">
                                        <div className="flex justify-between">
                                            <span>Sistem Cevap: {sonuc.sistemCevap}</span>
                                            <span>Gemini Cevap: {sonuc.geminiCevap}</span>
                                        </div>
                                        
                                        <div className="mt-2">
                                            <h4 className="font-medium">Analiz:</h4>
                                            <p className="text-gray-700">{sonuc.analiz.aciklama}</p>
                                        </div>

                                        {sonuc.analiz.tekrarlananCevapVar && (
                                            <div className="mt-2 p-2 bg-yellow-50 rounded">
                                                ⚠️ Tekrarlanan cevaplar: {sonuc.analiz.tekrarlananSiklar.join(', ')}
                                            </div>
                                        )}

                                        {sonuc.analiz.dahaOnceSorulmus && (
                                            <div className="mt-2 p-2 bg-orange-50 rounded">
                                                ⚠️ Daha önce sorulmuş: {sonuc.analiz.dahaOnceSorulmaNedeni}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
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

export default BulkQuestionVerification; 