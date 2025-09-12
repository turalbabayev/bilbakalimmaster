import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import StepOne from './StepOne';
import StepTwo from './StepTwo';
import StepThree from './StepThree';
import StepFour from './StepFour';
import StepFive from './StepFive';
import StepSix from './StepSix';
import { toast } from 'react-hot-toast';

const CreateExamModal = ({ 
    isOpen, 
    onClose, 
    konular, 
    konuIstatistikleri, 
    loading,
    onComplete 
}) => {
    const [modalStep, setModalStep] = useState(1);
    const [selectionMethod, setSelectionMethod] = useState('');
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [selectedDifficulties, setSelectedDifficulties] = useState(['easy', 'medium', 'hard']);
    const [automaticDifficultyDistribution, setAutomaticDifficultyDistribution] = useState(true);
    const [manualDifficultyCount, setManualDifficultyCount] = useState({
        easy: 30,
        medium: 50,
        hard: 20
    });
    const [selectedQuestions, setSelectedQuestions] = useState({});
    const [automaticTopicSelections, setAutomaticTopicSelections] = useState({
        'Genel Bankacılık': {},
        'Genel Kültür': {},
        'Genel Yetenek': {}
    });

    // Modal'ı kapat ve sıfırla
    const closeModal = () => {
        onClose();
        setModalStep(1);
        setSelectionMethod('');
        setSelectedDifficulties(['easy', 'medium', 'hard']);
        setSelectedTopics([]);
        setAutomaticDifficultyDistribution(true);
        setManualDifficultyCount({ easy: 30, medium: 50, hard: 20 });
        setAutomaticTopicSelections({
            'Genel Bankacılık': {},
            'Genel Kültür': {},
            'Genel Yetenek': {}
        });
    };

    // Bir sonraki adıma geç
    const nextStep = () => {
        if (modalStep === 1) {
            if (!selectionMethod) {
                return;
            }
            if (selectionMethod === 'automatic') {
                setModalStep(3);
            } else {
                setModalStep(2);
            }
        } else if (modalStep === 2) {
            if (selectedTopics.length === 0) {
                return;
            }
            setModalStep(3);
        } else if (modalStep === 3) {
            if (selectedDifficulties.length === 0) {
                return;
            }
            
            // Debug için log ekle
            console.log('Modal Step 3 - Debug Info:');
            console.log('selectionMethod:', selectionMethod);
            console.log('automaticDifficultyDistribution:', automaticDifficultyDistribution);
            
            // Otomatik seçimde manuel zorluk dağılımı için 100 soru sınırı kontrolü
            if (selectionMethod === 'automatic' && !automaticDifficultyDistribution) {
                const totalSelected = Object.entries(manualDifficultyCount)
                    .filter(([key]) => selectedDifficulties.includes(key))
                    .reduce((total, [, count]) => total + count, 0);
                
                if (totalSelected > 100) {
                    toast.error("Toplam soru sayısı 100'ü geçemez! Lütfen sayıları azaltın.");
                    return;
                }
                
                if (totalSelected === 0) {
                    toast.error("En az 1 soru seçmelisiniz!");
                    return;
                }
            }
            
            if (selectionMethod === 'automatic') {
                // Otomatik seçimde en az 1 konu ve toplam > 0 adet olmalı
                const totalSelectedTopics = Object.values(automaticTopicSelections).reduce((sum, cat) => sum + Object.keys(cat).length, 0);
                const totalPlanned = Object.values(automaticTopicSelections).reduce((sum, cat) => sum + Object.values(cat).reduce((s, v) => s + (parseInt(v)||0), 0), 0);
                if (totalSelectedTopics === 0 || totalPlanned === 0) {
                    toast.error('Otomatik seçimde her başlık için konuları ve adetleri belirleyin (en az 1).');
                    return;
                }
                // Otomatik seçimde hem otomatik hem manuel dağılım için adım 4'e git
                console.log('Otomatik seçim - Adım 4\'e geçiliyor');
                setModalStep(4);
            } else {
                // Manuel seçim - StepFive'e git (soru görüntüleme)
                console.log('Manuel seçim - StepFive\'e geçiliyor (soru görüntüleme)');
                setModalStep(5);
            }
        } else if (modalStep === 4) {
            setModalStep(5);
        } else if (modalStep < 6) {
            setModalStep(modalStep + 1);
        }
    };

    // Bir önceki adıma dön
    const previousStep = () => {
        if (modalStep === 2) {
            setModalStep(1);
        } else if (modalStep === 3) {
            if (selectionMethod === 'automatic') {
                setModalStep(1);
            } else {
                setModalStep(2);
            }
        } else if (modalStep === 4) {
            setModalStep(3);
        } else if (modalStep === 5) {
            if (selectionMethod === 'automatic') {
                setModalStep(4);
            } else {
                setModalStep(3);
            }
        } else if (modalStep === 6) {
            setModalStep(5);
        }
    };

    const getStepTitle = () => {
        switch (modalStep) {
            case 1: return 'Soru Seçim Yöntemi';
            case 2: return 'Konu Seçimi';
            case 3: return 'Zorluk Seviyesi Seçimi';
            case 4: return 'Otomatik Soru Dağılımı';
            case 5: return 'Seçilen Sorular';
            case 6: return 'Sınav Bilgileri';
            default: return '';
        }
    };

    const getStepDescription = () => {
        switch (modalStep) {
            case 1: return 'Soruları nasıl seçmek istiyorsunuz?';
            case 2: return 'Sınava dahil etmek istediğiniz konuları seçin';
            case 3: return 'Hangi zorluk seviyesindeki soruları dahil etmek istiyorsunuz?';
            case 4: return 'Hangi otomatik soru dağılımını seçmek istiyorsunuz?';
            case 5: return 'Sınavınız için seçilen soruları inceleyin';
            case 6: return 'Son olarak sınavınız için gerekli bilgileri girin';
            default: return '';
        }
    };

    // Soruları görüntüle
    const viewQuestions = () => {
        setModalStep(5);
    };

    // StepFive'dan gelen soruları kaydet ve StepSix'e geç
    const handleStepFiveComplete = (questions) => {
        setSelectedQuestions(questions);
        setModalStep(6);
    };

    // StepSix'dan gelen final sınav verisini işle
    const handleFinalExamCreate = (examData) => {
        console.log('Final sınav verisi:', examData);
        onComplete(examData);
        closeModal();
    };

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="fixed inset-0 z-50" onClose={closeModal}>
                <Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white p-8 shadow-xl transition-all">
                                {/* Modal Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <Dialog.Title className="text-2xl font-bold text-gray-900">
                                            {getStepTitle()}
                                        </Dialog.Title>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {getStepDescription()}
                                        </p>
                                        
                                        {/* Adım Göstergesi */}
                                        <div className="flex items-center mt-3">
                                            {selectionMethod === 'automatic' ? (
                                                <>
                                                    <div className={`w-3 h-3 rounded-full ${modalStep === 1 ? 'bg-blue-500' : modalStep > 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    <div className="w-6 h-0.5 bg-gray-300 mx-1"></div>
                                                    <div className={`w-3 h-3 rounded-full ${modalStep === 3 ? 'bg-blue-500' : modalStep > 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    <div className="w-6 h-0.5 bg-gray-300 mx-1"></div>
                                                    <div className={`w-3 h-3 rounded-full ${modalStep === 4 ? 'bg-blue-500' : modalStep > 4 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    <div className="w-6 h-0.5 bg-gray-300 mx-1"></div>
                                                    <div className={`w-3 h-3 rounded-full ${modalStep === 5 ? 'bg-blue-500' : modalStep > 5 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    <div className="w-6 h-0.5 bg-gray-300 mx-1"></div>
                                                    <div className={`w-3 h-3 rounded-full ${modalStep === 6 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                                    <span className="ml-3 text-xs text-gray-500">
                                                        Adım {modalStep === 1 ? 1 : modalStep === 3 ? 2 : modalStep === 4 ? 3 : modalStep === 5 ? 4 : 5}/5
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className={`w-3 h-3 rounded-full ${modalStep === 1 ? 'bg-blue-500' : modalStep > 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    <div className="w-6 h-0.5 bg-gray-300 mx-1"></div>
                                                    <div className={`w-3 h-3 rounded-full ${modalStep === 2 ? 'bg-blue-500' : modalStep > 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    <div className="w-6 h-0.5 bg-gray-300 mx-1"></div>
                                                    <div className={`w-3 h-3 rounded-full ${modalStep === 3 ? 'bg-blue-500' : modalStep > 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    <div className="w-6 h-0.5 bg-gray-300 mx-1"></div>
                                                    <div className={`w-3 h-3 rounded-full ${modalStep === 5 ? 'bg-blue-500' : modalStep > 5 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    <div className="w-6 h-0.5 bg-gray-300 mx-1"></div>
                                                    <div className={`w-3 h-3 rounded-full ${modalStep === 6 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                                    <span className="ml-3 text-xs text-gray-500">
                                                        Adım {modalStep === 1 ? 1 : modalStep === 2 ? 2 : modalStep === 3 ? 3 : modalStep === 5 ? 4 : 5}/5
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={closeModal}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <FaTimes className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="space-y-4">
                                    {modalStep === 1 && (
                                        <StepOne 
                                            selectionMethod={selectionMethod}
                                            onSelectMethod={setSelectionMethod}
                                        />
                                    )}
                                    
                                    {modalStep === 2 && (
                                        <StepTwo 
                                            konular={konular}
                                            konuIstatistikleri={konuIstatistikleri}
                                            loading={loading}
                                            selectedTopics={selectedTopics}
                                            onToggleTopicSelection={(topicId) => {
                                                setSelectedTopics(prev => {
                                                    if (prev.includes(topicId)) {
                                                        return prev.filter(id => id !== topicId);
                                                    } else {
                                                        return [...prev, topicId];
                                                    }
                                                });
                                            }}
                                        />
                                    )}
                                    
                                    {modalStep === 3 && (
                                        <StepThree 
                                            selectionMethod={selectionMethod}
                                            selectedTopics={selectedTopics}
                                            selectedDifficulties={selectedDifficulties}
                                            onToggleDifficultySelection={(difficulty) => {
                                                setSelectedDifficulties(prev => {
                                                    if (prev.includes(difficulty)) {
                                                        const newSelection = prev.filter(d => d !== difficulty);
                                                        if (newSelection.length === 0) {
                                                            return prev;
                                                        }
                                                        return newSelection;
                                                    } else {
                                                        return [...prev, difficulty];
                                                    }
                                                });
                                            }}
                                            automaticDifficultyDistribution={automaticDifficultyDistribution}
                                            onSetAutomaticDifficultyDistribution={setAutomaticDifficultyDistribution}
                                            manualDifficultyCount={manualDifficultyCount}
                                            onSetManualDifficultyCount={setManualDifficultyCount}
                                            konular={konular}
                                            automaticTopicSelections={automaticTopicSelections}
                                            onSetAutomaticTopicSelections={setAutomaticTopicSelections}
                                        />
                                    )}
                                    
                                    {modalStep === 4 && (
                                        <StepFour 
                                            selectedDifficulties={selectedDifficulties}
                                            automaticDifficultyDistribution={automaticDifficultyDistribution}
                                            manualDifficultyCount={manualDifficultyCount}
                                            automaticTopicSelections={automaticTopicSelections}
                                            onViewQuestions={viewQuestions}
                                            onComplete={() => {
                                                onComplete({
                                                    method: selectionMethod,
                                                    topics: selectedTopics,
                                                    difficulties: selectedDifficulties,
                                                    manualCounts: manualDifficultyCount,
                                                    automaticDifficultyDistribution: automaticDifficultyDistribution,
                                                    automaticTopicSelections: automaticTopicSelections
                                                });
                                                closeModal();
                                            }}
                                        />
                                    )}
                                    
                                    {modalStep === 5 && (
                                        <StepFive 
                                            selectionMethod={selectionMethod}
                                            selectedTopics={selectedTopics}
                                            selectedDifficulties={selectedDifficulties}
                                            automaticDifficultyDistribution={automaticDifficultyDistribution}
                                            manualDifficultyCount={manualDifficultyCount}
                                            automaticTopicSelections={automaticTopicSelections}
                                            onBack={previousStep}
                                            onComplete={handleStepFiveComplete}
                                        />
                                    )}

                                    {modalStep === 6 && (
                                        <StepSix 
                                            selectedQuestions={selectedQuestions}
                                            onBack={previousStep}
                                            onComplete={handleFinalExamCreate}
                                        />
                                    )}
                                </div>

                                {/* Modal Footer */}
                                {modalStep < 5 && (
                                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                                        <div>
                                            {modalStep > 1 && (
                                                <button
                                                    onClick={previousStep}
                                                    className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800"
                                                >
                                                    <FaChevronLeft className="h-4 w-4 mr-1" />
                                                    Geri
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="flex gap-3">
                                            <button
                                                onClick={closeModal}
                                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                            >
                                                İptal
                                            </button>
                                            
                                            {modalStep < 4 && (
                                                <button 
                                                    onClick={nextStep}
                                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={
                                                        (modalStep === 1 && !selectionMethod) ||
                                                        (modalStep === 2 && selectedTopics.length === 0) ||
                                                        (modalStep === 3 && selectedDifficulties.length === 0) ||
                                                        (modalStep === 3 && selectionMethod === 'automatic' && !automaticDifficultyDistribution && 
                                                            Object.entries(manualDifficultyCount)
                                                                .filter(([key]) => selectedDifficulties.includes(key))
                                                                .reduce((total, [, count]) => total + count, 0) > 100)
                                                    }
                                                >
                                                    {(() => {
                                                        let buttonText;
                                                        if (modalStep === 3 && selectionMethod === 'manual') {
                                                            buttonText = 'Seçimi Tamamla';
                                                        } else if (modalStep === 3 && selectionMethod === 'automatic') {
                                                            buttonText = 'Dağılımı Gör';
                                                        } else {
                                                            buttonText = 'Devam Et';
                                                        }
                                                        
                                                        // Debug için console.log
                                                        if (modalStep === 3) {
                                                            console.log('Button text:', buttonText);
                                                            console.log('Button conditions - selectionMethod:', selectionMethod, 'automaticDifficultyDistribution:', automaticDifficultyDistribution);
                                                        }
                                                        
                                                        return buttonText;
                                                    })()}
                                                    <FaChevronRight className="h-4 w-4 ml-1" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default CreateExamModal; 