import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDocs, collection, updateDoc } from "firebase/firestore";

const ChangeDraftOrder = ({ isOpen, onClose, konuId, altKonuId, draftId }) => {
    const [allDrafts, setAllDrafts] = useState([]);
    const [currentNumber, setCurrentNumber] = useState(0);
    const [targetNumber, setTargetNumber] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [currentId, setCurrentId] = useState("");
    const [minNumber, setMinNumber] = useState(1);
    const [maxNumber, setMaxNumber] = useState(1);

    useEffect(() => {
        if (!isOpen || !draftId) return;

        const load = async () => {
            try {
                setIsLoading(true);
                setCurrentId(draftId);
                const draftsRef = collection(db, "konular", konuId, "altkonular", altKonuId, "taslaklar");
                const snap = await getDocs(draftsRef);
                const list = [];
                snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
                const sorted = list.sort((a, b) => (a.soruNumarasi ?? 0) - (b.soruNumarasi ?? 0));
                setAllDrafts(sorted);
                const nums = sorted.map(q => (typeof q.soruNumarasi === 'number' ? q.soruNumarasi : parseInt(q.soruNumarasi, 10) || 0)).filter(n => n > 0);
                if (nums.length > 0) {
                    setMinNumber(Math.min(...nums));
                    setMaxNumber(Math.max(...nums));
                } else {
                    setMinNumber(1);
                    setMaxNumber(sorted.length || 1);
                }
                const current = sorted.find(q => q.id === draftId);
                if (current) {
                    const curNum = (typeof current.soruNumarasi === 'number' ? current.soruNumarasi : parseInt(current.soruNumarasi, 10) || 0);
                    setCurrentNumber(curNum);
                    setTargetNumber(curNum);
                }
            } catch (e) {
                console.error("Taslaklar yüklenirken hata:", e);
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [isOpen, draftId, konuId, altKonuId]);

    const handleSwap = async () => {
        if (targetNumber < minNumber || targetNumber > maxNumber) {
            alert(`Lütfen ${minNumber} ile ${maxNumber} arasında bir numara girin.`);
            return;
        }
        if (targetNumber === currentNumber) {
            onClose();
            return;
        }
        try {
            const target = allDrafts.find(q => (typeof q.soruNumarasi === 'number' ? q.soruNumarasi : parseInt(q.soruNumarasi, 10) || 0) === targetNumber);
            const current = allDrafts.find(q => q.id === currentId);
            if (!target || !current) {
                alert("Hedef numarada taslak bulunamadı!");
                return;
            }
            const currentRef = doc(db, "konular", konuId, "altkonular", altKonuId, "taslaklar", current.id);
            const targetRef = doc(db, "konular", konuId, "altkonular", altKonuId, "taslaklar", target.id);
            await Promise.all([
                updateDoc(currentRef, { soruNumarasi: targetNumber }),
                updateDoc(targetRef, { soruNumarasi: currentNumber })
            ]);
            alert("Taslak sıraları başarıyla takas edildi.");
            onClose();
        } catch (e) {
            console.error("Taslak sıra değiştirme hatası:", e);
            alert("İşlem sırasında bir hata oluştu!");
        }
    };

    const stripHtml = (html) => {
        if (!html) return "";
        const docp = new DOMParser().parseFromString(html, 'text/html');
        return docp.body.textContent || "";
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">Taslak Sırasını Değiştir</h2>
                </div>
                <div className="p-8">
                    {isLoading ? (
                        <div className="flex justify-center">
                            <div className="w-8 h-8 border-t-4 border-b-4 border-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">Mevcut Soru Numarası:</label>
                                    <input type="number" value={currentNumber} disabled className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                                </div>
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">Takas Edilecek Soru Numarası:</label>
                                    <input type="number" value={targetNumber} onChange={(e)=>setTargetNumber(Number(e.target.value))} min={minNumber} max={maxNumber} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all" />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bu alt konu için geçerli soru numaraları: {minNumber} - {maxNumber}</p>
                                </div>
                            </div>
                            <div className="mt-4 bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg">
                                <h3 className="font-medium text-indigo-800 dark:text-indigo-300 mb-2">Mevcut Taslak Sıralaması:</h3>
                                <div className="max-h-40 overflow-y-auto pr-2">
                                    <ul className="space-y-1.5">
                                        {allDrafts.map((d)=> (
                                            <li key={d.id} className={`text-sm py-1 px-2 rounded ${d.id===currentId?'bg-indigo-100 dark:bg-indigo-800/50 font-medium': d.soruNumarasi===targetNumber?'bg-amber-100 dark:bg-amber-800/30 font-medium':''}`}>
                                                <span className="font-medium mr-2">#{d.soruNumarasi || '?'}</span>
                                                {stripHtml(d.soruMetni)?.substring(0,60)}
                                                {(stripHtml(d.soruMetni)||'').length>60?'...':''}
                                                {d.id===currentId ? (
                                                    <span className="ml-1 text-indigo-600 dark:text-indigo-400">(seçili)</span>
                                                ) : d.soruNumarasi===targetNumber ? (
                                                    <span className="ml-1 text-amber-600 dark:text-amber-400">(takas edilecek)</span>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                                <p className="text-sm text-yellow-700 dark:text-yellow-300"><strong>Not:</strong> Bu işlem sadece iki taslağın soru numaralarını takas eder.</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">İptal</button>
                    <button onClick={handleSwap} disabled={isLoading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">Taslakları Takas Et</button>
                </div>
            </div>
        </div>
    );
};

export default ChangeDraftOrder;


