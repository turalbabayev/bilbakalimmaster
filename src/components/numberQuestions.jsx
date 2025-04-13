import React, { useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

const NumberQuestions = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState("idle"); // idle, running, success, error
    const [log, setLog] = useState([]);

    const addLog = (message) => {
        setLog((prev) => [...prev, message]);
    };

    const handleNumberQuestions = async () => {
        setStatus("running");
        setLog(["Soruları numaralandırma işlemi başlatılıyor..."]);

        try {
            const konularRef = doc(db, "konular");
            const konularDoc = await getDoc(konularRef);
            
            if (!konularDoc.exists()) {
                throw new Error("Konular bulunamadı!");
            }

            const konular = konularDoc.data();
            let soruNumarasi = 1;

            // Her konu için
            for (const [konuId, konu] of Object.entries(konular)) {
                const konuRef = doc(db, "konular", konuId);
                const altKonular = konu.altkonular || {};

                // Her alt konu için
                for (const [altKonuId, altKonu] of Object.entries(altKonular)) {
                    const subbranches = altKonu.subbranches || {};

                    // Her alt dal için
                    for (const [subbranch, subbranch_data] of Object.entries(subbranches)) {
                        const questions = subbranch_data.questions || {};

                        // Her soru için
                        for (const [questionId, question] of Object.entries(questions)) {
                            // Soru numarasını güncelle
                            questions[questionId] = {
                                ...question,
                                soruNumarasi
                            };
                            soruNumarasi++;
                        }

                        // Alt dalı güncelle
                        subbranches[subbranch] = {
                            ...subbranch_data,
                            questions
                        };
                    }

                    // Alt konuyu güncelle
                    altKonular[altKonuId] = {
                        ...altKonu,
                        subbranches
                    };
                }

                // Konuyu güncelle
                await updateDoc(konuRef, {
                    altkonular: altKonular
                });
            }

            toast.success("Tüm soru numaraları başarıyla güncellendi!");
            setStatus("success");
        } catch (error) {
            console.error("Hata:", error);
            toast.error("Soru numaraları güncellenirken bir hata oluştu!");
            setStatus("error");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-3/4 p-6 max-h-[80vh] overflow-hidden flex flex-col">
                <h2 className="text-xl font-bold mb-4">Soruları Numaralandır</h2>
                
                <div className="flex-1 overflow-y-auto mb-4 bg-gray-100 p-3 rounded-md text-sm h-96">
                    {log.length > 0 ? (
                        log.map((message, index) => (
                            <div key={index} className="mb-1">
                                {message}
                            </div>
                        ))
                    ) : (
                        <p>Soruları numaralandırma işlemi başlatıldığında loglar burada gösterilecek.</p>
                    )}
                </div>
                
                <div className="flex justify-end space-x-4">
                    {status === "idle" && (
                        <button
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                            onClick={handleNumberQuestions}
                        >
                            Numaralandırmayı Başlat
                        </button>
                    )}
                    
                    {status === "running" && (
                        <button
                            className="bg-gray-400 text-white px-4 py-2 rounded-md cursor-not-allowed"
                            disabled
                        >
                            İşlem Devam Ediyor...
                        </button>
                    )}
                    
                    {(status === "success" || status === "error") && (
                        <button
                            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                            onClick={onClose}
                        >
                            Kapat
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NumberQuestions; 