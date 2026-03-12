class ClientsManager {
    constructor() {
        this.currentTab = 'clients';
        this.init();
    }

    async init() {
        auth.protectPage();
        await this.loadData();
        this.setupEventListeners();
        this.renderModals();
        this.updateUserUI();
    }

    async loadData() {
        try {
            const [clients, suppliers, projects] = await Promise.all([
                sheetsAPI.fetchData('Clients'),
                sheetsAPI.fetchData('Suppliers'),
                sheetsAPI.fetchData('Projects')
            ]);

            this.clients = clients;
            this.suppliers = suppliers;
            this.projects = projects;

            this.renderClientsTable();
            this.renderSuppliersTable();
            this.updateStats();
        } catch (error) {
            console.error('Erreur chargement données:', error);
            Utils.showToast('Erreur lors du chargement des données', 'error');
        }
    }

    renderClientsTable() {
        const tbody = document.querySelector('#clients-table tbody');
        if (!tbody) return;

        if (this.clients.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>Aucun client trouvé</h3>
                        <p>Commencez par ajouter votre premier client</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.clients.map(client => {
            const clientProjects = this.projects.filter(p => p.client_id === client.id);
            const projectCount = clientProjects.length;

            return `
                <tr class="client-row" data-id="${client.id}">
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="avatar-small" style="background-color: ${this.getColorFromString(client.company_name)}">
                                ${client.company_name?.charAt(0) || 'C'}
                            </div>
                            <div>
                                <div class="font-weight-600">${client.company_name || 'N/A'}</div>
                                <small class="text-muted">${client.tax_id || 'N/A'}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div>${client.contact_person || 'N/A'}</div>
                        <small class="text-muted">${client.phone || 'N/A'}</small>
                    </td>
                    <td>
                        <a href="mailto:${client.email}" class="text-primary">
                            ${client.email || 'N/A'}
                        </a>
                    </td>
                    <td>${client.phone || 'N/A'}</td>
                    <td>
                        <span class="badge badge-primary">${projectCount} projet${projectCount !== 1 ? 's' : ''}</span>
                    </td>
                    <td>
                        <span class="status-badge ${client.status === 'active' ? 'status-completed' : 'status-pending'}">
                            ${client.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                    </td>
                    <td>
                        <div class="actions">
                            ${auth.canEdit() ? `
                                <button class="btn-icon" onclick="clients.editClient('${client.id}')" title="Modifier">
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : ''}
                            <button class="btn-icon" onclick="clients.viewClient('${client.id}')" title="Voir">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${auth.canDelete() ? `
                                <button class="btn-icon btn-danger" onclick="clients.deleteClient('${client.id}')" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderSuppliersTable() {
        const tbody = document.querySelector('#suppliers-table tbody');
        if (!tbody) return;

        if (this.suppliers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-truck"></i>
                        <h3>Aucun fournisseur trouvé</h3>
                        <p>Commencez par ajouter votre premier fournisseur</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.suppliers.map(supplier => `
            <tr class="supplier-row" data-id="${supplier.id}">
                <td>
                    <div class="font-weight-600">${supplier.company_name || 'N/A'}</div>
                    <small class="text-muted">${supplier.services || 'N/A'}</small>
                </td>
                <td>
                    <div>${supplier.contact_person || 'N/A'}</div>
                    <small class="text-muted">${supplier.phone || 'N/A'}</small>
                </td>
                <td>
                    <div class="tags">
                        ${supplier.services ? supplier.services.split(',').slice(0, 3).map(service =>
            `<span class="tag">${service.trim()}</span>`
        ).join('') : 'N/A'}
                        ${supplier.services && supplier.services.split(',').length > 3 ?
                `<span class="tag">+${supplier.services.split(',').length - 3}</span>` : ''}
                    </div>
                </td>
                <td>
                    ${this.renderRating(supplier.rating)}
                </td>
                <td>
                    <div class="actions">
                        ${auth.canEdit() ? `
                            <button class="btn-icon" onclick="clients.editSupplier('${supplier.id}')" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        ${auth.canDelete() ? `
                            <button class="btn-icon btn-danger" onclick="clients.deleteSupplier('${supplier.id}')" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderRating(rating) {
        const numRating = parseFloat(rating) || 0;
        const fullStars = Math.floor(numRating);
        const halfStar = numRating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star text-warning"></i>';
        }

        if (halfStar) {
            stars += '<i class="fas fa-star-half-alt text-warning"></i>';
        }

        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star text-warning"></i>';
        }

        return `<div class="rating">${stars} <small class="text-muted">(${numRating.toFixed(1)})</small></div>`;
    }

    getColorFromString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        const colors = [
            '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
            '#10b981', '#06b6d4', '#3b82f6', '#f59e0b'
        ];

        return colors[Math.abs(hash) % colors.length];
    }

    renderModals() {
        // Modal Client
        const clientModal = document.createElement('div');
        clientModal.className = 'modal';
        clientModal.id = 'clientModal';
        clientModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="clientModalTitle">Nouveau Client</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="clientForm">
                        <input type="hidden" id="clientId">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="companyName">Entreprise *</label>
                                <input type="text" id="companyName" required>
                            </div>
                            <div class="form-group">
                                <label for="contactPerson">Personne de contact *</label>
                                <input type="text" id="contactPerson" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="clientEmail">Email *</label>
                                <input type="email" id="clientEmail" required>
                            </div>
                            <div class="form-group">
                                <label for="clientPhone">Téléphone</label>
                                <input type="tel" id="clientPhone">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="clientAddress">Adresse</label>
                            <textarea id="clientAddress" rows="2"></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="taxId">N° SIRET/TVA</label>
                                <input type="text" id="taxId">
                            </div>
                            <div class="form-group">
                                <label for="clientStatus">Statut</label>
                                <select id="clientStatus">
                                    <option value="active">Actif</option>
                                    <option value="inactive">Inactif</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="clientNotes">Notes</label>
                            <textarea id="clientNotes" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="clients.closeModal()">Annuler</button>
                    <button type="button" class="btn btn-primary" onclick="clients.saveClient()">Enregistrer</button>
                </div>
            </div>
        `;
        document.body.appendChild(clientModal);

        // Modal Fournisseur
        const supplierModal = document.createElement('div');
        supplierModal.className = 'modal';
        supplierModal.id = 'supplierModal';
        supplierModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="supplierModalTitle">Nouveau Fournisseur</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="supplierForm">
                        <input type="hidden" id="supplierId">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="supplierCompany">Entreprise *</label>
                                <input type="text" id="supplierCompany" required>
                            </div>
                            <div class="form-group">
                                <label for="supplierContact">Personne de contact</label>
                                <input type="text" id="supplierContact">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="supplierEmail">Email</label>
                                <input type="email" id="supplierEmail">
                            </div>
                            <div class="form-group">
                                <label for="supplierPhone">Téléphone</label>
                                <input type="tel" id="supplierPhone">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="supplierServices">Services (séparés par des virgules)</label>
                            <textarea id="supplierServices" rows="2" placeholder="Développement web, Design, Hébergement..."></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="supplierRating">Évaluation (0-5)</label>
                                <input type="number" id="supplierRating" min="0" max="5" step="0.5" value="0">
                            </div>
                            <div class="form-group">
                                <label for="supplierStatus">Statut</label>
                                <select id="supplierStatus">
                                    <option value="active">Actif</option>
                                    <option value="inactive">Inactif</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="supplierNotes">Notes</label>
                            <textarea id="supplierNotes" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="clients.closeModal()">Annuler</button>
                    <button type="button" class="btn btn-primary" onclick="clients.saveSupplier()">Enregistrer</button>
                </div>
            </div>
        `;
        document.body.appendChild(supplierModal);
    }

    openClientModal(clientId = null) {
        const modal = document.getElementById('clientModal');
        const title = document.getElementById('clientModalTitle');
        const form = document.getElementById('clientForm');

        if (clientId) {
            // Mode édition
            const client = this.clients.find(c => c.id === clientId);
            if (client) {
                title.textContent = 'Modifier Client';
                document.getElementById('clientId').value = client.id;
                document.getElementById('companyName').value = client.company_name || '';
                document.getElementById('contactPerson').value = client.contact_person || '';
                document.getElementById('clientEmail').value = client.email || '';
                document.getElementById('clientPhone').value = client.phone || '';
                document.getElementById('clientAddress').value = client.address || '';
                document.getElementById('taxId').value = client.tax_id || '';
                document.getElementById('clientStatus').value = client.status || 'active';
                document.getElementById('clientNotes').value = client.notes || '';
            }
        } else {
            // Mode création
            title.textContent = 'Nouveau Client';
            form.reset();
            document.getElementById('clientId').value = '';
            document.getElementById('clientStatus').value = 'active';
        }

        modal.classList.add('active');
    }

    openSupplierModal(supplierId = null) {
        const modal = document.getElementById('supplierModal');
        const title = document.getElementById('supplierModalTitle');
        const form = document.getElementById('supplierForm');

        if (supplierId) {
            // Mode édition
            const supplier = this.suppliers.find(s => s.id === supplierId);
            if (supplier) {
                title.textContent = 'Modifier Fournisseur';
                document.getElementById('supplierId').value = supplier.id;
                document.getElementById('supplierCompany').value = supplier.company_name || '';
                document.getElementById('supplierContact').value = supplier.contact_person || '';
                document.getElementById('supplierEmail').value = supplier.email || '';
                document.getElementById('supplierPhone').value = supplier.phone || '';
                document.getElementById('supplierServices').value = supplier.services || '';
                document.getElementById('supplierRating').value = supplier.rating || 0;
                document.getElementById('supplierStatus').value = supplier.status || 'active';
                document.getElementById('supplierNotes').value = supplier.notes || '';
            }
        } else {
            // Mode création
            title.textContent = 'Nouveau Fournisseur';
            form.reset();
            document.getElementById('supplierId').value = '';
            document.getElementById('supplierStatus').value = 'active';
            document.getElementById('supplierRating').value = 0;
        }

        modal.classList.add('active');
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    async saveClient() {
        const form = document.getElementById('clientForm');
        if (!form.checkValidity()) {
            Utils.showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        const email = document.getElementById('clientEmail').value;
        if (!Utils.validateEmail(email)) {
            Utils.showToast('Veuillez saisir un email valide', 'warning');
            return;
        }

        const clientData = {
            id: document.getElementById('clientId').value || Utils.generateId(),
            company_name: document.getElementById('companyName').value,
            contact_person: document.getElementById('contactPerson').value,
            email: email,
            phone: document.getElementById('clientPhone').value,
            address: document.getElementById('clientAddress').value,
            tax_id: document.getElementById('taxId').value,
            status: document.getElementById('clientStatus').value,
            notes: document.getElementById('clientNotes').value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            const isEdit = !!document.getElementById('clientId').value;
            await sheetsAPI.saveData('Clients', clientData, isEdit);

            Utils.showToast(isEdit ? 'Client modifié avec succès' : 'Client créé avec succès', 'success');

            this.closeModal();
            await this.loadData();
        } catch (error) {
            console.error('Erreur sauvegarde client:', error);
            Utils.showToast('Erreur lors de la sauvegarde', 'error');
        }
    }

    async saveSupplier() {
        const form = document.getElementById('supplierForm');
        if (!form.checkValidity()) {
            Utils.showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        const email = document.getElementById('supplierEmail').value;
        if (email && !Utils.validateEmail(email)) {
            Utils.showToast('Veuillez saisir un email valide', 'warning');
            return;
        }

        const supplierData = {
            id: document.getElementById('supplierId').value || Utils.generateId(),
            company_name: document.getElementById('supplierCompany').value,
            contact_person: document.getElementById('supplierContact').value,
            email: email || '',
            phone: document.getElementById('supplierPhone').value || '',
            services: document.getElementById('supplierServices').value,
            rating: document.getElementById('supplierRating').value || 0,
            status: document.getElementById('supplierStatus').value || 'active',
            notes: document.getElementById('supplierNotes').value || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            const isEdit = !!document.getElementById('supplierId').value;
            await sheetsAPI.saveData('Suppliers', supplierData, isEdit);

            Utils.showToast(isEdit ? 'Fournisseur modifié avec succès' : 'Fournisseur créé avec succès', 'success');

            this.closeModal();
            await this.loadData();
        } catch (error) {
            console.error('Erreur sauvegarde fournisseur:', error);
            Utils.showToast('Erreur lors de la sauvegarde', 'error');
        }
    }

    async deleteClient(clientId) {
        const confirm = await Utils.confirm('Êtes-vous sûr de vouloir supprimer ce client ?');
        if (!confirm) return;

        try {
            // Vérifier si le client a des projets associés
            const clientProjects = this.projects.filter(p => p.client_id === clientId);
            if (clientProjects.length > 0) {
                Utils.showToast('Impossible de supprimer ce client car il a des projets associés', 'error');
                return;
            }

            await sheetsAPI.deleteData('Clients', clientId);
            Utils.showToast('Client supprimé avec succès', 'success');
            await this.loadData();
        } catch (error) {
            console.error('Erreur suppression client:', error);
            Utils.showToast('Erreur lors de la suppression', 'error');
        }
    }

    async deleteSupplier(supplierId) {
        const confirm = await Utils.confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?');
        if (!confirm) return;

        try {
            await sheetsAPI.deleteData('Suppliers', supplierId);
            Utils.showToast('Fournisseur supprimé avec succès', 'success');
            await this.loadData();
        } catch (error) {
            console.error('Erreur suppression fournisseur:', error);
            Utils.showToast('Erreur lors de la suppression', 'error');
        }
    }

    viewClient(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;

        const clientProjects = this.projects.filter(p => p.client_id === clientId);

        const viewModal = document.createElement('div');
        viewModal.className = 'modal modal-lg';
        viewModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${client.company_name}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="client-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Personne de contact:</span>
                                <span class="detail-value">${client.contact_person || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Email:</span>
                                <span class="detail-value">${client.email || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Téléphone:</span>
                                <span class="detail-value">${client.phone || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Adresse:</span>
                                <span class="detail-value">${client.address || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">SIRET/TVA:</span>
                                <span class="detail-value">${client.tax_id || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Statut:</span>
                                <span class="detail-value">
                                    <span class="status-badge ${client.status === 'active' ? 'status-completed' : 'status-pending'}">
                                        ${client.status === 'active' ? 'Actif' : 'Inactif'}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Projets:</span>
                                <span class="detail-value">
                                    <span class="badge badge-primary">${clientProjects.length}</span>
                                </span>
                            </div>
                        </div>
                        
                        ${client.notes ? `
                            <div class="detail-section">
                                <h4>Notes</h4>
                                <div class="notes-content">${client.notes}</div>
                            </div>
                        ` : ''}
                        
                        ${clientProjects.length > 0 ? `
                            <div class="detail-section">
                                <h4>Projets associés</h4>
                                <div class="projects-list">
                                    ${clientProjects.slice(0, 5).map(project => `
                                        <div class="project-item">
                                            <i class="fas fa-project-diagram"></i>
                                            <span>${project.name}</span>
                                            <span class="status-badge status-${project.status?.toLowerCase() || 'pending'}">
                                                ${this.getProjectStatusLabel(project.status)}
                                            </span>
                                        </div>
                                    `).join('')}
                                    ${clientProjects.length > 5 ? `
                                        <div class="text-muted">+ ${clientProjects.length - 5} autres projets</div>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                    <button type="button" class="btn btn-primary" onclick="clients.editClient('${client.id}'); this.closest('.modal').remove()">
                        Modifier
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(viewModal);
        viewModal.classList.add('active');
    }

    getProjectStatusLabel(status) {
        const statusMap = {
            'pending': 'En attente',
            'in_progress': 'En cours',
            'completed': 'Terminé',
            'cancelled': 'Annulé'
        };
        return statusMap[status] || status || 'En attente';
    }

    async searchClients(query) {
        if (!query) {
            this.renderClientsTable();
            return;
        }

        const filtered = this.clients.filter(client =>
            client.company_name?.toLowerCase().includes(query.toLowerCase()) ||
            client.contact_person?.toLowerCase().includes(query.toLowerCase()) ||
            client.email?.toLowerCase().includes(query.toLowerCase()) ||
            client.phone?.toLowerCase().includes(query.toLowerCase())
        );

        this.renderFilteredClients(filtered);
    }

    renderFilteredClients(filtered) {
        const tbody = document.querySelector('#clients-table tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Aucun résultat trouvé</h3>
                        <p>Aucun client ne correspond à votre recherche</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(client => {
            const clientProjects = this.projects.filter(p => p.client_id === client.id);
            const projectCount = clientProjects.length;

            return `
                <tr>
                    <td>${client.company_name || 'N/A'}</td>
                    <td>${client.contact_person || 'N/A'}</td>
                    <td>${client.email || 'N/A'}</td>
                    <td>${client.phone || 'N/A'}</td>
                    <td>
                        <span class="badge badge-primary">${projectCount} projet${projectCount !== 1 ? 's' : ''}</span>
                    </td>
                    <td>
                        <span class="status-badge ${client.status === 'active' ? 'status-completed' : 'status-pending'}">
                            ${client.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="clients.editClient('${client.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="clients.deleteClient('${client.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async searchSuppliers(query) {
        if (!query) {
            this.renderSuppliersTable();
            return;
        }

        const filtered = this.suppliers.filter(supplier =>
            supplier.company_name?.toLowerCase().includes(query.toLowerCase()) ||
            supplier.contact_person?.toLowerCase().includes(query.toLowerCase()) ||
            supplier.services?.toLowerCase().includes(query.toLowerCase())
        );

        this.renderFilteredSuppliers(filtered);
    }

    renderFilteredSuppliers(filtered) {
        const tbody = document.querySelector('#suppliers-table tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Aucun résultat trouvé</h3>
                        <p>Aucun fournisseur ne correspond à votre recherche</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(supplier => `
            <tr>
                <td>${supplier.company_name || 'N/A'}</td>
                <td>${supplier.contact_person || 'N/A'}</td>
                <td>
                    <div class="tags">
                        ${supplier.services ? supplier.services.split(',').slice(0, 2).map(service =>
            `<span class="tag">${service.trim()}</span>`
        ).join('') : 'N/A'}
                    </div>
                </td>
                <td>${this.renderRating(supplier.rating)}</td>
                <td>
                    <button class="btn-icon" onclick="clients.editSupplier('${supplier.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="clients.deleteSupplier('${supplier.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateStats() {
        const stats = {
            totalClients: this.clients.length,
            activeClients: this.clients.filter(c => c.status === 'active').length,
            totalSuppliers: this.suppliers.length,
            activeSuppliers: this.suppliers.filter(s => s.status === 'active').length
        };

        const statsElement = document.getElementById('clients-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stat-card fade-in">
                    <div class="stat-icon" style="background-color: rgba(99, 102, 241, 0.1); color: var(--primary-color);">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-value">${stats.totalClients}</div>
                    <div class="stat-label">Clients Totaux</div>
                </div>
                <div class="stat-card fade-in">
                    <div class="stat-icon" style="background-color: rgba(16, 185, 129, 0.1); color: var(--secondary-color);">
                        <i class="fas fa-user-check"></i>
                    </div>
                    <div class="stat-value">${stats.activeClients}</div>
                    <div class="stat-label">Clients Actifs</div>
                </div>
                <div class="stat-card fade-in">
                    <div class="stat-icon" style="background-color: rgba(245, 158, 11, 0.1); color: var(--warning-color);">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="stat-value">${stats.totalSuppliers}</div>
                    <div class="stat-label">Fournisseurs</div>
                </div>
                <div class="stat-card fade-in">
                    <div class="stat-icon" style="background-color: rgba(59, 130, 246, 0.1); color: var(--info-color);">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="stat-value">${stats.activeSuppliers}</div>
                    <div class="stat-label">Fournisseurs Actifs</div>
                </div>
            `;
        }
    }

    updateUserUI() {
        // Mettre à jour le nom et l'avatar dans le header
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');

        if (auth.currentUser) {
            userName.textContent = auth.currentUser.full_name;
            const initials = auth.currentUser.full_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase();
            userAvatar.textContent = initials || 'U';
            userAvatar.style.backgroundColor = this.getColorFromString(auth.currentUser.full_name);
        }
    }

    setupEventListeners() {
        // Recherche clients
        const clientSearch = document.getElementById('clientSearch');
        if (clientSearch) {
            clientSearch.addEventListener('input', Utils.debounce((e) => {
                this.searchClients(e.target.value);
            }, 300));
        }

        // Recherche fournisseurs
        const supplierSearch = document.getElementById('supplierSearch');
        if (supplierSearch) {
            supplierSearch.addEventListener('input', Utils.debounce((e) => {
                this.searchSuppliers(e.target.value);
            }, 300));
        }

        // Filtres clients
        const clientFilter = document.getElementById('clientFilter');
        if (clientFilter) {
            clientFilter.addEventListener('change', (e) => {
                this.filterClients(e.target.value);
            });
        }

        // Gestion des tabs
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab')) {
                const tabId = e.target.dataset.tab;
                this.switchTab(tabId);
            }
        });

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                auth.logout();
            });
        }

        // Menu toggle
        const menuToggle = document.getElementById('menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('active');
            });
        }
    }

    filterClients(filter) {
        if (!filter || filter === 'all') {
            this.renderClientsTable();
            return;
        }

        const filtered = this.clients.filter(client => client.status === filter);
        this.renderFilteredClients(filtered);
    }

    switchTab(tabId) {
        // Mettre à jour l'onglet actif
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabId) {
                tab.classList.add('active');
            }
        });

        // Afficher le contenu correspondant
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tabId}-tab`) {
                content.classList.add('active');
            }
        });

        this.currentTab = tabId;
    }

    editClient(clientId) {
        this.openClientModal(clientId);
    }

    editSupplier(supplierId) {
        this.openSupplierModal(supplierId);
    }
}

// Initialiser le gestionnaire de clients
const clients = new ClientsManager();