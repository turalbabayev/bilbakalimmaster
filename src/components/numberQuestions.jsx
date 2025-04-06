import React, { useState } from "react";
import { database } from "../firebase";
import { ref, get, update } from "firebase/database";

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
            // Tüm konuları al
            addLog("Konular alınıyor...");
            const konularRef = ref(database, 'konular');
            const konularSnapshot = await get(konularRef);
            const konular = konularSnapshot.val();

            if (!konular) {
                addLog("Konular bulunamadı!");
                setStatus("error");
                return;
            }

            // Her konu için
            for (const konuId in konular) {
                const konu = konular[konuId];
                addLog(`Konu: ${konu.baslik} (${konuId}) işleniyor...`);
                
                // Alt konular varsa
                if (konu.altkonular) {
                    // Her alt konu için
                    for (const altKonuId in konu.altkonular) {
                        const altKonu = konu.altkonular[altKonuId];
                        addLog(`Alt Konu: ${altKonu.baslik} (${altKonuId}) işleniyor...`);
                        
                        // Alt konunun soruları varsa
                        if (altKonu.sorular) {
                            let soruNumarasi = 1;
                            addLog(`${altKonu.baslik} için sorular numaralandırılıyor...`);
                            
                            // Her soru için numara ata
                            for (const soruId in altKonu.sorular) {
                                const soruPath = `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`;
                                await update(ref(database, soruPath), { soruNumarasi: soruNumarasi });
                                addLog(`${soruPath} için soruNumarasi = ${soruNumarasi} atandı.`);
                                soruNumarasi++;
                            }
                        }
                        
                        // Alt dallar varsa
                        if (altKonu.altdallar) {
                            // Her alt dal için
                            for (const altDalId in altKonu.altdallar) {
                                const altDal = altKonu.altdallar[altDalId];
                                addLog(`Alt Dal: ${altDal.baslik} (${altDalId}) işleniyor...`);
                                
                                // Alt dalın soruları varsa
                                if (altDal.sorular) {
                                    let soruNumarasi = 1;
                                    addLog(`${altDal.baslik} için sorular numaralandırılıyor...`);
                                    
                                    // Her soru için numara ata
                                    for (const soruId in altDal.sorular) {
                                        const soruPath = `konular/${konuId}/altkonular/${altKonuId}/altdallar/${altDalId}/sorular/${soruId}`;
                                        await update(ref(database, soruPath), { soruNumarasi: soruNumarasi });
                                        addLog(`${soruPath} için soruNumarasi = ${soruNumarasi} atandı.`);
                                        soruNumarasi++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            addLog('Tüm sorular başarıyla numaralandırıldı!');
            setStatus("success");
        } catch (error) {
            addLog(`Sorular numaralandırılırken bir hata oluştu: ${error.message}`);
            console.error('Sorular numaralandırılırken bir hata oluştu:', error);
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