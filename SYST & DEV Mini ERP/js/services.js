class ServicesManager {
    constructor() {
        this.init();
    }

    async init() {
        auth.protectPage();
        await this.loadServices();
        this.setupEventListeners();
        this.renderModals();
    }

    async loadServices() {
        try {
            this.services = await sheetsAPI.fetchData('Services');
            this.renderServicesTable();
            this.updateStats();
        } catch (error) {
            console.error('Erreur chargement services:', error);
            Utils.showToast('Erreur lors du chargement des services', 'error');
        }
    }

    renderServicesTable() {
        const tbody = document.querySelector('#services-table tbody');
        if (!tbody) return;

        if (this.services.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-cogs"></i>
                        <h3>Aucun service trouvé</h3>
                        <p>Commencez par ajouter votre premier service</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.services.map(service => `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="service-icon ${service.category}">
                            <i class="fas fa-${this.getServiceIcon(service.category)}"></i>
                        </div>
                        <div>
                            <div class="font-weight-600">${service.name}</div>
                            <small class="text-muted">${this.getCategoryLabel(service.category)}</small>
                        </div>
                    </div>
                </td>
                <td>${service.description || 'N/A'}</td>
                <td>${Utils.formatCurrency(service.price)}</td>
                <td>${service.duration || 'N/A'}</td>
                <td>
                    <span class="status-badge ${service.is_active === 'true' ? 'status-completed' : 'status-pending'}">
                        ${service.is_active === 'true' ? 'Actif' : 'Inactif'}
                    </span>
                </td>
                <td>
                    <div class="actions">
                        ${auth.canEdit() ? `
                            <button class="btn-icon" onclick="services.editService('${service.id}')" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        ${auth.canDelete() ? `
                            <button class="btn-icon btn-danger" onclick="services.deleteService('${service.id}')" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getServiceIcon(category) {
        const icons = {
            'web': 'globe',
            'mobile': 'mobile-alt',
            'design': 'palette',
            'hosting': 'server',
            'consulting': 'comments'
        };
        return icons[category] || 'cog';
    }

    getCategoryLabel(category) {
        const labels = {
            'web': 'Développement Web',
            'mobile': 'Développement Mobile',
            'design': 'Design Graphique',
            'hosting': 'Hébergement',
            'consulting': 'Consulting'
        };
        return labels[category] || category || 'Autre';
    }

    renderModals() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'serviceModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="serviceModalTitle">Nouveau Service</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="serviceForm">
                        <input type="hidden" id="serviceId">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="serviceName">Nom du service *</label>
                                <input type="text" id="serviceName" required>
                            </div>
                            <div class="form-group">
                                <label for="serviceCategory">Catégorie *</label>
                                <select id="serviceCategory" required>
                                    <option value="">Sélectionner une catégorie</option>
                                    <option value="web">Développement Web</option>
                                    <option value="mobile">Développement Mobile</option>
                                    <option value="design">Design Graphique</option>
                                    <option value="hosting">Hébergement</option>
                                    <option value="consulting">Consulting</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="serviceDescription">Description</label>
                            <textarea id="serviceDescription" rows="3"></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="servicePrice">Prix (€) *</label>
                                <input type="number" id="servicePrice" min="0" step="0.01" required>
                            </div>
                            <div class="form-group">
                                <label for="serviceDuration">Durée estimée</label>
                                <input type="text" id="serviceDuration" placeholder="ex: 2 semaines, 1 mois">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="serviceActive">Statut</label>
                            <select id="serviceActive">
                                <option value="true">Actif</option>
                                <option value="false">Inactif</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="services.closeModal()">Annuler</button>
                    <button type="button" class="btn btn-primary" onclick="services.saveService()">Enregistrer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    openServiceModal(serviceId = null) {
        const modal = document.getElementById('serviceModal');
        const title = document.getElementById('serviceModalTitle');

        if (serviceId) {
            // Mode édition
            const service = this.services.find(s => s.id === serviceId);
            if (service) {
                title.textContent = 'Modifier Service';
                document.getElementById('serviceId').value = service.id;
                document.getElementById('serviceName').value = service.name || '';
                document.getElementById('serviceCategory').value = service.category || '';
                document.getElementById('serviceDescription').value = service.description || '';
                document.getElementById('servicePrice').value = service.price || '';
                document.getElementById('serviceDuration').value = service.duration || '';
                document.getElementById('serviceActive').value = service.is_active || 'true';
            }
        } else {
            // Mode création
            title.textContent = 'Nouveau Service';
            document.getElementById('serviceForm').reset();
            document.getElementById('serviceId').value = '';
        }

        modal.classList.add('active');
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    async saveService() {
        const form = document.getElementById('serviceForm');
        if (!form.checkValidity()) {
            Utils.showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        const serviceData = {
            id: document.getElementById('serviceId').value || Utils.generateId(),
            name: document.getElementById('serviceName').value,
            category: document.getElementById('serviceCategory').value,
            description: document.getElementById('serviceDescription').value,
            price: document.getElementById('servicePrice').value,
            duration: document.getElementById('serviceDuration').value,
            is_active: document.getElementById('serviceActive').value,
            created_at: new Date().toISOString()
        };

        try {
            const isEdit = !!document.getElementById('serviceId').value;
            await sheetsAPI.saveData('Services', serviceData, isEdit);

            Utils.showToast(isEdit ? 'Service modifié avec succès' : 'Service créé avec succès', 'success');

            this.closeModal();
            await this.loadServices();
        } catch (error) {
            console.error('Erreur sauvegarde service:', error);
            Utils.showToast('Erreur lors de la sauvegarde', 'error');
        }
    }

    async deleteService(serviceId) {
        const confirm = await Utils.confirm('Êtes-vous sûr de vouloir supprimer ce service ?');
        if (!confirm) return;

        try {
            await sheetsAPI.deleteData('Services', serviceId);
            Utils.showToast('Service supprimé avec succès', 'success');
            await this.loadServices();
        } catch (error) {
            console.error('Erreur suppression service:', error);
            Utils.showToast('Erreur lors de la suppression', 'error');
        }
    }

    async searchServices(query) {
        if (!query) {
            this.renderServicesTable();
            return;
        }

        const filtered = this.services.filter(service =>
            service.name?.toLowerCase().includes(query.toLowerCase()) ||
            service.description?.toLowerCase().includes(query.toLowerCase()) ||
            service.category?.toLowerCase().includes(query.toLowerCase())
        );

        const tbody = document.querySelector('#services-table tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Aucun résultat trouvé</h3>
                        <p>Aucun service ne correspond à votre recherche</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(service => `
            <tr>
                <td>${service.name}</td>
                <td>${service.description || 'N/A'}</td>
                <td>${Utils.formatCurrency(service.price)}</td>
                <td>${service.duration || 'N/A'}</td>
                <td>
                    <span class="status-badge ${service.is_active === 'true' ? 'status-completed' : 'status-pending'}">
                        ${service.is_active === 'true' ? 'Actif' : 'Inactif'}
                    </span>
                </td>
                <td>
                    <button class="btn-icon" onclick="services.editService('${service.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateStats() {
        const stats = {
            total: this.services.length,
            active: this.services.filter(s => s.is_active === 'true').length,
            web: this.services.filter(s => s.category === 'web').length,
            mobile: this.services.filter(s => s.category === 'mobile').length,
            design: this.services.filter(s => s.category === 'design').length
        };

        const statsElement = document.getElementById('services-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stats-summary">
                    <div class="stat-item">
                        <span class="stat-number">${stats.total}</span>
                        <span class="stat-label">Total</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.active}</span>
                        <span class="stat-label">Actifs</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.web}</span>
                        <span class="stat-label">Web</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.mobile}</span>
                        <span class="stat-label">Mobile</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.design}</span>
                        <span class="stat-label">Design</span>
                    </div>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Recherche services
        const searchInput = document.getElementById('serviceSearch');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchServices(e.target.value);
            }, 300));
        }
    }

    editService(serviceId) {
        this.openServiceModal(serviceId);
    }
}

// Initialiser le gestionnaire de services
const services = new ServicesManager();