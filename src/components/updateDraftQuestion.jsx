import React, { useEffect, useState, lazy, Suspense } from "react";
import { db, storage } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from 'react-hot-toast';
const LazyEditor = lazy(() => import('@tinymce/tinymce-react').then(m => ({ default: m.Editor })));
const LazyQuill = lazy(() => import('react-quill'));

const UpdateDraftQuestion = ({ isOpen, onClose, konuId, altKonuId, soruId, onUpdateComplete }) => {
    const [soru, setSoru] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cevaplar, setCevaplar] = useState(["", "", "", "", ""]);
    const [dogruCevap, setDogruCevap] = useState("A");
    const [zenginMetinAktif, setZenginMetinAktif] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showEditors, setShowEditors] = useState(false);
    // Alt konu değiştirme kaldırıldı

    const modules = { toolbar: [[{ 'header': [1, 2, 3, 4, 5, 6, false] }], [{ 'font': [] }], ['bold', 'italic', 'underline', 'strike'], [{ 'color': [] }, { 'background': [] }], [{ 'list': 'ordered'}, { 'list': 'bullet' }], [{ 'align': [] }], ['clean']] };
    const formats = ['header','font','bold','italic','underline','strike','color','background','list','bullet','align'];

    const stripHtml = (html) => {
        const docp = new DOMParser().parseFromString(html, 'text/html');
        return docp.body.textContent || "";
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!konuId || !altKonuId || !soruId) {
                    toast.error('Gerekli parametreler eksik!');
                    setLoading(false);
                    onClose();
                    return;
                }
                const draftRef = doc(db, 'konular', konuId, 'altkonular', altKonuId, 'taslaklar', soruId);
                const snap = await getDoc(draftRef);
                if (!snap.exists()) {
                    toast.error('Taslak bulunamadı!');
                    setLoading(false);
                    onClose();
                    return;
                }
                const data = snap.data();
                setSoru({ ...data });
                const arr = Array.isArray(data.cevaplar) ? [...data.cevaplar] : ["", "", "", "", ""];
                while (arr.length < 5) arr.push("");
                setCevaplar(arr);
                setDogruCevap(data.dogruCevap || 'A');
                setLoading(false);
                // Editörleri ilk paint'ten sonra yükle
                setTimeout(() => setShowEditors(true), 0);
            } catch (e) {
                console.error(e);
                toast.error('Veri yüklenirken hata');
                setLoading(false);
            }
        };
        if (isOpen) fetchData();
    }, [isOpen, konuId, altKonuId, soruId, onClose]);

    const handleImageUpload = async (blobInfo) => {
        const file = new File([blobInfo.blob()], blobInfo.filename(), { type: blobInfo.blob().type });
        const storageRef = ref(storage, `soru_resimleri/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!soru) return;
        setIsSaving(true);
        try {
            const draftRef = doc(db, 'konular', konuId, 'altkonular', altKonuId, 'taslaklar', soruId);
            const payload = {
                soruMetni: soru.soruMetni || '',
                cevaplar: cevaplar.map(c => c || ''),
                dogruCevap: dogruCevap || 'A',
                aciklama: soru.aciklama || '',
                difficulty: soru.difficulty || 'medium',
                soruResmi: soru.soruResmi || null,
                soruNumarasi: typeof soru?.soruNumarasi === 'number' ? soru.soruNumarasi : (parseInt(soru?.soruNumarasi, 10) || 0),
                liked: soru.liked || 0,
                unliked: soru.unliked || 0,
                report: soru.report || 0,
                updatedAt: new Date()
            };
            await updateDoc(draftRef, payload);
            toast.success('Taslak güncellendi');
            if (onUpdateComplete) onUpdateComplete(payload);
            onClose();
        } catch (e) {
            console.error(e);
            toast.error('Güncelleme sırasında hata');
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-60 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-5xl max-h-[calc(100vh-40px)] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">Taslak Soruyu Düzenle</h2>
                </div>
                {loading ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="w-16 h-16 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="flex flex-col flex-1 overflow-hidden">
                        <div className="p-8 overflow-y-auto flex-1">
                            <div className="space-y-8">
                                {/* Alt konu değiştirme kaldırıldı */}
                                <div>
                                    <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">Soru Metni</label>
                                    <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                        {showEditors ? (
                                            <Suspense fallback={<div className="p-4 text-sm text-gray-500">Editör yükleniyor...</div>}>
                                                <LazyEditor
                                                    apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                                                    value={soru?.soruMetni || ''}
                                                    onEditorChange={(content) => setSoru({ ...soru, soruMetni: content })}
                                                    init={{
                                                        height: 300,
                                                        menubar: false,
                                                        plugins: [
                                                            'advlist','autolink','lists','link','charmap','preview',
                                                            'searchreplace','visualblocks','code','fullscreen',
                                                            'insertdatetime','table','help','wordcount'
                                                        ],
                                                        toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
                                                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                                                    }}
                                                />
                                            </Suspense>
                                        ) : (
                                            <div className="p-4 text-sm text-gray-500">Yükleniyor...</div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-base font-semibold text-gray-900 dark:text-white">Cevaplar</label>
                                        <button onClick={(e)=>{e.preventDefault(); setZenginMetinAktif(!zenginMetinAktif); if (zenginMetinAktif) { setCevaplar(cevaplar.map(c=>stripHtml(c))); } }} className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${zenginMetinAktif ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{zenginMetinAktif ? 'Basit Metin Editörüne Geç' : 'Zengin Metin Editörüne Geç'}</button>
                                    </div>
                                    <div className="space-y-4">
                                        {cevaplar.map((cevap, index) => (
                                            <div key={index} className="flex items-start gap-4">
                                                <div className="flex-shrink-0 pt-3">
                                                    <button type="button" onClick={()=>setDogruCevap(String.fromCharCode(65+index))} className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-all duration-200 ${dogruCevap===String.fromCharCode(65+index)?'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 ring-2 ring-green-500':'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{String.fromCharCode(65+index)}</button>
                                                </div>
                                                <div className="flex-1">
                                                    {zenginMetinAktif ? (
                                                        <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                                            {showEditors ? (
                                                                <Suspense fallback={<div className="p-2 text-xs text-gray-500">Editör yükleniyor...</div>}>
                                                                    <LazyQuill theme="snow" value={cevap} onChange={(val)=>{const arr=[...cevaplar]; arr[index]=val; setCevaplar(arr);}} modules={modules} formats={formats} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                                                </Suspense>
                                                            ) : (
                                                                <div className="p-2 text-xs text-gray-500">Yükleniyor...</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <input type="text" value={cevap} onChange={(e)=>{const arr=[...cevaplar]; arr[index]=e.target.value; setCevaplar(arr);}} placeholder={`${String.fromCharCode(65+index)} şıkkının cevabını girin`} className={`w-full px-4 py-3 rounded-xl border-2 ${dogruCevap===String.fromCharCode(65+index)?'border-green-200 dark:border-green-800':'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`} />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">Açıklama</label>
                                    <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                        {showEditors ? (
                                            <Suspense fallback={<div className="p-4 text-sm text-gray-500">Editör yükleniyor...</div>}>
                                                <LazyEditor apiKey={process.env.REACT_APP_TINYMCE_API_KEY} value={soru?.aciklama || ''} onEditorChange={(content)=>setSoru({...soru, aciklama: content})} init={{ height: 200, menubar: false, plugins: ['advlist','autolink','lists','link','charmap','preview','searchreplace','visualblocks','code','fullscreen','insertdatetime','table','help','wordcount'], toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help', content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }' }} />
                                            </Suspense>
                                        ) : (
                                            <div className="p-4 text-sm text-gray-500">Yükleniyor...</div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-900 dark:text-white mb-2">Zorluk Seviyesi</label>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={()=>setSoru({...soru, difficulty:'easy'})} className={`px-3 py-1 rounded-lg text-sm font-medium ${soru?.difficulty==='easy'?'bg-green-500 text-white':'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Kolay</button>
                                        <button type="button" onClick={()=>setSoru({...soru, difficulty:'medium'})} className={`px-3 py-1 rounded-lg text-sm font-medium ${soru?.difficulty==='medium'?'bg-yellow-500 text-white':'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Orta</button>
                                        <button type="button" onClick={()=>setSoru({...soru, difficulty:'hard'})} className={`px-3 py-1 rounded-lg text-sm font-medium ${soru?.difficulty==='hard'?'bg-red-500 text-white':'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Zor</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-4">
                            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium">İptal</button>
                            <button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center">{isSaving ? 'Güncelleniyor...' : 'Güncelle'}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default UpdateDraftQuestion;


