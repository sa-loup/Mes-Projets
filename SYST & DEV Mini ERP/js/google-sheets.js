// Configuration Google Sheets
class GoogleSheetsConfig {
    static SHEET_ID = '1tp8KrvtuKstBj4JS0lNWLLMEpaSx8C4aofAKLAJpeJo';
    static API_KEY = 'AIzaSyCzzb19IRf2WJpQ92THgSs20N5EBYPE1vI';
    static BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/`;
    // URL de déploiement Web App (à remplir après le déploiement du script)
    static SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypr0FRf1Ta6mZzMR9Y_tPUxxj0QzjdgUUHcd8VGFG1qgc6Ih6hHa2y7NVddwIKR3E5/exec';
    static HEADERS = {
        'Users': ['id', 'email', 'password_hash', 'role', 'full_name', 'created_at', 'last_login'],
        'Clients': ['id', 'company_name', 'contact_person', 'email', 'phone', 'address', 'tax_id', 'category', 'status', 'created_at', 'notes'],
        'Suppliers': ['id', 'company_name', 'contact_person', 'email', 'phone', 'address', 'services', 'rating', 'status', 'created_at', 'notes'],
        'Services': ['id', 'name', 'category', 'description', 'price', 'duration', 'is_active', 'created_at'],
        'Projects': ['id', 'name', 'client_id', 'service_id', 'category', 'description', 'status', 'priority', 'start_date', 'deadline', 'end_date', 'budget', 'progress', 'team_members', 'created_at', 'updated_at'],
        'Tickets': ['id', 'title', 'project_id', 'client_id', 'category', 'priority', 'status', 'assigned_to', 'description', 'created_at', 'resolved_at', 'comments_count'],
        'Tasks': ['id', 'title', 'project_id', 'assigned_to', 'priority', 'status', 'deadline', 'estimated_hours', 'actual_hours', 'checklist', 'created_at', 'completed_at'],
        'Invoices': ['id', 'invoice_number', 'client_id', 'project_id', 'issue_date', 'due_date', 'status', 'subtotal', 'tax_rate', 'tax_amount', 'total', 'items', 'notes', 'paid_at', 'created_at'],
        'Payments': ['id', 'invoice_id', 'amount', 'payment_method', 'transaction_id', 'status', 'processed_at', 'created_at'],
        'Purchases': ['id', 'supplier_id', 'item_name', 'quantity', 'unit_price', 'total', 'category', 'purchase_date', 'status', 'notes'],
        'Sales': ['id', 'client_id', 'service_id', 'quantity', 'unit_price', 'total', 'sale_date', 'status', 'invoice_id', 'notes']
    };
}

class GoogleSheetsAPI {
    constructor() {
        this.cache = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    async fetchData(sheetName, range = 'A:Z') {
        const cacheKey = `${sheetName}_${range}`;
        const now = Date.now();

        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (now - cached.timestamp < this.cacheDuration) {
                return cached.data;
            }
        }

        try {
            const response = await fetch(
                `${GoogleSheetsConfig.BASE_URL}${sheetName}!${range}?key=${GoogleSheetsConfig.API_KEY}`
            );

            if (!response.ok) {
                throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const rows = data.values || [];

            // Convertir en objets
            let result = [];
            if (rows.length > 0) {
                const headers = GoogleSheetsConfig.HEADERS[sheetName] || rows[0];
                result = rows.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index] || '';
                    });
                    return obj;
                });
            }

            // Mettre en cache
            this.cache.set(cacheKey, {
                data: result,
                timestamp: now
            });

            return result;
        } catch (error) {
            console.error(`Erreur Google Sheets [${sheetName}]:`, error);

            // Retourner les données du cache même si expirées en cas d'erreur
            if (this.cache.has(cacheKey)) {
                console.warn('Utilisation des données en cache (API hors ligne)');
                return this.cache.get(cacheKey).data;
            }

            throw error;
        }
    }

    async appendData(sheetName, data) {
        // Essayer d'utiliser le script si configuré, sinon fallback sur l'API classique (qui échouera en 401)
        if (GoogleSheetsConfig.SCRIPT_URL) {
            return this.proxyRequest('append', sheetName, null, data);
        }

        try {
            const headers = GoogleSheetsConfig.HEADERS[sheetName];
            if (!headers) {
                throw new Error(`Headers non définis pour ${sheetName}`);
            }

            // Préparer les données dans l'ordre des colonnes
            const rowData = headers.map(header => data[header] || '');

            const response = await fetch(
                `${GoogleSheetsConfig.BASE_URL}${sheetName}:append?valueInputOption=USER_ENTERED&key=${GoogleSheetsConfig.API_KEY}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        values: [rowData]
                    })
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Erreur 401 : L'écriture directe nécessite OAuth2. Veuillez configurer SCRIPT_URL.");
                }
                throw new Error(`Erreur append: ${response.status}`);
            }

            // Invalider le cache
            this.cache.delete(`${sheetName}_A:Z`);

            return await response.json();
        } catch (error) {
            console.error('Erreur ajout données:', error);
            throw error;
        }
    }

    async updateData(sheetName, rowId, data) {
        if (GoogleSheetsConfig.SCRIPT_URL) {
            return this.proxyRequest('update', sheetName, rowId, data);
        }

        try {
            // Trouver la ligne par ID
            const allData = await this.fetchData(sheetName);
            const rowIndex = allData.findIndex(item => item.id === rowId);

            if (rowIndex === -1) {
                throw new Error('Ligne non trouvée');
            }

            // Google Sheets commence à 1 et +1 pour l'en-tête
            const sheetRowIndex = rowIndex + 2;

            const headers = GoogleSheetsConfig.HEADERS[sheetName];
            const rowData = headers.map(header => data[header] || '');

            const response = await fetch(
                `${GoogleSheetsConfig.BASE_URL}${sheetName}!A${sheetRowIndex}:Z${sheetRowIndex}?valueInputOption=USER_ENTERED&key=${GoogleSheetsConfig.API_KEY}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        values: [rowData]
                    })
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Erreur 401 : La mise à jour directe nécessite OAuth2. Veuillez configurer SCRIPT_URL.");
                }
                throw new Error(`Erreur update: ${response.status}`);
            }

            // Invalider le cache
            this.cache.delete(`${sheetName}_A:Z`);

            return await response.json();
        } catch (error) {
            console.error('Erreur mise à jour:', error);
            throw error;
        }
    }

    async deleteData(sheetName, rowId) {
        if (GoogleSheetsConfig.SCRIPT_URL) {
            return this.proxyRequest('delete', sheetName, rowId);
        }

        try {
            // Dans Google Sheets API, on ne peut pas supprimer une ligne directement
            // On la vide à la place
            const allData = await this.fetchData(sheetName);
            const rowIndex = allData.findIndex(item => item.id === rowId);

            if (rowIndex === -1) {
                throw new Error('Ligne non trouvée');
            }

            const sheetRowIndex = rowIndex + 2;
            const headers = GoogleSheetsConfig.HEADERS[sheetName];
            const emptyRow = headers.map(() => '');

            const response = await fetch(
                `${GoogleSheetsConfig.BASE_URL}${sheetName}!A${sheetRowIndex}:Z${sheetRowIndex}?valueInputOption=USER_ENTERED&key=${GoogleSheetsConfig.API_KEY}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        values: [emptyRow]
                    })
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Erreur 401 : La suppression directe nécessite OAuth2. Veuillez configurer SCRIPT_URL.");
                }
                throw new Error(`Erreur delete: ${response.status}`);
            }

            // Invalider le cache
            this.cache.delete(`${sheetName}_A:Z`);

            return await response.json();
        } catch (error) {
            console.error('Erreur suppression:', error);
            throw error;
        }
    }

    async saveData(sheetName, data, isUpdate = null) {
        try {
            // Si isUpdate n'est pas fourni, on essaie de le déduire
            const finalIsUpdate = isUpdate !== null ? isUpdate : !!data.id;

            console.log(`[sheetsAPI] saveData ${sheetName}:`, { isUpdate: finalIsUpdate, data });

            if (finalIsUpdate) {
                return await this.updateData(sheetName, data.id, data);
            } else {
                // S'assurer qu'un ID est généré pour les nouveaux
                if (!data.id) {
                    data.id = typeof Utils !== 'undefined' ? Utils.generateId() : Date.now().toString(36);
                }
                return await this.appendData(sheetName, data);
            }
        } catch (error) {
            console.error(`Erreur saveData [${sheetName}]:`, error);
            throw error;
        }
    }

    // Nouvelle méthode pour gérer les requêtes via le proxy Apps Script
    async proxyRequest(action, sheetName, rowId = null, data = null) {
        console.log(`[sheetsAPI] ProxyRequest:`, { action, sheetName, rowId, data });
        try {
            const headers = GoogleSheetsConfig.HEADERS[sheetName];
            let values = [];
            if (data) {
                values = [headers.map(header => (data[header] !== undefined && data[header] !== null) ? data[header] : '')];
            }

            const payload = {
                action: action,
                sheetId: GoogleSheetsConfig.SHEET_ID,
                sheetName: sheetName,
                rowId: rowId,
                values: values
            };

            const response = await fetch(GoogleSheetsConfig.SCRIPT_URL, {
                method: 'POST',
                // mode: 'no-cors', // Retiré pour essayer de voir les erreurs, mais attention aux redirections
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // Apps Script préfère souvent text/plain pour éviter OPTIONS
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok && response.type !== 'opaque') {
                throw new Error(`Erreur proxy: ${response.status} ${response.statusText}`);
            }

            // Invalider le cache local
            this.cache.delete(`${sheetName}_A:Z`);

            return { result: 'success', message: 'Request sent to proxy' };
        } catch (error) {
            console.error(`Erreur proxy [${action}]:`, error);
            throw error;
        }
    }

    async bulkUpdate(sheetName, dataArray) {
        try {
            const headers = GoogleSheetsConfig.HEADERS[sheetName];
            const values = dataArray.map(data =>
                headers.map(header => data[header] || '')
            );

            // Ajouter les en-têtes
            values.unshift(headers);

            const response = await fetch(
                `${GoogleSheetsConfig.BASE_URL}${sheetName}!A1:Z?valueInputOption=USER_ENTERED&key=${GoogleSheetsConfig.API_KEY}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        values: values
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Erreur bulk update: ${response.status}`);
            }

            // Invalider le cache
            this.cache.delete(`${sheetName}_A:Z`);

            return await response.json();
        } catch (error) {
            console.error('Erreur bulk update:', error);
            throw error;
        }
    }

    // Méthodes utilitaires
    clearCache() {
        this.cache.clear();
    }

    async getStats() {
        try {
            const [clients, projects, invoices] = await Promise.all([
                this.fetchData('Clients'),
                this.fetchData('Projects'),
                this.fetchData('Invoices')
            ]);

            return {
                totalClients: clients.length,
                activeClients: clients.filter(c => c.status === 'active').length,
                totalProjects: projects.length,
                activeProjects: projects.filter(p => p.status === 'in_progress').length,
                totalRevenue: invoices
                    .filter(i => i.status === 'paid')
                    .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0)
            };
        } catch (error) {
            console.error('Erreur stats:', error);
            return null;
        }
    }

    // Recherche avancée
    async search(sheetName, query, fields = []) {
        const data = await this.fetchData(sheetName);

        return data.filter(item => {
            if (fields.length > 0) {
                return fields.some(field =>
                    item[field] &&
                    item[field].toString().toLowerCase().includes(query.toLowerCase())
                );
            }

            // Recherche dans tous les champs
            return Object.values(item).some(value =>
                value && value.toString().toLowerCase().includes(query.toLowerCase())
            );
        });
    }
}

// Singleton instance
const sheetsAPI = new GoogleSheetsAPI();