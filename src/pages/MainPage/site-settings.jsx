import React, { useEffect, useMemo, useState } from "react";
import Layout from "../../components/layout";
import { FaChevronDown, FaCog, FaImage, FaSave, FaSyncAlt, FaTextHeight, FaCreditCard } from "react-icons/fa";
import siteSettingsService from "../../services/siteSettingsService";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const SiteSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroMode, setHeroMode] = useState("text"); // text | image
  const [heroTitle1, setHeroTitle1] = useState("");
  const [heroTitle2, setHeroTitle2] = useState("");
  const [heroImageFile, setHeroImageFile] = useState(null);
  const [rightImageFile, setRightImageFile] = useState(null);
  const [heroImagePreview, setHeroImagePreview] = useState("");
  const [rightImagePreview, setRightImagePreview] = useState("");
  const [heroImagePath, setHeroImagePath] = useState("");
  const [rightImagePath, setRightImagePath] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [rightImageUrl, setRightImageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRightDragging, setIsRightDragging] = useState(false);
  const [isHeroDragging, setIsHeroDragging] = useState(false);
  const [platformTitle, setPlatformTitle] = useState("Platform Özellikleri");
  const [platformImages, setPlatformImages] = useState([]); // [{id, url, path}]
  const [platformNewImages, setPlatformNewImages] = useState([]); // [{id, file, preview}]
  const [platformDeletePaths, setPlatformDeletePaths] = useState([]);
  const [platformItems, setPlatformItems] = useState([]);
  const [newPlatformItem, setNewPlatformItem] = useState("");
  const [isPlatformDragging, setIsPlatformDragging] = useState(false);
  const [faqItems, setFaqItems] = useState([]);
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [aboutTitle, setAboutTitle] = useState("Hakkımızda");
  const [aboutContent, setAboutContent] = useState("");
  const [contractItems, setContractItems] = useState([]);
  const [bankItems, setBankItems] = useState([]);
  const [newBank, setNewBank] = useState({ bankName: "", iban: "", holder: "", logoFile: null, logoPreview: "", logoPath: "" });
  const [isNewBankDragging, setIsNewBankDragging] = useState(false);
  const [bankDragIndex, setBankDragIndex] = useState(null);
  const [activeSection, setActiveSection] = useState("hero");
  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "clean"],
      ],
    }),
    []
  );

  const heroPreview = useMemo(() => {
    if (heroMode === "text") return null;
    return heroImageFile ? URL.createObjectURL(heroImageFile) : heroImageUrl;
  }, [heroMode, heroImageFile, heroImageUrl]);

  const rightPreview = useMemo(() => {
    return rightImageFile ? URL.createObjectURL(rightImageFile) : rightImageUrl;
  }, [rightImageFile, rightImageUrl]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await siteSettingsService.getHeroSettings();
        const platform = await siteSettingsService.getPlatformFeatures();
        const faq = await siteSettingsService.getFaq();
        const about = await siteSettingsService.getAbout();
        const contracts = await siteSettingsService.getContracts();
        const banks = await siteSettingsService.getBankAccounts();
        setHeroMode(data.heroMode || "text");
        setHeroTitle1(data.heroTitle1 || "");
        setHeroTitle2(data.heroTitle2 || "");
        setHeroImageUrl(data.heroImageUrl || "");
        setHeroImagePath(data.heroImagePath || "");
        setRightImageUrl(data.rightImageUrl || "");
        setRightImagePath(data.rightImagePath || "");
        setPlatformTitle(platform.title || "Platform Özellikleri");
        setPlatformImages(
          (platform.images || []).map((img, idx) => ({
            id: img?.path || img?.url || `img-${idx}`,
            url: img?.url || "",
            path: img?.path || "",
          }))
        );
        setPlatformItems(Array.isArray(platform.items) ? platform.items : []);
        setFaqItems(Array.isArray(faq.items) ? faq.items : []);
        setAboutTitle(about.title || "Hakkımızda");
        setAboutContent(about.content || "");
        setContractItems(Array.isArray(contracts.items) ? contracts.items : []);
        setBankItems(
          (Array.isArray(banks.items) ? banks.items : []).map((b, idx) => ({
            bankName: b.bankName || "",
            iban: b.iban || "",
            holder: b.holder || "",
            logoUrl: b.logoUrl || "",
            logoPath: b.logoPath || "",
            logoPreview: b.logoUrl || "",
            _newLogoFile: null,
          }))
        );
      } catch (err) {
        console.error(err);
        setError("Ayarlar yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onHeroFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setHeroImageFile(file);
  };

  const handleHeroDrop = (event) => {
    event.preventDefault();
    setIsHeroDragging(false);
    if (!event.dataTransfer.files?.length) return;
    const file = event.dataTransfer.files[0];
    if (file && file.type?.startsWith("image/")) {
      setHeroImageFile(file);
    }
  };

  const handleHeroDragOver = (event) => {
    event.preventDefault();
    setIsHeroDragging(true);
  };

  const handleHeroDragLeave = (event) => {
    event.preventDefault();
    setIsHeroDragging(false);
  };

  const onRightFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setRightImageFile(file);
  };

  const handleRightDrop = (event) => {
    event.preventDefault();
    setIsRightDragging(false);
    if (!event.dataTransfer.files?.length) return;
    const file = event.dataTransfer.files[0];
    if (file && file.type?.startsWith("image/")) {
      setRightImageFile(file);
    }
  };

  const handleRightDragOver = (event) => {
    event.preventDefault();
    setIsRightDragging(true);
  };

  const handleRightDragLeave = (event) => {
    event.preventDefault();
    setIsRightDragging(false);
  };

  const handleSave = async () => {
    setError("");
    setMessage("");
    setSaving(true);

    try {
      let newHeroImageUrl = heroImageUrl;
      let newHeroImagePath = heroImagePath;
      let newRightImageUrl = rightImageUrl;
      let newRightImagePath = rightImagePath;

      if (heroMode === "image" && heroImageFile) {
        if (heroImagePath) {
          await siteSettingsService.deleteImage(heroImagePath);
        }
        const uploaded = await siteSettingsService.uploadImage(
          heroImageFile,
          "site-settings/hero/main"
        );
        newHeroImageUrl = uploaded.url;
        newHeroImagePath = uploaded.path;
      }

      if (heroMode === "text") {
        // Metin modunda görsel zorunlu değil; mevcut görseli saklamak isteyebiliriz
        // İstenirse tam silme için aşağıdaki iki satır açılabilir
        // newHeroImageUrl = "";
        // newHeroImagePath = "";
      }

      if (rightImageFile) {
        if (newRightImagePath) {
          await siteSettingsService.deleteImage(newRightImagePath);
        }
        const uploaded = await siteSettingsService.uploadImage(
          rightImageFile,
          "site-settings/hero/right"
        );
        newRightImageUrl = uploaded.url;
        newRightImagePath = uploaded.path;
      }

      await siteSettingsService.saveHeroSettings({
        heroMode,
        heroTitle1,
        heroTitle2,
        heroImageUrl: newHeroImageUrl,
        heroImagePath: newHeroImagePath,
        rightImageUrl: newRightImageUrl,
        rightImagePath: newRightImagePath,
      });

      // Platform Özellikleri: silinecek görselleri kaldır
      for (const path of platformDeletePaths) {
        await siteSettingsService.deleteImage(path);
      }

      // Yeni görselleri yükle
      const uploadedPlatformImages = [];
      for (const item of platformNewImages) {
        const uploaded = await siteSettingsService.uploadImage(
          item.file,
          "site-settings/platform-features"
        );
        uploadedPlatformImages.push({
          id: uploaded.path,
          url: uploaded.url,
          path: uploaded.path,
        });
      }

      const finalPlatformImages = [
        ...platformImages,
        ...uploadedPlatformImages,
      ];

      const cleanedItems = (platformItems || [])
        .map((i) => (i || "").trim())
        .filter((i) => i.length > 0);

      await siteSettingsService.savePlatformFeatures({
        title: platformTitle || "Platform Özellikleri",
        images: finalPlatformImages,
        items: cleanedItems,
      });

      const cleanedFaqItems = (faqItems || [])
        .map((f) => ({
          question: (f?.question || "").trim(),
          answer: (f?.answer || "").trim(),
        }))
        .filter((f) => f.question.length > 0 && f.answer.length > 0);

      await siteSettingsService.saveFaq({
        items: cleanedFaqItems,
      });

      await siteSettingsService.saveAbout({
        title: aboutTitle || "Hakkımızda",
        content: aboutContent || "",
      });

      const cleanedContracts = (contractItems || []).map((c) => ({
        title: (c?.title || "").trim(),
        content: (c?.content || "").trim(),
      }));

      await siteSettingsService.saveContracts({
        items: cleanedContracts,
      });

      const processedBankItems = [];
      for (const b of bankItems || []) {
        const bankName = (b?.bankName || "").trim();
        const iban = (b?.iban || "").trim();
        const holder = (b?.holder || "").trim();
        let logoUrl = b?.logoUrl || "";
        let logoPath = b?.logoPath || "";

        if (b?._newLogoFile) {
          if (logoPath) {
            await siteSettingsService.deleteImage(logoPath);
          }
          const uploaded = await siteSettingsService.uploadImage(
            b._newLogoFile,
            "site-settings/bank-logos"
          );
          logoUrl = uploaded.url;
          logoPath = uploaded.path;
        }

        if (bankName || iban || holder || logoUrl) {
          processedBankItems.push({
            bankName,
            iban,
            holder,
            logoUrl,
            logoPath,
          });
        }
      }

      await siteSettingsService.saveBankAccounts({
        items: processedBankItems,
      });

      setHeroImageUrl(newHeroImageUrl);
      setHeroImagePath(newHeroImagePath);
      setRightImageUrl(newRightImageUrl);
      setRightImagePath(newRightImagePath);
      setHeroImageFile(null);
      setRightImageFile(null);
      setPlatformNewImages([]);
      setPlatformDeletePaths([]);
      setPlatformImages(finalPlatformImages);
      setPlatformItems(cleanedItems);
      setFaqItems(cleanedFaqItems);
      setAboutTitle(aboutTitle || "Hakkımızda");
      setAboutContent(aboutContent || "");
      setContractItems(cleanedContracts);
      setBankItems(
        processedBankItems.map((b) => ({
          ...b,
          logoPreview: b.logoUrl,
          _newLogoFile: null,
        }))
      );
      setMessage("Ayarlar kaydedildi.");
    } catch (err) {
      console.error(err);
      setError("Kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  const handlePlatformDrop = (event) => {
    event.preventDefault();
    setIsPlatformDragging(false);
    if (!event.dataTransfer.files?.length) return;
    const files = Array.from(event.dataTransfer.files).filter((f) =>
      f.type?.startsWith("image/")
    );
    if (!files.length) return;
    const mapped = files.map((file) => ({
      id: `${Date.now()}-${file.name}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setPlatformNewImages((prev) => [...prev, ...mapped]);
  };

  const handlePlatformDragOver = (event) => {
    event.preventDefault();
    setIsPlatformDragging(true);
  };

  const handlePlatformDragLeave = (event) => {
    event.preventDefault();
    setIsPlatformDragging(false);
  };

  const handlePlatformFile = (event) => {
    const files = Array.from(event.target.files || []).filter((f) =>
      f.type?.startsWith("image/")
    );
    if (!files.length) return;
    const mapped = files.map((file) => ({
      id: `${Date.now()}-${file.name}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setPlatformNewImages((prev) => [...prev, ...mapped]);
  };

  const removeExistingPlatformImage = (path) => {
    setPlatformImages((prev) => prev.filter((img) => img.path !== path));
    setPlatformDeletePaths((prev) => [...prev, path]);
  };

  const removeNewPlatformImage = (id) => {
    setPlatformNewImages((prev) => prev.filter((img) => img.id !== id));
  };

  const addPlatformItem = () => {
    const val = (newPlatformItem || "").trim();
    if (!val) return;
    setPlatformItems((prev) => [...prev, val]);
    setNewPlatformItem("");
  };

  const removePlatformItem = (idx) => {
    setPlatformItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addFaqItem = () => {
    const q = (newFaqQuestion || "").trim();
    const a = (newFaqAnswer || "").trim();
    if (!q || !a) return;
    setFaqItems((prev) => [...prev, { question: q, answer: a }]);
    setNewFaqQuestion("");
    setNewFaqAnswer("");
  };

  const removeFaqItem = (idx) => {
    setFaqItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateContractItem = (idx, field, value) => {
    setContractItems((prev) =>
      prev.map((c, i) =>
        i === idx
          ? {
              ...c,
              [field]: value,
            }
          : c
      )
    );
  };

  const updateBankItem = (idx, field, value) => {
    setBankItems((prev) =>
      prev.map((b, i) =>
        i === idx
          ? {
              ...b,
              [field]: value,
            }
          : b
      )
    );
  };

  const addBankItem = () => {
    const trimmed = {
      bankName: (newBank.bankName || "").trim(),
      iban: (newBank.iban || "").trim(),
      holder: (newBank.holder || "").trim(),
    };
    if (!trimmed.bankName && !trimmed.iban && !trimmed.holder && !newBank.logoFile) return;
    setBankItems((prev) => [
      ...prev,
      {
        ...trimmed,
        logoUrl: "",
        logoPath: "",
        logoPreview: newBank.logoPreview || "",
        _newLogoFile: newBank.logoFile || null,
      },
    ]);
    setNewBank({ bankName: "", iban: "", holder: "", logoFile: null, logoPreview: "", logoPath: "" });
  };

  const removeBankItem = (idx) => {
    setBankItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const setNewBankLogoFile = (file) => {
    if (!file || !file.type?.startsWith("image/")) return;
    setNewBank((prev) => ({
      ...prev,
      logoFile: file,
      logoPreview: URL.createObjectURL(file),
    }));
  };

  const handleNewBankFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setNewBankLogoFile(file);
  };

  const handleNewBankDrop = (event) => {
    event.preventDefault();
    setIsNewBankDragging(false);
    if (!event.dataTransfer.files?.length) return;
    const file = event.dataTransfer.files[0];
    setNewBankLogoFile(file);
  };

  const handleNewBankDragOver = (event) => {
    event.preventDefault();
    setIsNewBankDragging(true);
  };

  const handleNewBankDragLeave = (event) => {
    event.preventDefault();
    setIsNewBankDragging(false);
  };

  const setExistingBankLogoFile = (idx, file) => {
    if (!file || !file.type?.startsWith("image/")) return;
    setBankItems((prev) =>
      prev.map((b, i) =>
        i === idx
          ? {
              ...b,
              logoPreview: URL.createObjectURL(file),
              _newLogoFile: file,
            }
          : b
      )
    );
  };

  const handleBankLogoFileSelect = (idx, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setExistingBankLogoFile(idx, file);
  };

  const handleBankLogoDrop = (idx, event) => {
    event.preventDefault();
    setBankDragIndex(null);
    if (!event.dataTransfer.files?.length) return;
    const file = event.dataTransfer.files[0];
    setExistingBankLogoFile(idx, file);
  };

  const handleBankLogoDragOver = (idx, event) => {
    event.preventDefault();
    setBankDragIndex(idx);
  };

  const handleBankLogoDragLeave = () => {
    setBankDragIndex(null);
  };

  const SectionCard = ({ id, title, icon, children }) => {
    const open = activeSection === id;
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-gray-900/50 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveSection((prev) => (prev === id ? null : id))}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {title}
            </span>
          </div>
          <FaChevronDown
            className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
            size={14}
          />
        </button>
        {open && (
          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4 md:px-6 md:py-6">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-10">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-3">
                  <FaCog className="text-indigo-600" />
                  Site Ayarları
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Hero alanını güncelleyin: metin veya görsel, sağ görsel, tek noktadan yönetim.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">
              {loading ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  Ayarlar yükleniyor...
                </div>
              ) : (
                <div className="space-y-6">
                  {(message || error) && (
                    <div
                      className={`rounded-lg px-4 py-3 text-sm ${
                        error
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}
                    >
                      {error || message}
                    </div>
                  )}

                  <SectionCard
                    id="hero"
                    title="Üst Başlık Ayarları"
                    icon={<FaTextHeight className="text-indigo-500" />}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Görünüm Modu
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border transition ${heroMode === "text" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : "border-gray-200 dark:border-gray-700"}`}>
                              <input
                                type="radio"
                                name="heroMode"
                                value="text"
                                checked={heroMode === "text"}
                                onChange={() => setHeroMode("text")}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-800 dark:text-gray-200">İki Metin</span>
                            </label>
                            <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border transition ${heroMode === "image" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : "border-gray-200 dark:border-gray-700"}`}>
                              <input
                                type="radio"
                                name="heroMode"
                                value="image"
                                checked={heroMode === "image"}
                                onChange={() => setHeroMode("image")}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-800 dark:text-gray-200">Tek Görsel</span>
                            </label>
                          </div>
                        </div>

                        {heroMode === "text" && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Üst Başlık Metin 1 (Zengin Metin)
                              </label>
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                                <ReactQuill
                                  theme="snow"
                                  value={heroTitle1}
                                  onChange={setHeroTitle1}
                                  placeholder="Örn: Dijital dünyada oyunun kurallarını değiştirin"
                                  modules={quillModules}
                                  className="text-sm"
                                />
                              </div>
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Renk, kalın, italik, liste ve link desteği ile zengin metin girişi.
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Üst Başlık Metin 2
                              </label>
                              <input
                                type="text"
                                value={heroTitle2}
                                onChange={(e) => setHeroTitle2(e.target.value)}
                                placeholder="Örn: Etkileyici içerikler ve güçlü altyapı ile büyütün"
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                              />
                            </div>
                          </div>
                        )}

                        {heroMode === "image" && (
                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Üst Başlık Görseli
                            </label>
                            <div
                              onDragOver={handleHeroDragOver}
                              onDragLeave={handleHeroDragLeave}
                              onDrop={handleHeroDrop}
                              className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition shadow-sm
                               ${isHeroDragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30"}`}
                            >
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                Dosya seç veya sürükle-bırak
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Görsel dosyalarını destekler
                              </p>
                              <label className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={onHeroFileChange}
                                  className="hidden"
                                />
                                Dosya Seç
                              </label>
                              {heroImageFile && (
                                <span className="text-xs text-gray-500">
                                  {heroImageFile.name}
                                </span>
                              )}
                            </div>
                            {heroPreview && (
                              <div className="mt-2">
                                <img
                                  src={heroPreview}
                                  alt="Üst başlık önizleme"
                                  className="h-40 w-full max-w-md rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                                />
                              </div>
                            )}
                            {!heroPreview && heroImageUrl && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Kayıtlı görsel kullanılmaya devam ediyor.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <FaImage className="text-indigo-500" />
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            Sağ Görsel
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div
                            onDragOver={handleRightDragOver}
                            onDragLeave={handleRightDragLeave}
                            onDrop={handleRightDrop}
                            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition shadow-sm
                             ${isRightDragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30"}`}
                          >
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                              Dosya seç veya sürükle-bırak
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Görsel dosyalarını destekler
                            </p>
                            <label className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={onRightFileChange}
                                className="hidden"
                              />
                              Dosya Seç
                            </label>
                            {rightImageFile && (
                              <span className="text-xs text-gray-500">
                                {rightImageFile.name}
                              </span>
                            )}
                          </div>
                          {rightPreview && (
                            <div>
                              <img
                                src={rightPreview}
                                alt="Sağ görsel önizleme"
                                className="h-40 w-full max-w-md rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                              />
                            </div>
                          )}
                          {!rightPreview && rightImageUrl && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Kayıtlı görsel kullanılmaya devam ediyor.
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Hero sağ tarafındaki görseli güncelleyin. Yeni dosya seçtiğinizde mevcut görsel otomatik değişir.
                        </p>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    id="platform"
                    title="Platform Özellikleri"
                    icon={<FaImage className="text-indigo-500" />}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Alan Başlığı
                          </label>
                          <input
                            type="text"
                            value={platformTitle}
                            onChange={(e) => setPlatformTitle(e.target.value)}
                            placeholder="Örn: Platform Özellikleri"
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                          />
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            Sol Slider Görselleri
                          </p>
                          <div
                            onDragOver={handlePlatformDragOver}
                            onDragLeave={handlePlatformDragLeave}
                            onDrop={handlePlatformDrop}
                            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition shadow-sm
                             ${isPlatformDragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30"}`}
                          >
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                              Birden fazla dosya seç veya sürükle-bırak
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Slider için görsel dosyaları
                            </p>
                            <label className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePlatformFile}
                                className="hidden"
                              />
                              Dosya Seç
                            </label>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {platformImages.map((img) => (
                              <div
                                key={img.id}
                                className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm"
                              >
                                <img
                                  src={img.url}
                                  alt="Platform görseli"
                                  className="h-28 w-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeExistingPlatformImage(img.path)}
                                  className="absolute top-2 right-2 rounded-full bg-white/90 dark:bg-gray-900/80 text-red-500 hover:text-red-600 shadow px-2 py-0.5 text-xs font-semibold"
                                >
                                  Sil
                                </button>
                              </div>
                            ))}
                            {platformNewImages.map((img) => (
                              <div
                                key={img.id}
                                className="relative rounded-xl overflow-hidden border border-indigo-200 dark:border-indigo-700 shadow-sm"
                              >
                                <img
                                  src={img.preview}
                                  alt="Yeni platform görseli"
                                  className="h-28 w-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeNewPlatformImage(img.id)}
                                  className="absolute top-2 right-2 rounded-full bg-white/90 dark:bg-gray-900/80 text-red-500 hover:text-red-600 shadow px-2 py-0.5 text-xs font-semibold"
                                >
                                  Kaldır
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            Özellik Maddeleri
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newPlatformItem}
                              onChange={(e) => setNewPlatformItem(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addPlatformItem();
                                }
                              }}
                              placeholder="Örn: Gerçek zamanlı analiz"
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            />
                            <button
                              type="button"
                              onClick={addPlatformItem}
                              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm font-semibold shadow-sm"
                            >
                              Ekle
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {platformItems.length === 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Henüz madde yok. Yeni madde ekleyin.
                            </p>
                          )}
                          {platformItems.map((item, idx) => (
                            <div
                              key={`${item}-${idx}`}
                              className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm"
                            >
                              <p className="text-sm text-gray-800 dark:text-gray-100">
                                {item}
                              </p>
                              <button
                                type="button"
                                onClick={() => removePlatformItem(idx)}
                                className="text-xs font-semibold text-red-500 hover:text-red-600"
                              >
                                Sil
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    id="faq"
                    title="Sıkça Sorulan Sorular"
                    icon={<FaTextHeight className="text-indigo-500" />}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Soru Başlığı
                          </label>
                          <input
                            type="text"
                            value={newFaqQuestion}
                            onChange={(e) => setNewFaqQuestion(e.target.value)}
                            placeholder="Örn: Platformu nasıl kullanırım?"
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Soru Cevabı (Zengin Metin)
                          </label>
                          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                            <ReactQuill
                              theme="snow"
                              value={newFaqAnswer}
                              onChange={setNewFaqAnswer}
                              placeholder="Örn: Hesabınıza giriş yapın, sağ üstten..."
                              modules={quillModules}
                              className="text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={addFaqItem}
                            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold shadow-sm"
                          >
                            Soru Ekle
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {faqItems.length === 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Henüz soru yok. Yeni soru ekleyin.
                          </p>
                        )}
                        {faqItems.map((item, idx) => (
                          <div
                            key={`${item.question}-${idx}`}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                {item.question}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeFaqItem(idx)}
                                className="text-xs font-semibold text-red-500 hover:text-red-600"
                              >
                                Sil
                              </button>
                            </div>
                            <div
                              className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-200"
                              dangerouslySetInnerHTML={{ __html: item.answer }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    id="about"
                    title="Hakkımızda"
                    icon={<FaTextHeight className="text-indigo-500" />}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Başlık
                          </label>
                          <input
                            type="text"
                            value={aboutTitle}
                            onChange={(e) => setAboutTitle(e.target.value)}
                            placeholder="Örn: Biz Kimiz?"
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Açıklama (Zengin Metin)
                          </label>
                          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                            <ReactQuill
                              theme="snow"
                              value={aboutContent}
                              onChange={setAboutContent}
                              placeholder="Örn: Misyonumuz, vizyonumuz ve değerlerimiz..."
                              modules={quillModules}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4 space-y-2">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            Canlı Önizleme
                          </p>
                          <p className="text-base font-bold text-gray-900 dark:text-white">
                            {aboutTitle || "Hakkımızda"}
                          </p>
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-200"
                            dangerouslySetInnerHTML={{ __html: aboutContent || "<p>İçerik girilmedi.</p>" }}
                          />
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    id="contracts"
                    title="Sözleşmeler"
                    icon={<FaTextHeight className="text-indigo-500" />}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        {contractItems.length === 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Henüz sözleşme yok.</p>
                        )}
                        {contractItems.map((c, idx) => (
                          <div key={`${c.title}-${idx}`} className="space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Sözleşme Başlığı
                              </label>
                              <input
                                type="text"
                                value={c.title}
                                onChange={(e) => updateContractItem(idx, "title", e.target.value)}
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                İçerik (Zengin Metin)
                              </label>
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                                <ReactQuill
                                  theme="snow"
                                  value={c.content}
                                  onChange={(val) => updateContractItem(idx, "content", val)}
                                  placeholder="Sözleşme metnini girin"
                                  modules={quillModules}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4 space-y-2">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            Önizleme
                          </p>
                          {contractItems.map((c, idx) => (
                            <div key={`preview-${idx}`} className="space-y-1 pb-3 border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{c.title || "Başlık"}</p>
                              <div
                                className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-200"
                                dangerouslySetInnerHTML={{ __html: c.content || "<p>İçerik yok.</p>" }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    id="banks"
                    title="Banka Hesaplarımız"
                    icon={<FaCreditCard className="text-indigo-500" />}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4 space-y-4">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            Yeni Hesap Ekle
                          </p>
                          <div className="grid grid-cols-1 gap-3">
                            <input
                              type="text"
                              value={newBank.bankName}
                              onChange={(e) => setNewBank((p) => ({ ...p, bankName: e.target.value }))}
                              placeholder="Banka Adı"
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            />
                            <input
                              type="text"
                              value={newBank.iban}
                              onChange={(e) => setNewBank((p) => ({ ...p, iban: e.target.value }))}
                              placeholder="IBAN"
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            />
                            <input
                              type="text"
                              value={newBank.holder}
                              onChange={(e) => setNewBank((p) => ({ ...p, holder: e.target.value }))}
                              placeholder="Alıcı"
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            />
                          </div>
                          <div
                            onDragOver={handleNewBankDragOver}
                            onDragLeave={handleNewBankDragLeave}
                            onDrop={handleNewBankDrop}
                            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition shadow-sm
                             ${isNewBankDragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30"}`}
                          >
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                              Banka logosu: dosya seç veya sürükle-bırak
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              PNG/JPG desteklenir
                            </p>
                            <label className="mt-2 inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleNewBankFileSelect}
                                className="hidden"
                              />
                              Dosya Seç
                            </label>
                            {newBank.logoPreview && (
                              <div className="mt-2">
                                <img
                                  src={newBank.logoPreview}
                                  alt="Yeni banka logosu"
                                  className="h-16 w-16 object-contain rounded-md border border-gray-200 dark:border-gray-700 bg-white"
                                />
                              </div>
                            )}
                            {!newBank.logoPreview && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Logo eklemek opsiyonel</p>
                            )}
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={addBankItem}
                              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold shadow-sm"
                            >
                              Hesap Ekle
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {bankItems.length === 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Henüz hesap eklenmedi.</p>
                          )}
                          {bankItems.map((b, idx) => (
                            <div
                              key={`${b.bankName}-${idx}`}
                              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  {b.logoPreview ? (
                                    <img src={b.logoPreview} alt={b.bankName} className="h-10 w-10 object-contain rounded-md border border-gray-200 dark:border-gray-700 bg-white" />
                                  ) : (
                                    <div className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500">
                                      Logo
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{b.bankName || "Banka"}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{b.holder || "Alıcı"}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeBankItem(idx)}
                                  className="text-xs font-semibold text-red-500 hover:text-red-600"
                                >
                                  Sil
                                </button>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                <div
                                  onDragOver={(e) => handleBankLogoDragOver(idx, e)}
                                  onDragLeave={handleBankLogoDragLeave}
                                  onDrop={(e) => handleBankLogoDrop(idx, e)}
                                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-3 text-center transition shadow-sm
                                   ${bankDragIndex === idx ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30"}`}
                                >
                                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                                    Logo değiştir (sürükle-bırak veya seç)
                                  </p>
                                  <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleBankLogoFileSelect(idx, e)}
                                      className="hidden"
                                    />
                                    Dosya Seç
                                  </label>
                                </div>
                                <input
                                  type="text"
                                  value={b.bankName}
                                  onChange={(e) => updateBankItem(idx, "bankName", e.target.value)}
                                  placeholder="Banka Adı"
                                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                                />
                                <input
                                  type="text"
                                  value={b.iban}
                                  onChange={(e) => updateBankItem(idx, "iban", e.target.value)}
                                  placeholder="IBAN"
                                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                                />
                                <input
                                  type="text"
                                  value={b.holder}
                                  onChange={(e) => updateBankItem(idx, "holder", e.target.value)}
                                  placeholder="Alıcı"
                                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                                />
                                <input
                                  type="text"
                                  value={b.logoUrl}
                                  onChange={(e) => updateBankItem(idx, "logoUrl", e.target.value)}
                                  placeholder="Logo URL (opsiyonel)"
                                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4 space-y-3">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            Önizleme
                          </p>
                          {bankItems.map((b, idx) => (
                            <div key={`bank-preview-${idx}`} className="flex items-center justify-between gap-3 border-b last:border-b-0 border-gray-100 dark:border-gray-800 pb-3">
                              <div className="flex items-center gap-3">
                                {b.logoPreview ? (
                                  <img src={b.logoPreview} alt={b.bankName} className="h-10 w-10 object-contain rounded-md border border-gray-200 dark:border-gray-700 bg-white" />
                                ) : (
                                  <div className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500">
                                    Logo
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{b.bankName || "Banka"}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{b.holder || "Alıcı"}</p>
                                  <p className="text-xs font-mono text-gray-700 dark:text-gray-300">{b.iban || "IBAN"}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {bankItems.length === 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Henüz önizlenecek hesap yok.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={saving || loading}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition
                       ${saving || loading ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}`}
                    >
                      {saving ? <FaSyncAlt className="animate-spin" /> : <FaSave />}
                      {saving ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SiteSettingsPage;

