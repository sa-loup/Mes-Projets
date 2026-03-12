class PurchasesManager {
    constructor() {
        this.currentTab = 'purchases';
        this.init();
    }

    async init() {
        auth.protectPage();
        await this.loadData();
        this.setupEventListeners();
        this.renderModals();
    }

    async loadData() {
        try {
            const [purchases, suppliers, sales, clients, services] = await Promise.all([
                sheetsAPI.fetchData('Purchases'),
                sheetsAPI.fetchData('Suppliers'),
                sheetsAPI.fetchData('Sales'),
                sheetsAPI.fetchData('Clients'),
                sheetsAPI.fetchData('Services')
            ]);

            this.purchases = purchases;
            this.suppliers = suppliers;
            this.sales = sales;
            this.clients = clients;
            this.services = services;

            this.renderPurchasesTable();
            this.renderSalesTable();
            this.updateStats();
        } catch (error) {
            console.error('Erreur chargement données:', error);
            Utils.showToast('Erreur lors du chargement des données', 'error');
        }
    }

    renderPurchasesTable() {
        const tbody = document.querySelector('#purchases-table tbody');
        if (!tbody) return;

        if (this.purchases.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-shopping-cart"></i>
                        <h3>Aucun achat trouvé</h3>
                        <p>Commencez par enregistrer votre premier achat</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.purchases.map(purchase => {
            const supplier = this.suppliers.find(s => s.id === purchase.supplier_id);

            return `
                <tr>
                    <td>
                        <div class="font-weight-600">${purchase.item_name}</div>
                        <small class="text-muted">${purchase.category || 'N/A'}</small>
                    </td>
                    <td>${supplier?.company_name || 'N/A'}</td>
                    <td>${purchase.quantity || 0}</td>
                    <td>${Utils.formatCurrency(purchase.unit_price || 0)}</td>
                    <td>${Utils.formatCurrency(purchase.total || 0)}</td>
                    <td>${Utils.formatDate(purchase.purchase_date)}</td>
                    <td>
                        <span class="status-badge ${purchase.status === 'paid' ? 'status-completed' : 'status-pending'}">
                            ${this.getPurchaseStatusLabel(purchase.status)}
                        </span>
                    </td>
                    <td>
                        <div class="actions">
                            <button class="btn-icon" onclick="purchases.viewPurchase('${purchase.id}')" title="Voir">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${auth.canDelete() ? `
                                <button class="btn-icon btn-danger" onclick="purchases.deletePurchase('${purchase.id}')" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderSalesTable() {
        const tbody = document.querySelector('#sales-table tbody');
        if (!tbody) return;

        if (this.sales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-chart-line"></i>
                        <h3>Aucune vente trouvée</h3>
                        <p>Commencez par enregistrer votre première vente</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.sales.map(sale => {
            const client = this.clients.find(c => c.id === sale.client_id);
            const service = this.services.find(s => s.id === sale.service_id);

            return `
                <tr>
                    <td>
                        <div class="font-weight-600">${service?.name || 'N/A'}</div>
                        <small class="text-muted">${client?.company_name || 'N/A'}</small>
                    </td>
                    <td>${client?.company_name || 'N/A'}</td>
                    <td>${sale.quantity || 1}</td>
                    <td>${Utils.formatCurrency(sale.unit_price || 0)}</td>
                    <td>${Utils.formatCurrency(sale.total || 0)}</td>
                    <td>${Utils.formatDate(sale.sale_date)}</td>
                    <td>
                        <span class="status-badge ${sale.status === 'completed' ? 'status-completed' : 'status-pending'}">
                            ${this.getSaleStatusLabel(sale.status)}
                        </span>
                    </td>
                    <td>
                        <div class="actions">
                            <button class="btn-icon" onclick="purchases.viewSale('${sale.id}')" title="Voir">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getPurchaseStatusLabel(status) {
        const labels = {
            'pending': 'En attente',
            'paid': 'Payé',
            'cancelled': 'Annulé'
        };
        return labels[status] || status || 'En attente';
    }

    getSaleStatusLabel(status) {
        const labels = {
            'pending': 'En attente',
            'completed': 'Terminée',
            'cancelled': 'Annulée'
        };
        return labels[status] || status || 'En attente';
    }

    renderModals() {
        // Modal Achat
        const purchaseModal = document.createElement('div');
        purchaseModal.className = 'modal';
        purchaseModal.id = 'purchaseModal';
        purchaseModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="purchaseModalTitle">Nouvel Achat</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="purchaseForm">
                        <input type="hidden" id="purchaseId">
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="purchaseItem">Article *</label>
                                <input type="text" id="purchaseItem" required>
                            </div>
                            <div class="form-group">
                                <label for="purchaseSupplier">Fournisseur *</label>
                                <select id="purchaseSupplier" required>
                                    <option value="">Sélectionner un fournisseur</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="purchaseCategory">Catégorie</label>
                                <select id="purchaseCategory">
                                    <option value="software">Logiciel</option>
                                    <option value="hardware">Matériel</option>
                                    <option value="service">Service</option>
                                    <option value="other">Autre</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="purchaseDate">Date d'achat</label>
                                <input type="date" id="purchaseDate">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="purchaseQuantity">Quantité *</label>
                                <input type="number" id="purchaseQuantity" min="1" required>
                            </div>
                            <div class="form-group">
                                <label for="purchaseUnitPrice">Prix unitaire (€) *</label>
                                <input type="number" id="purchaseUnitPrice" min="0" step="0.01" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="purchaseTotal">Total (€)</label>
                            <input type="number" id="purchaseTotal" readonly>
                        </div>
                        
                        <div class="form-group">
                            <label for="purchaseStatus">Statut</label>
                            <select id="purchaseStatus">
                                <option value="pending">En attente</option>
                                <option value="paid">Payé</option>
                                <option value="cancelled">Annulé</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="purchaseNotes">Notes</label>
                            <textarea id="purchaseNotes" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="purchases.closeModal()">Annuler</button>
                    <button type="button" class="btn btn-primary" onclick="purchases.savePurchase()">Enregistrer</button>
                </div>
            </div>
        `;
        document.body.appendChild(purchaseModal);

        // Modal Vente
        const saleModal = document.createElement('div');
        saleModal.className = 'modal';
        saleModal.id = 'saleModal';
        saleModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="saleModalTitle">Nouvelle Vente</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="saleForm">
                        <input type="hidden" id="saleId">
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="saleClient">Client *</label>
                                <select id="saleClient" required>
                                    <option value="">Sélectionner un client</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="saleService">Service *</label>
                                <select id="saleService" required>
                                    <option value="">Sélectionner un service</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="saleQuantity">Quantité</label>
                                <input type="number" id="saleQuantity" min="1" value="1">
                            </div>
                            <div class="form-group">
                                <label for="saleDate">Date de vente</label>
                                <input type="date" id="saleDate">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="saleUnitPrice">Prix unitaire (€)</label>
                            <input type="number" id="saleUnitPrice" min="0" step="0.01">
                        </div>
                        
                        <div class="form-group">
                            <label for="saleTotal">Total (€)</label>
                            <input type="number" id="saleTotal" readonly>
                        </div>
                        
                        <div class="form-group">
                            <label for="saleStatus">Statut</label>
                            <select id="saleStatus">
                                <option value="pending">En attente</option>
                                <option value="completed">Terminée</option>
                                <option value="cancelled">Annulée</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="saleNotes">Notes</label>
                            <textarea id="saleNotes" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="purchases.closeModal()">Annuler</button>
                    <button type="button" class="btn btn-primary" onclick="purchases.saveSale()">Enregistrer</button>
                </div>
            </div>
        `;
        document.body.appendChild(saleModal);
    }

    openPurchaseModal(purchaseId = null) {
        const modal = document.getElementById('purchaseModal');
        const title = document.getElementById('purchaseModalTitle');

        // Remplir le select des fournisseurs
        this.populateSupplierSelect();

        if (purchaseId) {
            // Mode édition
            const purchase = this.purchases.find(p => p.id === purchaseId);
            if (purchase) {
                title.textContent = 'Modifier Achat';
                document.getElementById('purchaseId').value = purchase.id;
                document.getElementById('purchaseItem').value = purchase.item_name || '';
                document.getElementById('purchaseSupplier').value = purchase.supplier_id || '';
                document.getElementById('purchaseCategory').value = purchase.category || 'other';
                document.getElementById('purchaseDate').value = App.formatDateForInput(purchase.purchase_date);
                document.getElementById('purchaseQuantity').value = purchase.quantity || 1;
                document.getElementById('purchaseUnitPrice').value = purchase.unit_price || 0;
                document.getElementById('purchaseTotal').value = purchase.total || 0;
                document.getElementById('purchaseStatus').value = purchase.status || 'pending';
                document.getElementById('purchaseNotes').value = purchase.notes || '';
            }
        } else {
            // Mode création
            title.textContent = 'Nouvel Achat';
            document.getElementById('purchaseForm').reset();
            document.getElementById('purchaseId').value = '';
            document.getElementById('purchaseDate').value = App.formatDateForInput(new Date());
            document.getElementById('purchaseStatus').value = 'pending';
            document.getElementById('purchaseCategory').value = 'other';
            document.getElementById('purchaseQuantity').value = 1;
            document.getElementById('purchaseUnitPrice').value = 0;
            document.getElementById('purchaseTotal').value = 0;
        }

        // Calculer le total automatiquement
        const quantityInput = document.getElementById('purchaseQuantity');
        const unitPriceInput = document.getElementById('purchaseUnitPrice');
        const totalInput = document.getElementById('purchaseTotal');

        const calculateTotal = () => {
            const quantity = parseFloat(quantityInput.value) || 0;
            const unitPrice = parseFloat(unitPriceInput.value) || 0;
            totalInput.value = (quantity * unitPrice).toFixed(2);
        };

        quantityInput.addEventListener('input', calculateTotal);
        unitPriceInput.addEventListener('input', calculateTotal);

        modal.classList.add('active');
    }

    openSaleModal(saleId = null) {
        const modal = document.getElementById('saleModal');
        const title = document.getElementById('saleModalTitle');

        // Remplir les selects
        this.populateClientSelect();
        this.populateServiceSelect();

        if (saleId) {
            // Mode édition
            const sale = this.sales.find(s => s.id === saleId);
            if (sale) {
                title.textContent = 'Modifier Vente';
                document.getElementById('saleId').value = sale.id;
                document.getElementById('saleClient').value = sale.client_id || '';
                document.getElementById('saleService').value = sale.service_id || '';
                document.getElementById('saleQuantity').value = sale.quantity || 1;
                document.getElementById('saleDate').value = App.formatDateForInput(sale.sale_date);
                document.getElementById('saleUnitPrice').value = sale.unit_price || 0;
                document.getElementById('saleTotal').value = sale.total || 0;
                document.getElementById('saleStatus').value = sale.status || 'pending';
                document.getElementById('saleNotes').value = sale.notes || '';
            }
        } else {
            // Mode création
            title.textContent = 'Nouvelle Vente';
            document.getElementById('saleForm').reset();
            document.getElementById('saleId').value = '';
            document.getElementById('saleDate').value = App.formatDateForInput(new Date());
            document.getElementById('saleStatus').value = 'pending';
            document.getElementById('saleQuantity').value = 1;
            document.getElementById('saleUnitPrice').value = 0;
            document.getElementById('saleTotal').value = 0;
        }

        // Calculer le total automatiquement
        const quantityInput = document.getElementById('saleQuantity');
        const unitPriceInput = document.getElementById('saleUnitPrice');
        const totalInput = document.getElementById('saleTotal');

        const calculateTotal = () => {
            const quantity = parseFloat(quantityInput.value) || 0;
            const unitPrice = parseFloat(unitPriceInput.value) || 0;
            totalInput.value = (quantity * unitPrice).toFixed(2);
        };

        quantityInput.addEventListener('input', calculateTotal);
        unitPriceInput.addEventListener('input', calculateTotal);

        // Remplir automatiquement le prix unitaire depuis le service sélectionné
        const serviceSelect = document.getElementById('saleService');
        serviceSelect.addEventListener('change', () => {
            const serviceId = serviceSelect.value;
            const service = this.services.find(s => s.id === serviceId);
            if (service && service.price) {
                unitPriceInput.value = service.price;
                calculateTotal();
            }
        });

        modal.classList.add('active');
    }

    populateSupplierSelect() {
        const select = document.getElementById('purchaseSupplier');
        select.innerHTML = '<option value="">Sélectionner un fournisseur</option>' +
            this.suppliers.map(supplier => `
                <option value="${supplier.id}">${supplier.company_name}</option>
            `).join('');
    }

    populateClientSelect() {
        const select = document.getElementById('saleClient');
        select.innerHTML = '<option value="">Sélectionner un client</option>' +
            this.clients.map(client => `
                <option value="${client.id}">${client.company_name}</option>
            `).join('');
    }

    populateServiceSelect() {
        const select = document.getElementById('saleService');
        select.innerHTML = '<option value="">Sélectionner un service</option>' +
            this.services.map(service => `
                <option value="${service.id}">${service.name} (${Utils.formatCurrency(service.price)})</option>
            `).join('');
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    async savePurchase() {
        const form = document.getElementById('purchaseForm');
        if (!form.checkValidity()) {
            Utils.showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        const purchaseData = {
            id: document.getElementById('purchaseId').value || Utils.generateId(),
            item_name: document.getElementById('purchaseItem').value,
            supplier_id: document.getElementById('purchaseSupplier').value,
            category: document.getElementById('purchaseCategory').value,
            purchase_date: document.getElementById('purchaseDate').value || new Date().toISOString(),
            quantity: document.getElementById('purchaseQuantity').value,
            unit_price: document.getElementById('purchaseUnitPrice').value,
            total: document.getElementById('purchaseTotal').value,
            status: document.getElementById('purchaseStatus').value,
            notes: document.getElementById('purchaseNotes').value,
            created_at: new Date().toISOString()
        };

        try {
            const isEdit = !!document.getElementById('purchaseId').value;
            await sheetsAPI.saveData('Purchases', purchaseData, isEdit);

            Utils.showToast(isEdit ? 'Achat modifié avec succès' : 'Achat créé avec succès', 'success');

            this.closeModal();
            await this.loadData();
        } catch (error) {
            console.error('Erreur sauvegarde achat:', error);
            Utils.showToast('Erreur lors de la sauvegarde', 'error');
        }
    }

    async saveSale() {
        const form = document.getElementById('saleForm');
        if (!form.checkValidity()) {
            Utils.showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        const saleData = {
            id: document.getElementById('saleId').value || Utils.generateId(),
            client_id: document.getElementById('saleClient').value,
            service_id: document.getElementById('saleService').value,
            quantity: document.getElementById('saleQuantity').value || 1,
            sale_date: document.getElementById('saleDate').value || new Date().toISOString(),
            unit_price: document.getElementById('saleUnitPrice').value,
            total: document.getElementById('saleTotal').value,
            status: document.getElementById('saleStatus').value,
            notes: document.getElementById('saleNotes').value,
            created_at: new Date().toISOString()
        };

        try {
            const isEdit = !!document.getElementById('saleId').value;
            await sheetsAPI.saveData('Sales', saleData, isEdit);

            Utils.showToast(isEdit ? 'Vente modifiée avec succès' : 'Vente créée avec succès', 'success');

            this.closeModal();
            await this.loadData();
        } catch (error) {
            console.error('Erreur sauvegarde vente:', error);
            Utils.showToast('Erreur lors de la sauvegarde', 'error');
        }
    }

    async deletePurchase(purchaseId) {
        const confirm = await Utils.confirm('Êtes-vous sûr de vouloir supprimer cet achat ?');
        if (!confirm) return;

        try {
            await sheetsAPI.deleteData('Purchases', purchaseId);
            Utils.showToast('Achat supprimé avec succès', 'success');
            await this.loadData();
        } catch (error) {
            console.error('Erreur suppression achat:', error);
            Utils.showToast('Erreur lors de la suppression', 'error');
        }
    }

    viewPurchase(purchaseId) {
        const purchase = this.purchases.find(p => p.id === purchaseId);
        if (!purchase) return;

        const supplier = this.suppliers.find(s => s.id === purchase.supplier_id);

        const viewModal = document.createElement('div');
        viewModal.className = 'modal';
        viewModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${purchase.item_name}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="purchase-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Fournisseur:</span>
                                <span class="detail-value">${supplier?.company_name || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Catégorie:</span>
                                <span class="detail-value">${purchase.category || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Quantité:</span>
                                <span class="detail-value">${purchase.quantity || 0}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Prix unitaire:</span>
                                <span class="detail-value">${Utils.formatCurrency(purchase.unit_price || 0)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Total:</span>
                                <span class="detail-value">${Utils.formatCurrency(purchase.total || 0)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Date d'achat:</span>
                                <span class="detail-value">${Utils.formatDate(purchase.purchase_date)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Statut:</span>
                                <span class="detail-value">
                                    <span class="status-badge ${purchase.status === 'paid' ? 'status-completed' : 'status-pending'}">
                                        ${this.getPurchaseStatusLabel(purchase.status)}
                                    </span>
                                </span>
                            </div>
                        </div>
                        
                        ${purchase.notes ? `
                            <div class="detail-section">
                                <h4>Notes</h4>
                                <div class="notes-content">${purchase.notes}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                </div>
            </div>
        `;
        document.body.appendChild(viewModal);
        viewModal.classList.add('active');
    }

    viewSale(saleId) {
        const sale = this.sales.find(s => s.id === saleId);
        if (!sale) return;

        const client = this.clients.find(c => c.id === sale.client_id);
        const service = this.services.find(s => s.id === sale.service_id);

        const viewModal = document.createElement('div');
        viewModal.className = 'modal';
        viewModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Vente #${saleId.slice(0, 8)}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="sale-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Client:</span>
                                <span class="detail-value">${client?.company_name || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Service:</span>
                                <span class="detail-value">${service?.name || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Quantité:</span>
                                <span class="detail-value">${sale.quantity || 1}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Prix unitaire:</span>
                                <span class="detail-value">${Utils.formatCurrency(sale.unit_price || 0)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Total:</span>
                                <span class="detail-value">${Utils.formatCurrency(sale.total || 0)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Date de vente:</span>
                                <span class="detail-value">${Utils.formatDate(sale.sale_date)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Statut:</span>
                                <span class="detail-value">
                                    <span class="status-badge ${sale.status === 'completed' ? 'status-completed' : 'status-pending'}">
                                        ${this.getSaleStatusLabel(sale.status)}
                                    </span>
                                </span>
                            </div>
                        </div>
                        
                        ${sale.notes ? `
                            <div class="detail-section">
                                <h4>Notes</h4>
                                <div class="notes-content">${sale.notes}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                </div>
            </div>
        `;
        document.body.appendChild(viewModal);
        viewModal.classList.add('active');
    }

    updateStats() {
        const purchaseStats = {
            total: this.purchases.length,
            totalAmount: this.purchases.reduce((sum, p) => sum + parseFloat(p.total || 0), 0),
            pending: this.purchases.filter(p => p.status === 'pending').length
        };

        const saleStats = {
            total: this.sales.length,
            totalAmount: this.sales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
            completed: this.sales.filter(s => s.status === 'completed').length
        };

        const statsElement = document.getElementById('purchases-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stats-summary">
                    <div class="stat-item">
                        <span class="stat-number">${purchaseStats.total}</span>
                        <span class="stat-label">Achats</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${Utils.formatCurrency(purchaseStats.totalAmount)}</span>
                        <span class="stat-label">Total Achats</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${saleStats.total}</span>
                        <span class="stat-label">Ventes</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${Utils.formatCurrency(saleStats.totalAmount)}</span>
                        <span class="stat-label">Total Ventes</span>
                    </div>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Recherche achats
        const purchaseSearch = document.getElementById('purchaseSearch');
        if (purchaseSearch) {
            purchaseSearch.addEventListener('input', Utils.debounce((e) => {
                this.searchPurchases(e.target.value);
            }, 300));
        }

        // Recherche ventes
        const saleSearch = document.getElementById('saleSearch');
        if (saleSearch) {
            saleSearch.addEventListener('input', Utils.debounce((e) => {
                this.searchSales(e.target.value);
            }, 300));
        }
    }

    async searchPurchases(query) {
        if (!query) {
            this.renderPurchasesTable();
            return;
        }

        const filtered = this.purchases.filter(purchase =>
            purchase.item_name?.toLowerCase().includes(query.toLowerCase()) ||
            purchase.category?.toLowerCase().includes(query.toLowerCase())
        );

        this.renderFilteredPurchases(filtered);
    }

    async searchSales(query) {
        if (!query) {
            this.renderSalesTable();
            return;
        }

        const filtered = this.sales.filter(sale => {
            const client = this.clients.find(c => c.id === sale.client_id);
            const service = this.services.find(s => s.id === sale.service_id);

            return (
                client?.company_name?.toLowerCase().includes(query.toLowerCase()) ||
                service?.name?.toLowerCase().includes(query.toLowerCase())
            );
        });

        this.renderFilteredSales(filtered);
    }

    renderFilteredPurchases(filtered) {
        const tbody = document.querySelector('#purchases-table tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Aucun résultat trouvé</h3>
                        <p>Aucun achat ne correspond à votre recherche</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(purchase => {
            const supplier = this.suppliers.find(s => s.id === purchase.supplier_id);

            return `
                <tr>
                    <td>${purchase.item_name}</td>
                    <td>${supplier?.company_name || 'N/A'}</td>
                    <td>${purchase.quantity || 0}</td>
                    <td>${Utils.formatCurrency(purchase.unit_price || 0)}</td>
                    <td>${Utils.formatCurrency(purchase.total || 0)}</td>
                    <td>${Utils.formatDate(purchase.purchase_date)}</td>
                    <td>
                        <span class="status-badge ${purchase.status === 'paid' ? 'status-completed' : 'status-pending'}">
                            ${this.getPurchaseStatusLabel(purchase.status)}
                        </span>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="purchases.viewPurchase('${purchase.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderFilteredSales(filtered) {
        const tbody = document.querySelector('#sales-table tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Aucun résultat trouvé</h3>
                        <p>Aucune vente ne correspond à votre recherche</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(sale => {
            const client = this.clients.find(c => c.id === sale.client_id);
            const service = this.services.find(s => s.id === sale.service_id);

            return `
                <tr>
                    <td>${service?.name || 'N/A'}</td>
                    <td>${client?.company_name || 'N/A'}</td>
                    <td>${sale.quantity || 1}</td>
                    <td>${Utils.formatCurrency(sale.unit_price || 0)}</td>
                    <td>${Utils.formatCurrency(sale.total || 0)}</td>
                    <td>${Utils.formatDate(sale.sale_date)}</td>
                    <td>
                        <span class="status-badge ${sale.status === 'completed' ? 'status-completed' : 'status-pending'}">
                            ${this.getSaleStatusLabel(sale.status)}
                        </span>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="purchases.viewSale('${sale.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// Initialiser le gestionnaire d'achats/ventes
const purchases = new PurchasesManager();