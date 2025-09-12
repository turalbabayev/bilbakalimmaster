import React from 'react';
import Lottie from 'lottie-react';
import lookingGoesWrong from '../assets/animations/looking-goes-wrong.json';
import calendarAnimation from '../assets/animations/calendar.json';

const MaxLimitModal = ({ isOpen, onClose, title, message, buttonText = "Tamam! 👍", animationType = "error" }) => {
    if (!isOpen) return null;

    const animationData = animationType === "calendar" ? calendarAnimation : lookingGoesWrong;
    const animationSize = animationType === "calendar" ? "w-32 h-24" : "w-28 h-28";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
                <div className="mb-6">
                    <div className={`${animationSize} mx-auto mb-2`}>
                        <Lottie animationData={animationData} loop autoplay />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-gray-600 leading-relaxed">
                        {message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
};

export default MaxLimitModal;
