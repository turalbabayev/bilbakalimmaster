import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaUsers, FaApple, FaAndroid, FaUserSecret, FaGraduationCap, FaCrown, FaUserAlt, FaChartPie, FaChartBar } from 'react-icons/fa';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingUserId, setUpdatingUserId] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [stats, setStats] = useState({
        total: 0,
        premium: 0,
        free: 0,
        guest: 0,
        ios: 0,
        android: 0
    });

    // Grafik renkleri
    const COLORS = {
        premium: '#FCD34D', // Sarı
        free: '#9CA3AF',    // Gri
        guest: '#A78BFA',   // Mor
        ios: '#4B5563',     // Koyu Gri
        android: '#34D399'  // Yeşil
    };

    const fetchUsers = async () => {
        try {
            console.log('Kullanıcılar getiriliyor...');
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('Getirilen kullanıcılar:', usersData);
            setUsers(usersData);

            // İstatistikleri hesapla
            const newStats = {
                total: usersData.length,
                premium: usersData.filter(user => user.isPremium).length,
                free: usersData.filter(user => !user.isPremium && !user.isGuest).length,
                guest: usersData.filter(user => user.isGuest).length,
                ios: usersData.filter(user => user.device_type === 'iOS').length,
                android: usersData.filter(user => user.device_type === 'Android').length
            };
            setStats(newStats);
        } catch (error) {
            console.error('Kullanıcılar yüklenirken hata:', error);
            toast.error('Kullanıcılar yüklenirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handlePremiumUpdate = async (userId, newPremiumStatus) => {
        setUpdatingUserId(userId);
        try {
            await updateDoc(doc(db, 'users', userId), {
                isPremium: newPremiumStatus
            });
            toast.success(`Kullanıcı ${newPremiumStatus ? 'premium' : 'ücretsiz'} üyeliğe geçirildi!`);
            fetchUsers();
        } catch (error) {
            console.error('Premium durumu güncellenirken hata:', error);
            toast.error('Premium durumu güncellenirken bir hata oluştu!');
        } finally {
            setUpdatingUserId(null);
        }
    };

    const getFilteredUsers = () => {
        switch (activeFilter) {
            case 'premium':
                return users.filter(user => user.isPremium);
            case 'free':
                return users.filter(user => !user.isPremium && !user.isGuest);
            case 'guest':
                return users.filter(user => user.isGuest);
            case 'ios':
                return users.filter(user => user.device_type === 'iOS');
            case 'android':
                return users.filter(user => user.device_type === 'Android');
            default:
                return users;
        }
    };

    // Pasta grafik verisi
    const getPieChartData = () => [
        { name: 'Premium', value: stats.premium, color: COLORS.premium },
        { name: 'Ücretsiz', value: stats.free, color: COLORS.free },
        { name: 'Misafir', value: stats.guest, color: COLORS.guest }
    ];

    // Çubuk grafik verisi
    const getBarChartData = () => [
        { name: 'iOS', value: stats.ios, color: COLORS.ios },
        { name: 'Android', value: stats.android, color: COLORS.android }
    ];

    const StatCard = ({ title, count, icon: Icon, color, onClick, isActive }) => (
        <div
            onClick={onClick}
            className={`${
                isActive ? 'ring-2 ring-offset-2 ring-' + color + '-500' : ''
            } cursor-pointer transform hover:scale-105 transition-all duration-200 bg-white rounded-xl shadow-md p-4 flex items-center space-x-4`}
        >
            <div className={`p-3 rounded-lg bg-${color}-100`}>
                <Icon className={`h-6 w-6 text-${color}-600`} />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-2xl font-semibold text-gray-900">{count}</p>
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
                        <FaUsers className="text-indigo-600" />
                        Kullanıcılar
                    </h1>

                    {/* İstatistik Kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                        <StatCard
                            title="Toplam Kullanıcı"
                            count={stats.total}
                            icon={FaUsers}
                            color="blue"
                            onClick={() => setActiveFilter('all')}
                            isActive={activeFilter === 'all'}
                        />
                        <StatCard
                            title="Premium Üyeler"
                            count={stats.premium}
                            icon={FaCrown}
                            color="yellow"
                            onClick={() => setActiveFilter('premium')}
                            isActive={activeFilter === 'premium'}
                        />
                        <StatCard
                            title="Ücretsiz Üyeler"
                            count={stats.free}
                            icon={FaUserAlt}
                            color="gray"
                            onClick={() => setActiveFilter('free')}
                            isActive={activeFilter === 'free'}
                        />
                        <StatCard
                            title="Misafir Kullanıcılar"
                            count={stats.guest}
                            icon={FaUserSecret}
                            color="purple"
                            onClick={() => setActiveFilter('guest')}
                            isActive={activeFilter === 'guest'}
                        />
                        <StatCard
                            title="iOS Kullanıcıları"
                            count={stats.ios}
                            icon={FaApple}
                            color="gray"
                            onClick={() => setActiveFilter('ios')}
                            isActive={activeFilter === 'ios'}
                        />
                        <StatCard
                            title="Android Kullanıcıları"
                            count={stats.android}
                            icon={FaAndroid}
                            color="green"
                            onClick={() => setActiveFilter('android')}
                            isActive={activeFilter === 'android'}
                        />
                    </div>

                    {/* Grafikler */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Üyelik Dağılımı - Pasta Grafik */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <FaChartPie className="text-indigo-600" />
                                Üyelik Dağılımı
                            </h2>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={getPieChartData()}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {getPieChartData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Platform Dağılımı - Çubuk Grafik */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <FaChartBar className="text-indigo-600" />
                                Platform Dağılımı
                            </h2>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={getBarChartData()}
                                        margin={{
                                            top: 20,
                                            right: 30,
                                            left: 20,
                                            bottom: 5,
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="value" name="Kullanıcı Sayısı">
                                            {getBarChartData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : getFilteredUsers().length === 0 ? (
                            <div className="text-center py-12">
                                <FaUsers className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">Kullanıcı Bulunamadı</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Seçili filtre için kullanıcı bulunmamaktadır.
                                </p>
                                <div className="mt-6">
                                    <button
                                        onClick={() => setActiveFilter('all')}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        Tüm Kullanıcıları Göster
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Kullanıcı
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                E-posta
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Platform
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Uzmanlık Alanı
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Üyelik Durumu
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Kayıt Tarihi
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                İşlemler
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {getFilteredUsers().map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                                <span className="text-indigo-600 font-medium">
                                                                    {user.name ? user.name[0].toUpperCase() : '?'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                                                {user.name} {user.surname}
                                                                {user.isGuest && (
                                                                    <FaUserSecret className="text-gray-400" title="Misafir Kullanıcı" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500">
                                                        {user.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xl">
                                                        {user.device_type === 'iOS' ? (
                                                            <FaApple className="text-gray-700" title="iOS" />
                                                        ) : user.device_type === 'Android' ? (
                                                            <FaAndroid className="text-green-500" title="Android" />
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <FaGraduationCap className="mr-2" />
                                                        {user.expertise || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        user.isPremium 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {user.isPremium ? 'Premium' : 'Ücretsiz'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {(() => {
                                                        try {
                                                            const timestamp = user.created_at || user.createdAt;
                                                            if (!timestamp) return '-';
                                                            
                                                            if (timestamp.toDate) {
                                                                return timestamp.toDate().toLocaleString('tr-TR', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                });
                                                            } else if (timestamp instanceof Date) {
                                                                return timestamp.toLocaleString('tr-TR', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                });
                                                            }
                                                            return '-';
                                                        } catch (error) {
                                                            console.error('Tarih dönüştürme hatası:', error);
                                                            return '-';
                                                        }
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => handlePremiumUpdate(user.id, !user.isPremium)}
                                                        disabled={updatingUserId === user.id}
                                                        className={`inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white ${
                                                            user.isPremium 
                                                            ? 'bg-red-600 hover:bg-red-700' 
                                                            : 'bg-green-600 hover:bg-green-700'
                                                        } focus:outline-none transition ease-in-out duration-150 ${
                                                            updatingUserId === user.id ? 'opacity-50 cursor-not-allowed' : ''
                                                        }`}
                                                    >
                                                        {updatingUserId === user.id ? (
                                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        ) : null}
                                                        {user.isPremium ? 'Ücretsiz Yap' : 'Premium Yap'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default UsersPage; 