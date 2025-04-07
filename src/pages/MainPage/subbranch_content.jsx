import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import AddQuestionSubbranch from "../../components/addQuestionSubbranch";
import DeleteQuestion from "../../components/deleteQuestion";
import UpdateQuestion from "../../components/updateQuestion";
import ChangeQuestionOrder from "../../components/changeQuestionOrder";
import ExportSubbranchToDocx from "../../components/ExportSubbranchToDocx";
import { useParams } from "react-router-dom";
import { database } from "../../firebase";
import { ref, onValue, get, set, remove } from "firebase/database";
import CopyQuestions from "../../components/CopyQuestions";

const SubbranchContent = ({ subbranchId, subbranchName, onClose }) => {
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const questionsRef = ref(database, `konular/${subbranchId}/sorular`);
                const snapshot = await get(questionsRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const formattedData = Object.entries(data).map(([key, value]) => ({
                        id: key,
                        ...value,
                    }));
                    setQuestions(formattedData);
                }
                setIsLoading(false);
            } catch (error) {
                console.error("Soru yükleme hatası:", error);
                setIsLoading(false);
            }
        };

        fetchQuestions();
    }, [subbranchId]);

    const handleDeleteQuestion = async (questionId) => {
        if (window.confirm("Bu soruyu silmek istediğinize emin misiniz?")) {
            try {
                const questionRef = ref(database, `konular/${subbranchId}/sorular/${questionId}`);
                await remove(questionRef);
                setQuestions(questions.filter((q) => q.id !== questionId));
            } catch (error) {
                console.error("Soru silme hatası:", error);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-700 dark:text-gray-300">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-[800px] max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {subbranchName}
                    </h2>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-sm transition-all"
                    >
                        Kapat
                    </button>
                </div>

                <div className="space-y-4">
                    {questions.length === 0 ? (
                        <p className="text-gray-700 dark:text-gray-300 text-center py-4">
                            Bu alt dalda henüz soru bulunmuyor.
                        </p>
                    ) : (
                        questions.map((question) => (
                            <div
                                key={question.id}
                                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <p className="text-gray-800 dark:text-gray-200">
                                            {question.soruMetni}
                                        </p>
                                        {question.cevap && (
                                            <p className="mt-2 text-gray-600 dark:text-gray-400">
                                                <span className="font-semibold">Cevap:</span>{" "}
                                                {question.cevap}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteQuestion(question.id)}
                                        className="ml-4 text-red-500 hover:text-red-700"
                                    >
                                        Sil
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubbranchContent;
