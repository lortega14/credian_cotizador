const API_URL = '/api';

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
    async createCompanyUser(email, companyName, fixedCondition = 'Libre') {
        return this.request('/admin/users', {
            method: 'POST',
            body: { email, companyName, fixedCondition }
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

// Global Toast Notification Helper
window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    if (type === 'error') {
        svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else if (type === 'info') {
        svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `<span style="display:inline-flex; align-items:center; flex-shrink:0;">${svgIcon}</span><span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
};
