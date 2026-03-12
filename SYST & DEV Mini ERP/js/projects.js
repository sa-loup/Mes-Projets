class ProjectsManager {
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
            const [projects, clients, services] = await Promise.all([
                sheetsAPI.fetchData('Projects'),
                sheetsAPI.fetchData('Clients'),
                sheetsAPI.fetchData('Services')
            ]);

            this.projects = projects;
            this.clients = clients;
            this.services = services;

            this.renderProjectsTable();
            this.updateStats();
        } catch (error) {
            console.error('Erreur chargement projets:', error);
            Utils.showToast('Erreur lors du chargement des projets', 'error');
        }
    }

    renderProjectsTable() {
        const tbody = document.querySelector('#projects-table tbody');
        if (!tbody) return;

        if (this.projects.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-project-diagram"></i>
                        <h3>Aucun projet trouvé</h3>
                        <p>Commencez par créer votre premier projet</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.projects.map(project => {
            const client = this.clients.find(c => c.id === project.client_id);
            const service = this.services.find(s => s.id === project.service_id);

            return `
                <tr class="project-row" data-id="${project.id}">
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="project-icon ${this.getProjectIcon(project.category)}">
                                <i class="fas fa-${this.getProjectIcon(project.category)}"></i>
                            </div>
                            <div>
                                <div class="font-weight-600">${project.name}</div>
                                <small class="text-muted">${service?.name || 'N/A'}</small>
                            </div>
                        </div>
                    </td>
                    <td>${client?.company_name || 'N/A'}</td>
                    <td>${Utils.formatDate(project.start_date)}</td>
                    <td>${Utils.formatDate(project.deadline)}</td>
                    <td>
                        <span class="budget">${Utils.formatCurrency(project.budget || 0)}</span>
                    </td>
                    <td>
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${project.progress || 0}%"></div>
                            <span class="progress-text">${project.progress || 0}%</span>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge status-${project.status?.toLowerCase() || 'pending'}">
                            ${this.getStatusLabel(project.status)}
                        </span>
                    </td>
                    <td>
                        <div class="actions">
                            <button class="btn-icon" onclick="projects.viewProject('${project.id}')" title="Voir">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon" onclick="projects.editProject('${project.id}')" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon" onclick="projects.generateSpecs('${project.id}')" title="Cahier des charges">
                                <i class="fas fa-file-contract"></i>
                            </button>
                            ${auth.canDelete() ? `
                                <button class="btn-icon btn-danger" onclick="projects.deleteProject('${project.id}')" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getProjectIcon(category) {
        const icons = {
            'web': 'globe',
            'mobile': 'mobile-alt',
            'design': 'palette'
        };
        return icons[category] || 'project-diagram';
    }

    getStatusLabel(status) {
        const statusMap = {
            'pending': 'En attente',
            'in_progress': 'En cours',
            'on_hold': 'En suspens',
            'completed': 'Terminé',
            'cancelled': 'Annulé'
        };
        return statusMap[status] || status || 'En attente';
    }

    renderModals() {
        // Modal Projet
        const projectModal = document.createElement('div');
        projectModal.className = 'modal modal-lg';
        projectModal.id = 'projectModal';
        projectModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="projectModalTitle">Nouveau Projet</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="projectForm">
                        <input type="hidden" id="projectId">
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="projectName">Nom du projet *</label>
                                <input type="text" id="projectName" required>
                            </div>
                            <div class="form-group">
                                <label for="projectClient">Client *</label>
                                <select id="projectClient" required>
                                    <option value="">Sélectionner un client</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="projectService">Service *</label>
                                <select id="projectService" required>
                                    <option value="">Sélectionner un service</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="projectCategory">Catégorie</label>
                                <select id="projectCategory">
                                    <option value="web">Développement Web</option>
                                    <option value="mobile">Développement Mobile</option>
                                    <option value="design">Design Graphique</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="projectStart">Date de début</label>
                                <input type="date" id="projectStart">
                            </div>
                            <div class="form-group">
                                <label for="projectDeadline">Deadline *</label>
                                <input type="date" id="projectDeadline" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="projectBudget">Budget (€)</label>
                                <input type="number" id="projectBudget" min="0" step="0.01">
                            </div>
                            <div class="form-group">
                                <label for="projectProgress">Progression (%)</label>
                                <input type="range" id="projectProgress" min="0" max="100" value="0">
                                <span id="progressValue">0%</span>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="projectStatus">Statut</label>
                                <select id="projectStatus">
                                    <option value="pending">En attente</option>
                                    <option value="in_progress">En cours</option>
                                    <option value="on_hold">En suspens</option>
                                    <option value="completed">Terminé</option>
                                    <option value="cancelled">Annulé</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="projectPriority">Priorité</label>
                                <select id="projectPriority">
                                    <option value="low">Basse</option>
                                    <option value="medium" selected>Moyenne</option>
                                    <option value="high">Haute</option>
                                    <option value="critical">Critique</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="projectDescription">Description</label>
                            <textarea id="projectDescription" rows="4"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="projectTeam">Équipe (IDs séparés par des virgules)</label>
                            <input type="text" id="projectTeam" placeholder="user1, user2, user3">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="projects.closeModal()">Annuler</button>
                    <button type="button" class="btn btn-primary" onclick="projects.saveProject()">Enregistrer</button>
                </div>
            </div>
        `;
        document.body.appendChild(projectModal);
    }

    openProjectModal(projectId = null) {
        const modal = document.getElementById('projectModal');
        const title = document.getElementById('projectModalTitle');

        // Remplir les select
        this.populateClientSelect();
        this.populateServiceSelect();

        if (projectId) {
            // Mode édition
            const project = this.projects.find(p => p.id === projectId);
            if (project) {
                title.textContent = 'Modifier Projet';
                document.getElementById('projectId').value = project.id;
                document.getElementById('projectName').value = project.name || '';
                document.getElementById('projectClient').value = project.client_id || '';
                document.getElementById('projectService').value = project.service_id || '';
                document.getElementById('projectCategory').value = project.category || 'web';
                document.getElementById('projectStart').value = App.formatDateForInput(project.start_date);
                document.getElementById('projectDeadline').value = App.formatDateForInput(project.deadline);
                document.getElementById('projectBudget').value = project.budget || '';
                document.getElementById('projectProgress').value = project.progress || 0;
                document.getElementById('progressValue').textContent = `${project.progress || 0}%`;
                document.getElementById('projectStatus').value = project.status || 'pending';
                document.getElementById('projectPriority').value = project.priority || 'medium';
                document.getElementById('projectDescription').value = project.description || '';
                document.getElementById('projectTeam').value = project.team_members || '';
            }
        } else {
            // Mode création
            title.textContent = 'Nouveau Projet';
            document.getElementById('projectForm').reset();
            document.getElementById('projectId').value = '';
            document.getElementById('progressValue').textContent = '0%';
        }

        // Écouter le changement du slider de progression
        const progressSlider = document.getElementById('projectProgress');
        const progressValue = document.getElementById('progressValue');
        progressSlider.addEventListener('input', function () {
            progressValue.textContent = `${this.value}%`;
        });

        modal.classList.add('active');
    }

    populateClientSelect() {
        const select = document.getElementById('projectClient');
        select.innerHTML = '<option value="">Sélectionner un client</option>' +
            this.clients.map(client => `
                <option value="${client.id}">${client.company_name} (${client.contact_person})</option>
            `).join('');
    }

    populateServiceSelect() {
        const select = document.getElementById('projectService');
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

    async saveProject() {
        const form = document.getElementById('projectForm');
        if (!form.checkValidity()) {
            Utils.showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        const projectData = {
            id: document.getElementById('projectId').value || Utils.generateId(),
            name: document.getElementById('projectName').value,
            client_id: document.getElementById('projectClient').value,
            service_id: document.getElementById('projectService').value,
            category: document.getElementById('projectCategory').value,
            start_date: document.getElementById('projectStart').value || new Date().toISOString(),
            deadline: document.getElementById('projectDeadline').value,
            budget: document.getElementById('projectBudget').value || 0,
            progress: document.getElementById('projectProgress').value,
            status: document.getElementById('projectStatus').value,
            priority: document.getElementById('projectPriority').value,
            description: document.getElementById('projectDescription').value,
            team_members: document.getElementById('projectTeam').value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            const isEdit = !!document.getElementById('projectId').value;
            console.log('[Projects] Enregistrement...', { isEdit, projectData });

            const response = await sheetsAPI.saveData('Projects', projectData, isEdit);
            console.log('[Projects] Réponse API:', response);

            Utils.showToast(isEdit ? 'Projet modifié avec succès' : 'Projet créé avec succès', 'success');

            this.closeModal();
            await this.loadData();
        } catch (error) {
            console.error('Erreur sauvegarde projet:', error);
            alert('Erreur lors de la sauvegarde du projet: ' + error.message);
            Utils.showToast('Erreur lors de la sauvegarde', 'error');
        }
    }

    async deleteProject(projectId) {
        const confirm = await Utils.confirm('Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.');
        if (!confirm) return;

        try {
            await sheetsAPI.deleteData('Projects', projectId);
            Utils.showToast('Projet supprimé avec succès', 'success');
            await this.loadData();
        } catch (error) {
            console.error('Erreur suppression projet:', error);
            Utils.showToast('Erreur lors de la suppression', 'error');
        }
    }

    viewProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        const client = this.clients.find(c => c.id === project.client_id);
        const service = this.services.find(s => s.id === project.service_id);

        const viewModal = document.createElement('div');
        viewModal.className = 'modal modal-lg';
        viewModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${project.name}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="project-details">
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
                                <span class="detail-label">Date de début:</span>
                                <span class="detail-value">${Utils.formatDate(project.start_date)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Deadline:</span>
                                <span class="detail-value">${Utils.formatDate(project.deadline)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Budget:</span>
                                <span class="detail-value">${Utils.formatCurrency(project.budget || 0)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Progression:</span>
                                <span class="detail-value">
                                    <div class="progress-container">
                                        <div class="progress-bar" style="width: ${project.progress || 0}%"></div>
                                        <span class="progress-text">${project.progress || 0}%</span>
                                    </div>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Statut:</span>
                                <span class="detail-value">
                                    <span class="status-badge status-${project.status?.toLowerCase() || 'pending'}">
                                        ${this.getStatusLabel(project.status)}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Priorité:</span>
                                <span class="detail-value">
                                    <span class="badge ${this.getPriorityBadgeClass(project.priority)}">
                                        ${this.getPriorityLabel(project.priority)}
                                    </span>
                                </span>
                            </div>
                        </div>
                        
                        ${project.description ? `
                            <div class="detail-section">
                                <h4>Description</h4>
                                <div class="description-content">${project.description}</div>
                            </div>
                        ` : ''}
                        
                        ${project.team_members ? `
                            <div class="detail-section">
                                <h4>Équipe</h4>
                                <div class="team-members">
                                    ${project.team_members.split(',').map(member =>
            `<span class="team-member">${member.trim()}</span>`
        ).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                    <button type="button" class="btn btn-primary" onclick="projects.editProject('${project.id}'); this.closest('.modal').remove()">
                        Modifier
                    </button>
                    <button type="button" class="btn btn-info" onclick="projects.generateSpecs('${project.id}'); this.closest('.modal').remove()">
                        <i class="fas fa-file-contract"></i> Cahier des charges
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(viewModal);
        viewModal.classList.add('active');
    }

    getPriorityLabel(priority) {
        const priorityMap = {
            'low': 'Basse',
            'medium': 'Moyenne',
            'high': 'Haute',
            'critical': 'Critique'
        };
        return priorityMap[priority] || priority || 'Moyenne';
    }

    getPriorityBadgeClass(priority) {
        const classMap = {
            'low': 'badge-info',
            'medium': 'badge-primary',
            'high': 'badge-warning',
            'critical': 'badge-danger'
        };
        return classMap[priority] || 'badge-primary';
    }

    async generateSpecs(projectId) {
        try {
            const project = this.projects.find(p => p.id === projectId);
            if (!project) {
                Utils.showToast('Projet non trouvé', 'error');
                return;
            }

            const client = this.clients.find(c => c.id === project.client_id);
            const service = this.services.find(s => s.id === project.service_id);

            const specsData = {
                ...project,
                client_name: client?.company_name || 'N/A',
                service_name: service?.name || 'N/A',
                client_contact: client?.contact_person || 'N/A',
                client_email: client?.email || 'N/A'
            };

            await PDFGenerator.generateSpecs(specsData);
            Utils.showToast('Cahier des charges généré avec succès', 'success');
        } catch (error) {
            console.error('Erreur génération cahier des charges:', error);
            Utils.showToast('Erreur lors de la génération', 'error');
        }
    }

    async searchProjects(query) {
        if (!query) {
            this.renderProjectsTable();
            return;
        }

        const filtered = this.projects.filter(project =>
            project.name?.toLowerCase().includes(query.toLowerCase()) ||
            project.description?.toLowerCase().includes(query.toLowerCase())
        );

        const tbody = document.querySelector('#projects-table tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Aucun résultat trouvé</h3>
                        <p>Aucun projet ne correspond à votre recherche</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Re-render avec les résultats filtrés
        tbody.innerHTML = filtered.map(project => {
            const client = this.clients.find(c => c.id === project.client_id);
            const service = this.services.find(s => s.id === project.service_id);

            return `
                <tr>
                    <td>${project.name}</td>
                    <td>${client?.company_name || 'N/A'}</td>
                    <td>${Utils.formatDate(project.start_date)}</td>
                    <td>${Utils.formatDate(project.deadline)}</td>
                    <td>${Utils.formatCurrency(project.budget || 0)}</td>
                    <td>
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${project.progress || 0}%"></div>
                            <span class="progress-text">${project.progress || 0}%</span>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge status-${project.status?.toLowerCase() || 'pending'}">
                            ${this.getStatusLabel(project.status)}
                        </span>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="projects.viewProject('${project.id}')" title="Voir">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${auth.canEdit() ? `
                            <button class="btn-icon" onclick="projects.editProject('${project.id}')" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        ${auth.canDelete() ? `
                            <button class="btn-icon btn-danger" onclick="projects.deleteProject('${project.id}')" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateStats() {
        const stats = {
            total: this.projects.length,
            active: this.projects.filter(p => p.status === 'in_progress').length,
            completed: this.projects.filter(p => p.status === 'completed').length,
            overdue: this.projects.filter(p => {
                if (!p.deadline) return false;
                return new Date(p.deadline) < new Date() && p.status !== 'completed';
            }).length
        };

        const statsElement = document.getElementById('projects-stats');
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
                        <span class="stat-number">${stats.completed}</span>
                        <span class="stat-label">Terminés</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.overdue}</span>
                        <span class="stat-label">En retard</span>
                    </div>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Recherche projets
        const searchInput = document.getElementById('projectSearch');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchProjects(e.target.value);
            }, 300));
        }

        // Filtres
        const filterSelect = document.getElementById('projectFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                // Implémenter le filtrage par statut
            });
        }
    }

    editProject(projectId) {
        this.openProjectModal(projectId);
    }
}

// Initialiser le gestionnaire de projets
const projects = new ProjectsManager();