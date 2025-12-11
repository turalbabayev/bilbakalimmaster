import { db, storage } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

const HERO_DOC_REF = doc(db, "site-settings", "hero");
const PLATFORM_DOC_REF = doc(db, "site-settings", "platform-features");
const FAQ_DOC_REF = doc(db, "site-settings", "faq");
const ABOUT_DOC_REF = doc(db, "site-settings", "about");
const CONTRACTS_DOC_REF = doc(db, "site-settings", "contracts");
const BANK_ACCOUNTS_DOC_REF = doc(db, "site-settings", "bank-accounts");
const TESTIMONIALS_DOC_REF = doc(db, "site-settings", "testimonials");

const getHeroSettings = async () => {
  const snap = await getDoc(HERO_DOC_REF);
  if (!snap.exists()) {
    return {
      heroMode: "text",
      heroTitle1: "",
      heroTitle2: "",
      heroImageUrl: "",
      heroImagePath: "",
      rightImageUrl: "",
      rightImagePath: "",
    };
  }

  const data = snap.data() || {};
  return {
    heroMode: data.heroMode || "text",
    heroTitle1: data.heroTitle1 || "",
    heroTitle2: data.heroTitle2 || "",
    heroImageUrl: data.heroImageUrl || "",
    heroImagePath: data.heroImagePath || "",
    rightImageUrl: data.rightImageUrl || "",
    rightImagePath: data.rightImagePath || "",
  };
};

const uploadImage = async (file, folder) => {
  const fileName = `${Date.now()}-${file.name}`;
  const storagePath = `${folder}/${fileName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, path: storagePath };
};

const deleteImage = async (path) => {
  if (!path) return;
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  } catch (error) {
    // Silme hatası kritik değil; loglayıp devam edelim
    console.warn("Eski görsel silinirken hata oluştu:", error);
  }
};

const saveHeroSettings = async (payload) => {
  await setDoc(
    HERO_DOC_REF,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const getPlatformFeatures = async () => {
  const snap = await getDoc(PLATFORM_DOC_REF);
  if (!snap.exists()) {
    return {
      title: "Platform Özellikleri",
      images: [],
      items: [],
    };
  }

  const data = snap.data() || {};
  return {
    title: data.title || "Platform Özellikleri",
    images: Array.isArray(data.images) ? data.images : [],
    items: Array.isArray(data.items) ? data.items : [],
  };
};

const savePlatformFeatures = async (payload) => {
  await setDoc(
    PLATFORM_DOC_REF,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const getFaq = async () => {
  const snap = await getDoc(FAQ_DOC_REF);
  if (!snap.exists()) {
    return {
      items: [],
    };
  }
  const data = snap.data() || {};
  return {
    items: Array.isArray(data.items) ? data.items : [],
  };
};

const saveFaq = async (payload) => {
  await setDoc(
    FAQ_DOC_REF,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const getAbout = async () => {
  const snap = await getDoc(ABOUT_DOC_REF);
  if (!snap.exists()) {
    return {
      title: "Hakkımızda",
      content: "",
    };
  }
  const data = snap.data() || {};
  return {
    title: data.title || "Hakkımızda",
    content: data.content || "",
  };
};

const saveAbout = async (payload) => {
  await setDoc(
    ABOUT_DOC_REF,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const getContracts = async () => {
  const snap = await getDoc(CONTRACTS_DOC_REF);
  if (!snap.exists()) {
    return {
      items: [
        { title: "Gizlilik Sözleşmesi", content: "" },
        { title: "Mesafeli Satış ve Uzaktan Eğitim Sözleşmesi", content: "" },
        { title: "Kişisel Verilerin Kullanılması ve İşlenmesi", content: "" },
      ],
    };
  }
  const data = snap.data() || {};
  const items = Array.isArray(data.items) ? data.items : [];
  return {
    items: items.map((i) => ({
      title: i?.title || "",
      content: i?.content || "",
    })),
  };
};

const saveContracts = async (payload) => {
  await setDoc(
    CONTRACTS_DOC_REF,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const getBankAccounts = async () => {
  const snap = await getDoc(BANK_ACCOUNTS_DOC_REF);
  if (!snap.exists()) {
    return {
      items: [],
    };
  }
  const data = snap.data() || {};
  const items = Array.isArray(data.items) ? data.items : [];
  return {
    items: items.map((i) => ({
      bankName: i?.bankName || "",
      iban: i?.iban || "",
      holder: i?.holder || "",
      logoUrl: i?.logoUrl || "",
    })),
  };
};

const saveBankAccounts = async (payload) => {
  await setDoc(
    BANK_ACCOUNTS_DOC_REF,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const getTestimonials = async () => {
  const snap = await getDoc(TESTIMONIALS_DOC_REF);
  if (!snap.exists()) {
    return { items: [] };
  }
  const data = snap.data() || {};
  const items = Array.isArray(data.items) ? data.items : [];
  return {
    items: items.map((i) => ({
      fullName: i?.fullName || "",
      date: i?.date || "",
      title: i?.title || "",
      text: i?.text || "",
      rating: i?.rating || 5,
      platform: i?.platform || "google-play",
      avatarUrl: i?.avatarUrl || "",
      avatarPath: i?.avatarPath || "",
    })),
  };
};

const saveTestimonials = async (payload) => {
  await setDoc(
    TESTIMONIALS_DOC_REF,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const siteSettingsService = {
  getHeroSettings,
  getPlatformFeatures,
  getFaq,
  getAbout,
  getContracts,
  getBankAccounts,
  getTestimonials,
  uploadImage,
  deleteImage,
  saveHeroSettings,
  savePlatformFeatures,
  saveFaq,
  saveAbout,
  saveContracts,
  saveBankAccounts,
  saveTestimonials,
};

export default siteSettingsService;

