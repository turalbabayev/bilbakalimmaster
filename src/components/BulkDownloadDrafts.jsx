import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { toast } from 'react-hot-toast';

const BulkDownloadDrafts = ({ isOpen, onClose, konuId, altKonuId }) => {
    const [loading, setLoading] = useState(false);
    const [jsonLoading, setJsonLoading] = useState(false);
    const [taslaklar, setTaslaklar] = useState([]);
    const [selected, setSelected] = useState({});
    const [hepsiSecili, setHepsiSecili] = useState(false);
    const [indirmeTipi, setIndirmeTipi] = useState("tum"); // tum | sadeceSorular
    const [indirmeMiktari, setIndirmeMiktari] = useState("secili"); // tumu | ilk10 | ilk20 | ilk30 | secili

    const normalizeDifficulty = (raw) => {
        if (!raw && raw !== 0) return 'medium';
        const s = String(raw).toLowerCase().trim();
        if (["kolay","easy","e","k","1","low","basit"].includes(s)) return 'easy';
        if (["zor","hard","z","h","3","difficult","high"].includes(s)) return 'hard';
        if (["orta","medium","m","2","mid","normal"].includes(s)) return 'medium';
        return 'medium';
    };

    const difficultyEmoji = (item) => {
        const difficulty = normalizeDifficulty(item?.difficulty);
        if (difficulty === 'easy') return '🟢';
        if (difficulty === 'hard') return '🔴';
        return '🟡';
    };

    useEffect(() => {
        const fetchDrafts = async () => {
            if (!isOpen) return;
            setLoading(true);
            try {
                const ref = collection(db, 'konular', konuId, 'altkonular', altKonuId, 'taslaklar');
                const snap = await getDocs(ref);
                const list = [];
                snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
                const sirali = list.sort((a,b) => {
                    const na = typeof a.soruNumarasi === 'number' ? a.soruNumarasi : parseInt(a.soruNumarasi, 10) || 0;
                    const nb = typeof b.soruNumarasi === 'number' ? b.soruNumarasi : parseInt(b.soruNumarasi, 10) || 0;
                    return na - nb;
                });
                setTaslaklar(sirali);
                setSelected({});
                setHepsiSecili(false);
            } catch (e) {
                console.error(e);
                toast.error('Taslaklar yüklenemedi');
            } finally {
                setLoading(false);
            }
        };
        fetchDrafts();
    }, [isOpen, konuId, altKonuId]);

    const toggleSelectAll = () => {
        if (hepsiSecili) {
            setSelected({});
            setHepsiSecili(false);
        } else {
            const all = {};
            taslaklar.forEach(d => { all[d.id] = true; });
            setSelected(all);
            setHepsiSecili(true);
        }
    };

    const filteredByAmount = () => {
        if (indirmeMiktari === 'tumu') return taslaklar;
        if (indirmeMiktari === 'ilk10') return taslaklar.slice(0, 10);
        if (indirmeMiktari === 'ilk20') return taslaklar.slice(0, 20);
        if (indirmeMiktari === 'ilk30') return taslaklar.slice(0, 30);
        // secili
        return taslaklar.filter(d => selected[d.id]);
    };

    const stripHtml = (html) => {
        if (!html) return "";
        const docp = new DOMParser().parseFromString(html, 'text/html');
        return docp.body.textContent || "";
    };

    const createDocx = async () => {
        try {
            const items = filteredByAmount();
            if (items.length === 0) {
                toast('İndirilecek taslak yok');
                return;
            }
            const children = [];
            items.forEach((soru, idx) => {
                children.push(new Paragraph({
                    children: [
                        new TextRun({ text: `${difficultyEmoji(soru)} Soru ${soru.soruNumarasi || ""}`, bold: true, size: 28 })
                    ]
                }));
                const qText = stripHtml(soru.soruMetni || '').trim() || '(Boş)';
                children.push(new Paragraph({ children: [ new TextRun(qText) ] }));
                if (Array.isArray(soru.cevaplar)) {
                    soru.cevaplar.forEach((c, i) => {
                        const label = String.fromCharCode(65 + i);
                        const isCorrect = soru.dogruCevap === label;
                        const ans = stripHtml(c || '').trim();
                        children.push(new Paragraph({ children: [ new TextRun({ text: `${label}) ${ans}`, bold: isCorrect }) ] }));
                    });
                }
                if (soru.aciklama) {
                    children.push(new Paragraph({ children: [ new TextRun({ text: `Açıklama: ${stripHtml(soru.aciklama)}`, italics: true }) ] }));
                }
                children.push(new Paragraph({}));
            });
            const docx = new Document({ sections: [{ properties: {}, children }] });
            const blob = await Packer.toBlob(docx);
            saveAs(blob, `taslaklar_${altKonuId}.docx`);
            toast.success('DOCX indirildi');
        } catch (e) {
            console.error(e);
            toast.error('DOCX oluşturulamadı');
        }
    };

    const downloadJSON = async () => {
        try {
            setJsonLoading(true);
            const items = filteredByAmount();
            if (items.length === 0) {
                toast('İndirilecek taslak yok');
                setJsonLoading(false);
                return;
            }
            const exportItems = items.map((q) => ({
                konuId,
                altKonuId,
                soruMetni: q.soruMetni || '',
                cevaplar: Array.isArray(q.cevaplar) ? q.cevaplar : [],
                dogruCevap: q.dogruCevap || 'A',
                aciklama: q.aciklama || '',
                difficulty: q.difficulty || 'medium',
            }));
            const blob = new Blob([JSON.stringify(exportItems, null, 2)], { type: 'application/json' });
            saveAs(blob, `taslaklar_${altKonuId}.json`);
            toast.success('JSON indirildi');
        } catch (e) {
            console.error(e);
            toast.error('JSON indirilemedi');
        } finally {
            setJsonLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Taslakları İndir</h3>
                    <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">Kapat</button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium">İndirme Tipi:</label>
                        <select value={indirmeTipi} onChange={(e)=>setIndirmeTipi(e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <option value="tum">Tüm içerik</option>
                            <option value="sadeceSorular">Sadece sorular</option>
                        </select>
                        <label className="text-sm font-medium ml-6">Miktar:</label>
                        <select value={indirmeMiktari} onChange={(e)=>setIndirmeMiktari(e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <option value="tumu">Tümü</option>
                            <option value="ilk10">İlk 10</option>
                            <option value="ilk20">İlk 20</option>
                            <option value="ilk30">İlk 30</option>
                            <option value="secili">Seçili</option>
                        </select>
                        <button onClick={toggleSelectAll} className="ml-auto px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {hepsiSecili ? 'Tüm Seçimi Kaldır' : 'Tümünü Seç'}
                        </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-lg">
                        {loading ? (
                            <div className="p-6 text-center text-gray-500">Yükleniyor...</div>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {taslaklar.map((soru) => (
                                    <li key={soru.id} className="p-3 flex items-center gap-3">
                                        <input type="checkbox" checked={!!selected[soru.id]} onChange={(e)=>setSelected(prev=>({ ...prev, [soru.id]: e.target.checked }))} />
                                        <span className="text-sm text-gray-500 w-16">#{soru.soruNumarasi || '-'}</span>
                                        <span className="text-sm">{difficultyEmoji(soru)}</span>
                                        <div className="text-sm text-gray-800 dark:text-gray-200 truncate">{stripHtml(soru.soruMetni || '').slice(0,120)}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                    <button onClick={downloadJSON} disabled={jsonLoading} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-60">JSON İndir</button>
                    <button onClick={createDocx} disabled={loading} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">DOCX İndir</button>
                </div>
            </div>
        </div>
    );
};

export default BulkDownloadDrafts;


