import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { 
    FaBox, 
    FaPlus, 
    FaEdit, 
    FaTrash, 
    FaImage,
    FaChartBar,
    FaCalendarAlt
} from 'react-icons/fa';
import { db, storage } from "../../firebase";
import { 
    collection, 
    getDocs, 
    deleteDoc, 
    doc, 
    query,
    orderBy,
    getDoc
} from "firebase/firestore";
import { 
    ref, 
    deleteObject 
} from "firebase/storage";

const PackagesPage = () => {
    const navigate = useNavigate();
    const [packages, setPackages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPackages();
    }, []);

    const loadPackages = async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, "packages"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const packagesList = [];
            querySnapshot.forEach((doc) => {
                packagesList.push({ id: doc.id, ...doc.data() });
            });
            setPackages(packagesList);
        } catch (error) {
            console.error('Paketler yüklenirken hata:', error);
            toast.error('Paketler yüklenirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };


    const handleDeletePackage = async (packageId) => {
        if (!window.confirm('Bu paketi silmek istediğinize emin misiniz?')) {
            return;
        }

        try {
            // Paket verisini çek
            const packageDoc = await getDoc(doc(db, "packages", packageId));
            if (packageDoc.exists()) {
                const packageData = packageDoc.data();
                
                // Resmi Storage'dan sil (imagePath kullanarak)
                if (packageData.imagePath) {
                    try {
                        const imageRef = ref(storage, packageData.imagePath);
                        await deleteObject(imageRef);
                    } catch (error) {
                        console.error('Resim silinirken hata:', error);
                    }
                }
            }

            // Firestore'dan paketi sil
            await deleteDoc(doc(db, "packages", packageId));
            toast.success('Paket başarıyla silindi!');
            loadPackages();
        } catch (error) {
            console.error('Paket silinirken hata:', error);
            toast.error('Paket silinirken hata oluştu');
        }
    };


    const getDurationLabel = (type) => {
        switch (type) {
            case "aylik":
                return "Aylık";
            case "yillik":
                return "Yıllık";
            case "suresiz":
                return "Süresiz";
            default:
                return type;
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(price);
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-6 md:px-8 lg:px-12">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-3">
                                    <FaBox className="text-indigo-600" />
                                    Paketlerimiz
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400">Satış paketlerinin yönetimi</p>
                            </div>
                            <button
                                onClick={() => navigate('/paketlerimiz/yeni')}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <FaPlus />
                                <span>Paket Ekle</span>
                            </button>
                        </div>

                        {/* Packages Grid */}
                        {isLoading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : packages.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12">
                                <div className="text-center">
                                    <FaBox className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Henüz paket eklenmemiş
                                    </h2>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                                        İlk paketinizi eklemek için yukarıdaki "Paket Ekle" butonuna tıklayın.
                                    </p>
                                    <button
                                        onClick={() => navigate('/paketlerimiz/yeni')}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        <FaPlus />
                                        <span>Paket Ekle</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {packages.map((pkg) => (
                                    <div
                                        key={pkg.id}
                                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 group flex flex-col"
                                    >
                                        {/* Package Image */}
                                        <div className="relative h-52 bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden flex-shrink-0 rounded-t-xl">
                                            {pkg.imageUrl ? (
                                                <img
                                                    src={pkg.imageUrl}
                                                    alt={pkg.title}
                                                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <FaImage className="h-14 w-14 text-white opacity-50" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Package Content */}
                                        <div className="p-5 flex flex-col flex-grow">
                                            <div className="mb-2.5">
                                                <h3 className="text-lg font-bold text-gray-800 dark:text-white line-clamp-2 mb-1.5">
                                                    {pkg.title}
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                                                    {pkg.description || "Açıklama bulunmuyor"}
                                                </p>
                                            </div>

                                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                                            {formatPrice(pkg.price)}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            <FaCalendarAlt className="h-3.5 w-3.5" />
                                                            <span>{getDurationLabel(pkg.durationType)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                                                        title="İstatistikler (Yakında)"
                                                    >
                                                        <FaChartBar className="h-4 w-4" />
                                                        <span>İstatistikler</span>
                                                    </button>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            onClick={() => navigate(`/paketlerimiz/${pkg.id}/duzenle`)}
                                                            className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm border-2 border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium transition-colors"
                                                        >
                                                            <FaEdit className="h-3.5 w-3.5" />
                                                            <span>Düzenle</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePackage(pkg.id)}
                                                            className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                                                        >
                                                            <FaTrash className="h-3.5 w-3.5" />
                                                            <span>Sil</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default PackagesPage;
