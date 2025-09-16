import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, addDoc, orderBy, query, getDoc } from 'firebase/firestore';
import UpdateDraftQuestion from '../../components/updateDraftQuestion';
import { toast } from 'react-hot-toast';

const DraftsPage = () => {
    const { id: konuId } = useParams();
    const navigate = useNavigate();
    const [altKonular, setAltKonular] = useState({});
    const [loading, setLoading] = useState(true);
    const [draftCounts, setDraftCounts] = useState({});
    const [countUnsubs, setCountUnsubs] = useState([]);

    useEffect(() => {
        const altkonularRef = collection(db, 'konular', konuId, 'altkonular');
        const unsub = onSnapshot(altkonularRef, (snap) => {
            const data = {};
            snap.forEach((d) => {
                data[d.id] = { id: d.id, ...d.data() };
            });
            setAltKonular(data);
            setLoading(false);

            // Taslak sayacı listener'larını güncelle
            // Eski unsub'ları kapat
            countUnsubs.forEach((u) => typeof u === 'function' && u());
            const newUnsubs = [];
            Object.keys(data).forEach((altId) => {
                const draftsRef = collection(db, 'konular', konuId, 'altkonular', altId, 'taslaklar');
                const u = onSnapshot(draftsRef, (dsnap) => {
                    setDraftCounts((prev) => ({ ...prev, [altId]: dsnap.size }));
                });
                newUnsubs.push(u);
            });
            setCountUnsubs(newUnsubs);
        });
        return () => unsub();
    }, [konuId]);

    const [drafts, setDrafts] = useState({});

    const loadDrafts = (altKonuId) => {
        const ref = collection(db, 'konular', konuId, 'altkonular', altKonuId, 'taslaklar');
        const q = query(ref, orderBy('soruNumarasi', 'asc'));
        return onSnapshot(q, (snap) => {
            const items = {};
            snap.forEach((d) => { items[d.id] = { id: d.id, ...d.data() }; });
            setDrafts((prev) => ({ ...prev, [altKonuId]: items }));
        });
    };

    const publishDraft = async (altKonuId, draftId) => {
        try {
            const list = drafts[altKonuId] || {};
            const d = list[draftId];
            if (!d) return;
            const sorularRef = collection(db, 'konular', konuId, 'altkonular', altKonuId, 'sorular');
            await addDoc(sorularRef, {
                soruMetni: d.soruMetni || '',
                cevaplar: d.cevaplar || [],
                dogruCevap: d.dogruCevap || 'A',
                aciklama: d.aciklama || '',
                difficulty: d.difficulty || 'medium',
                liked: 0, unliked: 0, report: 0, soruNumarasi: null, soruResmi: null
            });
            await deleteDoc(doc(db, 'konular', konuId, 'altkonular', altKonuId, 'taslaklar', draftId));
            toast.success('Taslak yayınlandı');
        } catch (e) {
            console.error(e);
            toast.error('Taslak yayınlanırken hata');
        }
    };

    const deleteDraft = async (altKonuId, draftId) => {
        try {
            await deleteDoc(doc(db, 'konular', konuId, 'altkonular', altKonuId, 'taslaklar', draftId));
            toast.success('Taslak silindi');
        } catch (e) {
            console.error(e);
            toast.error('Silme sırasında hata');
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-4">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Taslak Alanı</h1>
                        <button onClick={()=>navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Geri</button>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-16">Yükleniyor...</div>
                    ) : (
                        Object.keys(altKonular).length === 0 ? (
                            <div className="text-center text-gray-600 dark:text-gray-300">Alt konu bulunamadı.</div>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(altKonular).map(([altId, alt]) => (
                                    <AltKonuDrafts
                                        key={altId}
                                        konuId={konuId}
                                        altKonuId={altId}
                                        altBaslik={alt.baslik}
                                        loadDrafts={loadDrafts}
                                        drafts={drafts[altId]}
                                        count={draftCounts[altId] || 0}
                                        onPublish={publishDraft}
                                        onDelete={deleteDraft}
                                    />
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </Layout>
    );
};

const AltKonuDrafts = ({ konuId, altKonuId, altBaslik, loadDrafts, drafts, count = 0, onPublish, onDelete }) => {
    const [editing, setEditing] = useState(null); // draft id
    const [editForm, setEditForm] = useState({ soruMetni: '', cevaplar: ['', '', '', '', ''], dogruCevap: 'A', aciklama: '', difficulty: 'medium' });
    const [expanded, setExpanded] = useState(false);
    useEffect(() => {
        const unsub = loadDrafts(altKonuId);
        return () => { if (typeof unsub === 'function') unsub(); };
    }, [altKonuId, loadDrafts]);
    const items = drafts ? Object.entries(drafts) : [];
    const itemsSorted = [...items].sort((a, b) => {
        const na = typeof a[1]?.soruNumarasi === 'number' ? a[1].soruNumarasi : parseInt(a[1]?.soruNumarasi, 10) || 999999;
        const nb = typeof b[1]?.soruNumarasi === 'number' ? b[1].soruNumarasi : parseInt(b[1]?.soruNumarasi, 10) || 999999;
        return na - nb;
    });
    const easyCount = items.filter(([, d]) => d.difficulty === 'easy').length;
    const medCount = items.filter(([, d]) => d.difficulty === 'medium').length;
    const hardCount = items.filter(([, d]) => d.difficulty === 'hard').length;

    const handleDifficulty = async (id, difficulty) => {
        try {
            await updateDoc(doc(db, 'konular', konuId, 'altkonular', altKonuId, 'taslaklar', id), { difficulty });
            toast.success('Zorluk güncellendi');
        } catch (e) {
            console.error(e);
            toast.error('Zorluk güncellenemedi');
        }
    };

    const openEdit = async (id) => {
        try {
            const snap = await getDoc(doc(db, 'konular', konuId, 'altkonular', altKonuId, 'taslaklar', id));
            if (snap.exists()) {
                const d = snap.data();
                const cevaplar = Array.isArray(d.cevaplar) ? [...d.cevaplar] : ['', '', '', '', ''];
                while (cevaplar.length < 5) cevaplar.push('');
                setEditForm({
                    soruMetni: d.soruMetni || '',
                    cevaplar,
                    dogruCevap: d.dogruCevap || 'A',
                    aciklama: d.aciklama || '',
                    difficulty: d.difficulty || 'medium'
                });
                setEditing(id);
            }
        } catch (e) {
            console.error(e);
            toast.error('Düzenleme açılırken hata');
        }
    };

    const saveEdit = async () => {
        try {
            await updateDoc(doc(db, 'konular', konuId, 'altkonular', altKonuId, 'taslaklar', editing), editForm);
            toast.success('Taslak güncellendi');
            setEditing(null);
        } catch (e) {
            console.error(e);
            toast.error('Taslak güncellenemedi');
        }
    };
    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/90 flex items-center justify-center text-white font-bold">{altBaslik?.[0] || 'A'}</div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{altBaslik}</h2>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span className="mr-3">{count} taslak</span>
                            <span className="mr-2">🟢 {easyCount}</span>
                            <span className="mr-2">🟡 {medCount}</span>
                            <span>🔴 {hardCount}</span>
                        </div>
                    </div>
                </div>
                <svg className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
            </button>
            {expanded && (
                <div className="p-6 border-t border-gray-100 dark:border-gray-700">
            {items.length === 0 ? (
                <div className="text-gray-500 dark:text-gray-400">Bu alt konuda taslak yok.</div>
            ) : (
                <div className="space-y-5 mt-2">
                    {itemsSorted.map(([id, d], idx) => (
                        <div key={id} className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg shadow-sm flex flex-col transition-all duration-200 hover:shadow-md">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col p-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="text-lg font-semibold">{(typeof d.soruNumarasi === 'number' ? d.soruNumarasi : (parseInt(d.soruNumarasi, 10) || (idx + 1)))}. Soru:</h3>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Zorluk:</span>
                                                <button onClick={()=>handleDifficulty(id,'easy')} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${d.difficulty==='easy'?'bg-green-500 text-white':'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}>Kolay</button>
                                                <button onClick={()=>handleDifficulty(id,'medium')} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${d.difficulty==='medium'?'bg-yellow-500 text-white':'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}>Orta</button>
                                                <button onClick={()=>handleDifficulty(id,'hard')} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${d.difficulty==='hard'?'bg-red-500 text-white':'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}>Zor</button>
                                            </div>
                                        </div>
                                        {d.soruResmi && (
                                            <div className="mb-4">
                                                <img src={d.soruResmi} alt="Soru resmi" className="max-w-full h-auto rounded-lg shadow-md" />
                                            </div>
                                        )}
                                        <div className="mb-2" dangerouslySetInnerHTML={{ __html: d.soruMetni }} />
                                        <div className="ml-4 space-y-1">
                                            {Array.isArray(d.cevaplar) && d.cevaplar.map((cevap, cevapIndex) => {
                                                const isCorrect = d.dogruCevap === String.fromCharCode(65 + cevapIndex);
                                                return (
                                                    <div key={cevapIndex} className={`p-2 rounded-md ${isCorrect ? 'bg-green-100 dark:bg-green-900/70 text-green-800 dark:text-green-200' : 'bg-gray-50 dark:bg-gray-700'}`}>
                                                        <span className="font-bold mr-2">{String.fromCharCode(65 + cevapIndex)}:</span>
                                                        <span dangerouslySetInnerHTML={{ __html: cevap }} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-3 mb-1">
                                            <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                                Doğru Cevap:
                                                {d.dogruCevap ? (
                                                    <span>
                                                        {(/^[A-E]$/.test(d.dogruCevap)) ? (
                                                            <>
                                                                {` ${d.dogruCevap} Şıkkı`}
                                                                {Array.isArray(d.cevaplar) && d.cevaplar[d.dogruCevap.charCodeAt(0) - 65] && (
                                                                    <span className="ml-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                                                                        (<span dangerouslySetInnerHTML={{ __html: d.cevaplar[d.dogruCevap.charCodeAt(0) - 65] }} />)
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {Array.isArray(d.cevaplar) && (
                                                                    <>
                                                                        {` ${String.fromCharCode(65 + d.cevaplar.indexOf(d.dogruCevap))} Şıkkı`}
                                                                        <span className="ml-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">({d.dogruCevap})</span>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                    </span>
                                                ) : ' Belirtilmemiş'}
                                            </p>
                                        </div>
                                        {d.aciklama && (
                                            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900 rounded-md">
                                                <span className="font-semibold">Açıklama: </span>
                                                <span className="text-sm" dangerouslySetInnerHTML={{ __html: d.aciklama }} />
                                            </div>
                                        )}
                                        <div className="mt-4 flex justify-end text-gray-500 dark:text-gray-400 space-x-4 text-sm">
                                            <p className="flex items-center"><span className="mr-1">⚠️</span> {d.report || 0}</p>
                                            <p className="flex items-center"><span className="mr-1">👍</span> {d.liked || 0}</p>
                                            <p className="flex items-center"><span className="mr-1">👎</span> {d.unliked || 0}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col space-y-2 ml-4">
                                    <button onClick={()=>openEdit(id)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-200">Düzenle</button>
                                    <button onClick={()=>onPublish(altKonuId, id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-200">Yayınla</button>
                                    <button onClick={()=>onDelete(altKonuId, id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-200">Sil</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
                </div>
            )}
            {editing && (
                <UpdateDraftQuestion
                    isOpen={!!editing}
                    onClose={()=>setEditing(null)}
                    konuId={konuId}
                    altKonuId={altKonuId}
                    soruId={editing}
                    onUpdateComplete={()=>setEditing(null)}
                />
            )}
        </div>
    );
};

export default DraftsPage;


