class TicketsManager {
    constructor() {
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
            const [tickets, projects, clients] = await Promise.all([
                sheetsAPI.fetchData('Tickets'),
                sheetsAPI.fetchData('Projects'),
                sheetsAPI.fetchData('Clients')
            ]);

            this.tickets = tickets;
            this.projects = projects;
            this.clients = clients;

            this.renderTicketsTable();
            this.updateStats();
            this.updateBadge();
        } catch (error) {
            console.error('Erreur chargement tickets:', error);
            Utils.showToast('Erreur lors du chargement des tickets', 'error');
        }
    }

    renderTicketsTable() {
        const tbody = document.querySelector('#tickets-table tbody');
        if (!tbody) return;

        if (this.tickets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-ticket-alt"></i>
                        <h3>Aucun ticket trouvé</h3>
                        <p>Commencez par créer votre premier ticket</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.tickets.map(ticket => {
            const project = this.projects.find(p => p.id === ticket.project_id);
            const client = this.clients.find(c => c.id === ticket.client_id);

            return `
                <tr class="ticket-row ${this.getTicketRowClass(ticket)}" data-id="${ticket.id}">
                    <td>
                        <div class="ticket-title">
                            <div class="font-weight-600">${ticket.title}</div>
                            <small class="text-muted">${project?.name || 'N/A'}</small>
                        </div>
                    </td>
                    <td>${client?.company_name || 'N/A'}</td>
                    <td>
                        <span class="badge ${this.getCategoryBadgeClass(ticket.category)}">
                            ${this.getCategoryLabel(ticket.category)}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${this.getPriorityBadgeClass(ticket.priority)}">
                            ${this.getPriorityLabel(ticket.priority)}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge status-${ticket.status?.toLowerCase() || 'open'}">
                            ${this.getStatusLabel(ticket.status)}
                        </span>
                    </td>
                    <td>${Utils.formatDate(ticket.created_at)}</td>
                    <td>
                        <div class="actions">
                            <button class="btn-icon" onclick="tickets.viewTicket('${ticket.id}')" title="Voir">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${auth.canEdit() ? `
                                <button class="btn-icon" onclick="tickets.editTicket('${ticket.id}')" title="Modifier">
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : ''}
                            ${auth.canDelete() ? `
                                <button class="btn-icon btn-danger" onclick="tickets.deleteTicket('${ticket.id}')" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getTicketRowClass(ticket) {
        if (ticket.priority === 'critical') return 'ticket-critical';
        if (ticket.priority === 'high') return 'ticket-high';
        if (ticket.status === 'resolved') return 'ticket-resolved';
        return '';
    }

    getCategoryLabel(category) {
        const labels = {
            'bug': 'Bug',
            'feature': 'Fonctionnalité',
            'support': 'Support',
            'question': 'Question',
            'other': 'Autre'
        };
        return labels[category] || category || 'Autre';
    }

    getCategoryBadgeClass(category) {
        const classes = {
            'bug': 'badge-danger',
            'feature': 'badge-success',
            'support': 'badge-info',
            'question': 'badge-warning',
            'other': 'badge-secondary'
        };
        return classes[category] || 'badge-secondary';
    }

    getPriorityLabel(priority) {
        const labels = {
            'low': 'Basse',
            'medium': 'Moyenne',
            'high': 'Haute',
            'critical': 'Critique'
        };
        return labels[priority] || priority || 'Moyenne';
    }

    getPriorityBadgeClass(priority) {
        const classes = {
            'low': 'badge-info',
            'medium': 'badge-primary',
            'high': 'badge-warning',
            'critical': 'badge-danger'
        };
        return classes[priority] || 'badge-primary';
    }

    getStatusLabel(status) {
        const labels = {
            'open': 'Ouvert',
            'in_progress': 'En cours',
            'resolved': 'Résolu',
            'closed': 'Fermé'
        };
        return labels[status] || status || 'Ouvert';
    }

    renderModals() {
        // Modal Ticket
        const ticketModal = document.createElement('div');
        ticketModal.className = 'modal modal-lg';
        ticketModal.id = 'ticketModal';
        ticketModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="ticketModalTitle">Nouveau Ticket</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="ticketForm">
                        <input type="hidden" id="ticketId">
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="ticketTitle">Titre *</label>
                                <input type="text" id="ticketTitle" required>
                            </div>
                            <div class="form-group">
                                <label for="ticketProject">Projet</label>
                                <select id="ticketProject">
                                    <option value="">Sans projet</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="ticketCategory">Catégorie</label>
                                <select id="ticketCategory">
                                    <option value="support">Support</option>
                                    <option value="bug">Bug</option>
                                    <option value="feature">Fonctionnalité</option>
                                    <option value="question">Question</option>
                                    <option value="other">Autre</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="ticketPriority">Priorité</label>
                                <select id="ticketPriority">
                                    <option value="low">Basse</option>
                                    <option value="medium" selected>Moyenne</option>
                                    <option value="high">Haute</option>
                                    <option value="critical">Critique</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="ticketStatus">Statut</label>
                                <select id="ticketStatus">
                                    <option value="open">Ouvert</option>
                                    <option value="in_progress">En cours</option>
                                    <option value="resolved">Résolu</option>
                                    <option value="closed">Fermé</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="ticketAssigned">Assigné à</label>
                                <input type="text" id="ticketAssigned" placeholder="Nom de l'utilisateur">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="ticketDescription">Description *</label>
                            <textarea id="ticketDescription" rows="4" required></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="tickets.closeModal()">Annuler</button>
                    <button type="button" class="btn btn-primary" onclick="tickets.saveTicket()">Enregistrer</button>
                </div>
            </div>
        `;
        document.body.appendChild(ticketModal);

        // Modal Commentaires
        const commentsModal = document.createElement('div');
        commentsModal.className = 'modal modal-lg';
        commentsModal.id = 'commentsModal';
        commentsModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Commentaires</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="commentsList" class="comments-list"></div>
                    <div class="add-comment">
                        <textarea id="newComment" placeholder="Ajouter un commentaire..." rows="3"></textarea>
                        <button class="btn btn-primary mt-2" onclick="tickets.addComment()">Ajouter</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(commentsModal);
    }

    openTicketModal(ticketId = null) {
        const modal = document.getElementById('ticketModal');
        const title = document.getElementById('ticketModalTitle');

        // Remplir le select des projets
        this.populateProjectSelect();

        if (ticketId) {
            // Mode édition
            const ticket = this.tickets.find(t => t.id === ticketId);
            if (ticket) {
                title.textContent = 'Modifier Ticket';
                document.getElementById('ticketId').value = ticket.id;
                document.getElementById('ticketTitle').value = ticket.title || '';
                document.getElementById('ticketProject').value = ticket.project_id || '';
                document.getElementById('ticketCategory').value = ticket.category || 'support';
                document.getElementById('ticketPriority').value = ticket.priority || 'medium';
                document.getElementById('ticketStatus').value = ticket.status || 'open';
                document.getElementById('ticketAssigned').value = ticket.assigned_to || '';
                document.getElementById('ticketDescription').value = ticket.description || '';
            }
        } else {
            // Mode création
            title.textContent = 'Nouveau Ticket';
            document.getElementById('ticketForm').reset();
            document.getElementById('ticketId').value = '';
            document.getElementById('ticketStatus').value = 'open';
            document.getElementById('ticketPriority').value = 'medium';
            document.getElementById('ticketCategory').value = 'support';
        }

        modal.classList.add('active');
    }

    populateProjectSelect() {
        const select = document.getElementById('ticketProject');
        select.innerHTML = '<option value="">Sans projet</option>' +
            this.projects.map(project => `
                <option value="${project.id}">${project.name}</option>
            `).join('');
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    async saveTicket() {
        const form = document.getElementById('ticketForm');
        if (!form.checkValidity()) {
            Utils.showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        const ticketData = {
            id: document.getElementById('ticketId').value || Utils.generateId(),
            title: document.getElementById('ticketTitle').value,
            project_id: document.getElementById('ticketProject').value || '',
            category: document.getElementById('ticketCategory').value,
            priority: document.getElementById('ticketPriority').value,
            status: document.getElementById('ticketStatus').value,
            assigned_to: document.getElementById('ticketAssigned').value,
            description: document.getElementById('ticketDescription').value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            comments_count: 0
        };

        // Déterminer le client à partir du projet
        if (ticketData.project_id) {
            const project = this.projects.find(p => p.id === ticketData.project_id);
            if (project) {
                ticketData.client_id = project.client_id;
            }
        }

        try {
            const isEdit = !!document.getElementById('ticketId').value;
            await sheetsAPI.saveData('Tickets', ticketData, isEdit);

            Utils.showToast(isEdit ? 'Ticket modifié avec succès' : 'Ticket créé avec succès', 'success');

            this.closeModal();
            await this.loadData();
        } catch (error) {
            console.error('Erreur sauvegarde ticket:', error);
            Utils.showToast('Erreur lors de la sauvegarde', 'error');
        }
    }

    async deleteTicket(ticketId) {
        const confirm = await Utils.confirm('Êtes-vous sûr de vouloir supprimer ce ticket ?');
        if (!confirm) return;

        try {
            await sheetsAPI.deleteData('Tickets', ticketId);
            Utils.showToast('Ticket supprimé avec succès', 'success');
            await this.loadData();
        } catch (error) {
            console.error('Erreur suppression ticket:', error);
            Utils.showToast('Erreur lors de la suppression', 'error');
        }
    }

    viewTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        const project = this.projects.find(p => p.id === ticket.project_id);
        const client = this.clients.find(c => c.id === ticket.client_id);

        const viewModal = document.createElement('div');
        viewModal.className = 'modal modal-lg';
        viewModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${ticket.title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="ticket-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Catégorie:</span>
                                <span class="detail-value">
                                    <span class="badge ${this.getCategoryBadgeClass(ticket.category)}">
                                        ${this.getCategoryLabel(ticket.category)}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Priorité:</span>
                                <span class="detail-value">
                                    <span class="badge ${this.getPriorityBadgeClass(ticket.priority)}">
                                        ${this.getPriorityLabel(ticket.priority)}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Statut:</span>
                                <span class="detail-value">
                                    <span class="status-badge status-${ticket.status?.toLowerCase() || 'open'}">
                                        ${this.getStatusLabel(ticket.status)}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Assigné à:</span>
                                <span class="detail-value">${ticket.assigned_to || 'Non assigné'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Projet:</span>
                                <span class="detail-value">${project?.name || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Client:</span>
                                <span class="detail-value">${client?.company_name || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Créé le:</span>
                                <span class="detail-value">${Utils.formatDate(ticket.created_at)}</span>
                            </div>
                            ${ticket.resolved_at ? `
                                <div class="detail-item">
                                    <span class="detail-label">Résolu le:</span>
                                    <span class="detail-value">${Utils.formatDate(ticket.resolved_at)}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="detail-section">
                            <h4>Description</h4>
                            <div class="description-content">${ticket.description || 'Aucune description'}</div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Commentaires (${ticket.comments_count || 0})</h4>
                            <button class="btn btn-secondary btn-sm" onclick="tickets.openCommentsModal('${ticket.id}')">
                                <i class="fas fa-comments"></i> Gérer les commentaires
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                    <button type="button" class="btn btn-primary" onclick="tickets.editTicket('${ticket.id}'); this.closest('.modal').remove()">
                        Modifier
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(viewModal);
        viewModal.classList.add('active');
    }

    openCommentsModal(ticketId) {
        const modal = document.getElementById('commentsModal');
        const commentsList = document.getElementById('commentsList');

        // Pour le moment, simuler des commentaires
        commentsList.innerHTML = `
            <div class="comment">
                <div class="comment-header">
                    <span class="comment-author">Admin</span>
                    <span class="comment-date">${Utils.formatDate(new Date())}</span>
                </div>
                <div class="comment-content">
                    Ceci est un commentaire de démonstration. Dans une version complète, 
                    les commentaires seraient stockés dans Google Sheets.
                </div>
            </div>
        `;

        modal.dataset.ticketId = ticketId;
        modal.classList.add('active');

        // Fermer les autres modals
        document.querySelectorAll('.modal').forEach(m => {
            if (m.id !== 'commentsModal') {
                m.classList.remove('active');
            }
        });
    }

    addComment() {
        const commentText = document.getElementById('newComment').value;
        if (!commentText.trim()) return;

        const commentsList = document.getElementById('commentsList');
        const comment = document.createElement('div');
        comment.className = 'comment';
        comment.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">${auth.currentUser?.full_name || 'Utilisateur'}</span>
                <span class="comment-date">${Utils.formatDate(new Date())}</span>
            </div>
            <div class="comment-content">${Utils.sanitizeHTML(commentText)}</div>
        `;

        commentsList.appendChild(comment);
        document.getElementById('newComment').value = '';

        Utils.showToast('Commentaire ajouté', 'success');
    }

    updateBadge() {
        const openTickets = this.tickets.filter(t => t.status === 'open').length;
        const badge = document.getElementById('ticket-badge');
        if (badge) {
            badge.textContent = openTickets;
            if (openTickets > 0) {
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    updateStats() {
        const stats = {
            total: this.tickets.length,
            open: this.tickets.filter(t => t.status === 'open').length,
            in_progress: this.tickets.filter(t => t.status === 'in_progress').length,
            resolved: this.tickets.filter(t => t.status === 'resolved').length,
            critical: this.tickets.filter(t => t.priority === 'critical').length
        };

        const statsElement = document.getElementById('tickets-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stats-summary">
                    <div class="stat-item">
                        <span class="stat-number">${stats.total}</span>
                        <span class="stat-label">Total</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.open}</span>
                        <span class="stat-label">Ouverts</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.in_progress}</span>
                        <span class="stat-label">En cours</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.critical}</span>
                        <span class="stat-label">Critiques</span>
                    </div>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Recherche tickets
        const searchInput = document.getElementById('ticketSearch');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchTickets(e.target.value);
            }, 300));
        }

        // Filtres
        const filterSelect = document.getElementById('ticketFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterTickets(e.target.value);
            });
        }
    }

    async searchTickets(query) {
        if (!query) {
            this.renderTicketsTable();
            return;
        }

        const filtered = this.tickets.filter(ticket =>
            ticket.title?.toLowerCase().includes(query.toLowerCase()) ||
            ticket.description?.toLowerCase().includes(query.toLowerCase())
        );

        this.renderFilteredTickets(filtered);
    }

    async filterTickets(filter) {
        if (!filter || filter === 'all') {
            this.renderTicketsTable();
            return;
        }

        const filtered = this.tickets.filter(ticket =>
            ticket.status === filter || ticket.priority === filter || ticket.category === filter
        );

        this.renderFilteredTickets(filtered);
    }

    renderFilteredTickets(filtered) {
        const tbody = document.querySelector('#tickets-table tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Aucun résultat trouvé</h3>
                        <p>Aucun ticket ne correspond à votre recherche/filtre</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Utiliser la même logique de rendu que renderTicketsTable mais avec les données filtrées
        tbody.innerHTML = filtered.map(ticket => {
            const project = this.projects.find(p => p.id === ticket.project_id);
            const client = this.clients.find(c => c.id === ticket.client_id);

            return `
                <tr class="ticket-row ${this.getTicketRowClass(ticket)}">
                    <td>${ticket.title}</td>
                    <td>${client?.company_name || 'N/A'}</td>
                    <td>
                        <span class="badge ${this.getCategoryBadgeClass(ticket.category)}">
                            ${this.getCategoryLabel(ticket.category)}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${this.getPriorityBadgeClass(ticket.priority)}">
                            ${this.getPriorityLabel(ticket.priority)}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge status-${ticket.status?.toLowerCase() || 'open'}">
                            ${this.getStatusLabel(ticket.status)}
                        </span>
                    </td>
                    <td>${Utils.formatDate(ticket.created_at)}</td>
                    <td>
                        <button class="btn-icon" onclick="tickets.viewTicket('${ticket.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="tickets.editTicket('${ticket.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    editTicket(ticketId) {
        this.openTicketModal(ticketId);
    }
}

// Initialiser le gestionnaire de tickets
const tickets = new TicketsManager();