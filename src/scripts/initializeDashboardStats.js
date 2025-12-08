/**
 * Dashboard Stats Initialization Script
 * 
 * Bu script tek seferlik çalıştırılır ve tüm dashboard istatistiklerini hesaplayıp
 * Firestore'daki 'dashboard-stats/overview' dokümanına yazar.
 * 
 * Kullanım:
 * 1. Browser console'da: 
 *    import statsService from './services/statsService';
 *    statsService.recalculateAllStats().then(() => console.log('Tamamlandı!'));
 * 
 * 2. Veya bir sayfaya buton ekleyip çağırabilirsin
 */

import statsService from '../services/statsService';

/**
 * Dashboard istatistiklerini başlat (tek seferlik)
 */
export const initializeDashboardStats = async () => {
    try {
        console.log('🚀 Dashboard istatistikleri başlatılıyor...');
        const stats = await statsService.recalculateAllStats();
        console.log('✅ Dashboard istatistikleri başarıyla hesaplandı:', stats);
        return stats;
    } catch (error) {
        console.error('❌ Dashboard istatistikleri hesaplanırken hata:', error);
        throw error;
    }
};

export default initializeDashboardStats;

