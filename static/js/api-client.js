// PostgreSQL API client for calendar application
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
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
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

    async getAvailableYears() {
        return this.request(`${this.baseURL}/api/years`);
    }
}

// Global API instance
window.calendarAPI = new CalendarAPI();