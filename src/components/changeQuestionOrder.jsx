import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, get, update } from "firebase/database";

const ChangeQuestionOrder = ({ isOpen, onClose, soruRefPath, konuId, altKonuId }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentNumber, setCurrentNumber] = useState(0);
    const [targetNumber, setTargetNumber] = useState(0);
    const [currentKey, setCurrentKey] = useState("");
    const [sorularPath, setSorularPath] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Modal açıldığında verileri yükle
    useEffect(() => {
        if (!isOpen || !soruRefPath) return;
        
        const fetchData = async () => {
            console.log("📢 HATA AYIKLAMA - Veriler yükleniyor, soruRefPath:", soruRefPath);
            setLoading(true);
            setError(null);
            
            try {
                // 1. Mevcut soruyu yükle
                const currentQuestionSnapshot = await get(ref(database, soruRefPath));
                
                if (!currentQuestionSnapshot.exists()) {
                    console.error("❌ Soru bulunamadı:", soruRefPath);
                    throw new Error("Soru bulunamadı");
                }
                
                const currentQuestion = currentQuestionSnapshot.val();
                console.log("✅ Mevcut soru yüklendi:", currentQuestion);
                
                // 2. Path bilgilerini ayır
                const pathParts = soruRefPath.split('/');
                console.log("📊 Path parçaları:", pathParts);
                
                const currentId = pathParts.pop(); // Son eleman soru ID'si
                
                // ÖNEMLİ: Burada düzeltme yapıyoruz. Sorular yerine soruyu arıyoruz
                // Eğer son eleman "sorular" değilse, bir sorun var demektir
                let questionsPath = pathParts.join('/');
                
                console.log("📊 Sorular path (ham):", questionsPath);
                
                // Hata düzeltme: Yol "sorular" ile bitmiyorsa ekle
                if (!questionsPath.endsWith("/sorular")) {
                    console.warn("⚠️ Yol 'sorular' ile bitmiyor!");
                    
                    // Olası yanlış format düzeltmeleri
                    if (questionsPath.includes("/sorular/")) {
                        // Eğer sorular/ ile devam ediyorsa, soru ID'sini çıkar
                        questionsPath = questionsPath.split("/sorular/")[0] + "/sorular";
                        console.log("🔧 Düzeltilmiş sorular path:", questionsPath);
                    }
                }
                
                console.log("📊 Sorular path (final):", questionsPath);
                console.log("📊 Mevcut soru ID:", currentId);
                
                // 3. Tüm soruları yükle
                const allQuestionsSnapshot = await get(ref(database, questionsPath));
                
                if (!allQuestionsSnapshot.exists()) {
                    console.error("❌ Sorular koleksiyonu bulunamadı:", questionsPath);
                    throw new Error("Sorular koleksiyonu bulunamadı");
                }
                
                // 4. Soruları diziye dönüştür
                const allQuestionsObj = allQuestionsSnapshot.val();
                console.log("✅ Sorular yüklendi, veri şekli:", typeof allQuestionsObj, Object.keys(allQuestionsObj).length);
                
                const questionsArray = Object.keys(allQuestionsObj).map(key => ({
                    id: key,
                    ...allQuestionsObj[key]
                }));
                
                // 5. Soruları sırala
                questionsArray.sort((a, b) => 
                    (a.soruNumarasi || 999) - (b.soruNumarasi || 999)
                );
                
                console.log("✅ Toplam soru sayısı:", questionsArray.length);
                
                // 6. State'leri güncelle
                setQuestions(questionsArray);
                setCurrentNumber(currentQuestion.soruNumarasi || 0);
                setTargetNumber(currentQuestion.soruNumarasi || 0);
                setCurrentKey(currentId);
                setSorularPath(questionsPath);
                setLoading(false);
                
            } catch (err) {
                console.error("❌ Veri yükleme hatası:", err);
                setError(err.message);
                setLoading(false);
            }
        };
        
        fetchData();
        
        // Cleanup
        return () => {
            setLoading(true);
            setQuestions([]);
            setError(null);
        };
    }, [isOpen, soruRefPath]);
    
    // Soru değiştirme işlemi
    const handleSwapOrder = async () => {
        if (currentNumber === targetNumber) {
            alert("Lütfen farklı bir soru numarası seçin");
            return;
        }
        
        if (loading || isSubmitting || !questions.length) {
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // Hedef soruyu bul
            const targetQuestion = questions.find(q => q.soruNumarasi === targetNumber);
            
            if (!targetQuestion) {
                throw new Error(`${targetNumber} numaralı soru bulunamadı`);
            }
            
            console.log("✅ Değiştirilecek sorular:", {
                "mevcut": { id: currentKey, sıra: currentNumber },
                "hedef": { id: targetQuestion.id, sıra: targetNumber }
            });
            
            // Firebase güncellemelerini hazırla
            const updates = {};
            updates[`${sorularPath}/${currentKey}/soruNumarasi`] = targetNumber;
            updates[`${sorularPath}/${targetQuestion.id}/soruNumarasi`] = currentNumber;
            
            // Güncelleme işlemini gerçekleştir
            await update(ref(database), updates);
            
            console.log("✅ Soru sırası değiştirildi");
            alert("Soru sırası başarıyla değiştirildi");
            onClose();
            
        } catch (err) {
            console.error("❌ Sıralama değiştirme hatası:", err);
            alert("Hata: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 pb-2 border-b">
                    Soru Sırasını Değiştir
                </h2>
                
                {loading ? (
                    <div className="py-10 flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p>Yükleniyor...</p>
                        <p className="text-xs text-gray-500 mt-2">{soruRefPath || "Soru yolu eksik"}</p>
                    </div>
                ) : error ? (
                    <div className="py-10 text-center text-red-500">
                        <div className="text-3xl mb-2">⚠️</div>
                        <p className="font-medium mb-4">{error}</p>
                        <p className="text-xs text-gray-600 mt-2">{soruRefPath || "Soru yolu eksik"}</p>
                    </div>
                ) : questions.length > 0 ? (
                    <div>
                        <div className="mb-4">
                            <p className="font-medium">Mevcut Soru: #{currentNumber}</p>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block mb-2">Takas Edilecek Soru:</label>
                            <select 
                                className="w-full p-2 border rounded"
                                value={targetNumber}
                                onChange={(e) => setTargetNumber(Number(e.target.value))}
                            >
                                {questions.map(q => (
                                    <option key={q.id} value={q.soruNumarasi}>
                                        #{q.soruNumarasi} - {(q.soruMetni || "").slice(0, 30)}
                                        {q.soruMetni?.length > 30 ? "..." : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded mb-4">
                            <h3 className="font-medium mb-2">Tüm Sorular:</h3>
                            <div className="max-h-60 overflow-y-auto">
                                <ul className="space-y-1">
                                    {questions.map(q => (
                                        <li 
                                            key={q.id} 
                                            className={`p-2 rounded ${q.id === currentKey ? 'bg-blue-100' : ''} ${q.soruNumarasi === targetNumber && q.id !== currentKey ? 'bg-yellow-100' : ''}`}
                                        >
                                            <span className="font-medium">#{q.soruNumarasi}</span> - 
                                            {(q.soruMetni || "").slice(0, 40)}
                                            {q.soruMetni?.length > 40 ? "..." : ""}
                                            
                                            {q.id === currentKey && (
                                                <span className="ml-1 text-blue-600 text-xs">(seçili)</span>
                                            )}
                                            {q.soruNumarasi === targetNumber && q.id !== currentKey && (
                                                <span className="ml-1 text-yellow-600 text-xs">(hedef)</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-10 text-center text-gray-500">
                        <p>Soru bulunamadı</p>
                        <p className="text-xs text-gray-400 mt-2">{soruRefPath || "Soru yolu eksik"}</p>
                    </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-3 border-t mt-4">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSwapOrder}
                        disabled={loading || isSubmitting || !questions.length || currentNumber === targetNumber}
                        className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 ${isSubmitting ? 'opacity-70' : ''}`}
                    >
                        {isSubmitting ? "İşleniyor..." : "Sıralamayı Değiştir"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangeQuestionOrder; 