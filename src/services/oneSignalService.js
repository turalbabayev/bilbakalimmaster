// OneSignal Service - Vercel API Routes ile
class OneSignalService {
  constructor() {
    // Production'da domain'inizi, development'ta localhost kullanın
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? '' // Vercel'de aynı domain
      : 'http://localhost:3000'; // Development'ta
  }

  async sendNotification(notificationData) {
    try {
      const response = await fetch(`${this.baseURL}/api/onesignal/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Bildirim gönderme hatası:', error);
      throw error;
    }
  }

  async getAppStats() {
    try {
      const response = await fetch(`${this.baseURL}/api/onesignal/app`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('App istatistikleri alma hatası:', error);
      throw error;
    }
  }

  async getSegments() {
    try {
      const response = await fetch(`${this.baseURL}/api/onesignal/segments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Segment alma hatası:', error);
      // Hata durumunda boş array döndür
      return { segments: [] };
    }
  }

  async getSamplePlayerIds() {
    try {
      const response = await fetch(`${this.baseURL}/api/onesignal/players?limit=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.players || [];
    } catch (error) {
      console.error('Player ID alma hatası:', error);
      return [];
    }
  }

  async getNotificationHistory(limit = 50, offset = 0) {
    try {
      const response = await fetch(
        `${this.baseURL}/api/onesignal/notifications?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Bildirim geçmişi alma hatası:', error);
      throw error;
    }
  }

  // Bildirim formatını OneSignal API'sine uygun hale getir
  formatNotificationData(formData) {
    const notification = {
      headings: { en: formData.title },
      contents: { en: formData.message }
    };

    // Hedef kitle
    if (formData.targetAudience === 'all') {
      notification.included_segments = ['All'];
    } else if (formData.targetAudience === 'segments' && formData.segments?.length > 0) {
      notification.included_segments = formData.segments;
    } else if (formData.targetAudience === 'players' && formData.playerIds?.length > 0) {
      notification.include_player_ids = formData.playerIds;
    }

    // Opsiyonel alanlar
    if (formData.imageUrl) {
      notification.big_picture = formData.imageUrl;
      notification.large_icon = formData.imageUrl;
    }

    if (formData.redirectUrl) {
      notification.url = formData.redirectUrl;
    }

    // Zamanlama
    if (formData.scheduleType === 'later' && formData.scheduleTime) {
      notification.send_after = formData.scheduleTime;
    }

    return notification;
  }
}

export default new OneSignalService(); 