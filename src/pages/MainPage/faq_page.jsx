import React, { useEffect, useMemo, useState } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from "firebase/firestore";
import { FaQuestionCircle, FaPlus, FaSave, FaEdit, FaTrash, FaSearch, FaChevronRight } from "react-icons/fa";
import { toast } from "react-hot-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// ReactQuill Editor Component
const RichTextEditor = ({ value, onChange, placeholder, height = 200 }) => {
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link'],
            ['clean']
        ],
    };

    const formats = [
        'header', 'bold', 'italic', 'underline', 'strike',
        'list', 'bullet', 'link'
    ];

    return (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <ReactQuill
                theme="snow"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                modules={modules}
                formats={formats}
                style={{ 
                    height: height,
                    backgroundColor: 'white'
                }}
                className="dark:bg-gray-900"
            />
        </div>
    );
};

const FAQPage = () => {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Command/search + filter
    const [search, setSearch] = useState("");
    const [onlyActive, setOnlyActive] = useState(false);

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState("add"); // add | edit

    // Form states
    const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
    const [editFaq, setEditFaq] = useState({ id: "", question: "", answer: "", isActive: true });

    const stripHtml = (html) => html ? html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim() : '';

    const loadFaqs = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "faqs"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setFaqs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
            toast.error("SSS yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadFaqs(); }, []);

    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return faqs.filter(f => (
            ((stripHtml(f.question || "").toLowerCase().includes(s) || stripHtml(f.answer || "").toLowerCase().includes(s)) &&
            (!onlyActive || f.isActive !== false))
        ));
    }, [faqs, search, onlyActive]);

    const openAddDrawer = () => {
        setDrawerMode("add");
        setNewFaq({ question: "", answer: "" });
        setDrawerOpen(true);
    };

    const openEditDrawer = (item) => {
        setDrawerMode("edit");
        setEditFaq({ id: item.id, question: item.question || "", answer: item.answer || "", isActive: item.isActive !== false });
        setDrawerOpen(true);
    };

    const closeDrawer = () => setDrawerOpen(false);

    const addFaq = async (e) => {
        e.preventDefault();
        if (!stripHtml(newFaq.question)) return toast.error("Soru zorunlu");
        if (!stripHtml(newFaq.answer)) return toast.error("Cevap zorunlu");
        try {
            await addDoc(collection(db, "faqs"), {
                question: newFaq.question, // HTML içerik
                answer: newFaq.answer,     // HTML içerik
                isActive: true,
                createdAt: serverTimestamp()
            });
            toast.success("SSS eklendi");
            closeDrawer();
            loadFaqs();
        } catch (e) {
            console.error(e);
            toast.error("SSS eklenemedi");
        }
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        if (!editFaq.id) return;
        if (!stripHtml(editFaq.question)) return toast.error("Soru zorunlu");
        if (!stripHtml(editFaq.answer)) return toast.error("Cevap zorunlu");
        try {
            await updateDoc(doc(db, "faqs", editFaq.id), {
                question: editFaq.question, // HTML içerik
                answer: editFaq.answer,     // HTML içerik
                isActive: !!editFaq.isActive,
                updatedAt: serverTimestamp()
            });
            toast.success("SSS güncellendi");
            closeDrawer();
            loadFaqs();
        } catch (e) {
            console.error(e);
            toast.error("SSS güncellenemedi");
        }
    };

    const removeFaq = async (item) => {
        if (!window.confirm("Silmek istiyor musunuz?")) return;
        try {
            await deleteDoc(doc(db, "faqs", item.id));
            toast.success("SSS silindi");
            loadFaqs();
        } catch (e) {
            console.error(e);
            toast.error("SSS silinemedi");
        }
    };

    const activeCount = useMemo(() => faqs.filter(f => f.isActive !== false).length, [faqs]);

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Command bar */}
                <div className="sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-gray-900/60 border-b border-gray-200/60 dark:border-gray-800/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
                        <div className="relative flex-1 max-w-xl">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kısayol: SSS ara (soru/cevap)" className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                                <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
                                Sadece aktif
                            </label>
                            <button onClick={openAddDrawer} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
                                Yeni Soru
                            </button>
                        </div>
                    </div>
                </div>

                {/* Split layout */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sidebar */}
                    <aside className="lg:col-span-3 space-y-4">
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-indigo-600 text-white"><FaQuestionCircle /></div>
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Toplam SSS</div>
                                    <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{faqs.length}</div>
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/30 p-3">
                                    <div className="text-gray-600 dark:text-gray-300">Aktif</div>
                                    <div className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">{activeCount}</div>
                                </div>
                                <div className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
                                    <div className="text-gray-600 dark:text-gray-300">Pasif</div>
                                    <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{faqs.length - activeCount}</div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-5">
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Kısa İpuçları</div>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc pl-5">
                                <li>Kısa, net soru başlıkları yazın.</li>
                                <li>Cevaplarda madde işaretleri kullanın.</li>
                                <li>Güncel olmayanları pasife alın.</li>
                            </ul>
                        </div>
                    </aside>

                    {/* Content */}
                    <main className="lg:col-span-9">
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden">
                            <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-900/40 text-xs font-semibold text-gray-600 dark:text-gray-300 px-4 py-2">
                                <div className="col-span-7">Soru</div>
                                <div className="col-span-3">Durum</div>
                                <div className="col-span-2 text-right">İşlemler</div>
                            </div>
                            {loading ? (
                                <div className="p-10 text-center text-gray-500">Yükleniyor...</div>
                            ) : filtered.length === 0 ? (
                                <div className="p-10 text-center text_gray-500">Kayıt yok</div>
                            ) : (
                                filtered.map(item => (
                                    <div key={item.id} className="grid grid-cols-12 items-center px-4 py-3 border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                                        <div className="col-span-7 pr-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{stripHtml(item.question)}</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{stripHtml(item.answer)}</div>
                                        </div>
                                        <div className="col-span-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${item.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg_current"></span>
                                                {item.isActive !== false ? 'Aktif' : 'Pasif'}
                                            </span>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end gap-2">
                                            <button onClick={() => openEditDrawer(item)} className="px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">Düzenle</button>
                                            <button onClick={() => removeFaq(item)} className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold">Sil</button>
                                            <FaChevronRight className="text-gray-400" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </main>
                </div>

                {/* Right drawer */}
                {drawerOpen && (
                    <div className="fixed inset-0 z-50 flex">
                        <div className="flex-1 bg-black/50" onClick={closeDrawer} />
                        <div className="w-full max-w-2xl bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl p-6 overflow-y-auto">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{drawerMode === 'add' ? 'Yeni SSS' : 'SSS Düzenle'}</h2>
                            {drawerMode === 'add' ? (
                                <form onSubmit={addFaq} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Soru *</label>
                                        <RichTextEditor
                                            value={newFaq.question}
                                            onChange={(content) => setNewFaq(prev => ({ ...prev, question: content }))}
                                            placeholder="Sorunuzu buraya yazın..."
                                            height={200}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cevap *</label>
                                        <RichTextEditor
                                            value={newFaq.answer}
                                            onChange={(content) => setNewFaq(prev => ({ ...prev, answer: content }))}
                                            placeholder="Cevabınızı buraya yazın..."
                                            height={300}
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={closeDrawer} className="flex-1 px-5 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold">İptal</button>
                                        <button type="submit" className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2"><FaSave /> Kaydet</button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={submitEdit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Soru *</label>
                                        <RichTextEditor
                                            value={editFaq.question}
                                            onChange={(content) => setEditFaq(prev => ({ ...prev, question: content }))}
                                            placeholder="Sorunuzu buraya yazın..."
                                            height={200}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cevap *</label>
                                        <RichTextEditor
                                            value={editFaq.answer}
                                            onChange={(content) => setEditFaq(prev => ({ ...prev, answer: content }))}
                                            placeholder="Cevabınızı buraya yazın..."
                                            height={300}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input id="active" type="checkbox" checked={editFaq.isActive} onChange={(e) => setEditFaq(prev => ({ ...prev, isActive: e.target.checked }))} />
                                        <label htmlFor="active" className="text-sm text-gray-700 dark:text-gray-300">Aktif</label>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={closeDrawer} className="flex-1 px-5 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold">İptal</button>
                                        <button type="submit" className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2"><FaSave /> Güncelle</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default FAQPage;
