import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import AddAnnouncement from "./addAnnouncement";
import { toast } from "react-hot-toast";

const AnnouncementList = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [informations, setInformations] = useState([]);
    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('announcements');

    useEffect(() => {
        // Duyurular koleksiyonunu dinle
        const announcementsRef = collection(db, "announcements");
        const announcementsQuery = query(announcementsRef, orderBy("tarih", "desc"));
        
        // Bilgilendirmeler koleksiyonunu dinle
        const informationsRef = collection(db, "informations");
        const informationsQuery = query(informationsRef, orderBy("tarih", "desc"));
        
        // Etkinlikler koleksiyonunu dinle
        const eventsRef = collection(db, "events");
        const eventsQuery = query(eventsRef, orderBy("tarih", "desc"));
        
        const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
            const announcementList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tip: "Duyuru"
            }));
            setAnnouncements(announcementList);
            setIsLoading(false);
        }, (error) => {
            console.error("Duyurular dinlenirken hata:", error);
            toast.error("Duyurular yüklenirken bir hata oluştu!");
        });

        const unsubscribeInformations = onSnapshot(informationsQuery, (snapshot) => {
            const informationList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tip: "Bilgilendirme"
            }));
            setInformations(informationList);
        }, (error) => {
            console.error("Bilgilendirmeler dinlenirken hata:", error);
            toast.error("Bilgilendirmeler yüklenirken bir hata oluştu!");
        });

        const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
            const eventList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tip: "Etkinlik"
            }));
            setEvents(eventList);
        }, (error) => {
            console.error("Etkinlikler dinlenirken hata:", error);
            toast.error("Etkinlikler yüklenirken bir hata oluştu!");
        });

        return () => {
            unsubscribeAnnouncements();
            unsubscribeInformations();
            unsubscribeEvents();
        };
    }, []);

    const handleDelete = async (id, type) => {
        let collectionName;
        let itemType;
        
        switch (type) {
            case "Duyuru":
                collectionName = "announcements";
                itemType = "duyuruyu";
                break;
            case "Bilgilendirme":
                collectionName = "informations";
                itemType = "bilgilendirmeyi";
                break;
            case "Etkinlik":
                collectionName = "events";
                itemType = "etkinliği";
                break;
            default:
                return;
        }

        if (window.confirm(`Bu ${itemType} silmek istediğinizden emin misiniz?`)) {
            try {
                await deleteDoc(doc(db, collectionName, id));
                toast.success(`${type} başarıyla silindi`);
            } catch (error) {
                console.error('Error deleting:', error);
                toast.error(`${type} silinirken bir hata oluştu`);
            }
        }
    };

    const handleToggleActive = async (id, currentActive, type) => {
        let collectionName;
        
        switch (type) {
            case "Duyuru":
                collectionName = "announcements";
                break;
            case "Bilgilendirme":
                collectionName = "informations";
                break;
            case "Etkinlik":
                collectionName = "events";
                break;
            default:
                return;
        }

        try {
            const itemRef = doc(db, collectionName, id);
            await updateDoc(itemRef, { aktif: !currentActive });
            toast.success(`${type} durumu ${!currentActive ? "aktif" : "pasif"} olarak güncellendi.`);
        } catch (error) {
            console.error(`${type} durumu güncellenirken bir hata oluştu:`, error);
            toast.error(`${type} durumu güncellenirken bir hata oluştu!`);
        }
    };

    const formatDate = (dateString) => {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('tr-TR', options);
    };

    const getActiveItems = () => {
        switch (activeTab) {
            case 'announcements':
                return announcements;
            case 'informations':
                return informations;
            case 'events':
                return events;
            default:
                return [];
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Duyurular</h1>
                <button
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md transition-all duration-200 flex items-center"
                    onClick={() => {
                        setSelectedItem(null);
                        setIsModalOpen(true);
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Yeni Ekle
                </button>
            </div>

            <div className="mb-6">
                <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
                    <button
                        className={`py-2 px-4 ${activeTab === 'announcements' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('announcements')}
                    >
                        Duyurular
                    </button>
                    <button
                        className={`py-2 px-4 ${activeTab === 'informations' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('informations')}
                    >
                        Bilgilendirmeler
                    </button>
                    <button
                        className={`py-2 px-4 ${activeTab === 'events' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('events')}
                    >
                        Etkinlikler
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getActiveItems().map((item) => (
                        <div 
                            key={item.id} 
                            className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-200 hover:shadow-xl border ${item.aktif ? 'border-green-500' : 'border-red-500'}`}
                        >
                            {item.resim && (
                                <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                                    <img 
                                        src={`data:${item.resimTuru || 'image/png'};base64,${item.resim}`}
                                        alt={item.baslik} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-3">
                                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                                        {item.baslik}
                                    </h2>
                                    <span className={`text-sm px-2 py-1 rounded-full ${item.aktif ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                        {item.aktif ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                                
                                {item.tip === "Duyuru" && (
                                    <>
                                        <div 
                                            className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 prose prose-sm dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: item.aciklama }}
                                        />
                                        
                                        {item.toplantiLinki && (
                                            <div className="mb-4">
                                                <a 
                                                    href={item.toplantiLinki}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    Toplantıya Katıl
                                                </a>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                item.gosterimHedefi === 'premium' 
                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            }`}>
                                                {item.gosterimHedefi === 'premium' ? 'Premium' : 'Herkese Açık'}
                                            </span>

                                            {item.expertise && item.expertise !== 'Tüm Ünvanlar' && (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    {(() => {
                                                        const expertiseLabels = {
                                                            'Servis Asistanı': 'Servis Asistanı',
                                                            'Servis Görevlisi': 'Servis Görevlisi',
                                                            'Servis Yetkilisi': 'Servis Yetkilisi',
                                                            'Yönetmen Yardımcısı': 'Yönetmen Yardımcısı',
                                                            'Yönetmen': 'Yönetmen'
                                                        };
                                                        return expertiseLabels[item.expertise] || item.expertise;
                                                    })()}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                                
                                {item.tip === "Etkinlik" && (
                                    <>
                                        <p className="text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                                            <span className="font-semibold">Kısa Açıklama:</span> {item.kisaAciklama}
                                        </p>
                                        <p className="text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                                            <span className="font-semibold">Uzun Açıklama:</span> {item.uzunAciklama}
                                        </p>
                                        <p className="text-emerald-600 dark:text-emerald-400 mb-3 font-semibold">
                                            Ücret: {item.ucret} TL
                                        </p>
                                        {item.odemeSonrasiIcerik && (
                                            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mb-3">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ödeme Sonrası İçerik:</p>
                                                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-1">
                                                    {item.odemeSonrasiIcerik}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                                
                                {item.tip === "Bilgilendirme" && (
                                    <>
                                        <p className="text-gray-600 dark:text-gray-300 mb-2 line-clamp-3">
                                            {item.kisaAciklama}
                                        </p>
                                        <div className="bg-blue-50 dark:bg-blue-900 p-2 rounded-lg mb-3">
                                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                                <span className="font-semibold">Hedef Sayfa:</span> {item.target}
                                            </p>
                                        </div>
                                    </>
                                )}
                                
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    {formatDate(item.tarih)}
                                </div>
                                
                                <div className="flex justify-end space-x-2">
                                    <button
                                        onClick={() => {
                                            setSelectedItem(item);
                                            setEditMode(true);
                                            setIsModalOpen(true);
                                        }}
                                        className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 rounded-lg font-medium transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(item.id, item.aktif, item.tip)}
                                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                            item.aktif 
                                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800' 
                                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
                                        }`}
                                    >
                                        {item.aktif ? 'Pasif Yap' : 'Aktif Yap'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id, item.tip)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && getActiveItems().length === 0 && (
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                        {activeTab === 'announcements' && "Henüz duyuru bulunmuyor."}
                        {activeTab === 'informations' && "Henüz bilgilendirme bulunmuyor."}
                        {activeTab === 'events' && "Henüz etkinlik bulunmuyor."}
                    </p>
                </div>
            )}

            {isModalOpen && (
                <AddAnnouncement 
                    isOpen={isModalOpen} 
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditMode(false);
                        setSelectedItem(null);
                    }}
                    selectedType={activeTab === 'announcements' ? 'Duyuru' : activeTab === 'informations' ? 'Bilgilendirme' : 'Etkinlik'}
                    editItem={editMode ? selectedItem : null}
                />
            )}
        </div>
    );
};

export default AnnouncementList; 