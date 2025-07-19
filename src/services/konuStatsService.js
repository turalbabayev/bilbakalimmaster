import { db } from "../firebase";
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    updateDoc,
    serverTimestamp,
    onSnapshot,
    collectionGroup
} from "firebase/firestore";

class KonuStatsService {
    // Belirli bir konunun tüm alt konularını ve soru sayılarını hesapla
    async calculateKonuStats(konuId) {
        try {
            console.log(`Konu ${konuId} için istatistikler hesaplanıyor...`);
            
            // Konu referansı
            const konuRef = doc(db, "konular", konuId);
            const konuDoc = await getDoc(konuRef);
            const konuData = konuDoc.data();
            const konuAdi = konuData?.baslik || konuData?.title || konuData?.name || konuId;
            
            // Alt konuları al
            const altKonularRef = collection(konuRef, "altkonular");
            const altKonularSnapshot = await getDocs(altKonularRef);
            
            const altKonuStats = [];
            let toplamSoru = 0;
            
            // Her alt konu için soru sayısını hesapla
            for (const altKonuDoc of altKonularSnapshot.docs) {
                const altKonuId = altKonuDoc.id;
                const altKonuData = altKonuDoc.data();
                
                // Alt konunun sorularını al
                const sorularRef = collection(altKonuDoc.ref, "sorular");
                const sorularSnapshot = await getDocs(sorularRef);
                
                // Boş olmayan soruları filtrele
                let gecerliSoruSayisi = 0;
                sorularSnapshot.forEach(soruDoc => {
                    const soruData = soruDoc.data();
                    // Soru metni varsa ve boş değilse say
                    if (soruData.soruMetni && soruData.soruMetni.trim() !== '') {
                        gecerliSoruSayisi++;
                    }
                });
                
                altKonuStats.push({
                    altKonuId: altKonuId,
                    altKonuAdi: altKonuData.baslik || altKonuData.altKonuAdi || altKonuData.title || altKonuData.altKonu || altKonuData.name || 'İsimsiz Alt Konu',
                    soruSayisi: gecerliSoruSayisi,
                    toplamSoru: sorularSnapshot.size, // Toplam soru sayısı (boş olanlar dahil)
                    gecerliSoru: gecerliSoruSayisi // Sadece geçerli soru sayısı
                });
                
                toplamSoru += gecerliSoruSayisi;
            }
            
            // Konu stats document'ini oluştur/güncelle
            const konuStatsRef = doc(db, "konu-stats", konuId);
            const konuStatsData = {
                konuId: konuId,
                konuAdi: konuAdi,
                altKonular: altKonuStats,
                toplamSoru: toplamSoru,
                altKonuSayisi: altKonuStats.length,
                lastUpdated: serverTimestamp()
            };
            
            await setDoc(konuStatsRef, konuStatsData, { merge: true });
            
            console.log(`Konu ${konuId} istatistikleri güncellendi:`, konuStatsData);
            return konuStatsData;
            
        } catch (error) {
            console.error(`Konu ${konuId} istatistikleri hesaplanırken hata:`, error);
            throw error;
        }
    }
    
    // Tüm konuların istatistiklerini hesapla
    async calculateAllKonuStats() {
        try {
            console.log('Tüm konuların istatistikleri hesaplanıyor...');
            
            // Tüm konuları al
            const konularRef = collection(db, "konular");
            const konularSnapshot = await getDocs(konularRef);
            
            const results = [];
            
            for (const konuDoc of konularSnapshot.docs) {
                const konuId = konuDoc.id;
                try {
                    const stats = await this.calculateKonuStats(konuId);
                    results.push(stats);
                } catch (error) {
                    console.error(`Konu ${konuId} için hata:`, error);
                    results.push({ konuId, error: error.message });
                }
            }
            
            console.log('Tüm konuların istatistikleri tamamlandı:', results);
            return results;
            
        } catch (error) {
            console.error('Tüm konuların istatistikleri hesaplanırken hata:', error);
            throw error;
        }
    }
    
    // Belirli bir konunun istatistiklerini getir
    async getKonuStats(konuId) {
        try {
            const konuStatsRef = doc(db, "konu-stats", konuId);
            const konuStatsDoc = await getDoc(konuStatsRef);
            
            if (konuStatsDoc.exists()) {
                return konuStatsDoc.data();
            } else {
                // Eğer stats yoksa hesapla
                return await this.calculateKonuStats(konuId);
            }
        } catch (error) {
            console.error(`Konu ${konuId} istatistikleri alınırken hata:`, error);
            throw error;
        }
    }
    
    // Tüm konu istatistiklerini getir
    async getAllKonuStats() {
        try {
            const konuStatsRef = collection(db, "konu-stats");
            const konuStatsSnapshot = await getDocs(konuStatsRef);
            
            const stats = [];
            konuStatsSnapshot.forEach(doc => {
                stats.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return stats;
        } catch (error) {
            console.error('Tüm konu istatistikleri alınırken hata:', error);
            throw error;
        }
    }
    
    // Alt konu eklendiğinde/güncellendiğinde çağrılacak
    async updateKonuStatsOnAltKonuChange(konuId) {
        try {
            await this.calculateKonuStats(konuId);
        } catch (error) {
            console.error(`Konu ${konuId} istatistikleri güncellenirken hata:`, error);
        }
    }
    
    // Soru eklendiğinde/silindiğinde çağrılacak
    async updateKonuStatsOnSoruChange(konuId) {
        try {
            await this.calculateKonuStats(konuId);
        } catch (error) {
            console.error(`Konu ${konuId} istatistikleri güncellenirken hata:`, error);
        }
    }

    // Real-time listener'ları başlat
    startRealTimeUpdates() {
        console.log('Real-time konu istatistikleri güncellemeleri başlatılıyor...');
        
        // Tüm konuları dinle
        const konularRef = collection(db, "konular");
        const konularUnsubscribe = onSnapshot(konularRef, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const konuId = change.doc.id;
                console.log(`Konu değişikliği algılandı: ${konuId} - ${change.type}`);
                
                if (change.type === 'added' || change.type === 'modified') {
                    this.updateKonuStatsOnAltKonuChange(konuId);
                }
            });
        });

        // Tüm alt konuları dinle
        const altKonularGroup = query(collectionGroup(db, "altkonular"));
        const altKonularUnsubscribe = onSnapshot(altKonularGroup, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const konuId = change.doc.ref.parent.parent.id;
                console.log(`Alt konu değişikliği algılandı: ${konuId} - ${change.type}`);
                
                if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
                    this.updateKonuStatsOnAltKonuChange(konuId);
                }
            });
        });

        // Tüm soruları dinle
        const sorularGroup = query(collectionGroup(db, "sorular"));
        const sorularUnsubscribe = onSnapshot(sorularGroup, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const konuId = change.doc.ref.parent.parent.parent.parent.id;
                console.log(`Soru değişikliği algılandı: ${konuId} - ${change.type}`);
                
                if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
                    this.updateKonuStatsOnSoruChange(konuId);
                }
            });
        });

        // Cleanup fonksiyonunu döndür
        return () => {
            konularUnsubscribe();
            altKonularUnsubscribe();
            sorularUnsubscribe();
            console.log('Real-time konu istatistikleri güncellemeleri durduruldu.');
        };
    }

    // Belirli bir konunun real-time güncellemelerini başlat
    startKonuRealTimeUpdates(konuId) {
        console.log(`Konu ${konuId} için real-time güncellemeler başlatılıyor...`);
        
        // Konu değişikliklerini dinle
        const konuRef = doc(db, "konular", konuId);
        const konuUnsubscribe = onSnapshot(konuRef, (doc) => {
            if (doc.exists()) {
                console.log(`Konu ${konuId} değişikliği algılandı`);
                this.updateKonuStatsOnAltKonuChange(konuId);
            }
        });

        // Alt konuları dinle
        const altKonularRef = collection(konuRef, "altkonular");
        const altKonularUnsubscribe = onSnapshot(altKonularRef, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                console.log(`Alt konu değişikliği algılandı: ${konuId} - ${change.type}`);
                this.updateKonuStatsOnAltKonuChange(konuId);
            });
        });

        // Alt konuların sorularını dinle
        const altKonularGroup = query(collectionGroup(db, "sorular"));
        const sorularUnsubscribe = onSnapshot(altKonularGroup, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const changeKonuId = change.doc.ref.parent.parent.parent.parent.id;
                if (changeKonuId === konuId) {
                    console.log(`Soru değişikliği algılandı: ${konuId} - ${change.type}`);
                    this.updateKonuStatsOnSoruChange(konuId);
                }
            });
        });

        // Cleanup fonksiyonunu döndür
        return () => {
            konuUnsubscribe();
            altKonularUnsubscribe();
            sorularUnsubscribe();
            console.log(`Konu ${konuId} için real-time güncellemeler durduruldu.`);
        };
    }
}

export default new KonuStatsService(); 