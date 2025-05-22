import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { FaSearch, FaFilter, FaSort, FaExclamationTriangle, FaInfoCircle, FaExclamationCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import Layout from '../../components/layout';

const ErrorLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterType, setFilterType] = useState('all');
    const [expandedLogs, setExpandedLogs] = useState({});

    const fetchLogs = async (isInitial = false) => {
        try {
            setLoading(true);
            let q = query(
                collection(db, 'audit_trails'),
                orderBy('timestamp', sortOrder),
                limit(20)
            );

            if (!isInitial && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const querySnapshot = await getDocs(q);
            const newLogs = await Promise.all(
                querySnapshot.docs.map(async (docSnapshot) => {
                    const logData = docSnapshot.data();
                    let userName = '';
                    let userSurname = '';
                    
                    console.log('Audit Trail Data:', {
                        id: docSnapshot.id,
                        userId: logData.userId,
                        userEmail: logData.userEmail
                    });
                    
                    if (logData.userId) {
                        try {
                            const userRef = doc(db, 'users', logData.userId);
                            const userSnap = await getDoc(userRef);
                            
                            console.log('User Data:', {
                                exists: userSnap.exists(),
                                data: userSnap.exists() ? userSnap.data() : null
                            });
                            
                            if (userSnap.exists()) {
                                const userData = userSnap.data();
                                userName = userData.name || '';
                                userSurname = userData.surname || '';
                            }
                        } catch (error) {
                            console.error('Kullanıcı bilgisi alınamadı:', error);
                        }
                    }

                    return {
                        id: docSnapshot.id,
                        ...logData,
                        userName,
                        userSurname
                    };
                })
            );

            if (isInitial) {
                setLogs(newLogs);
            } else {
                setLogs(prev => [...prev, ...newLogs]);
            }

            setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
            setHasMore(querySnapshot.docs.length === 20);
        } catch (error) {
            console.error('Loglar yüklenirken hata oluştu:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(true);
    }, [sortOrder, filterType]);

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchLogs();
        }
    };

    const handleSort = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        setLastDoc(null);
    };

    const getFilteredLogs = () => {
        return logs.filter(log => {
            const matchesSearch = 
                log.errorMessage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.errorType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.pageName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.userSurname?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesFilter = filterType === 'all' || log.type === filterType;

            return matchesSearch && matchesFilter;
        });
    };

    const toggleExpand = (logId) => {
        setExpandedLogs(prev => ({
            ...prev,
            [logId]: !prev[logId]
        }));
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'error':
                return 'bg-red-100 text-red-800';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800';
            case 'info':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'error':
                return <FaExclamationTriangle className="text-red-500" />;
            case 'warning':
                return <FaExclamationCircle className="text-yellow-500" />;
            case 'info':
                return <FaInfoCircle className="text-blue-500" />;
            default:
                return <FaInfoCircle className="text-gray-500" />;
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Header Section */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-50 rounded-xl">
                                        <FaExclamationTriangle className="text-red-500 text-xl" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-800">Hata Kayıtları</h1>
                                        <p className="text-sm text-gray-500 mt-1">Sistemdeki tüm hata ve uyarı kayıtlarını görüntüleyin</p>
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:flex-none">
                                        <input
                                            type="text"
                                            placeholder="Hata kayıtlarında ara..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full md:w-64 pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                        />
                                        <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                                    </div>
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                    >
                                        <option value="all">Tüm Kayıtlar</option>
                                        <option value="error">Hatalar</option>
                                        <option value="warning">Uyarılar</option>
                                        <option value="info">Bilgiler</option>
                                    </select>
                                    <button
                                        onClick={handleSort}
                                        className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 flex items-center justify-center gap-2"
                                    >
                                        <FaSort />
                                        {sortOrder === 'desc' ? 'En Yeni' : 'En Eski'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Logs Section */}
                        <div className="space-y-4">
                            {getFilteredLogs().map((log) => (
                                <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2 rounded-xl ${getTypeColor(log.type).replace('text-', 'bg-').replace('bg-', 'bg-opacity-10 ')}`}>
                                                    {getTypeIcon(log.type)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getTypeColor(log.type)}`}>
                                                            {log.type}
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            {format(log.timestamp?.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-gray-800 mt-1">{log.errorType}</h3>
                                                    <p className="text-sm text-gray-600 mt-1">{log.pageName}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {log.userId ? (
                                                            <>
                                                                {log.userName && log.userSurname ? (
                                                                    `${log.userName} ${log.userSurname}`
                                                                ) : (
                                                                    log.userEmail || 'Sistem'
                                                                )}
                                                            </>
                                                        ) : 'Sistem'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{log.userEmail || 'Sistem'}</div>
                                                </div>
                                                <button
                                                    onClick={() => toggleExpand(log.id)}
                                                    className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                                                >
                                                    {expandedLogs[log.id] ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
                                                </button>
                                            </div>
                                        </div>

                                        {expandedLogs[log.id] && (
                                            <div className="mt-6 pt-6 border-t border-gray-100">
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Hata Mesajı</h4>
                                                        <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl">{log.errorMessage}</p>
                                                    </div>
                                                    {log.errorDetails && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Hata Detayları</h4>
                                                            <pre className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
                                                                {log.errorDetails}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {log.deviceInfo && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Cihaz Bilgisi</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                <div className="bg-gray-50 p-4 rounded-xl">
                                                                    <div className="text-xs text-gray-500">Model</div>
                                                                    <div className="text-sm font-medium text-gray-900 mt-1">{log.deviceInfo.model}</div>
                                                                </div>
                                                                <div className="bg-gray-50 p-4 rounded-xl">
                                                                    <div className="text-xs text-gray-500">Platform</div>
                                                                    <div className="text-sm font-medium text-gray-900 mt-1">{log.deviceInfo.platform}</div>
                                                                </div>
                                                                <div className="bg-gray-50 p-4 rounded-xl">
                                                                    <div className="text-xs text-gray-500">Sistem</div>
                                                                    <div className="text-sm font-medium text-gray-900 mt-1">{log.deviceInfo.systemVersion}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {log.additionalInfo && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Ek Bilgiler</h4>
                                                            <pre className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
                                                                {JSON.stringify(log.additionalInfo, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Load More Button */}
                        {hasMore && (
                            <div className="mt-8 text-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loading}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 font-medium transition-colors"
                                >
                                    {loading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ErrorLogsPage; 