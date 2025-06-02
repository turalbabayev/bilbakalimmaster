import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, getDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaUsers, FaApple, FaAndroid, FaUserSecret, FaGraduationCap, FaCrown, FaUserAlt, FaChartPie, FaChartBar, FaSearch, FaSort, FaSortAmountDown, FaSortAmountUp, FaFilter, FaMobile, FaExchangeAlt } from 'react-icons/fa';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { Fragment } from 'react';


const expertiseOptions = [
    'Servis Asistanı',
    'Servis Görevlisi',
    'Servis Yetkilisi',
    'Yönetmen Yardımcısı',
    'Yönetmen'
];

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
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date'); // date, name, guest, premium
    const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingExpertise, setUpdatingExpertise] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
    const [loginAttempts, setLoginAttempts] = useState(null);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');

    // Grafik renkleri
    const COLORS = {
        premium: '#FCD34D', // Sarı
        free: '#9CA3AF',    // Gri
        guest: '#A78BFA',   // Mor
        ios: '#4B5563',     // Koyu Gri
        android: '#34D399'  // Yeşil
    };

    const fetchUsers = async () => {
        setIsLoading(true);
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
            setFilteredUsers(usersData);

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
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (users.length > 0) {
            filterAndSortUsers();
        }
    }, [searchTerm, sortBy, sortOrder, users]);

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

    const handleExpertiseUpdate = async (userId, newExpertise) => {
        setUpdatingExpertise(userId);
        try {
            await updateDoc(doc(db, 'users', userId), {
                expertise: newExpertise
            });
            toast.success('Uzmanlık alanı güncellendi!');
            fetchUsers();
        } catch (error) {
            console.error('Uzmanlık alanı güncellenirken hata:', error);
            toast.error('Uzmanlık alanı güncellenirken bir hata oluştu!');
        } finally {
            setUpdatingExpertise(null);
        }
    };

    const getFilteredUsers = () => {
        let filtered = [...users];

        // Arama filtresi
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(user => 
                (user.name?.toLowerCase().includes(searchLower) || '') ||
                (user.surname?.toLowerCase().includes(searchLower) || '') ||
                (user.email?.toLowerCase().includes(searchLower) || '')
            );
        }

        // Aktif filtreye göre filtreleme
        switch (activeFilter) {
            case 'premium':
                filtered = filtered.filter(user => user.isPremium);
                break;
            case 'free':
                filtered = filtered.filter(user => !user.isPremium && !user.isGuest);
                break;
            case 'guest':
                filtered = filtered.filter(user => user.isGuest);
                break;
            case 'ios':
                filtered = filtered.filter(user => user.device_type === 'iOS');
                break;
            case 'android':
                filtered = filtered.filter(user => user.device_type === 'Android');
                break;
            default:
                break;
        }

        // Sıralama
        if (sortBy) {
            filtered.sort((a, b) => {
                let comparison = 0;
                switch (sortBy) {
                    case 'date':
                        const dateA = a.created_at?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
                        const dateB = b.created_at?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
                        comparison = dateA - dateB;
                        break;
                    case 'name':
                        const nameA = `${a.name || ''} ${a.surname || ''}`.toLowerCase();
                        const nameB = `${b.name || ''} ${b.surname || ''}`.toLowerCase();
                        comparison = nameA.localeCompare(nameB);
                        break;
                    case 'guest':
                        comparison = (a.isGuest ? 1 : 0) - (b.isGuest ? 1 : 0);
                        break;
                    case 'premium':
                        comparison = (a.isPremium ? 1 : 0) - (b.isPremium ? 1 : 0);
                        break;
                }
                return sortOrder === 'asc' ? comparison : -comparison;
            });
        }

        return filtered;
    };

    useEffect(() => {
        const filtered = getFilteredUsers();
        setFilteredUsers(filtered);
    }, [users, searchTerm, sortBy, sortOrder, activeFilter]);

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

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        // TODO: Implement search functionality
    };

    const handleSort = (type) => {
        if (sortBy === type) {
            // Aynı kritere tıklandığında sıralama yönünü değiştir
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(type);
            setSortOrder('desc');
        }
    };

    const sortOptions = [
        { id: 'date', name: 'Kayıt Tarihi' },
        { id: 'name', name: 'İsim' },
        { id: 'guest', name: 'Misafir Durumu' },
        { id: 'premium', name: 'Premium Durumu' }
    ];

    const filterAndSortUsers = () => {
        let filtered = [...users];

        // Arama filtresi
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(user => 
                (user.name?.toLowerCase().includes(searchLower) ||
                user.surname?.toLowerCase().includes(searchLower) ||
                user.email?.toLowerCase().includes(searchLower))
            );
        }

        // Sıralama
        filtered.sort((a, b) => {
            let compareResult = 0;
            
            switch (sortBy) {
                case 'date':
                    const dateA = a.created_at?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.created_at?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
                    compareResult = dateB - dateA; // Varsayılan olarak yeniden eskiye
                    break;
                    
                case 'name':
                    const nameA = `${a.name || ''} ${a.surname || ''}`.toLowerCase();
                    const nameB = `${b.name || ''} ${b.surname || ''}`.toLowerCase();
                    compareResult = nameA.localeCompare(nameB);
                    break;
                    
                case 'guest':
                    compareResult = (b.isGuest ? 1 : 0) - (a.isGuest ? 1 : 0);
                    break;
                    
                case 'premium':
                    compareResult = (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0);
                    break;
                    
                default:
                    return 0;
            }
            
            // Sıralama yönünü uygula
            return sortOrder === 'asc' ? -compareResult : compareResult;
        });

        setFilteredUsers(filtered);
    };

    const fetchLoginAttempts = async (userId) => {
        try {
            const attemptsRef = doc(db, 'users', userId, 'login_attempts', 'device_attempts');
            const attemptsSnap = await getDoc(attemptsRef);
            if (attemptsSnap.exists()) {
                setLoginAttempts(attemptsSnap.data());
            } else {
                setLoginAttempts(null);
            }
        } catch (error) {
            console.error('Login attempts yüklenirken hata:', error);
            toast.error('Login attempts bilgisi alınamadı!');
        }
    };

    const handleDeviceIdChange = async (newDeviceId) => {
        if (!selectedUser) return;

        try {
            const attemptsRef = doc(db, 'users', selectedUser.id, 'login_attempts', 'device_attempts');
            await updateDoc(attemptsRef, {
                original_device_id: newDeviceId,
                attempted_device_ids: [newDeviceId]
            });

            // Kullanıcı dokümanını da güncelle
            await updateDoc(doc(db, 'users', selectedUser.id), {
                device_id: newDeviceId
            });

            toast.success('Cihaz ID başarıyla güncellendi!');
            setIsDeviceModalOpen(false);
            fetchUsers(); // Kullanıcı listesini yenile
        } catch (error) {
            console.error('Cihaz ID güncellenirken hata:', error);
            toast.error('Cihaz ID güncellenirken bir hata oluştu!');
        }
    };

    const handleDownloadEmails = () => {
        // Misafir kullanıcı hariç tüm kullanıcıların maillerini al
        const filteredEmails = users.filter(user => !user.email?.includes('guest_'));
        const emails = filteredEmails.map(user => user.email).join(", ");

        // Mailleri panoya kopyala
        navigator.clipboard.writeText(emails)
            .then(() => {
                toast.success(`${filteredEmails.length} adet mail adresi panoya kopyalandı!`);
            })
            .catch(() => {
                toast.error("Mail adresleri kopyalanırken bir hata oluştu!");
            });
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kullanıcılar</h1>
                        <button
                            onClick={handleDownloadEmails}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Mail Adreslerini Kopyala
                        </button>
                    </div>

                    {/* Arama ve Filtreleme Araç Çubuğu */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            {/* Arama Alanı */}
                            <div className="w-full md:w-96">
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Kullanıcı ara..."
                                        value={searchTerm}
                                        onChange={handleSearch}
                                    />
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>

                            {/* Sıralama Menüsü */}
                            <div className="flex items-center gap-2">
                                <Menu as="div" className="relative inline-block text-left">
                                    <Menu.Button className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                        <FaSort className="mr-2 h-4 w-4" />
                                        Sırala
                                    </Menu.Button>

                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-100"
                                        enterFrom="transform opacity-0 scale-95"
                                        enterTo="transform opacity-100 scale-100"
                                        leave="transition ease-in duration-75"
                                        leaveFrom="transform opacity-100 scale-100"
                                        leaveTo="transform opacity-0 scale-95"
                                    >
                                        <Menu.Items className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-10">
                                            <div className="py-1">
                                                {sortOptions.map((option) => (
                                                    <Menu.Item key={option.id}>
                                                        {({ active }) => (
                                                            <button
                                                                onClick={() => handleSort(option.id)}
                                                                className={`
                                                                    ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}
                                                                    ${sortBy === option.id ? 'bg-indigo-50 text-indigo-600' : ''}
                                                                    group flex items-center w-full px-4 py-2 text-sm
                                                                `}
                                                            >
                                                                {sortBy === option.id ? (
                                                                    sortOrder === 'asc' ? (
                                                                        <FaSortAmountUp className="mr-3 h-4 w-4" />
                                                                    ) : (
                                                                        <FaSortAmountDown className="mr-3 h-4 w-4" />
                                                                    )
                                                                ) : (
                                                                    <span className="mr-3 w-4" />
                                                                )}
                                                                {option.name}
                                                            </button>
                                                        )}
                                                    </Menu.Item>
                                                ))}
                                            </div>
                                        </Menu.Items>
                                    </Transition>
                                </Menu>

                                <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    <FaFilter className="mr-2 h-4 w-4" />
                                    Filtrele
                                </button>
                            </div>
                        </div>
                    </div>

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
                        {isLoading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : filteredUsers.length === 0 ? (
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
                                                Cihaz ID
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                İşlemler
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredUsers.map((user) => (
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
                                                        <Menu as="div" className="relative inline-block text-left">
                                                            <Menu.Button className="inline-flex items-center justify-center px-3 py-1 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                                                {user.expertise || 'Seçiniz'}
                                                                {updatingExpertise === user.id && (
                                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                )}
                                                            </Menu.Button>

                                                            <Transition
                                                                as={Fragment}
                                                                enter="transition ease-out duration-100"
                                                                enterFrom="transform opacity-0 scale-95"
                                                                enterTo="transform opacity-100 scale-100"
                                                                leave="transition ease-in duration-75"
                                                                leaveFrom="transform opacity-100 scale-100"
                                                                leaveTo="transform opacity-0 scale-95"
                                                            >
                                                                <Menu.Items className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-10">
                                                                    <div className="py-1">
                                                                        {expertiseOptions.map((option) => (
                                                                            <Menu.Item key={option}>
                                                                                {({ active }) => (
                                                                                    <button
                                                                                        onClick={() => handleExpertiseUpdate(user.id, option)}
                                                                                        className={`
                                                                                            ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}
                                                                                            ${user.expertise === option ? 'bg-indigo-50 text-indigo-600' : ''}
                                                                                            group flex items-center w-full px-4 py-2 text-sm
                                                                                        `}
                                                                                    >
                                                                                        {option}
                                                                                    </button>
                                                                                )}
                                                                            </Menu.Item>
                                                                        ))}
                                                                    </div>
                                                                </Menu.Items>
                                                            </Transition>
                                                        </Menu>
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
                                                            
                                                            let date;
                                                            if (timestamp.toDate) {
                                                                // Firestore Timestamp
                                                                date = timestamp.toDate();
                                                            } else if (timestamp instanceof Date) {
                                                                // JavaScript Date objesi
                                                                date = timestamp;
                                                            } else if (typeof timestamp === 'string') {
                                                                // ISO string formatı
                                                                date = new Date(timestamp);
                                                            } else {
                                                                return '-';
                                                            }

                                                            return date.toLocaleString('tr-TR', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            });
                                                        } catch (error) {
                                                            console.error('Tarih dönüştürme hatası:', error);
                                                            return '-';
                                                        }
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <FaMobile className="mr-2" />
                                                        {user.device_id || 'Belirtilmemiş'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            fetchLoginAttempts(user.id);
                                                            setIsDeviceModalOpen(true);
                                                        }}
                                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                    >
                                                        <FaExchangeAlt className="inline-block mr-1" />
                                                        Cihaz ID Değiştir
                                                    </button>
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

            {/* Cihaz ID Değiştirme Modalı */}
            <Transition appear show={isDeviceModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => setIsDeviceModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        Cihaz ID Değiştir
                                    </Dialog.Title>

                                    <div className="mt-4">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Mevcut Cihaz ID</label>
                                                <div className="mt-1 text-sm text-gray-500">{selectedUser?.device_id || 'Belirtilmemiş'}</div>
                                            </div>

                                            {loginAttempts && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Denenen Cihaz ID'leri</label>
                                                    <div className="mt-1">
                                                        {loginAttempts.attempted_device_ids?.map((deviceId, index) => (
                                                            <div key={index} className="text-sm text-gray-500">
                                                                {deviceId}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Yeni Cihaz ID</label>
                                                <select
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    value={selectedDeviceId}
                                                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                                                >
                                                    <option value="">Seçiniz</option>
                                                    {loginAttempts?.attempted_device_ids?.map((deviceId, index) => (
                                                        <option key={index} value={deviceId}>
                                                            {deviceId}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                            onClick={() => setIsDeviceModalOpen(false)}
                                        >
                                            İptal
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                            onClick={() => handleDeviceIdChange(selectedDeviceId)}
                                            disabled={!selectedDeviceId}
                                        >
                                            Değiştir
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </Layout>
    );
};

export default UsersPage; 