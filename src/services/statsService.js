import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, getCountFromServer, collectionGroup, getDocs, Timestamp, query, orderBy, limit } from 'firebase/firestore';

class StatsService {
    // Dashboard stats doküman referansı
    getStatsRef() {
        return doc(db, 'dashboard-stats', 'overview');
    }

    // Stats dokümanını al veya oluştur
    async getOrCreateStats() {
        const statsRef = this.getStatsRef();
        const statsSnap = await getDoc(statsRef);
        
        if (!statsSnap.exists()) {
            // İlk kez oluştur
            await setDoc(statsRef, {
                toplamSoru: 0,
                toplamKonu: 0,
                toplamKullanici: 0,
                toplamDuyuru: 0,
                aktifDenemeSinavi: 0,
                son30GunSoru: 0,
                lastUpdated: serverTimestamp()
            });
            return { toplamSoru: 0, toplamKonu: 0, toplamKullanici: 0, toplamDuyuru: 0, aktifDenemeSinavi: 0, son30GunSoru: 0 };
        }
        
        return statsSnap.data();
    }

    // Soru sayısını artır (arka planda son 30 gün sayısını da günceller)
    async incrementSoruCount(count = 1, createdAt = null) {
        try {
            const statsRef = this.getStatsRef();
            const updates = {
                toplamSoru: increment(count),
                lastUpdated: serverTimestamp()
            };

            // Eğer createdAt verildiyse ve son 30 gün içindeyse, son30GunSoru'yu da artır
            if (createdAt) {
                const otuzGunOnce = new Date();
                otuzGunOnce.setDate(otuzGunOnce.getDate() - 30);
                const soruTarihi = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
                
                if (soruTarihi >= otuzGunOnce) {
                    updates.son30GunSoru = increment(count);
                }
            }

            await updateDoc(statsRef, updates);
        } catch (error) {
            console.error('Soru sayısı güncellenirken hata:', error);
        }
    }

    // Soru sayısını azalt (arka planda son 30 gün sayısını da günceller)
    async decrementSoruCount(count = 1, createdAt = null) {
        try {
            const statsRef = this.getStatsRef();
            const updates = {
                toplamSoru: increment(-count),
                lastUpdated: serverTimestamp()
            };

            // Eğer createdAt verildiyse ve son 30 gün içindeyse, son30GunSoru'yu da azalt
            if (createdAt) {
                const otuzGunOnce = new Date();
                otuzGunOnce.setDate(otuzGunOnce.getDate() - 30);
                const soruTarihi = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
                
                if (soruTarihi >= otuzGunOnce) {
                    updates.son30GunSoru = increment(-count);
                }
            }

            await updateDoc(statsRef, updates);
        } catch (error) {
            console.error('Soru sayısı güncellenirken hata:', error);
        }
    }

    // Konu sayısını artır
    async incrementKonuCount(count = 1) {
        try {
            const statsRef = this.getStatsRef();
            await updateDoc(statsRef, {
                toplamKonu: increment(count),
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error('Konu sayısı güncellenirken hata:', error);
        }
    }

    // Konu sayısını azalt
    async decrementKonuCount(count = 1) {
        try {
            const statsRef = this.getStatsRef();
            await updateDoc(statsRef, {
                toplamKonu: increment(-count),
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error('Konu sayısı güncellenirken hata:', error);
        }
    }

    // Kullanıcı sayısını artır
    async incrementKullaniciCount(count = 1) {
        try {
            const statsRef = this.getStatsRef();
            await updateDoc(statsRef, {
                toplamKullanici: increment(count),
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error('Kullanıcı sayısı güncellenirken hata:', error);
        }
    }

    // Kullanıcı sayısını azalt
    async decrementKullaniciCount(count = 1) {
        try {
            const statsRef = this.getStatsRef();
            await updateDoc(statsRef, {
                toplamKullanici: increment(-count),
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error('Kullanıcı sayısı güncellenirken hata:', error);
        }
    }

    // Duyuru sayısını artır
    async incrementDuyuruCount(count = 1) {
        try {
            const statsRef = this.getStatsRef();
            await updateDoc(statsRef, {
                toplamDuyuru: increment(count),
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error('Duyuru sayısı güncellenirken hata:', error);
        }
    }

    // Duyuru sayısını azalt
    async decrementDuyuruCount(count = 1) {
        try {
            const statsRef = this.getStatsRef();
            await updateDoc(statsRef, {
                toplamDuyuru: increment(-count),
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error('Duyuru sayısı güncellenirken hata:', error);
        }
    }

    // Deneme sınavı sayısını artır
    async incrementDenemeSinaviCount(count = 1) {
        try {
            const statsRef = this.getStatsRef();
            await updateDoc(statsRef, {
                aktifDenemeSinavi: increment(count),
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error('Deneme sınavı sayısı güncellenirken hata:', error);
        }
    }

    // Deneme sınavı sayısını azalt
    async decrementDenemeSinaviCount(count = 1) {
        try {
            const statsRef = this.getStatsRef();
            await updateDoc(statsRef, {
                aktifDenemeSinavi: increment(-count),
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error('Deneme sınavı sayısı güncellenirken hata:', error);
        }
    }

    // Tüm stats'ı al
    async getStats() {
        try {
            const statsRef = this.getStatsRef();
            const statsSnap = await getDoc(statsRef);
            
            if (!statsSnap.exists()) {
                return await this.getOrCreateStats();
            }
            
            return statsSnap.data();
        } catch (error) {
            console.error('Stats alınırken hata:', error);
            return await this.getOrCreateStats();
        }
    }

    // Stats'ı manuel olarak güncelle (ilk kurulum için)
    async setStats(data) {
        try {
            const statsRef = this.getStatsRef();
            await setDoc(statsRef, {
                ...data,
                lastUpdated: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Stats güncellenirken hata:', error);
        }
    }

    // Son 30 gün soru sayısını güncelle
    async setLast30DaysQuestions(count) {
        try {
            const statsRef = this.getStatsRef();
            await updateDoc(statsRef, {
                son30GunSoru: count,
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error('Son 30 gün soru sayısı güncellenirken hata:', error);
        }
    }

    // TÜM İSTATİSTİKLERİ YENİDEN HESAPLA (İlk kurulum veya senkronizasyon için)
    async recalculateAllStats() {
        try {
            console.log('Tüm istatistikler yeniden hesaplanıyor...');
            
            // Tüm koleksiyonları paralel olarak say
            const [
                konularCount,
                usersCount,
                announcementsCount,
                examlarCount,
                manualQuestionsCount
            ] = await Promise.all([
                getCountFromServer(collection(db, "konular")),
                getCountFromServer(collection(db, "users")),
                getCountFromServer(collection(db, "announcements")),
                getCountFromServer(collection(db, 'examlar')),
                getCountFromServer(collection(db, 'manual-questions'))
            ]);

            // Tüm soruları say (konu altındaki sorular + manuel sorular)
            const sorularSnap = await getDocs(collectionGroup(db, 'sorular'));
            const toplamSoru = sorularSnap.size + manualQuestionsCount.data().count;

            // Son 30 günde eklenen soruları say
            const otuzGunOnce = new Date();
            otuzGunOnce.setDate(otuzGunOnce.getDate() - 30);
            const otuzGunOnceTimestamp = Timestamp.fromDate(otuzGunOnce);
            
            let son30GunSoru = 0;
            
            // Konu altındaki sorular
            sorularSnap.forEach(doc => {
                const data = doc.data();
                if (data.createdAt) {
                    const createdAt = data.createdAt;
                    if (createdAt >= otuzGunOnceTimestamp) {
                        son30GunSoru++;
                    }
                }
            });

            // Manuel sorular - son 30 gün
            const manualSnap = await getDocs(collection(db, 'manual-questions'));
            manualSnap.forEach(doc => {
                const data = doc.data();
                if (data.createdAt) {
                    const createdAt = data.createdAt;
                    if (createdAt >= otuzGunOnceTimestamp) {
                        son30GunSoru++;
                    }
                }
            });

            // Grafik verilerini hesapla
            const monthlyStats = this.calculateMonthlyStats(sorularSnap, manualSnap);
            const konuStats = await this.calculateKonuDagilimi(sorularSnap);

            // Stats'ı güncelle
            const statsData = {
                toplamSoru: toplamSoru,
                toplamKonu: konularCount.data().count,
                toplamKullanici: usersCount.data().count,
                toplamDuyuru: announcementsCount.data().count,
                aktifDenemeSinavi: examlarCount.data().count,
                son30GunSoru: son30GunSoru,
                // Grafik verileri
                aylikSoruTrendi: monthlyStats,
                konuBazindaDagilim: konuStats.slice(0, 10), // Top 10 konu
                lastUpdated: serverTimestamp()
            };

            const statsRef = this.getStatsRef();
            await setDoc(statsRef, statsData, { merge: false }); // merge: false = tamamen değiştir

            console.log('✅ Dashboard istatistikleri başarıyla Firestore\'a kaydedildi:', statsData);
            console.log('📍 Konum: dashboard-stats/overview');
            return statsData;
        } catch (error) {
            console.error('İstatistikler hesaplanırken hata:', error);
            throw error;
        }
    }

    // Aylık soru ekleme trendini hesapla (son 6 ay)
    calculateMonthlyStats(sorularSnap, manualSnap) {
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
                soruTarihi = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
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
                const soruTarihi = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
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
    }

    // Konu bazında soru dağılımını hesapla
    async calculateKonuDagilimi(sorularSnap) {
        // Konuları önce çek
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
    }

    // Grafik verilerini güncelle (arka planda - soru ekleme/silme sonrası)
    async updateChartData() {
        try {
            // Sadece grafik verilerini güncelle (sayıları değiştirme)
            const [sorularSnap, manualSnap] = await Promise.all([
                getDocs(collectionGroup(db, 'sorular')),
                getDocs(query(
                    collection(db, 'manual-questions'),
                    orderBy('createdAt', 'desc'),
                    limit(2000)
                ))
            ]);

            const monthlyStats = this.calculateMonthlyStats(sorularSnap, manualSnap);
            const konuStats = await this.calculateKonuDagilimi(sorularSnap);

            const statsRef = this.getStatsRef();
            await updateDoc(statsRef, {
                aylikSoruTrendi: monthlyStats,
                konuBazindaDagilim: konuStats.slice(0, 10),
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error('Grafik verileri güncellenirken hata:', error);
        }
    }
}

const statsService = new StatsService();
export default statsService;

