import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/layout';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, getDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaUsers, FaApple, FaAndroid, FaUserSecret, FaGraduationCap, FaCrown, FaUserAlt, FaChartPie, FaChartBar, FaSearch, FaSort, FaSortAmountDown, FaSortAmountUp, FaFilter, FaMobile, FaExchangeAlt, FaEdit, FaEnvelope, FaChevronDown, FaUserTie, FaUserShield, FaCog, FaUserCog, FaUserClock, FaPaperPlane } from 'react-icons/fa';
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
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
    const [isAssistantManagerModalOpen, setIsAssistantManagerModalOpen] = useState(false);
    const [isServiceOfficerModalOpen, setIsServiceOfficerModalOpen] = useState(false);
    const [isServiceStaffModalOpen, setIsServiceStaffModalOpen] = useState(false);
    const [isServiceAssistantModalOpen, setIsServiceAssistantModalOpen] = useState(false);
    const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editSurname, setEditSurname] = useState('');
    const [editUserId, setEditUserId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPerPage] = useState(12);
    const cardsRef = useRef(null);

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
                    case 'premiumPurchaseDate':
                        const premiumDateA = a.premiumPurchaseDate?.toDate?.() || new Date(0);
                        const premiumDateB = b.premiumPurchaseDate?.toDate?.() || new Date(0);
                        comparison = premiumDateA - premiumDateB;
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

    // Pagination hesaplamaları
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    // Sayfa değiştirme fonksiyonu
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        // Kartların bulunduğu alana scroll yap
        setTimeout(() => {
            if (cardsRef.current) {
                cardsRef.current.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }, 100);
    };

    // Filtreleme değiştiğinde sayfa 1'e dön
    useEffect(() => {
        setCurrentPage(1);
    }, [filteredUsers.length, searchTerm, activeFilter]);

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
        { id: 'premiumPurchaseDate', name: 'Premium Başlangıç' },
        { id: 'name', name: 'İsim' },
        { id: 'guest', name: 'Misafir Durumu' },
        { id: 'premium', name: 'Premium Durumu' }
    ];

    const handlePremiumUsers = () => {
        const premiumUsers = users.filter(user => user.isPremium);
        setFilteredUsers(premiumUsers);
        setActiveFilter('premium');
        setSortBy('premiumPurchaseDate'); // Premium sekmesine geçince otomatik olarak premium tarihine göre sırala
        setSortOrder('desc'); // Varsayılan olarak yeniden eskiye
    };

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
        filtered.sort((a, b) => {
            let compareResult = 0;
            
            switch (sortBy) {
                case 'date':
                    const dateA = a.created_at?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.created_at?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
                    compareResult = dateB - dateA;
                    break;
                    
                case 'premiumPurchaseDate':
                    const premiumDateA = a.premiumPurchaseDate?.toDate?.() || new Date(0);
                    const premiumDateB = b.premiumPurchaseDate?.toDate?.() || new Date(0);
                    compareResult = premiumDateB - premiumDateA;
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

    const handleDownloadPremiumEmails = () => {
        // Sadece premium kullanıcıların maillerini al
        const filteredEmails = users.filter(user => user.isPremium);
        const emails = filteredEmails.map(user => user.email).join(", ");

        // Mailleri panoya kopyala
        navigator.clipboard.writeText(emails)
            .then(() => {
                toast.success(`${filteredEmails.length} adet premium kullanıcı mail adresi panoya kopyalandı!`);
            })
            .catch(() => {
                toast.error("Mail adresleri kopyalanırken bir hata oluştu!");
            });
    };

    const handleDownloadManagerEmails = (onlyPremium = false) => {
        // Filtreleme seçeneğine göre Yönetmenleri al
        const filteredEmails = users.filter(user => {
            if (onlyPremium) {
                return user.expertise === 'Yönetmen' && user.isPremium;
            }
            return user.expertise === 'Yönetmen';
        });
        const emails = filteredEmails.map(user => user.email).join(", ");

        // Mailleri panoya kopyala
        navigator.clipboard.writeText(emails)
            .then(() => {
                toast.success(`${filteredEmails.length} adet Yönetmen mail adresi panoya kopyalandı!`);
            })
            .catch(() => {
                toast.error("Mail adresleri kopyalanırken bir hata oluştu!");
            });
        setIsManagerModalOpen(false);
    };

    const handleDownloadAssistantManagerEmails = (onlyPremium = false) => {
        // Filtreleme seçeneğine göre Yönetmen Yardımcılarını al
        const filteredEmails = users.filter(user => {
            if (onlyPremium) {
                return user.expertise === 'Yönetmen Yardımcısı' && user.isPremium;
            }
            return user.expertise === 'Yönetmen Yardımcısı';
        });
        const emails = filteredEmails.map(user => user.email).join(", ");

        // Mailleri panoya kopyala
        navigator.clipboard.writeText(emails)
            .then(() => {
                toast.success(`${filteredEmails.length} adet Yönetmen Yardımcısı mail adresi panoya kopyalandı!`);
            })
            .catch(() => {
                toast.error("Mail adresleri kopyalanırken bir hata oluştu!");
            });
        setIsAssistantManagerModalOpen(false);
    };

    const handleDownloadServiceOfficerEmails = (onlyPremium = false) => {
        // Filtreleme seçeneğine göre Servis Yetkililerini al
        const filteredEmails = users.filter(user => {
            if (onlyPremium) {
                return user.expertise === 'Servis Yetkilisi' && user.isPremium;
            }
            return user.expertise === 'Servis Yetkilisi';
        });
        const emails = filteredEmails.map(user => user.email).join(", ");

        // Mailleri panoya kopyala
        navigator.clipboard.writeText(emails)
            .then(() => {
                toast.success(`${filteredEmails.length} adet Servis Yetkilisi mail adresi panoya kopyalandı!`);
            })
            .catch(() => {
                toast.error("Mail adresleri kopyalanırken bir hata oluştu!");
            });
        setIsServiceOfficerModalOpen(false);
    };

    const handleDownloadServiceStaffEmails = (onlyPremium = false) => {
        // Filtreleme seçeneğine göre Servis Görevlilerini al
        const filteredEmails = users.filter(user => {
            if (onlyPremium) {
                return user.expertise === 'Servis Görevlisi' && user.isPremium;
            }
            return user.expertise === 'Servis Görevlisi';
        });
        const emails = filteredEmails.map(user => user.email).join(", ");

        // Mailleri panoya kopyala
        navigator.clipboard.writeText(emails)
            .then(() => {
                toast.success(`${filteredEmails.length} adet Servis Görevlisi mail adresi panoya kopyalandı!`);
            })
            .catch(() => {
                toast.error("Mail adresleri kopyalanırken bir hata oluştu!");
            });
        setIsServiceStaffModalOpen(false);
    };

    const handleDownloadServiceAssistantEmails = (onlyPremium = false) => {
        // Filtreleme seçeneğine göre Servis Asistanlarını al
        const filteredEmails = users.filter(user => {
            if (onlyPremium) {
                return user.expertise === 'Servis Asistanı' && user.isPremium;
            }
            return user.expertise === 'Servis Asistanı';
        });
        const emails = filteredEmails.map(user => user.email).join(", ");

        // Mailleri panoya kopyala
        navigator.clipboard.writeText(emails)
            .then(() => {
                toast.success(`${filteredEmails.length} adet Servis Asistanı mail adresi panoya kopyalandı!`);
            })
            .catch(() => {
                toast.error("Mail adresleri kopyalanırken bir hata oluştu!");
            });
        setIsServiceAssistantModalOpen(false);
    };

    const openEditNameModal = (user) => {
        setEditUserId(user.id);
        setEditName(user.name || '');
        setEditSurname(user.surname || '');
        setIsEditNameModalOpen(true);
    };

    const handleEditNameSave = async () => {
        if (!editUserId) return;
        try {
            const userRef = doc(db, 'users', editUserId);
            await updateDoc(userRef, { name: editName, surname: editSurname });
            setUsers((prev) => prev.map(u => u.id === editUserId ? { ...u, name: editName, surname: editSurname } : u));
            toast.success('Kullanıcı adı ve soyadı güncellendi!');
            setIsEditNameModalOpen(false);
        } catch (err) {
            toast.error('Güncelleme başarısız!');
        }
    };

    // Thunderbird ile mail gönderme fonksiyonu
    const handleSendEmail = (email, userName) => {
        try {
            // Konu ve içerik hazırla
            const subject = encodeURIComponent('Bilbakalım Destek');
            const body = encodeURIComponent(`Merhaba ${userName || 'Değerli Kullanıcımız'},\n\n\n\nİyi günler dileriz.\nBilbakalim Ekibi`);
            
            // Önce standart mailto protokolünü dene (işletim sistemi varsayılan mail uygulamasını açar)
            const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
            
            // Yeni sekme/pencerede aç
            const mailWindow = window.open(mailtoUrl, '_blank');
            
            // Eğer popup engellenmişse, kullanıcıyı yönlendir
            if (!mailWindow || mailWindow.closed || typeof mailWindow.closed == 'undefined') {
                // Popup engellenirse, aynı pencerede aç
                window.location.href = mailtoUrl;
            }
            
            toast.success(`${email} adresine mail uygulamanız açılıyor...`, {
                duration: 3000,
                icon: '✉️'
            });
            
        } catch (error) {
            console.error('Mail gönderilirken hata:', error);
            
            // Hata durumunda manuel kopyalama seçeneği sun
            const mailInfo = `Alıcı: ${email}\nKonu: Bilbakalım Destek\nİçerik: Merhaba ${userName || 'Değerli Kullanıcımız'},\n\n\n\nİyi günler dileriz.\nBilbakalım Destek Ekibi`;
            
            navigator.clipboard.writeText(mailInfo)
                .then(() => {
                    toast.success('Mail bilgileri panoya kopyalandı! Thunderbird\'de manuel olarak yapıştırabilirsiniz.', {
                        duration: 5000,
                        icon: '📋'
                    });
                })
                .catch(() => {
                    toast.error('Mail uygulaması açılamadı! Lütfen manuel olarak mail gönderin.', {
                        duration: 5000
                    });
                });
        }
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kullanıcılar</h1>
                    </div>

                    {/* Mail Adresleri İndir */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <FaEnvelope className="text-indigo-600" />
                                    Mail Adresleri İşlemleri
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">Kullanıcı kategorilerine göre mail adreslerini kopyalayın</p>
                            </div>
                            
                            <Menu as="div" className="relative inline-block text-left">
                                <Menu.Button className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm">
                                    <FaEnvelope className="mr-2 h-4 w-4" />
                                    Mail Adreslerini Kopyala
                                    <FaChevronDown className="ml-2 h-3 w-3" />
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
                                    <Menu.Items className="absolute right-0 mt-2 w-72 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-20">
                                        <div className="py-2">
                                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                Genel Mail Listeleri
                                            </div>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={handleDownloadEmails}
                                                        className={`${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'} group flex items-center w-full px-4 py-3 text-sm`}
                                                    >
                                                        <FaUsers className="mr-3 h-4 w-4 text-blue-500" />
                                                        <div className="flex-1 text-left">
                                                            <div className="font-medium">Tüm Kullanıcı Mailleri</div>
                                                            <div className="text-xs text-gray-500">Sistemdeki tüm kullanıcıların mail adresleri</div>
                                                        </div>
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{stats.total}</span>
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={handleDownloadPremiumEmails}
                                                        className={`${active ? 'bg-yellow-50 text-yellow-600' : 'text-gray-700'} group flex items-center w-full px-4 py-3 text-sm`}
                                                    >
                                                        <FaCrown className="mr-3 h-4 w-4 text-yellow-500" />
                                                        <div className="flex-1 text-left">
                                                            <div className="font-medium">Premium Kullanıcı Mailleri</div>
                                                            <div className="text-xs text-gray-500">Sadece premium üyelerin mail adresleri</div>
                                                        </div>
                                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">{stats.premium}</span>
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </div>
                                        
                                        <div className="py-2">
                                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                Uzmanlık Alanlarına Göre
                                            </div>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => setIsManagerModalOpen(true)}
                                                        className={`${active ? 'bg-purple-50 text-purple-600' : 'text-gray-700'} group flex items-center w-full px-4 py-3 text-sm`}
                                                    >
                                                        <FaUserTie className="mr-3 h-4 w-4 text-purple-500" />
                                                        <div className="flex-1 text-left">
                                                            <div className="font-medium">Yönetmen Mailleri</div>
                                                            <div className="text-xs text-gray-500">Yönetmen unvanlı kullanıcılar</div>
                                                        </div>
                                                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                                            {users.filter(user => user.expertise === 'Yönetmen').length}
                                                        </span>
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => setIsAssistantManagerModalOpen(true)}
                                                        className={`${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'} group flex items-center w-full px-4 py-3 text-sm`}
                                                    >
                                                        <FaUserShield className="mr-3 h-4 w-4 text-indigo-500" />
                                                        <div className="flex-1 text-left">
                                                            <div className="font-medium">Yönetmen Yardımcısı Mailleri</div>
                                                            <div className="text-xs text-gray-500">Yönetmen yardımcısı unvanlı kullanıcılar</div>
                                                        </div>
                                                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                                                            {users.filter(user => user.expertise === 'Yönetmen Yardımcısı').length}
                                                        </span>
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => setIsServiceOfficerModalOpen(true)}
                                                        className={`${active ? 'bg-green-50 text-green-600' : 'text-gray-700'} group flex items-center w-full px-4 py-3 text-sm`}
                                                    >
                                                        <FaCog className="mr-3 h-4 w-4 text-green-500" />
                                                        <div className="flex-1 text-left">
                                                            <div className="font-medium">Servis Yetkilisi Mailleri</div>
                                                            <div className="text-xs text-gray-500">Servis yetkilisi unvanlı kullanıcılar</div>
                                                        </div>
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                            {users.filter(user => user.expertise === 'Servis Yetkilisi').length}
                                                        </span>
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => setIsServiceStaffModalOpen(true)}
                                                        className={`${active ? 'bg-teal-50 text-teal-600' : 'text-gray-700'} group flex items-center w-full px-4 py-3 text-sm`}
                                                    >
                                                        <FaUserCog className="mr-3 h-4 w-4 text-teal-500" />
                                                        <div className="flex-1 text-left">
                                                            <div className="font-medium">Servis Görevlisi Mailleri</div>
                                                            <div className="text-xs text-gray-500">Servis görevlisi unvanlı kullanıcılar</div>
                                                        </div>
                                                        <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">
                                                            {users.filter(user => user.expertise === 'Servis Görevlisi').length}
                                                        </span>
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => setIsServiceAssistantModalOpen(true)}
                                                        className={`${active ? 'bg-cyan-50 text-cyan-600' : 'text-gray-700'} group flex items-center w-full px-4 py-3 text-sm`}
                                                    >
                                                        <FaUserClock className="mr-3 h-4 w-4 text-cyan-500" />
                                                        <div className="flex-1 text-left">
                                                            <div className="font-medium">Servis Asistanı Mailleri</div>
                                                            <div className="text-xs text-gray-500">Servis asistanı unvanlı kullanıcılar</div>
                                                        </div>
                                                        <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full">
                                                            {users.filter(user => user.expertise === 'Servis Asistanı').length}
                                                        </span>
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        </div>
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
                            onClick={handlePremiumUsers}
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        {/* Üyelik Dağılımı - Modern Donut Chart */}
                        <div className="bg-white rounded-xl shadow-md p-4">
                            <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                                Üyelik Dağılımı
                            </h2>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={getPieChartData()}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={70}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {getPieChartData().map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry.color}
                                                    stroke="rgba(255,255,255,0.8)"
                                                    strokeWidth={1}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                                            }}
                                            formatter={(value, name) => {
                                                const total = stats.total;
                                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                                return [`${value} kullanıcı (${percentage}%)`, name];
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Custom Legend */}
                            <div className="flex justify-center gap-4 mt-2">
                                {getPieChartData().map((entry, index) => {
                                    const percentage = stats.total > 0 ? ((entry.value / stats.total) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={index} className="flex items-center gap-1">
                                            <div 
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: entry.color }}
                                            ></div>
                                            <span className="text-xs text-gray-600">{entry.name}</span>
                                            <span className="text-xs font-medium text-gray-800">({entry.value})</span>
                                            <span className="text-xs text-gray-500">%{percentage}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Platform Dağılımı - Modern Gradient Bar Chart */}
                        <div className="bg-white rounded-xl shadow-md p-4">
                            <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
                                Platform Dağılımı
                            </h2>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={getBarChartData()}
                                        margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                                        barCategoryGap="20%"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#6B7280' }}
                                        />
                                        <YAxis 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: '#6B7280' }}
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
                                            dataKey="value" 
                                            radius={[4, 4, 0, 0]}
                                            name="Kullanıcı Sayısı"
                                        >
                                            {getBarChartData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Platform Stats */}
                            <div className="flex justify-center gap-6 mt-2">
                                {getBarChartData().map((entry, index) => (
                                    <div key={index} className="text-center">
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            {entry.name === 'iOS' ? (
                                                <FaApple className="text-gray-600 text-sm" />
                                            ) : (
                                                <FaAndroid className="text-green-600 text-sm" />
                                            )}
                                            <span className="text-xs text-gray-600">{entry.name}</span>
                                        </div>
                                        <div className="text-lg font-bold text-gray-800">{entry.value}</div>
                                        <div className="text-xs text-gray-500">kullanıcı</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                <span className="ml-2 text-gray-600">Yükleniyor...</span>
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
                            <div ref={cardsRef}>
                                {/* Üst Pagination */}
                                {totalPages > 1 && (
                                    <div className="mb-6 flex items-center justify-between">
                                        <div className="flex-1 flex justify-between sm:hidden">
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                                                    currentPage === 1
                                                        ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                                                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                                }`}
                                            >
                                                Önceki
                                            </button>
                                            <span className="text-sm text-gray-700 flex items-center">
                                                Sayfa {currentPage} / {totalPages}
                                            </span>
                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                                                    currentPage === totalPages
                                                        ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                                                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                                }`}
                                            >
                                                Sonraki
                                            </button>
                                        </div>
                                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm text-gray-700">
                                                    <span className="font-medium">{indexOfFirstUser + 1}</span>
                                                    {' '}-{' '}
                                                    <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span>
                                                    {' '}arası, toplam{' '}
                                                    <span className="font-medium">{filteredUsers.length}</span>
                                                    {' '}kullanıcı
                                                </p>
                                            </div>
                                            <div>
                                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                    <button
                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                                                            currentPage === 1
                                                                ? 'border-gray-300 text-gray-300 bg-gray-100 cursor-not-allowed'
                                                                : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        ‹
                                                    </button>

                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                                                        if (
                                                            pageNumber === 1 ||
                                                            pageNumber === totalPages ||
                                                            (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                                                        ) {
                                                            return (
                                                                <button
                                                                    key={pageNumber}
                                                                    onClick={() => handlePageChange(pageNumber)}
                                                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                                        currentPage === pageNumber
                                                                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                                                            : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
                                                                    }`}
                                                                >
                                                                    {pageNumber}
                                                                </button>
                                                            );
                                                        }
                                                        if (
                                                            pageNumber === currentPage - 3 ||
                                                            pageNumber === currentPage + 3
                                                        ) {
                                                            return (
                                                                <span key={pageNumber} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                                                    ...
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })}

                                                    <button
                                                        onClick={() => handlePageChange(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                                                            currentPage === totalPages
                                                                ? 'border-gray-300 text-gray-300 bg-gray-100 cursor-not-allowed'
                                                                : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        ›
                                                    </button>
                                                </nav>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {currentUsers.map((user) => (
                                        <div key={user.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                                            {/* Kullanıcı Başlığı */}
                                            <div className="flex items-center mb-4">
                                                <div className="flex-shrink-0 h-12 w-12">
                                                    {user.character?.image ? (
                                                        <img 
                                                            src={`/${user.character.image.split('/').pop()}`}
                                                            alt="Profil"
                                                            className="h-12 w-12 rounded-full object-cover"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div 
                                                        className={`h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center ${user.character?.image ? 'hidden' : ''}`}
                                                    >
                                                        <span className="text-indigo-600 font-medium text-lg">
                                                            {user.name ? user.name[0].toUpperCase() : '?'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-4 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-lg font-semibold text-gray-900">
                                                            {user.name} {user.surname}
                                                        </h3>
                                                        <button
                                                            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600"
                                                            title="Düzenle"
                                                            onClick={() => openEditNameModal(user)}
                                                        >
                                                            <FaEdit size={14} />
                                                        </button>
                                                        {user.isGuest && (
                                                            <FaUserSecret className="text-gray-400" title="Misafir Kullanıcı" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm text-gray-600">{user.email}</p>
                                                        {!user.email?.includes('guest_') && (
                                                            <button
                                                                onClick={() => handleSendEmail(user.email, `${user.name} ${user.surname}`)}
                                                                className="p-1 rounded hover:bg-blue-100 text-blue-500 hover:text-blue-600 transition-colors"
                                                                title="Mail Gönder (Thunderbird)"
                                                            >
                                                                <FaPaperPlane size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Kullanıcı Bilgileri */}
                                            <div className="space-y-3">
                                                {/* Premium Durumu */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-700">Üyelik:</span>
                                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                        user.isPremium 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {user.isPremium ? 'Premium' : 'Ücretsiz'}
                                                    </span>
                                                </div>

                                                {/* Cihaz Bilgisi */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-700">Cihaz:</span>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        {user.device_type === 'iOS' ? (
                                                            <FaApple className="mr-1" />
                                                        ) : user.device_type === 'Android' ? (
                                                            <FaAndroid className="mr-1" />
                                                        ) : null}
                                                        {user.device_type || 'Belirtilmemiş'}
                                                    </div>
                                                </div>

                                                {/* Uzmanlık */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-700">Uzmanlık:</span>
                                                    <Menu as="div" className="relative inline-block text-left">
                                                        <Menu.Button className="inline-flex items-center justify-center px-3 py-1 border border-gray-300 rounded-lg shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                                                            {user.expertise || 'Seçiniz'}
                                                            {updatingExpertise === user.id && (
                                                                <svg className="animate-spin ml-1 h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                                                            <Menu.Items className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-10">
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

                                                {/* Kayıt Tarihi */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-700">Kayıt Tarihi:</span>
                                                    <span className="text-xs text-gray-600">
                                                        {(() => {
                                                            try {
                                                                const timestamp = user.created_at || user.createdAt;
                                                                if (!timestamp) return '-';
                                                                
                                                                let date;
                                                                if (timestamp.toDate) {
                                                                    date = timestamp.toDate();
                                                                } else if (timestamp instanceof Date) {
                                                                    date = timestamp;
                                                                } else if (typeof timestamp === 'string') {
                                                                    date = new Date(timestamp);
                                                                } else {
                                                                    return '-';
                                                                }

                                                                return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                                                            } catch (error) {
                                                                return '-';
                                                            }
                                                        })()}
                                                    </span>
                                                </div>

                                                {/* Premium Tarih */}
                                                {user.premiumPurchaseDate && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-gray-700">Premium Olma Tarihi:</span>
                                                        <span className="text-xs text-gray-600">
                                                            {(() => {
                                                                try {
                                                                    const timestamp = user.premiumPurchaseDate;
                                                                    if (!timestamp) return '-';
                                                                    
                                                                    let date;
                                                                    if (timestamp.toDate) {
                                                                        date = timestamp.toDate();
                                                                    } else if (timestamp instanceof Date) {
                                                                        date = timestamp;
                                                                    } else if (typeof timestamp === 'string') {
                                                                        date = new Date(timestamp);
                                                                    } else {
                                                                        return '-';
                                                                    }

                                                                    return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                                                                } catch (error) {
                                                                    return '-';
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Cihaz ID */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-700">Cihaz ID:</span>
                                                    <span className="text-xs text-gray-600 truncate max-w-24" title={user.device_id}>
                                                        {user.device_id || 'Yok'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* İşlemler */}
                                            <div className="mt-6 flex flex-col gap-2">
                                                <button
                                                    onClick={() => handlePremiumUpdate(user.id, !user.isPremium)}
                                                    disabled={updatingUserId === user.id}
                                                    className={`w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white ${
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
                                                
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        fetchLoginAttempts(user.id);
                                                        setIsDeviceModalOpen(true);
                                                    }}
                                                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none transition ease-in-out duration-150"
                                                >
                                                    <FaExchangeAlt className="mr-2" />
                                                    Cihaz ID Değiştir
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Alt Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-8 flex items-center justify-between">
                                        <div className="flex-1 flex justify-between sm:hidden">
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                                                    currentPage === 1
                                                        ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                                                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                                }`}
                                            >
                                                Önceki
                                            </button>
                                            <span className="text-sm text-gray-700 flex items-center">
                                                Sayfa {currentPage} / {totalPages}
                                            </span>
                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                                                    currentPage === totalPages
                                                        ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                                                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                                }`}
                                            >
                                                Sonraki
                                            </button>
                                        </div>
                                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm text-gray-700">
                                                    <span className="font-medium">{indexOfFirstUser + 1}</span>
                                                    {' '}-{' '}
                                                    <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span>
                                                    {' '}arası, toplam{' '}
                                                    <span className="font-medium">{filteredUsers.length}</span>
                                                    {' '}kullanıcı
                                                </p>
                                            </div>
                                            <div>
                                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                    <button
                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                                                            currentPage === 1
                                                                ? 'border-gray-300 text-gray-300 bg-gray-100 cursor-not-allowed'
                                                                : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        ‹
                                                    </button>

                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                                                        if (
                                                            pageNumber === 1 ||
                                                            pageNumber === totalPages ||
                                                            (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                                                        ) {
                                                            return (
                                                                <button
                                                                    key={pageNumber}
                                                                    onClick={() => handlePageChange(pageNumber)}
                                                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                                        currentPage === pageNumber
                                                                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                                                            : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
                                                                    }`}
                                                                >
                                                                    {pageNumber}
                                                                </button>
                                                            );
                                                        }
                                                        if (
                                                            pageNumber === currentPage - 3 ||
                                                            pageNumber === currentPage + 3
                                                        ) {
                                                            return (
                                                                <span key={pageNumber} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                                                    ...
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })}

                                                    <button
                                                        onClick={() => handlePageChange(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                                                            currentPage === totalPages
                                                                ? 'border-gray-300 text-gray-300 bg-gray-100 cursor-not-allowed'
                                                                : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        ›
                                                    </button>
                                                </nav>
                                            </div>
                                        </div>
                                    </div>
                                )}
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

            {/* Yönetmen Mail Kopyalama Modalı */}
            <Transition appear show={isManagerModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => setIsManagerModalOpen(false)}>
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
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                                        Yönetmen Mail Adreslerini Kopyala
                                    </Dialog.Title>

                                    <div className="mt-4 space-y-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Hangi Yönetmenlerin mail adreslerini kopyalamak istersiniz?</h4>
                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => handleDownloadManagerEmails(false)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center">
                                                        <FaUsers className="text-purple-600 mr-3" />
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium text-gray-900">Tüm Yönetmenler</p>
                                                            <p className="text-xs text-gray-500">Sistemdeki tüm Yönetmen unvanlı kullanıcılar</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {users.filter(user => user.expertise === 'Yönetmen').length} kullanıcı
                                                    </span>
                                                </button>

                                                <button
                                                    onClick={() => handleDownloadManagerEmails(true)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center">
                                                        <FaCrown className="text-yellow-600 mr-3" />
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium text-gray-900">Premium Yönetmenler</p>
                                                            <p className="text-xs text-gray-500">Sadece Premium üye olan Yönetmenler</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {users.filter(user => user.expertise === 'Yönetmen' && user.isPremium).length} kullanıcı
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                            onClick={() => setIsManagerModalOpen(false)}
                                        >
                                            İptal
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Yönetmen Yardımcısı Mail Kopyalama Modalı */}
            <Transition appear show={isAssistantManagerModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => setIsAssistantManagerModalOpen(false)}>
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
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                                        Yönetmen Yardımcısı Mail Adreslerini Kopyala
                                    </Dialog.Title>

                                    <div className="mt-4 space-y-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Hangi Yönetmen Yardımcılarının mail adreslerini kopyalamak istersiniz?</h4>
                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => handleDownloadAssistantManagerEmails(false)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center">
                                                        <FaUsers className="text-indigo-600 mr-3" />
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium text-gray-900">Tüm Yönetmen Yardımcıları</p>
                                                            <p className="text-xs text-gray-500">Sistemdeki tüm Yönetmen Yardımcısı unvanlı kullanıcılar</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {users.filter(user => user.expertise === 'Yönetmen Yardımcısı').length} kullanıcı
                                                    </span>
                                                </button>

                                                <button
                                                    onClick={() => handleDownloadAssistantManagerEmails(true)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center">
                                                        <FaCrown className="text-yellow-600 mr-3" />
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium text-gray-900">Premium Yönetmen Yardımcıları</p>
                                                            <p className="text-xs text-gray-500">Sadece Premium üye olan Yönetmen Yardımcıları</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {users.filter(user => user.expertise === 'Yönetmen Yardımcısı' && user.isPremium).length} kullanıcı
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                            onClick={() => setIsAssistantManagerModalOpen(false)}
                                        >
                                            İptal
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Servis Yetkilisi Mail Kopyalama Modalı */}
            <Transition appear show={isServiceOfficerModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => setIsServiceOfficerModalOpen(false)}>
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
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                                        Servis Yetkilisi Mail Adreslerini Kopyala
                                    </Dialog.Title>

                                    <div className="mt-4 space-y-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Hangi Servis Yetkililerinin mail adreslerini kopyalamak istersiniz?</h4>
                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => handleDownloadServiceOfficerEmails(false)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center">
                                                        <FaUsers className="text-green-600 mr-3" />
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium text-gray-900">Tüm Servis Yetkilileri</p>
                                                            <p className="text-xs text-gray-500">Sistemdeki tüm Servis Yetkilisi unvanlı kullanıcılar</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {users.filter(user => user.expertise === 'Servis Yetkilisi').length} kullanıcı
                                                    </span>
                                                </button>

                                                <button
                                                    onClick={() => handleDownloadServiceOfficerEmails(true)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center">
                                                        <FaCrown className="text-yellow-600 mr-3" />
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium text-gray-900">Premium Servis Yetkilileri</p>
                                                            <p className="text-xs text-gray-500">Sadece Premium üye olan Servis Yetkilileri</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {users.filter(user => user.expertise === 'Servis Yetkilisi' && user.isPremium).length} kullanıcı
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                            onClick={() => setIsServiceOfficerModalOpen(false)}
                                        >
                                            İptal
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Servis Görevlisi Mail Kopyalama Modalı */}
            <Transition appear show={isServiceStaffModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => setIsServiceStaffModalOpen(false)}>
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
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                                        Servis Görevlisi Mail Adreslerini Kopyala
                                    </Dialog.Title>

                                    <div className="mt-4 space-y-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Hangi Servis Görevlilerinin mail adreslerini kopyalamak istersiniz?</h4>
                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => handleDownloadServiceStaffEmails(false)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center">
                                                        <FaUsers className="text-teal-600 mr-3" />
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium text-gray-900">Tüm Servis Görevlileri</p>
                                                            <p className="text-xs text-gray-500">Sistemdeki tüm Servis Görevlisi unvanlı kullanıcılar</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {users.filter(user => user.expertise === 'Servis Görevlisi').length} kullanıcı
                                                    </span>
                                                </button>

                                                <button
                                                    onClick={() => handleDownloadServiceStaffEmails(true)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center">
                                                        <FaCrown className="text-yellow-600 mr-3" />
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium text-gray-900">Premium Servis Görevlileri</p>
                                                            <p className="text-xs text-gray-500">Sadece Premium üye olan Servis Görevlileri</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {users.filter(user => user.expertise === 'Servis Görevlisi' && user.isPremium).length} kullanıcı
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                            onClick={() => setIsServiceStaffModalOpen(false)}
                                        >
                                            İptal
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Servis Asistanı Mail Kopyalama Modalı */}
            <Transition appear show={isServiceAssistantModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => setIsServiceAssistantModalOpen(false)}>
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
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                                        Servis Asistanı Mail Adreslerini Kopyala
                                    </Dialog.Title>

                                    <div className="mt-4 space-y-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Hangi Servis Asistanlarının mail adreslerini kopyalamak istersiniz?</h4>
                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => handleDownloadServiceAssistantEmails(false)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center">
                                                        <FaUsers className="text-cyan-600 mr-3" />
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium text-gray-900">Tüm Servis Asistanları</p>
                                                            <p className="text-xs text-gray-500">Sistemdeki tüm Servis Asistanı unvanlı kullanıcılar</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {users.filter(user => user.expertise === 'Servis Asistanı').length} kullanıcı
                                                    </span>
                                                </button>

                                                <button
                                                    onClick={() => handleDownloadServiceAssistantEmails(true)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center">
                                                        <FaCrown className="text-yellow-600 mr-3" />
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium text-gray-900">Premium Servis Asistanları</p>
                                                            <p className="text-xs text-gray-500">Sadece Premium üye olan Servis Asistanları</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {users.filter(user => user.expertise === 'Servis Asistanı' && user.isPremium).length} kullanıcı
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                            onClick={() => setIsServiceAssistantModalOpen(false)}
                                        >
                                            İptal
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Ad Soyad Düzenleme Modalı */}
            {isEditNameModalOpen && (
                <div className="fixed z-50 inset-0 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black opacity-30" onClick={() => setIsEditNameModalOpen(false)}></div>
                        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto p-8 z-10">
                            <h3 className="text-lg font-bold mb-4">Ad & Soyad Düzenle</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={editSurname}
                                    onChange={e => setEditSurname(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setIsEditNameModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleEditNameSave}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default UsersPage; 