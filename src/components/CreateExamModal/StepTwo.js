import React from 'react';
import { FaQuestionCircle, FaList } from 'react-icons/fa';

const StepTwo = ({ 
    konular, 
    konuIstatistikleri, 
    loading, 
    selectedTopics, 
    onToggleTopicSelection 
}) => {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Konular yükleniyor...</span>
            </div>
        );
    }

    if (konular.length === 0) {
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
                {konular.map((konu) => {
                    const istatistik = konuIstatistikleri[konu.id] || { soruSayisi: 0 };
                    const isSelected = selectedTopics.includes(konu.id);
                    
                    return (
                        <div
                            key={konu.id}
                            onClick={() => onToggleTopicSelection(konu.id)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                isSelected 
                                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                        {konu.baslik || "Başlık Yok"}
                                    </h3>
                                    <div className="flex items-center mt-2">
                                        <FaQuestionCircle className={`h-4 w-4 mr-1 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                                        <span className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                                            {istatistik.soruSayisi} soru
                                        </span>
                                    </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isSelected 
                                        ? 'border-blue-500 bg-blue-500' 
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
                            const konu = konular.find(k => k.id === topicId);
                            const istatistik = konuIstatistikleri[topicId] || { soruSayisi: 0 };
                            return (
                                <span key={topicId} className="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                    {konu?.baslik} ({istatistik.soruSayisi} soru)
                                </span>
                            );
                        })}
                    </div>
                    <p className="text-sm text-blue-700 mt-2">
                        Toplam: {selectedTopics.reduce((total, topicId) => {
                            const istatistik = konuIstatistikleri[topicId] || { soruSayisi: 0 };
                            return total + istatistik.soruSayisi;
                        }, 0)} soru
                    </p>
                </div>
            )}
        </>
    );
};

export default StepTwo; 