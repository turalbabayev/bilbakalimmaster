import React, { useState, useEffect } from 'react';
import { FaQuestionCircle, FaList, FaDatabase } from 'react-icons/fa';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const StepTwo = ({ 
    konular, 
    konuIstatistikleri, 
    loading, 
    selectedTopics, 
    onToggleTopicSelection 
}) => {
    const [manualTopics, setManualTopics] = useState([]);
    const [manualLoading, setManualLoading] = useState(false);

    // Manuel soruların konularını yükle
    useEffect(() => {
        setManualLoading(true);
        const unsubscribe = onSnapshot(collection(db, 'manual-questions'), (snapshot) => {
            const questions = snapshot.docs.map(doc => doc.data());
            
            // Benzersiz konuları bul ve soru sayılarını hesapla
            const topicCounts = {};
            questions.forEach(question => {
                if (question.topicName && question.topicName.trim()) {
                    const topicName = question.topicName.trim();
                    topicCounts[topicName] = (topicCounts[topicName] || 0) + 1;
                }
            });

            // Manuel konuları oluştur
            const manualTopicsList = Object.entries(topicCounts).map(([topicName, count]) => ({
                id: `manual-${topicName}`,
                baslik: topicName,
                soruSayisi: count,
                isManual: true
            }));

            setManualTopics(manualTopicsList);
            setManualLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Tüm konuları birleştir
    const allTopics = [
        ...konular.map(konu => ({
            ...konu,
            soruSayisi: konuIstatistikleri[konu.id]?.soruSayisi || 0,
            isManual: false
        })),
        ...manualTopics
    ];

    if (loading || manualLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Konular yükleniyor...</span>
            </div>
        );
    }

    if (allTopics.length === 0) {
        return (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FaList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Henüz hiç konu bulunamadı.</p>
                <p className="text-sm text-gray-400 mt-2">Önce konular eklenmelidir.</p>
            </div>
        );
    }

    return (
        <>
            {/* Konu Kategorileri Açıklaması */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <FaQuestionCircle className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Normal Konular</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FaDatabase className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Manuel Soru Havuzu</span>
                    </div>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                    Hem mevcut konu bankasından hem de manuel eklediğiniz sorulardan seçim yapabilirsiniz.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
                {allTopics.map((topic) => {
                    const isSelected = selectedTopics.includes(topic.id);
                    
                    return (
                        <div
                            key={topic.id}
                            onClick={() => onToggleTopicSelection(topic.id)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                isSelected 
                                    ? topic.isManual
                                        ? 'border-green-500 bg-green-50 shadow-md'
                                        : 'border-blue-500 bg-blue-50 shadow-md'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`font-medium ${
                                            isSelected 
                                                ? topic.isManual ? 'text-green-900' : 'text-blue-900'
                                                : 'text-gray-900'
                                        }`}>
                                            {topic.baslik || "Başlık Yok"}
                                        </h3>
                                        {topic.isManual && (
                                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                                Manuel
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center mt-2">
                                        {topic.isManual ? (
                                            <FaDatabase className={`h-4 w-4 mr-1 ${
                                                isSelected ? 'text-green-600' : 'text-gray-500'
                                            }`} />
                                        ) : (
                                            <FaQuestionCircle className={`h-4 w-4 mr-1 ${
                                                isSelected ? 'text-blue-600' : 'text-gray-500'
                                            }`} />
                                        )}
                                        <span className={`text-sm ${
                                            isSelected 
                                                ? topic.isManual ? 'text-green-700' : 'text-blue-700'
                                                : 'text-gray-600'
                                        }`}>
                                            {topic.soruSayisi} soru
                                        </span>
                                    </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isSelected 
                                        ? topic.isManual
                                            ? 'border-green-500 bg-green-500'
                                            : 'border-blue-500 bg-blue-500'
                                        : 'border-gray-300'
                                }`}>
                                    {isSelected && (
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Seçim Özeti */}
            {selectedTopics.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-blue-900 mb-2">Seçilen Konular:</h4>
                    <div className="flex flex-wrap gap-2">
                        {selectedTopics.map(topicId => {
                            const topic = allTopics.find(t => t.id === topicId);
                            return (
                                <span key={topicId} className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded ${
                                    topic?.isManual 
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-blue-100 text-blue-800'
                                }`}>
                                    {topic?.isManual && <FaDatabase className="w-3 h-3 mr-1" />}
                                    {topic?.baslik} ({topic?.soruSayisi} soru)
                                </span>
                            );
                        })}
                    </div>
                    <p className="text-sm text-blue-700 mt-2">
                        Toplam: {selectedTopics.reduce((total, topicId) => {
                            const topic = allTopics.find(t => t.id === topicId);
                            return total + (topic?.soruSayisi || 0);
                        }, 0)} soru
                    </p>
                </div>
            )}
        </>
    );
};

export default StepTwo; 