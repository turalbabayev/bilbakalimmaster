import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { Link } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs, collectionGroup, query, getCountFromServer, limit, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { FaHome, FaQuestionCircle, FaBullhorn, FaStickyNote, FaGraduationCap, FaBook, FaUsers, FaChartLine, FaArrowUp, FaArrowDown, FaClock, FaExclamationCircle } from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { toast } from 'react-hot-toast';
import statsService from '../../services/statsService';
import { FaSync } from 'react-icons/fa';

function HomePage() {
    const [stats, setStats] = useState({
        toplamSoru: 0,
        toplamKonu: 0,
        toplamKullanici: 0,
        toplamDuyuru: 0,
        son30GunSoru: 0,
        aktifDenemeSinavi: 0
    });
    const [loading, setLoading] = useState(true);
    const [chartsLoading, setChartsLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState([]);
    const [konuDagilimi, setKonuDagilimi] = useState([]);
    const [recentActivities, setRecentActivities] = useState([]);

    // Renk paleti
    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setChartsLoading(true);

            // Stats koleksiyonundan direkt sayıları çek (ÇOK HIZLI!)
            let statsData = await statsService.getStats();

            // Eğer stats yoksa veya tüm değerler 0 ise, yeniden hesapla (ilk kurulum veya senkronizasyon)
            const isStatsEmpty = !statsData || 
                (statsData.toplamSoru === 0 && 
                 statsData.toplamKonu === 0 && 
                 statsData.toplamKullanici === 0 && 
                 statsData.toplamDuyuru === 0 && 
                 statsData.aktifDenemeSinavi === 0);

            if (isStatsEmpty) {
                console.log('Stats boş veya 0, yeniden hesaplanıyor...');
                // Tüm istatistikleri yeniden hesapla (ilk kurulum)
                statsData = await statsService.recalculateAllStats();
            }

            // İlk olarak temel istatistikleri göster (HIZLI!)
            setStats({
                toplamSoru: statsData.toplamSoru || 0,
                toplamKonu: statsData.toplamKonu || 0,
                toplamKullanici: statsData.toplamKullanici || 0,
                toplamDuyuru: statsData.toplamDuyuru || 0,
                son30GunSoru: statsData.son30GunSoru || 0,
                aktifDenemeSinavi: statsData.aktifDenemeSinavi || 0
            });

            // Grafik verilerini stats'tan çek (HIZLI!)
            if (statsData.aylikSoruTrendi && statsData.konuBazindaDagilim) {
                setMonthlyData(statsData.aylikSoruTrendi);
                setKonuDagilimi(statsData.konuBazindaDagilim.slice(0, 5));
                setChartsLoading(false);
            } else {
                // Eğer grafik verileri yoksa, arka planda hesapla
                loadChartsData();
            }

            // Son aktiviteleri arka planda yükle
            fetchRecentActivities().then(activities => {
                setRecentActivities(activities);
            });

            // Loading'i hemen kapat - sayfa görünsün
            setLoading(false);

        } catch (error) {
            console.error("Dashboard verileri yüklenirken hata:", error);
            toast.error("Veriler yüklenirken bir hata oluştu");
            setLoading(false);
            setChartsLoading(false);
        }
    };

    const loadChartsData = async () => {
        try {
            // Eğer stats'ta grafik verileri yoksa, hesapla ve kaydet
            // Yavaş işlemler - arka planda çalışsın (sadece grafikler için)
            const [sorularSnap, manualSnap] = await Promise.all([
                getDocs(collectionGroup(db, 'sorular')),
                getDocs(query(
                    collection(db, 'manual-questions'),
                    orderBy('createdAt', 'desc'),
                    limit(2000) // Son 2000 manuel soruyu çek (grafikler için yeterli)
                ))
            ]);

            // Grafik verilerini hesapla
            const [monthlyStats, konuStats] = await Promise.all([
                calculateMonthlyStats(sorularSnap, manualSnap),
                calculateKonuDagilimi(sorularSnap)
            ]);

            // Stats'a kaydet (bir sonraki yüklemede hızlı olsun)
            try {
                const statsRef = doc(db, 'dashboard-stats', 'overview');
                await updateDoc(statsRef, {
                    aylikSoruTrendi: monthlyStats,
                    konuBazindaDagilim: konuStats.slice(0, 10),
                    lastUpdated: serverTimestamp()
                });
            } catch (statsError) {
                console.error("Grafik verileri stats'a kaydedilirken hata:", statsError);
            }

            setMonthlyData(monthlyStats);
            setKonuDagilimi(konuStats.slice(0, 5));
            setChartsLoading(false);

        } catch (error) {
            console.error("Grafik verileri yüklenirken hata:", error);
            setChartsLoading(false);
        }
    };

    const calculateMonthlyStats = async (sorularSnap, manualSnap) => {
        const months = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('tr-TR', { month: 'short' });
            months.push({ name: monthName, sorular: 0 });
        }

        // Konu altındaki sorular
        sorularSnap.forEach(doc => {
            const data = doc.data();
            let soruTarihi = null;
            
            if (data.createdAt) {
                soruTarihi = data.createdAt.toDate();
            } else if (data.soruNumarasi) {
                soruTarihi = new Date(data.soruNumarasi);
            }

            if (soruTarihi) {
                const monthIndex = months.findIndex(m => {
                    const monthDate = new Date(soruTarihi.getFullYear(), soruTarihi.getMonth(), 1);
                    const currentMonth = new Date(now.getFullYear(), now.getMonth() - (5 - months.indexOf(m)), 1);
                    return monthDate.getTime() === currentMonth.getTime();
                });
                
                if (monthIndex !== -1) {
                    months[monthIndex].sorular++;
                }
            }
        });

        // Manuel soru havuzu
        manualSnap.forEach(doc => {
            const data = doc.data();
            if (data.createdAt) {
                const soruTarihi = data.createdAt.toDate();
                const monthIndex = months.findIndex(m => {
                    const monthDate = new Date(soruTarihi.getFullYear(), soruTarihi.getMonth(), 1);
                    const currentMonth = new Date(now.getFullYear(), now.getMonth() - (5 - months.indexOf(m)), 1);
                    return monthDate.getTime() === currentMonth.getTime();
                });
                
                if (monthIndex !== -1) {
                    months[monthIndex].sorular++;
                }
            }
        });

        return months;
    };

    const calculateKonuDagilimi = async (sorularSnap) => {
        // Konuları önce çek (sadece sayı için gerekli, hızlı)
        const konularRef = collection(db, "konular");
        const konularSnap = await getDocs(konularRef);
        
        const konuMap = new Map();
        
        konularSnap.forEach(doc => {
            konuMap.set(doc.id, { name: doc.data().baslik || 'İsimsiz Konu', count: 0 });
        });

        sorularSnap.forEach(doc => {
            const path = doc.ref.path.split('/');
            const konuId = path[1]; // konular/{konuId}/...
            if (konuMap.has(konuId)) {
                konuMap.get(konuId).count++;
            }
        });

        return Array.from(konuMap.values()).sort((a, b) => b.count - a.count);
    };

    const fetchRecentActivities = async () => {
        const activities = [];
        
        try {
            // Son eklenen duyurular (limit ile sadece 3 tane çek)
            const announcementsRef = collection(db, "announcements");
            const announcementsQuery = query(announcementsRef, orderBy("tarih", "desc"), limit(3));
            const announcementsSnap = await getDocs(announcementsQuery);
            
            announcementsSnap.docs.forEach(doc => {
                const data = doc.data();
                activities.push({
                    type: 'duyuru',
                    title: data.baslik || 'Duyuru',
                    date: data.tarih?.toDate() || new Date(),
                    icon: <FaBullhorn className="text-green-500" />
                });
            });

            // Son eklenen deneme sınavları (limit ile sadece 2 tane çek)
            const examlarRef = collection(db, 'examlar');
            const examlarQuery = query(examlarRef, orderBy("createdAt", "desc"), limit(2));
            const examlarSnap = await getDocs(examlarQuery);
            
            examlarSnap.docs.forEach(doc => {
                const data = doc.data();
                activities.push({
                    type: 'sinav',
                    title: data.name || 'Deneme Sınavı',
                    date: data.createdAt?.toDate() || new Date(),
                    icon: <FaGraduationCap className="text-purple-500" />
                });
            });

            // Tarihe göre sırala
            activities.sort((a, b) => b.date - a.date);
            
            return activities.slice(0, 5);
        } catch (error) {
            console.error("Aktiviteler yüklenirken hata:", error);
            return activities;
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-4">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-3">
                                <FaHome className="text-indigo-600" />
                                Dashboard
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">Sistem genel bakış ve istatistikler</p>
                        </div>

                        {/* İstatistik Widget'ları */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                            <StatCard
                                title="Toplam Soru"
                                value={stats.toplamSoru}
                                icon={<FaQuestionCircle className="h-6 w-6" />}
                                color="indigo"
                                trend={stats.son30GunSoru}
                                trendLabel="Son 30 gün"
                            />
                            <StatCard
                                title="Toplam Konu"
                                value={stats.toplamKonu}
                                icon={<FaBook className="h-6 w-6" />}
                                color="blue"
                            />
                            <StatCard
                                title="Kullanıcılar"
                                value={stats.toplamKullanici}
                                icon={<FaUsers className="h-6 w-6" />}
                                color="green"
                            />
                            <StatCard
                                title="Duyurular"
                                value={stats.toplamDuyuru}
                                icon={<FaBullhorn className="h-6 w-6" />}
                                color="yellow"
                            />
                            <StatCard
                                title="Son 30 Gün"
                                value={stats.son30GunSoru}
                                icon={<FaClock className="h-6 w-6" />}
                                color="purple"
                            />
                            <StatCard
                                title="Deneme Sınavları"
                                value={stats.aktifDenemeSinavi}
                                icon={<FaGraduationCap className="h-6 w-6" />}
                                color="pink"
                            />
                        </div>

                        {/* Grafikler */}
                        {chartsLoading ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                    <div className="flex items-center justify-center h-[300px]">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Grafikler yükleniyor...</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                    <div className="flex items-center justify-center h-[300px]">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto mb-2"></div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Grafikler yükleniyor...</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                {/* Aylık Soru Ekleme Grafiği */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <FaChartLine className="text-indigo-600" />
                                        Aylık Soru Ekleme Trendi
                                    </h2>
                                    {monthlyData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <AreaChart data={monthlyData}>
                                                <defs>
                                                    <linearGradient id="colorSoru" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    stroke="#6b7280"
                                                    tick={{ fill: '#6b7280' }}
                                                />
                                                <YAxis 
                                                    stroke="#6b7280"
                                                    tick={{ fill: '#6b7280' }}
                                                />
                                                <Tooltip 
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                                                    }}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="sorular" 
                                                    stroke="#6366f1" 
                                                    fillOpacity={1} 
                                                    fill="url(#colorSoru)" 
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-gray-500">
                                            Veri bulunamadı
                                        </div>
                                    )}
                                </div>

                                {/* Konu Bazında Soru Dağılımı */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <FaChartLine className="text-purple-600" />
                                        Konu Bazında Soru Dağılımı
                                    </h2>
                                    {konuDagilimi.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={konuDagilimi}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    stroke="#6b7280"
                                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={80}
                                                />
                                                <YAxis 
                                                    stroke="#6b7280"
                                                    tick={{ fill: '#6b7280' }}
                                                />
                                                <Tooltip 
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                                                    }}
                                                />
                                                <Bar 
                                                    dataKey="count" 
                                                    fill="#8b5cf6"
                                                    radius={[8, 8, 0, 0]}
                                                >
                                                    {konuDagilimi.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-gray-500">
                                            Veri bulunamadı
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Alt Kısım: Son Aktiviteler ve Hızlı Erişim */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Son Aktiviteler */}
                            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    <FaClock className="text-indigo-600" />
                                    Son Aktiviteler
                                </h2>
                                <div className="space-y-4">
                                    {recentActivities.length > 0 ? (
                                        recentActivities.map((activity, index) => (
                                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <div className="mt-1">
                                                    {activity.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                                                        {activity.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {activity.date.toLocaleDateString('tr-TR', { 
                                                            day: 'numeric', 
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                            Henüz aktivite bulunmuyor
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Hızlı Erişim */}
                            <div className="lg:col-span-2">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                                    Hızlı Erişim
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <QuickAccessCard
                                        to="/soru-bankasi-yonetimi"
                                        title="Soru Bankası Yönetimi"
                                        description="Konu ve alt konu yönetimi"
                                        icon={<FaBook />}
                                        color="indigo"
                                    />
                                    <QuickAccessCard
                                        to="/question"
                                        title="Sorular"
                                        description="Soru bankasına göz at"
                                        icon={<FaQuestionCircle />}
                                        color="blue"
                                    />
                                    <QuickAccessCard
                                        to="/announcements"
                                        title="Duyurular"
                                        description="Duyuruları görüntüle"
                                        icon={<FaBullhorn />}
                                        color="green"
                                    />
                                    <QuickAccessCard
                                        to="/deneme-sinavlari"
                                        title="Deneme Sınavları"
                                        description="Sınavları yönet"
                                        icon={<FaGraduationCap />}
                                        color="purple"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

// İstatistik Kartı Komponenti
const StatCard = ({ title, value, icon, color, trend, trendLabel }) => {
    const colorClasses = {
        indigo: 'bg-indigo-500',
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        purple: 'bg-purple-500',
        pink: 'bg-pink-500'
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]} bg-opacity-10`}>
                    <div className={`text-${color}-600`}>
                        {icon}
                    </div>
                </div>
                {trend !== undefined && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                        <FaArrowUp className="h-3 w-3" />
                        <span>{trend}</span>
                    </div>
                )}
            </div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                {value.toLocaleString('tr-TR')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
                {title}
            </p>
            {trendLabel && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {trendLabel}
                </p>
            )}
        </div>
    );
};

// Hızlı Erişim Kartı Komponenti
const QuickAccessCard = ({ to, title, description, icon, color }) => {
    const colorClasses = {
        indigo: 'bg-indigo-500',
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500'
    };

    return (
        <Link
            to={to}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 group"
        >
            <div className={`h-1 ${colorClasses[color]} rounded-t-lg -mx-6 -mt-6 mb-4`} />
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${colorClasses[color]} bg-opacity-10 group-hover:bg-opacity-20 transition-colors`}>
                    <div className={`text-${color}-600`}>
                        {icon}
                    </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {title}
                </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
                {description}
            </p>
        </Link>
    );
};

export default HomePage;
