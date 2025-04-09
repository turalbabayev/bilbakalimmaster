import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, update, get } from "firebase/database";

const ChangeQuestionOrder = ({ isOpen, onClose, soruRefPath, konuId, altKonuId, altDalId }) => {
    const [allQuestions, setAllQuestions] = useState([]);
    const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
    const [targetQuestionNumber, setTargetQuestionNumber] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentSoruKey, setCurrentSoruKey] = useState("");
    const [basePath, setBasePath] = useState("");
    
    useEffect(() => {
        if (!isOpen || !soruRefPath) return;
        
        // Mevcut sorunun verilerini yükle
        const loadCurrentQuestion = async () => {
            setIsLoading(true);
            
            try {
                console.log('Modal açıldı, sorular yükleniyor... SoruRefPath:', soruRefPath);
                
                // Mevcut soru referansından soru ID'sini ve ana yolu al
                const pathParts = soruRefPath.split('/');
                const currentKey = pathParts.pop(); // Soru ID'si
                setCurrentSoruKey(currentKey);
                
                // "konular/konuId/altkonular/altKonuId/sorular" şeklinde path oluştur
                // "sorular/soruId" kısmını çıkararak ana dizine ulaşalım
                let soruDizini = '';
                
                if (soruRefPath.includes('/sorular/')) {
                    soruDizini = soruRefPath.split('/sorular/')[0] + '/sorular';
                } else {
                    // Alternatif olarak manuel oluşturalım
                    soruDizini = `konular/${konuId}/altkonular/${altKonuId}/sorular`;
                }
                
                setBasePath(soruDizini);
                console.log('Oluşturulan sorular dizini:', soruDizini);
                console.log('Soru anahtarı:', currentKey);
                
                // Mevcut soruyu yükle
                const currentQuestionRef = ref(database, soruRefPath);
                const currentSnapshot = await get(currentQuestionRef);
                
                if (!currentSnapshot.exists()) {
                    console.error('Mevcut soru bulunamadı:', soruRefPath);
                    throw new Error('Mevcut soru bulunamadı!');
                }
                
                const currentQuestion = currentSnapshot.val();
                console.log('Mevcut soru:', currentQuestion);
                
                if (currentQuestion) {
                    setCurrentQuestionNumber(currentQuestion.soruNumarasi || 0);
                    setTargetQuestionNumber(currentQuestion.soruNumarasi || 0);
                } else {
                    console.warn('Mevcut soruda veri yok:', currentQuestion);
                }
                
                // Tüm soruları yükle
                const allQuestionsRef = ref(database, soruDizini);
                const allQuestionsSnapshot = await get(allQuestionsRef);
                
                if (!allQuestionsSnapshot.exists()) {
                    console.error('Sorular bulunamadı:', soruDizini);
                    throw new Error('Sorular listesi bulunamadı!');
                }
                
                const allQuestionsData = allQuestionsSnapshot.val() || {};
                console.log('Tüm sorular yüklendi:', Object.keys(allQuestionsData).length);
                
                if (Object.keys(allQuestionsData).length === 0) {
                    throw new Error('Bu kategoride hiç soru bulunamadı!');
                }
                
                // Soruları sırala ve ayarla
                const questionsArray = Object.entries(allQuestionsData).map(([key, question]) => {
                    // Eğer soru verisinde id yoksa key'i id olarak ata
                    if (!question.id) {
                        question.id = key;
                    }
                    return {
                        id: key,  // Gerçek Firebase key'i her zaman id olarak sakla
                        ...question
                    };
                });
                
                // Sırala (soruNumarasi yoksa en sona koy)
                const sortedQuestionsArray = questionsArray.sort((a, b) => 
                    (a.soruNumarasi || 999) - (b.soruNumarasi || 999)
                );
                
                setAllQuestions(sortedQuestionsArray);
                
                console.log('Sorular başarıyla yüklendi:', sortedQuestionsArray.length);
                
            } catch (error) {
                console.error("Sorular yüklenirken hata oluştu:", error);
                alert("Sorular yüklenirken bir hata oluştu: " + error.message);
                onClose(); // Hata durumunda modalı kapat
            } finally {
                setIsLoading(false);
            }
        };
        
        loadCurrentQuestion();
    }, [isOpen, soruRefPath, konuId, altKonuId, onClose]);
    
    const handleSwapQuestions = async () => {
        // Hedef numara geçerli değilse işlemi iptal et
        if (targetQuestionNumber <= 0) {
            alert(`Lütfen geçerli bir sıra numarası girin.`);
            return;
        }
        
        // Aynı numara seçildiyse işlemi iptal et
        if (targetQuestionNumber === currentQuestionNumber) {
            alert("Aynı numara seçildi, değişiklik yapılmadı.");
            onClose();
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            console.log('Takas başlatılıyor...');
            console.log('Hedef soru numarası:', targetQuestionNumber);
            console.log('Mevcut soru numarası:', currentQuestionNumber);
            
            // Hedef soru numarasına sahip olan soruyu bul
            const targetQuestion = allQuestions.find(q => q.soruNumarasi === targetQuestionNumber);
            
            if (!targetQuestion) {
                throw new Error(`${targetQuestionNumber} numaralı soru bulunamadı.`);
            }
            
            console.log('Hedef soru bulundu:', targetQuestion);
            
            // Sadece iki sorunun sıra numaralarını değiştir (takas/swap)
            const updates = {};
            
            // Geçerlilik kontrolü
            if (!basePath || !currentSoruKey || !targetQuestion.id) {
                throw new Error("Gerekli bilgiler eksik! Lütfen sayfayı yenileyip tekrar deneyin.");
            }
            
            // Mevcut sorunun numarasını hedef numaraya güncelle
            updates[`${basePath}/${currentSoruKey}/soruNumarasi`] = targetQuestionNumber;
            
            // Hedef sorunun numarasını mevcut numaraya güncelle
            updates[`${basePath}/${targetQuestion.id}/soruNumarasi`] = currentQuestionNumber;
            
            console.log('Güncellenecek veriler:', updates);
            
            // Tüm güncellemeleri tek seferde yap
            await update(ref(database), updates);
            
            alert("Soru sıraları başarıyla takas edildi.");
            onClose();
        } catch (error) {
            console.error("Soru sırası güncellenirken hata oluştu:", error);
            alert(`Soru sırası güncellenirken bir hata oluştu: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b pb-3 border-gray-200 dark:border-gray-700">
                    Soru Sırasını Değiştir
                </h2>
                
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Mevcut Soru Numarası:
                            </label>
                            <input
                                type="number"
                                value={currentQuestionNumber}
                                disabled
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Takas Edilecek Soru Numarası:
                            </label>
                            <input
                                type="number"
                                value={targetQuestionNumber}
                                onChange={(e) => setTargetQuestionNumber(Number(e.target.value))}
                                min="1"
                                max={allQuestions.length}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Bu kategori için olası soru numaraları: 1 - {allQuestions.length}
                            </p>
                        </div>
                        
                        <div className="mt-4 bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg">
                            <h3 className="font-medium text-indigo-800 dark:text-indigo-300 mb-2">Mevcut Soru Sıralaması:</h3>
                            <div className="max-h-40 overflow-y-auto pr-2">
                                <ul className="space-y-1.5">
                                    {allQuestions.map((question) => (
                                        <li 
                                            key={question.id} 
                                            className={`text-sm py-1 px-2 rounded ${
                                                question.id === currentSoruKey
                                                ? 'bg-indigo-100 dark:bg-indigo-800/50 font-medium' 
                                                : question.soruNumarasi === targetQuestionNumber
                                                ? 'bg-amber-100 dark:bg-amber-800/30 font-medium'
                                                : ''
                                            }`}
                                        >
                                            <span className="font-medium mr-2">#{question.soruNumarasi || '?'}</span>
                                            {question.soruMetni?.substring(0, 60)}
                                            {question.soruMetni?.length > 60 ? '...' : ''}
                                            {question.id === currentSoruKey ? 
                                                <span className="ml-1 text-indigo-600 dark:text-indigo-400">(seçili)</span>
                                                : question.soruNumarasi === targetQuestionNumber ?
                                                <span className="ml-1 text-amber-600 dark:text-amber-400">(takas edilecek)</span>
                                                : null
                                            }
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                <strong>Not:</strong> Bu işlem sadece iki sorunun sıra numaralarını takas edecektir. Diğer soruların sıra numaraları değişmeyecektir.
                            </p>
                        </div>
                    </div>
                )}
                
                <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        İptal
                    </button>
                    <button
                        className={`bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all font-medium flex items-center justify-center ${
                            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                        onClick={handleSwapQuestions}
                        disabled={isSubmitting || isLoading}
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Güncelleniyor...
                            </>
                        ) : (
                            "Soruları Takas Et"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangeQuestionOrder; 