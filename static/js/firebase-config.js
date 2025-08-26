const firebaseConfig = {
  apiKey: "您的实际API密钥",
  authDomain: "您的项目域名",
  databaseURL: "您的数据库URL",
  projectId: "您的项目ID",
  storageBucket: "您的存储桶",
  messagingSenderId: "您的发送者ID",
  appId: "您的应用ID"
};

// 初始化Firebase
firebase.initializeApp(firebaseConfig);

// 获取数据库引用
const database = firebase.database();
const eventsRef = database.ref('events');

// 导出供其他文件使用
window.firebaseDB = {
  database,
  eventsRef
};

// Simple API client for PostgreSQL backend
class CalendarAPI {
    constructor() {
        this.baseURL = window.location.origin;
    }

    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { error: error.message };
        }
    }

    async getEvents() {
        return this.request(`${this.baseURL}/api/events`);
    }

    async createEvent(eventData) {
        return this.request(`${this.baseURL}/api/events`, {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
    }

    async updateEvent(eventId, eventData) {
        return this.request(`${this.baseURL}/api/events/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(eventData)
        });
    }

    async deleteEvent(eventId) {
        return this.request(`${this.baseURL}/api/events/${eventId}`, {
            method: 'DELETE'
        });
    }

    async getCalendarData(year, month) {
        return this.request(`${this.baseURL}/api/calendar/${year}/${month}`);
    }
}

// Global API instance
window.calendarAPI = new CalendarAPI();