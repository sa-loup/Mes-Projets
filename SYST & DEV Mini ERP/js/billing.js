class BillingSystem {
    constructor() {
        this.init();
    }

    async init() {
        auth.protectPage();
        await Promise.all([
            this.loadInvoices(),
            this.loadPayments()
        ]);
        this.setupEventListeners();
        this.renderInvoiceModal();
    }

    async loadInvoices() {
        try {
            const invoices = await sheetsAPI.fetchData('Invoices');
            const clients = await sheetsAPI.fetchData('Clients');

            this.invoices = invoices;
            this.clients = clients;

            this.renderInvoicesTable();
            this.updateStats();
        } catch (error) {
            console.error('Erreur chargement factures:', error);
            Utils.showToast('Erreur lors du chargement des factures', 'error');
        }
    }

    async loadPayments() {
        try {
            this.payments = await sheetsAPI.fetchData('Payments');
            this.renderPaymentsTable();
        } catch (error) {
            console.error('Erreur chargement paiements:', error);
        }
    }

    renderInvoicesTable() {
        const tbody = document.querySelector('#invoices-table tbody');
        if (!tbody) return;

        if (this.invoices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <h3>Aucune facture trouvée</h3>
                        <p>Commencez par créer votre première facture</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.invoices.map(invoice => {
            const client = this.clients.find(c => c.id === invoice.client_id);
            const statusClass = this.getInvoiceStatusClass(invoice.status);
            const statusLabel = this.getInvoiceStatusLabel(invoice.status);

            return `
                <tr>
                    <td>
                        <div class="font-weight-600">${invoice.invoice_number || 'N/A'}</div>
                        <small class="text-muted">${invoice.id.slice(0, 8)}</small>
                    </td>
                    <td>${client?.company_name || 'N/A'}</td>
                    <td>${Utils.formatDate(invoice.issue_date)}</td>
                    <td>${Utils.formatCurrency(invoice.total || 0)}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${statusLabel}
                        </span>
                    </td>
                    <td>
                        <div class="actions">
                            <button class="btn-icon" onclick="billing.viewInvoice('${invoice.id}')" title="Voir">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon" onclick="billing.generatePDF('${invoice.id}')" title="PDF">
                                <i class="fas fa-file-pdf"></i>
                            </button>
                            <button class="btn-icon" onclick="billing.editInvoice('${invoice.id}')" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${invoice.status !== 'paid' ? `
                                <button class="btn-icon btn-success" onclick="billing.validateInvoice('${invoice.id}')" title="Valider & Payer">
                                    <i class="fas fa-check-double"></i>
                                </button>
                            ` : ''}
                            ${auth.canDelete() ? `
                                <button class="btn-icon btn-danger" onclick="billing.deleteInvoice('${invoice.id}')" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderPaymentsTable() {
        const tbody = document.querySelector('#payments-table tbody');
        if (!tbody) return;

        if (!this.payments || this.payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Aucun paiement enregistré</td></tr>';
            return;
        }

        tbody.innerHTML = this.payments.map(payment => {
            return `
                <tr>
                    <td><code>${payment.transaction_id || 'N/A'}</code></td>
                    <td>${payment.invoice_id || 'N/A'}</td>
                    <td>${payment.payment_method?.toUpperCase()}</td>
                    <td>${Utils.formatDate(payment.processed_at)}</td>
                    <td>${Utils.formatCurrency(payment.amount)}</td>
                    <td><span class="status-badge status-completed">Complété</span></td>
                </tr>
            `;
        }).join('');
    }

    getInvoiceStatusClass(status) {
        const classes = {
            'paid': 'status-completed',
            'pending': 'status-pending',
            'overdue': 'status-cancelled',
            'cancelled': 'status-cancelled'
        };
        return classes[status] || 'status-pending';
    }

    getInvoiceStatusLabel(status) {
        const labels = {
            'paid': 'Payée',
            'pending': 'En attente',
            'overdue': 'En retard',
            'cancelled': 'Annulée'
        };
        return labels[status] || status || 'En attente';
    }

    renderInvoiceModal() {
        const modal = document.createElement('div');
        modal.className = 'modal modal-lg';
        modal.id = 'invoiceModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="invoiceModalTitle">Nouvelle Facture</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="invoiceForm">
                        <input type="hidden" id="invoiceId">
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="invoiceClient">Client *</label>
                                <select id="invoiceClient" required>
                                    <option value="">Sélectionner un client</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="invoiceProject">Projet (optionnel)</label>
                                <select id="invoiceProject">
                                    <option value="">Sans projet</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="invoiceDate">Date d'émission</label>
                                <input type="date" id="invoiceDate">
                            </div>
                            <div class="form-group">
                                <label for="invoiceDueDate">Date d'échéance</label>
                                <input type="date" id="invoiceDueDate">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="invoiceItems">Articles *</label>
                            <div id="invoiceItemsContainer">
                                <div class="invoice-item">
                                    <div class="form-row">
                                        <div class="form-group" style="flex: 2;">
                                            <input type="text" class="item-description" placeholder="Description" required>
                                        </div>
                                        <div class="form-group">
                                            <input type="number" class="item-quantity" placeholder="Qté" min="1" value="1" required>
                                        </div>
                                        <div class="form-group">
                                            <input type="number" class="item-price" placeholder="Prix unitaire" min="0" step="0.01" required>
                                        </div>
                                        <div class="form-group">
                                            <input type="number" class="item-total" placeholder="Total" readonly>
                                        </div>
                                        <div class="form-group" style="width: 40px;">
                                            <button type="button" class="btn-icon btn-danger remove-item" onclick="billing.removeInvoiceItem(this)">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button type="button" class="btn btn-secondary btn-sm mt-2" onclick="billing.addInvoiceItem()">
                                <i class="fas fa-plus"></i> Ajouter un article
                            </button>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="invoiceSubtotal">Sous-total</label>
                                <input type="number" id="invoiceSubtotal" readonly>
                            </div>
                            <div class="form-group">
                                <label for="invoiceTax">TVA (%)</label>
                                <input type="number" id="invoiceTax" min="0" max="100" value="20" step="0.1">
                            </div>
                            <div class="form-group">
                                <label for="invoiceTaxAmount">Montant TVA</label>
                                <input type="number" id="invoiceTaxAmount" readonly>
                            </div>
                            <div class="form-group">
                                <label for="invoiceTotal">Total</label>
                                <input type="number" id="invoiceTotal" readonly>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="invoiceStatus">Statut</label>
                            <select id="invoiceStatus">
                                <option value="pending">En attente</option>
                                <option value="paid">Payée</option>
                                <option value="overdue">En retard</option>
                                <option value="cancelled">Annulée</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="invoiceNotes">Notes</label>
                            <textarea id="invoiceNotes" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="billing.closeModal()">Annuler</button>
                    <button type="button" class="btn btn-primary" onclick="billing.saveInvoice()">Enregistrer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    openInvoiceModal(invoiceId = null) {
        const modal = document.getElementById('invoiceModal');
        const title = document.getElementById('invoiceModalTitle');

        this.populateClientSelect();
        this.populateProjectSelect();

        if (invoiceId) {
            // Mode édition
            const invoice = this.invoices.find(i => i.id === invoiceId);
            if (invoice) {
                title.textContent = 'Modifier Facture';
                document.getElementById('invoiceId').value = invoice.id;
                document.getElementById('invoiceClient').value = invoice.client_id || '';
                document.getElementById('invoiceProject').value = invoice.project_id || '';
                document.getElementById('invoiceDate').value = App.formatDateForInput(invoice.issue_date);
                document.getElementById('invoiceDueDate').value = App.formatDateForInput(invoice.due_date);
                document.getElementById('invoiceTax').value = invoice.tax_rate || 20;
                document.getElementById('invoiceStatus').value = invoice.status || 'pending';
                document.getElementById('invoiceNotes').value = invoice.notes || '';

                // Remplir les articles
                const itemsContainer = document.getElementById('invoiceItemsContainer');
                itemsContainer.innerHTML = '';

                if (invoice.items) {
                    const items = JSON.parse(invoice.items);
                    items.forEach((item, index) => {
                        this.addInvoiceItem(item.description, item.quantity, item.unit_price);
                    });
                } else {
                    this.addInvoiceItem();
                }

                this.calculateInvoiceTotals();
            }
        } else {
            // Mode création
            title.textContent = 'Nouvelle Facture';
            document.getElementById('invoiceForm').reset();
            document.getElementById('invoiceId').value = '';
            document.getElementById('invoiceDate').value = App.formatDateForInput(new Date());
            document.getElementById('invoiceDueDate').value = App.formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // +30 jours
            document.getElementById('invoiceStatus').value = 'pending';
            document.getElementById('invoiceTax').value = 20;

            // Réinitialiser les articles
            const itemsContainer = document.getElementById('invoiceItemsContainer');
            itemsContainer.innerHTML = '';
            this.addInvoiceItem();

            this.calculateInvoiceTotals();
        }

        // Configurer les événements de calcul
        this.setupInvoiceCalculation();

        modal.classList.add('active');
    }

    populateClientSelect() {
        const select = document.getElementById('invoiceClient');
        select.innerHTML = '<option value="">Sélectionner un client</option>' +
            this.clients.map(client => `
                <option value="${client.id}">${client.company_name}</option>
            `).join('');
    }

    async populateProjectSelect() {
        try {
            const projects = await sheetsAPI.fetchData('Projects');
            const select = document.getElementById('invoiceProject');
            select.innerHTML = '<option value="">Sans projet</option>' +
                projects.map(project => `
                    <option value="${project.id}">${project.name}</option>
                `).join('');
        } catch (error) {
            console.error('Erreur chargement projets:', error);
        }
    }

    addInvoiceItem(description = '', quantity = 1, price = 0) {
        const container = document.getElementById('invoiceItemsContainer');
        const itemIndex = container.children.length;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'invoice-item';
        itemDiv.innerHTML = `
            <div class="form-row">
                <div class="form-group" style="flex: 2;">
                    <input type="text" class="item-description" placeholder="Description" 
                           value="${description}" required>
                </div>
                <div class="form-group">
                    <input type="number" class="item-quantity" placeholder="Qté" 
                           min="1" value="${quantity}" required>
                </div>
                <div class="form-group">
                    <input type="number" class="item-price" placeholder="Prix unitaire" 
                           min="0" step="0.01" value="${price}" required>
                </div>
                <div class="form-group">
                    <input type="number" class="item-total" placeholder="Total" readonly>
                </div>
                <div class="form-group" style="width: 40px;">
                    <button type="button" class="btn-icon btn-danger remove-item" 
                            onclick="billing.removeInvoiceItem(this)">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(itemDiv);
        this.calculateItemTotal(itemDiv);
        this.calculateInvoiceTotals();
    }

    removeInvoiceItem(button) {
        const itemDiv = button.closest('.invoice-item');
        if (itemDiv && document.querySelectorAll('.invoice-item').length > 1) {
            itemDiv.remove();
            this.calculateInvoiceTotals();
        }
    }

    setupInvoiceCalculation() {
        const container = document.getElementById('invoiceItemsContainer');

        // Recalculer quand les valeurs changent
        container.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-quantity') ||
                e.target.classList.contains('item-price')) {
                const itemDiv = e.target.closest('.invoice-item');
                this.calculateItemTotal(itemDiv);
                this.calculateInvoiceTotals();
            }
        });

        // Recalculer quand la TVA change
        document.getElementById('invoiceTax').addEventListener('input', () => {
            this.calculateInvoiceTotals();
        });
    }

    calculateItemTotal(itemDiv) {
        const quantity = parseFloat(itemDiv.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(itemDiv.querySelector('.item-price').value) || 0;
        const total = quantity * price;
        itemDiv.querySelector('.item-total').value = total.toFixed(2);
    }

    calculateInvoiceTotals() {
        let subtotal = 0;

        document.querySelectorAll('.invoice-item').forEach(itemDiv => {
            const total = parseFloat(itemDiv.querySelector('.item-total').value) || 0;
            subtotal += total;
        });

        const taxRate = parseFloat(document.getElementById('invoiceTax').value) || 0;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        document.getElementById('invoiceSubtotal').value = subtotal.toFixed(2);
        document.getElementById('invoiceTaxAmount').value = taxAmount.toFixed(2);
        document.getElementById('invoiceTotal').value = total.toFixed(2);
    }

    async saveInvoice() {
        const form = document.getElementById('invoiceForm');
        if (!form.checkValidity()) {
            Utils.showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        // Récupérer les articles
        const items = [];
        let isValid = true;

        document.querySelectorAll('.invoice-item').forEach(itemDiv => {
            const description = itemDiv.querySelector('.item-description').value;
            const quantity = parseFloat(itemDiv.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(itemDiv.querySelector('.item-price').value) || 0;

            if (!description || quantity <= 0 || price < 0) {
                isValid = false;
                return;
            }

            items.push({
                description,
                quantity,
                unit_price: price,
                total: quantity * price
            });
        });

        if (!isValid || items.length === 0) {
            Utils.showToast('Veuillez vérifier les articles de la facture', 'warning');
            return;
        }

        // Générer le numéro de facture
        let invoiceNumber;
        if (document.getElementById('invoiceId').value) {
            invoiceNumber = document.getElementById('invoiceNumber').value;
        } else {
            const lastInvoice = this.invoices[this.invoices.length - 1];
            const lastNumber = lastInvoice ? parseInt(lastInvoice.invoice_number?.replace('INV-', '') || 0) : 1000;
            invoiceNumber = `INV-${lastNumber + 1}`;
        }

        const invoiceData = {
            id: document.getElementById('invoiceId').value || Utils.generateId(),
            invoice_number: invoiceNumber,
            client_id: document.getElementById('invoiceClient').value,
            project_id: document.getElementById('invoiceProject').value || '',
            issue_date: document.getElementById('invoiceDate').value || new Date().toISOString(),
            due_date: document.getElementById('invoiceDueDate').value || new Date().toISOString(),
            status: document.getElementById('invoiceStatus').value,
            subtotal: parseFloat(document.getElementById('invoiceSubtotal').value) || 0,
            tax_rate: parseFloat(document.getElementById('invoiceTax').value) || 20,
            tax_amount: parseFloat(document.getElementById('invoiceTaxAmount').value) || 0,
            total: parseFloat(document.getElementById('invoiceTotal').value) || 0,
            items: JSON.stringify(items),
            notes: document.getElementById('invoiceNotes').value,
            paid_at: '',
            created_at: new Date().toISOString()
        };

        try {
            const isEdit = !!document.getElementById('invoiceId').value;
            await sheetsAPI.saveData('Invoices', invoiceData, isEdit);

            Utils.showToast(isEdit ? 'Facture modifiée avec succès' : 'Facture créée avec succès', 'success');

            this.closeModal();
            await this.loadInvoices();
        } catch (error) {
            console.error('Erreur sauvegarde facture:', error);
            Utils.showToast('Erreur lors de la sauvegarde', 'error');
        }
    }

    async deleteInvoice(invoiceId) {
        const confirm = await Utils.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?');
        if (!confirm) return;

        try {
            await sheetsAPI.deleteData('Invoices', invoiceId);
            Utils.showToast('Facture supprimée avec succès', 'success');
            await this.loadInvoices();
        } catch (error) {
            console.error('Erreur suppression facture:', error);
            Utils.showToast('Erreur lors de la suppression', 'error');
        }
    }

    async validateInvoice(invoiceId) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;

        const confirm = await Utils.confirm(`Voulez-vous valider le paiement de ${Utils.formatCurrency(invoice.total)} ?`);
        if (!confirm) return;

        try {
            // 1. Mettre à jour la facture
            const updatedInvoice = { ...invoice, status: 'paid', paid_at: new Date().toISOString() };
            await sheetsAPI.saveData('Invoices', updatedInvoice, true);

            // 2. Créer le paiement
            const paymentData = {
                id: Utils.generateId(),
                invoice_id: invoice.invoice_number,
                amount: invoice.total,
                payment_method: 'simulation',
                transaction_id: 'VALID-' + Date.now().toString(36).toUpperCase(),
                status: 'completed',
                processed_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            await sheetsAPI.saveData('Payments', paymentData, false);

            Utils.showToast('Facture validée et paiement enregistré', 'success');
            await Promise.all([this.loadInvoices(), this.loadPayments()]);
        } catch (error) {
            console.error('Erreur validation facture:', error);
            Utils.showToast('Erreur lors de la validation', 'error');
        }
    }

    async generatePDF(invoiceId) {
        try {
            const invoice = this.invoices.find(i => i.id === invoiceId);
            if (!invoice) {
                Utils.showToast('Facture non trouvée', 'error');
                return;
            }

            await PDFGenerator.generateInvoice(invoice);
            Utils.showToast('PDF généré avec succès', 'success');
        } catch (error) {
            console.error('Erreur génération PDF:', error);
            Utils.showToast('Erreur lors de la génération du PDF', 'error');
        }
    }

    viewInvoice(invoiceId) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;

        const client = this.clients.find(c => c.id === invoice.client_id);
        const items = invoice.items ? JSON.parse(invoice.items) : [];

        const viewModal = document.createElement('div');
        viewModal.className = 'modal modal-lg';
        viewModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Facture ${invoice.invoice_number}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="invoice-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Client:</span>
                                <span class="detail-value">${client?.company_name || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Date d'émission:</span>
                                <span class="detail-value">${Utils.formatDate(invoice.issue_date)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Date d'échéance:</span>
                                <span class="detail-value">${Utils.formatDate(invoice.due_date)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Statut:</span>
                                <span class="detail-value">
                                    <span class="status-badge ${this.getInvoiceStatusClass(invoice.status)}">
                                        ${this.getInvoiceStatusLabel(invoice.status)}
                                    </span>
                                </span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Articles</h4>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Description</th>
                                            <th>Quantité</th>
                                            <th>Prix unitaire</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${items.map(item => `
                                            <tr>
                                                <td>${item.description}</td>
                                                <td>${item.quantity}</td>
                                                <td>${Utils.formatCurrency(item.unit_price)}</td>
                                                <td>${Utils.formatCurrency(item.total)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="invoice-totals">
                            <div class="total-row">
                                <span>Sous-total:</span>
                                <span>${Utils.formatCurrency(invoice.subtotal || 0)}</span>
                            </div>
                            <div class="total-row">
                                <span>TVA (${invoice.tax_rate || 20}%):</span>
                                <span>${Utils.formatCurrency(invoice.tax_amount || 0)}</span>
                            </div>
                            <div class="total-row total">
                                <span>Total:</span>
                                <span>${Utils.formatCurrency(invoice.total || 0)}</span>
                            </div>
                        </div>
                        
                        ${invoice.notes ? `
                            <div class="detail-section">
                                <h4>Notes</h4>
                                <div class="notes-content">${invoice.notes}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                    <button type="button" class="btn btn-primary" onclick="billing.editInvoice('${invoice.id}'); this.closest('.modal').remove()">
                        Modifier
                    </button>
                    <button type="button" class="btn btn-info" onclick="billing.generatePDF('${invoice.id}'); this.closest('.modal').remove()">
                        <i class="fas fa-file-pdf"></i> Télécharger PDF
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(viewModal);
        viewModal.classList.add('active');
    }

    updateStats() {
        const totalRevenue = this.invoices
            .filter(i => i.status === 'paid')
            .reduce((sum, invoice) => sum + parseFloat(invoice.total || 0), 0);

        const pendingInvoices = this.invoices.filter(i => i.status === 'pending').length;
        const overdueInvoices = this.invoices.filter(i => i.status === 'overdue').length;

        document.getElementById('totalRevenue').textContent = Utils.formatCurrency(totalRevenue);
        document.getElementById('totalInvoices').textContent = this.invoices.length;
        document.getElementById('pendingInvoices').textContent = pendingInvoices;
        document.getElementById('overdueInvoices').textContent = overdueInvoices;
    }

    async simulatePayment() {
        const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
        const method = document.getElementById('paymentMethod').value;

        if (amount <= 0) {
            Utils.showToast('Veuillez saisir un montant valide', 'warning');
            return;
        }

        // Simulation de paiement
        Utils.showToast(`Paiement de ${Utils.formatCurrency(amount)} simulé via ${method.toUpperCase()}`, 'success');

        // Ajouter un enregistrement de paiement
        try {
            const paymentData = {
                id: Utils.generateId(),
                invoice_id: '', // Paiement global/simulé
                amount: amount,
                payment_method: method,
                transaction_id: 'SIM-' + Date.now(),
                status: 'completed',
                processed_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };

            console.log('[Billing] Enregistrement paiement...', paymentData);
            const response = await sheetsAPI.saveData('Payments', paymentData, false);
            console.log('[Billing] Réponse API:', response);
            Utils.showToast('Paiement enregistré avec succès', 'success');
        } catch (error) {
            console.error('Erreur enregistrement paiement:', error);
            alert('Erreur enregistrement paiement: ' + error.message);
        }
    }

    setupEventListeners() {
        // Recherche factures
        const searchInput = document.getElementById('invoiceSearch');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchInvoices(e.target.value);
            }, 300));
        }

        // Filtres
        const filterSelect = document.getElementById('invoiceFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterInvoices(e.target.value);
            });
        }
    }

    async searchInvoices(query) {
        if (!query) {
            this.renderInvoicesTable();
            return;
        }

        const filtered = this.invoices.filter(invoice =>
            invoice.invoice_number?.toLowerCase().includes(query.toLowerCase()) ||
            this.clients.find(c => c.id === invoice.client_id)?.company_name?.toLowerCase().includes(query.toLowerCase())
        );

        this.renderFilteredInvoices(filtered);
    }

    async filterInvoices(filter) {
        if (!filter || filter === 'all') {
            this.renderInvoicesTable();
            return;
        }

        const filtered = this.invoices.filter(invoice => invoice.status === filter);
        this.renderFilteredInvoices(filtered);
    }

    renderFilteredInvoices(filtered) {
        const tbody = document.querySelector('#invoices-table tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Aucun résultat trouvé</h3>
                        <p>Aucune facture ne correspond à votre recherche/filtre</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(invoice => {
            const client = this.clients.find(c => c.id === invoice.client_id);
            const statusClass = this.getInvoiceStatusClass(invoice.status);
            const statusLabel = this.getInvoiceStatusLabel(invoice.status);

            return `
                <tr>
                    <td>${invoice.invoice_number || 'N/A'}</td>
                    <td>${client?.company_name || 'N/A'}</td>
                    <td>${Utils.formatDate(invoice.issue_date)}</td>
                    <td>${Utils.formatCurrency(invoice.total || 0)}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${statusLabel}
                        </span>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="billing.viewInvoice('${invoice.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="billing.generatePDF('${invoice.id}')">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    editInvoice(invoiceId) {
        this.openInvoiceModal(invoiceId);
    }
}

// Initialiser le système de facturation
const billing = new BillingSystem();