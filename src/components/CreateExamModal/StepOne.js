import React from 'react';
import { FaCheck } from 'react-icons/fa';

const StepOne = ({ selectionMethod, onSelectMethod }) => {
    const getSelectionMethodText = () => {
        if (!selectionMethod) return 'Seçim yöntemi belirlenmedi';
        return selectionMethod === 'manual' ? 'Manuel Seçim' : 'Otomatik Seçim';
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Soru Seçim Yöntemini Belirleyin:</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                    { 
                        key: 'manual', 
                        title: 'Manuel Seçim', 
                        icon: '🎯', 
                        desc: 'Soruları tek tek kendiniz seçin',
                        features: ['Tam kontrol', 'Özel soru seçimi', 'Detaylı inceleme']
                    },
                    { 
                        key: 'automatic', 
                        title: 'Otomatik Seçim', 
                        icon: '🤖', 
                        desc: 'Sistem size uygun soruları otomatik seçsin',
                        features: ['Hızlı oluşturma', 'Dengeli dağılım', 'Zaman tasarrufu']
                    }
                ].map((method) => {
                    const isSelected = selectionMethod === method.key;
                    
                    return (
                        <div
                            key={method.key}
                            onClick={() => onSelectMethod(method.key)}
                            className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                isSelected 
                                    ? 'border-blue-500 bg-blue-50 shadow-lg' 
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                            }`}
                        >
                            <div className="text-center">
                                <div className="text-4xl mb-3">{method.icon}</div>
                                <h4 className={`text-xl font-semibold mb-2 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                    {method.title}
                                </h4>
                                <p className={`text-sm mb-4 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                                    {method.desc}
                                </p>
                                
                                <div className="space-y-2">
                                    {method.features.map((feature, index) => (
                                        <div key={index} className="flex items-center justify-center">
                                            <FaCheck className={`h-3 w-3 mr-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                            <span className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto mt-4 ${
                                    isSelected 
                                        ? 'border-blue-500 bg-blue-500' 
                                        : 'border-gray-300'
                                }`}>
                                    {isSelected && (
                                        <FaCheck className="w-3 h-3 text-white" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Seçim Özeti */}
            {selectionMethod && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <h4 className="font-medium text-blue-900 mb-2">Seçiminiz:</h4>
                    <p className="text-sm text-blue-700">
                        <strong>{getSelectionMethodText()}</strong> 
                        {selectionMethod === 'manual' 
                            ? ' - Soruları tek tek inceleyip seçebileceksiniz.'
                            : ' - Sistem belirlediğiniz kriterlere göre otomatik soru seçimi yapacak.'
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default StepOne; 