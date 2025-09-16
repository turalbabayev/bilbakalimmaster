import React, { useState } from 'react';
import { FaTimes, FaCheck } from 'react-icons/fa';

const AutoFillExamModal = ({ isOpen, onClose, onConfirm }) => {
    const [selectedOption, setSelectedOption] = useState('');

    const handleConfirm = () => {
        if (!selectedOption) return;
        onConfirm(selectedOption);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Sınav Kimler İçin?</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <FaTimes className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedOption === 'servis'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedOption('servis')}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    selectedOption === 'servis'
                                        ? 'border-blue-500 bg-blue-500'
                                        : 'border-gray-300'
                                }`}>
                                    {selectedOption === 'servis' && (
                                        <FaCheck className="h-3 w-3 text-white" />
                                    )}
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">Servis Görevlisi ve Servis Yetkilileri için</div>
                                </div>
                            </div>
                        </div>

                        <div
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedOption === 'yonetim'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedOption('yonetim')}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    selectedOption === 'yonetim'
                                        ? 'border-blue-500 bg-blue-500'
                                        : 'border-gray-300'
                                }`}>
                                    {selectedOption === 'yonetim' && (
                                        <FaCheck className="h-3 w-3 text-white" />
                                    )}
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">Yönetmen Yardımcısı ve Yönetmen için</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedOption}
                            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white transition-colors"
                        >
                            Onayla
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutoFillExamModal;
