import React, { useEffect, useState } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { collection, addDoc, getDocs, serverTimestamp, orderBy, query, updateDoc, doc, deleteDoc, setDoc, where } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { FaBookOpen, FaPlus, FaSave, FaImage, FaEdit, FaTrash, FaSearch, FaEye, FaTimes } from "react-icons/fa";
import { toast } from "react-hot-toast";

const PodcastUnitsPage = () => {
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [newUnit, setNewUnit] = useState({ name: "", description: "", siraNumarasi: 0 });
    const [editUnit, setEditUnit] = useState({ id: "", name: "", description: "", imageUrl: "", siraNumarasi: 0 });
    const [isAutoNumbering, setIsAutoNumbering] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [editSelectedImageFile, setEditSelectedImageFile] = useState(null);
    const [editImagePreview, setEditImagePreview] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Podcasts for selection
    const [podcasts, setPodcasts] = useState([]);
    const [podcastsLoading, setPodcastsLoading] = useState(false);
    const [podcastSearch, setPodcastSearch] = useState("");
    const [selectedPodcastIds, setSelectedPodcastIds] = useState(new Set());
    const [editSelectedPodcastIds, setEditSelectedPodcastIds] = useState(new Set());
    const [showPodcastsModal, setShowPodcastsModal] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [unitPodcasts, setUnitPodcasts] = useState([]);

    const loadUnits = async () => {
        setLoading(true);
        try {
            const ref = collection(db, "podcast-units");
            const snap = await getDocs(ref);
            const base = snap.docs.map(d => ({ id: d.id, ...d.data(), podcastCount: 0 }));
            
            // Sıralama: önce siraNumarasi olanlar (küçükten büyüğe), sonra olmayanlar (tarihe göre)
            base.sort((a, b) => {
                const aSira = a.siraNumarasi || 0;
                const bSira = b.siraNumarasi || 0;
                
                if (aSira > 0 && bSira > 0) {
                    return aSira - bSira;
                }
                
                if (aSira > 0 && bSira === 0) return -1;
                if (aSira === 0 && bSira > 0) return 1;
                
                const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return bDate - aDate;
            });
            // fetch podcast counts in parallel
            const withCounts = await Promise.all(base.map(async (u) => {
                try {
                    const pSnap = await getDocs(collection(db, "podcast-units", u.id, "podcasts"));
                    return { ...u, podcastCount: pSnap.size };
                } catch {
                    return u;
                }
            }));
            setUnits(withCounts);
        } catch (e) {
            console.error(e);
            toast.error("Üniteler yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    const viewUnitPodcasts = async (unit) => {
        try {
            setSelectedUnit(unit);
            setUnitPodcasts([]);
            setShowPodcastsModal(true);
            
            // Load podcasts for this unit
            const podcastsRef = collection(db, "podcast-units", unit.id, "podcasts");
            const podcastsSnap = await getDocs(podcastsRef);
            
            if (podcastsSnap.empty) {
                setUnitPodcasts([]);
                return;
            }
            
            // Get podcast details from main podcasts collection
            const podcastIds = podcastsSnap.docs.map(doc => doc.id);
            const podcastPromises = podcastIds.map(async (podcastId) => {
                try {
                    const podcastDoc = await getDocs(query(collection(db, "podcasts"), where("__name__", "==", podcastId)));
                    if (!podcastDoc.empty) {
                        return { id: podcastId, ...podcastDoc.docs[0].data() };
                    }
                } catch (err) {
                    console.error(`Podcast ${podcastId} yüklenirken hata:`, err);
                }
                return null;
            });
            
            const podcastResults = await Promise.all(podcastPromises);
            const validPodcasts = podcastResults.filter(p => p !== null);
            
            // Sort by siraNumarasi
            validPodcasts.sort((a, b) => (a.siraNumarasi || 0) - (b.siraNumarasi || 0));
            
            setUnitPodcasts(validPodcasts);
        } catch (error) {
            console.error("Ünite podcast'leri yüklenirken hata:", error);
            toast.error("Podcast'ler yüklenirken hata oluştu");
        }
    };

    const getNextSiraNumarasi = () => {
        if (units.length === 0) return 1;
        
        // En yüksek sıra numarasını bul
        const maxSira = Math.max(...units.map(u => u.siraNumarasi || 0));
        
        return maxSira + 1;
    };

    const autoNumberUnits = async () => {
        if (isAutoNumbering) return;
        
        setIsAutoNumbering(true);
        try {
            // Tüm üniteleri tarihe göre sırala (eski → yeni)
            const sortedUnits = [...units].sort((a, b) => {
                const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return aDate - bDate;
            });

            // Her üniteye sıra numarası ata
            for (let i = 0; i < sortedUnits.length; i++) {
                const unit = sortedUnits[i];
                const siraNumarasi = i + 1;
                
                await updateDoc(doc(db, "podcast-units", unit.id), {
                    siraNumarasi: siraNumarasi
                });
                
                console.log(`${i + 1}/${sortedUnits.length} - ${unit.name} → Sıra: ${siraNumarasi}`);
            }

            toast.success(`${sortedUnits.length} üniteye otomatik sıra numarası atandı!`);
            
            // Üniteleri yeniden yükle
            await loadUnits();
            
        } catch (error) {
            console.error('Otomatik numaralandırma hatası:', error);
            toast.error('Otomatik numaralandırma sırasında hata oluştu!');
        } finally {
            setIsAutoNumbering(false);
        }
    };

    const loadPodcasts = async () => {
        setPodcastsLoading(true);
        try {
            const q = query(collection(db, "podcasts"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setPodcasts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
            toast.error("Podcast'ler yüklenemedi");
        } finally {
            setPodcastsLoading(false);
        }
    };

    useEffect(() => { loadUnits(); loadPodcasts(); }, []);

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.type)) {
            toast.error("Geçersiz resim türü!");
            return;
        }
        const url = URL.createObjectURL(file);
        setSelectedImageFile(file);
        setImagePreview(url);
    };

    const handleEditImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.type)) {
            toast.error("Geçersiz resim türü!");
            return;
        }
        const url = URL.createObjectURL(file);
        setEditSelectedImageFile(file);
        setEditImagePreview(url);
    };

    const uploadImage = async (file) => {
        const storage = getStorage();
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const fileName = `podcast-units/${timestamp}_${safeName}`;
        const ref = storageRef(storage, fileName);
        await uploadBytes(ref, file);
        return await getDownloadURL(ref);
    };

    const addUnit = async (e) => {
        e.preventDefault();
        if (!newUnit.name.trim()) return toast.error("Ünite adı zorunlu");
        try {
            // Sıra numarası çakışması kontrolü
            const newSira = newUnit.siraNumarasi || 0;
            if (newSira > 0) {
                // Aynı sıra numarasına sahip başka bir ünite var mı kontrol et
                const conflictingUnit = units.find(u => u.siraNumarasi === newSira);
                
                if (conflictingUnit) {
                    // Çakışan üniteyi 0 yap (sıra numarası yok)
                    await updateDoc(doc(db, "podcast-units", conflictingUnit.id), {
                        siraNumarasi: 0
                    });
                    console.log(`${conflictingUnit.name} ünitesinin sıra numarası kaldırıldı`);
                }
            }

            let imageUrl = "";
            if (selectedImageFile) {
                setUploadingImage(true);
                imageUrl = await uploadImage(selectedImageFile);
            }
            const ref = collection(db, "podcast-units");
            const docRef = await addDoc(ref, {
                name: newUnit.name.trim(),
                description: newUnit.description.trim(),
                imageUrl,
                createdAt: serverTimestamp(),
                isActive: true,
                siraNumarasi: newUnit.siraNumarasi
            });
            // doc id'yi kendi içine yaz (unitId)
            await updateDoc(doc(db, "podcast-units", docRef.id), { unitId: docRef.id });

            // Map selected podcasts to this unit and update podcast.unitId (with previous cleanup)
            const toAdd = Array.from(selectedPodcastIds);
            for (const pid of toAdd) {
                try {
                    const podcast = podcasts.find(p => p.id === pid);
                    if (podcast?.unitId && podcast.unitId !== docRef.id) {
                        // remove old mapping
                        await deleteDoc(doc(db, "podcast-units", podcast.unitId, "podcasts", pid));
                    }
                    await setDoc(doc(db, "podcast-units", docRef.id, "podcasts", pid), {
                        podcastId: pid,
                        createdAt: serverTimestamp()
                    });
                    await updateDoc(doc(db, "podcasts", pid), { unitId: docRef.id, lastUpdated: serverTimestamp() });
                } catch (mapErr) {
                    console.error("Podcast eşlemesi eklenemedi:", mapErr);
                }
            }

            toast.success("Ünite eklendi");
            setShowAdd(false);
            setNewUnit({ name: "", description: "" });
            setSelectedImageFile(null);
            setImagePreview(null);
            setSelectedPodcastIds(new Set());
            loadUnits();
        } catch (e) {
            console.error(e);
            toast.error("Ünite eklenemedi");
        } finally {
            setUploadingImage(false);
        }
    };

    const openEdit = async (unit) => {
        setEditUnit({ id: unit.id, name: unit.name || "", description: unit.description || "", imageUrl: unit.imageUrl || "", siraNumarasi: unit.siraNumarasi || 0 });
        setEditSelectedImageFile(null);
        setEditImagePreview(unit.imageUrl || null);
        // load selected podcasts for this unit
        try {
            const snap = await getDocs(collection(db, "podcast-units", unit.id, "podcasts"));
            const ids = new Set(snap.docs.map(d => d.id));
            setEditSelectedPodcastIds(ids);
        } catch (err) {
            setEditSelectedPodcastIds(new Set());
        }
        setShowEdit(true);
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        if (!editUnit.id) return;
        try {
            // Sıra numarası değişikliği kontrolü
            const originalUnit = units.find(u => u.id === editUnit.id);
            const originalSira = originalUnit?.siraNumarasi || 0;
            const newSira = editUnit.siraNumarasi || 0;
            
            // Eğer sıra numarası değiştiyse, yer değiştirme yap
            if (originalSira !== newSira && newSira > 0) {
                // Yeni sıra numarasına sahip başka bir ünite var mı kontrol et
                const conflictingUnit = units.find(u => u.id !== editUnit.id && u.siraNumarasi === newSira);
                
                if (conflictingUnit) {
                    // Çakışan üniteyi eski sıra numarasına taşı
                    await updateDoc(doc(db, "podcast-units", conflictingUnit.id), {
                        siraNumarasi: originalSira
                    });
                    console.log(`${conflictingUnit.name} ünitesi ${originalSira} numarasına taşındı`);
                }
            }

            let imageUrl = editUnit.imageUrl || "";
            if (editSelectedImageFile) {
                setUploadingImage(true);
                imageUrl = await uploadImage(editSelectedImageFile);
            }
            await updateDoc(doc(db, "podcast-units", editUnit.id), {
                name: editUnit.name.trim(),
                description: editUnit.description.trim(),
                imageUrl,
                siraNumarasi: editUnit.siraNumarasi
            });

            // sync podcast mappings
            const snap = await getDocs(collection(db, "podcast-units", editUnit.id, "podcasts"));
            const existing = new Set(snap.docs.map(d => d.id));
            const desired = new Set(editSelectedPodcastIds);

            // additions
            for (const pid of desired) {
                if (!existing.has(pid)) {
                    try {
                        const podcast = podcasts.find(p => p.id === pid);
                        if (podcast?.unitId && podcast.unitId !== editUnit.id) {
                            await deleteDoc(doc(db, "podcast-units", podcast.unitId, "podcasts", pid));
                        }
                        await setDoc(doc(db, "podcast-units", editUnit.id, "podcasts", pid), { podcastId: pid, updatedAt: serverTimestamp() }, { merge: true });
                        await updateDoc(doc(db, "podcasts", pid), { unitId: editUnit.id, lastUpdated: serverTimestamp() });
                    } catch (err) {
                        console.error("Podcast eşlemesi eklenirken hata:", err);
                    }
                }
            }
            // removals
            for (const pid of existing) {
                if (!desired.has(pid)) {
                    try {
                        await deleteDoc(doc(db, "podcast-units", editUnit.id, "podcasts", pid));
                        const pDocRef = doc(db, "podcasts", pid);
                        const podcast = podcasts.find(p => p.id === pid);
                        if (podcast?.unitId === editUnit.id) {
                            await updateDoc(pDocRef, { unitId: "", lastUpdated: serverTimestamp() });
                        }
                    } catch (err) {
                        console.error("Podcast eşlemesi silinirken hata:", err);
                    }
                }
            }

            toast.success("Ünite güncellendi");
            setShowEdit(false);
            setEditSelectedImageFile(null);
            setEditImagePreview(null);
            loadUnits();
        } catch (e) {
            console.error(e);
            toast.error("Ünite güncellenemedi");
        } finally {
            setUploadingImage(false);
        }
    };

    const removeUnit = async (unit) => {
        if (!window.confirm(`${unit.name} ünitesini silmek istediğinize emin misiniz?`)) return;
        try {
            // Fetch all mapped podcasts for this unit
            const pSnap = await getDocs(collection(db, "podcast-units", unit.id, "podcasts"));
            const podcastIds = pSnap.docs.map(d => d.id);

            let alsoDelete = false;
            if (podcastIds.length > 0) {
                alsoDelete = window.confirm(`Bu üniteye bağlı ${podcastIds.length} podcast bulundu.\n\nTamam: Podcast'leri de sil\nİptal: Sadece ünite bağlantısını kaldır (podcast'lerde unitId boşaltılır)`);
            }

            // Process podcasts per user choice
            for (const pid of podcastIds) {
                try {
                    if (alsoDelete) {
                        // Delete podcast document
                        await deleteDoc(doc(db, "podcasts", pid));
                    } else {
                        // Detach podcast from unit (clear unitId)
                        await updateDoc(doc(db, "podcasts", pid), { unitId: "", lastUpdated: serverTimestamp() });
                    }
                    // Remove mapping doc under the unit
                    await deleteDoc(doc(db, "podcast-units", unit.id, "podcasts", pid));
                } catch (err) {
                    console.error("Podcast temizleme hatası:", err);
                }
            }

            // Delete the unit document itself
            await deleteDoc(doc(db, "podcast-units", unit.id));

            toast.success("Ünite silindi");
            loadUnits();
        } catch (e) {
            console.error(e);
            toast.error("Ünite silinemedi");
        }
    };

    const toggleNewSelection = (pid) => {
        const next = new Set(selectedPodcastIds);
        if (next.has(pid)) next.delete(pid); else next.add(pid);
        setSelectedPodcastIds(next);
    };

    const toggleEditSelection = (pid) => {
        const next = new Set(editSelectedPodcastIds);
        if (next.has(pid)) next.delete(pid); else next.add(pid);
        setEditSelectedPodcastIds(next);
    };

    const filteredPodcasts = podcasts.filter(p => (p.baslik || "").toLowerCase().includes(podcastSearch.toLowerCase()));

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-600 rounded-2xl">
                                <FaBookOpen className="text-3xl text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Podcast Üniteleri</h1>
                                <p className="text-gray-600 dark:text-gray-400">Üniteleri görüntüleyin, düzenleyin ve ekleyin</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { 
                                const nextSira = getNextSiraNumarasi();
                                setNewUnit({ name: "", description: "", siraNumarasi: nextSira });
                                setShowAdd(true); 
                                setSelectedPodcastIds(new Set()); 
                            }}
                            className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
                        >
                            <FaPlus /> Yeni Ünite
                        </button>
                    </div>

                    <div className="bg-transparent">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
                        ) : units.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">Henüz ünite eklenmemiş</div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {units.map(u => (
                                    <div key={u.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-700">
                                            {u.imageUrl ? (
                                                <img src={u.imageUrl} alt={u.name} className="absolute inset-0 w-full h-full object-cover" />
                                            ) : (
                                                <div className="absolute inset-0 w-full h-full flex items-center justify-center text-gray-400">Görsel yok</div>
                                            )}
                                            <div className="absolute right-2 top-2 text-[11px] px-2 py-1 rounded-full bg-white/90 dark:bg-gray-900/80 text-gray-800 dark:text-gray-200 shadow">
                                                {u.podcastCount ?? 0} podcast
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-start justify_between gap-3">
                                                <div>
                                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{u.name}</h3>
                                                    {u.description && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{u.description}</p>
                                                    )}
                                                </div>
                                                <span className="text-[10px] px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shrink-0">Aktif</span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <a 
                                                    href={`/podcast?unitId=${u.id}`}
                                                    className="px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex items-center gap-1"
                                                >
                                                    <FaEye />
                                                    Podcast'leri Gör
                                                </a>
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => openEdit(u)} className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 transition-colors">
                                                        <FaEdit />
                                                    </button>
                                                    <button onClick={() => removeUnit(u)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-300 transition-colors">
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {showAdd && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
                            <div className="shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Yeni Ünite Ekle</h2>
                            </div>
                            <form onSubmit={addUnit} className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ünite Adı *</label>
                                            <input type="text" value={newUnit.name} onChange={(e) => setNewUnit(prev => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="Örn: Ünite 1 - Temel Kavramlar" required />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                                Sıra Numarası
                                            </label>
                                            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <input
                                                            type="number"
                                                            value={newUnit.siraNumarasi}
                                                            onChange={(e) => setNewUnit(prev => ({ ...prev, siraNumarasi: parseInt(e.target.value) || 0 }))}
                                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-lg font-semibold"
                                                            placeholder="0"
                                                            min="0"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewUnit(prev => ({ ...prev, siraNumarasi: (prev.siraNumarasi || 0) + 1 }))}
                                                            className="w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                                                            title="Artır"
                                                        >
                                                            <FaPlus className="text-xs" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewUnit(prev => ({ ...prev, siraNumarasi: Math.max(0, (prev.siraNumarasi || 0) - 1) }))}
                                                            className="w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                                                            title="Azalt"
                                                        >
                                                            <FaTimes className="text-xs" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full ${newUnit.siraNumarasi > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                                            {newUnit.siraNumarasi > 0 ? `Sıra: ${newUnit.siraNumarasi}` : 'Sıra numarası yok'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextSira = getNextSiraNumarasi();
                                                            setNewUnit(prev => ({ ...prev, siraNumarasi: nextSira }));
                                                        }}
                                                        className="text-xs px-3 py-1 bg-green-100 dark:bg-green-700 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-600 rounded-full transition-colors"
                                                    >
                                                        Otomatik
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Açıklama</label>
                                            <textarea value={newUnit.description} onChange={(e) => setNewUnit(prev => ({ ...prev, description: e.target.value }))} rows={8} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="Kısa bir açıklama (opsiyonel)" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Ünite Görseli</label>
                                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                                            <div className="flex items-center gap-3">
                                                <input type="file" accept="image/*" onChange={handleImageSelect} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 dark:file:bg-purple-900/30 dark:file:text-purple-300 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/40" />
                                                {imagePreview && (
                                                    <button type="button" onClick={() => { setSelectedImageFile(null); setImagePreview(null); }} className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 font-medium">Kaldır</button>
                                                )}
                                            </div>
                                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                    <FaImage className="text-purple-600" /> Önizleme
                                                </div>
                                                {imagePreview ? (
                                                    <div className="justify-self-end">
                                                        <img src={imagePreview} alt="Önizleme" className="w-36 h-36 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                                                    </div>
                                                ) : (
                                                    <div className="justify-self-end w-36 h-36 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-gray-900/40 flex items-center justify-center text-xs text-gray-500">Seçilmedi</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Bu üniteye eklenecek podcast'leri seçin</label>
                                    <div className="relative">
                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input value={podcastSearch} onChange={(e) => setPodcastSearch(e.target.value)} placeholder="Podcast ara" className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
                                    </div>
                                    <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                        {podcastsLoading ? (
                                            <div className="p-3 text-sm text-gray-500">Yükleniyor...</div>
                                        ) : filteredPodcasts.length === 0 ? (
                                            <div className="p-3 text-sm text-gray-500">Podcast bulunamadı</div>
                                        ) : (
                                            filteredPodcasts.map(p => (
                                                <label key={p.id} className="flex items-center justify_between gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                                    <input type="checkbox" checked={selectedPodcastIds.has(p.id)} onChange={() => toggleNewSelection(p.id)} />
                                                    <span className="text-sm text-gray-800 dark:text-gray-200 line-clamp-1">{p.baslik || p.id}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur pt-4">
                                    <div className="flex gap-4">
                                        <button type="button" onClick={() => { setShowAdd(false); setSelectedImageFile(null); setImagePreview(null); setSelectedPodcastIds(new Set()); }} className="flex-1 px-5 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold">İptal</button>
                                        <button type="submit" disabled={uploadingImage} className="flex-1 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                                            <FaSave /> {uploadingImage ? "Yükleniyor..." : "Kaydet"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showEdit && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
                            <div className="shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ünite Düzenle</h2>
                            </div>
                            <form onSubmit={submitEdit} className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ünite Adı *</label>
                                            <input type="text" value={editUnit.name} onChange={(e) => setEditUnit(prev => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg_gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500" required />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                                Sıra Numarası
                                            </label>
                                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <input
                                                            type="number"
                                                            value={editUnit.siraNumarasi}
                                                            onChange={(e) => setEditUnit(prev => ({ ...prev, siraNumarasi: parseInt(e.target.value) || 0 }))}
                                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center text-lg font-semibold"
                                                            placeholder="0"
                                                            min="0"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditUnit(prev => ({ ...prev, siraNumarasi: (prev.siraNumarasi || 0) + 1 }))}
                                                            className="w-10 h-10 flex items-center justify-center bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
                                                            title="Artır"
                                                        >
                                                            <FaPlus className="text-xs" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditUnit(prev => ({ ...prev, siraNumarasi: Math.max(0, (prev.siraNumarasi || 0) - 1) }))}
                                                            className="w-10 h-10 flex items-center justify-center bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
                                                            title="Azalt"
                                                        >
                                                            <FaTimes className="text-xs" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full ${editUnit.siraNumarasi > 0 ? 'bg-purple-500' : 'bg-gray-400'}`}></div>
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                                            {editUnit.siraNumarasi > 0 ? `Sıra: ${editUnit.siraNumarasi}` : 'Sıra numarası yok'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextSira = getNextSiraNumarasi();
                                                            setEditUnit(prev => ({ ...prev, siraNumarasi: nextSira }));
                                                        }}
                                                        className="text-xs px-3 py-1 bg-purple-100 dark:bg-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-600 rounded-full transition-colors"
                                                    >
                                                        Otomatik
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Açıklama</label>
                                            <textarea value={editUnit.description} onChange={(e) => setEditUnit(prev => ({ ...prev, description: e.target.value }))} rows={8} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Ünite Görseli</label>
                                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                                            <div className="flex items-center gap-3">
                                                <input type="file" accept="image/*" onChange={handleEditImageSelect} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 dark:file:bg-purple-900/30 dark:file:text-purple-300 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/40" />
                                                {editImagePreview && (
                                                    <button type="button" onClick={() => { setEditSelectedImageFile(null); setEditImagePreview(null); setEditUnit(prev => ({ ...prev, imageUrl: "" })); }} className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 font-medium">Kaldır</button>
                                                )}
                                            </div>
                                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                    <FaImage className="text-purple-600" /> Önizleme
                                                </div>
                                                {editImagePreview ? (
                                                    <div className="justify-self-end">
                                                        <img src={editImagePreview} alt="Önizleme" className="w-36 h-36 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                                                    </div>
                                                ) : (
                                                    <div className="justify-self-end w-36 h-36 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-gray-900/40 flex items-center justify-center text-xs text-gray-500">Seçilmedi</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Bu üniteye bağlı podcast'leri yönet</label>
                                    <div className="relative">
                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input value={podcastSearch} onChange={(e) => setPodcastSearch(e.target.value)} placeholder="Podcast ara" className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
                                    </div>
                                    <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                        {podcastsLoading ? (
                                            <div className="p-3 text-sm text-gray-500">Yükleniyor...</div>
                                        ) : filteredPodcasts.length === 0 ? (
                                            <div className="p-3 text-sm text-gray-500">Podcast bulunamadı</div>
                                        ) : (
                                            filteredPodcasts.map(p => (
                                                <label key={p.id} className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                                    <div className="flex items-center gap-3">
                                                        <input type="checkbox" checked={editSelectedPodcastIds.has(p.id)} onChange={() => toggleEditSelection(p.id)} />
                                                        <span className="text-sm text-gray-800 dark:text-gray-200 line-clamp-1">{p.baslik || p.id}</span>
                                                    </div>
                                                    {p.unitId && p.unitId !== editUnit.id && (
                                                        <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">Başka ünite: {p.unitId.slice(0,6)}...</span>
                                                    )}
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur pt-4">
                                    <div className="flex gap-4">
                                        <button type="button" onClick={() => setShowEdit(false)} className="flex-1 px-5 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold">İptal</button>
                                        <button type="submit" disabled={uploadingImage} className="flex-1 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                                            <FaSave /> {uploadingImage ? "Yükleniyor..." : "Güncelle"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Podcast'leri Gör artık podcast yönetimine yönlendiriyor */}
            </div>
        </Layout>
    );
};

export default PodcastUnitsPage;
