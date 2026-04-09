const API_URL = 'http://localhost:3000/api';

const api = {
    async request(endpoint, options = {}) {
        const url = `${API_URL}${endpoint}`;
        
        // Defaults
        const config = {
            ...options,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // If body is an object, stringify
        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Ocurrió un error en el servidor');
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    },

    // Auth
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
    },

    async logout() {
        return this.request('/auth/logout', { method: 'POST' });
    },

    async getMe() {
        try {
            return await this.request('/auth/me');
        } catch (err) {
            return null; // Not logged in
        }
    },

    // Admin
    async createCompanyUser(email, companyName) {
        return this.request('/admin/users', {
            method: 'POST',
            body: { email, companyName }
        });
    },

    async getCompanyUsers() {
        return this.request('/admin/users');
    },

    async updateCompanyUser(id, data) {
        return this.request(`/admin/users/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    async deleteCompanyUser(id) {
        return this.request(`/admin/users/${id}`, {
            method: 'DELETE'
        });
    },

    // Quotes
    async createQuote(quoteData) {
        return this.request('/quotes', {
            method: 'POST',
            body: quoteData
        });
    },

    async getQuotes() {
        return this.request('/quotes');
    },

    // Admin
    async getStats() {
        return this.request('/admin/stats');
    },

    async sendCredentials(email, companyName, password) {
        return this.request('/admin/send-credentials', {
            method: 'POST',
            body: { email, companyName, password }
        });
    }
};

// Expose to window
window.api = api;
