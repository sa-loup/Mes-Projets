class TasksManager {
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
            const [tasks, projects] = await Promise.all([
                sheetsAPI.fetchData('Tasks'),
                sheetsAPI.fetchData('Projects')
            ]);

            this.tasks = tasks;
            this.projects = projects;

            this.renderTasksTable();
            this.updateStats();
        } catch (error) {
            console.error('Erreur chargement tâches:', error);
            Utils.showToast('Erreur lors du chargement des tâches', 'error');
        }
    }

    renderTasksTable() {
        const tbody = document.querySelector('#tasks-table tbody');
        if (!tbody) return;

        if (this.tasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-tasks"></i>
                        <h3>Aucune tâche trouvée</h3>
                        <p>Commencez par créer votre première tâche</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.tasks.map(task => {
            const project = this.projects.find(p => p.id === task.project_id);

            return `
                <tr class="task-row ${this.getTaskRowClass(task)}" data-id="${task.id}">
                    <td>
                        <div class="task-title">
                            <div class="font-weight-600">${task.title}</div>
                            <small class="text-muted">${project?.name || 'Sans projet'}</small>
                        </div>
                    </td>
                    <td>${task.assigned_to || 'Non assigné'}</td>
                    <td>
                        <span class="badge ${this.getPriorityBadgeClass(task.priority)}">
                            ${this.getPriorityLabel(task.priority)}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge status-${task.status?.toLowerCase() || 'todo'}">
                            ${this.getStatusLabel(task.status)}
                        </span>
                    </td>
                    <td>${Utils.formatDate(task.deadline)}</td>
                    <td>
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${this.calculateTaskProgress(task)}%"></div>
                            <span class="progress-text">${this.calculateTaskProgress(task)}%</span>
                        </div>
                    </td>
                    <td>
                        <div class="actions">
                            <button class="btn-icon" onclick="tasks.viewTask('${task.id}')" title="Voir">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${auth.canEdit() ? `
                                <button class="btn-icon" onclick="tasks.editTask('${task.id}')" title="Modifier">
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : ''}
                            <button class="btn-icon" onclick="tasks.toggleTaskStatus('${task.id}')" title="Basculer statut">
                                <i class="fas fa-check"></i>
                            </button>
                            ${auth.canDelete() ? `
                                <button class="btn-icon btn-danger" onclick="tasks.deleteTask('${task.id}')" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getTaskRowClass(task) {
        if (task.status === 'completed') return 'task-completed';
        if (this.isTaskOverdue(task)) return 'task-overdue';
        if (task.priority === 'high') return 'task-high';
        return '';
    }

    isTaskOverdue(task) {
        if (!task.deadline || task.status === 'completed') return false;
        return new Date(task.deadline) < new Date();
    }

    calculateTaskProgress(task) {
        if (task.status === 'completed') return 100;
        if (task.status === 'in_progress') return 50;
        return 0;
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
            'todo': 'À faire',
            'in_progress': 'En cours',
            'completed': 'Terminée',
            'on_hold': 'En suspens'
        };
        return labels[status] || status || 'À faire';
    }

    renderModals() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'taskModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="taskModalTitle">Nouvelle Tâche</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="taskForm">
                        <input type="hidden" id="taskId">
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="taskTitle">Titre *</label>
                                <input type="text" id="taskTitle" required>
                            </div>
                            <div class="form-group">
                                <label for="taskProject">Projet</label>
                                <select id="taskProject">
                                    <option value="">Sans projet</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="taskAssigned">Assigné à</label>
                                <input type="text" id="taskAssigned" placeholder="Nom de l'utilisateur">
                            </div>
                            <div class="form-group">
                                <label for="taskPriority">Priorité</label>
                                <select id="taskPriority">
                                    <option value="low">Basse</option>
                                    <option value="medium" selected>Moyenne</option>
                                    <option value="high">Haute</option>
                                    <option value="critical">Critique</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="taskStatus">Statut</label>
                                <select id="taskStatus">
                                    <option value="todo">À faire</option>
                                    <option value="in_progress">En cours</option>
                                    <option value="completed">Terminée</option>
                                    <option value="on_hold">En suspens</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="taskDeadline">Deadline</label>
                                <input type="date" id="taskDeadline">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="taskEstimated">Heures estimées</label>
                                <input type="number" id="taskEstimated" min="0" step="0.5" placeholder="ex: 8">
                            </div>
                            <div class="form-group">
                                <label for="taskActual">Heures réelles</label>
                                <input type="number" id="taskActual" min="0" step="0.5">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="taskChecklist">Checklist (une par ligne)</label>
                            <textarea id="taskChecklist" rows="4" placeholder="Tâche 1&#10;Tâche 2&#10;Tâche 3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="tasks.closeModal()">Annuler</button>
                    <button type="button" class="btn btn-primary" onclick="tasks.saveTask()">Enregistrer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    openTaskModal(taskId = null) {
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskModalTitle');

        // Remplir le select des projets
        this.populateProjectSelect();

        if (taskId) {
            // Mode édition
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                title.textContent = 'Modifier Tâche';
                document.getElementById('taskId').value = task.id;
                document.getElementById('taskTitle').value = task.title || '';
                document.getElementById('taskProject').value = task.project_id || '';
                document.getElementById('taskAssigned').value = task.assigned_to || '';
                document.getElementById('taskPriority').value = task.priority || 'medium';
                document.getElementById('taskStatus').value = task.status || 'todo';
                document.getElementById('taskDeadline').value = App.formatDateForInput(task.deadline);
                document.getElementById('taskEstimated').value = task.estimated_hours || '';
                document.getElementById('taskActual').value = task.actual_hours || '';
                document.getElementById('taskChecklist').value = task.checklist || '';
            }
        } else {
            // Mode création
            title.textContent = 'Nouvelle Tâche';
            document.getElementById('taskForm').reset();
            document.getElementById('taskId').value = '';
            document.getElementById('taskStatus').value = 'todo';
            document.getElementById('taskPriority').value = 'medium';
            document.getElementById('taskDeadline').value = App.formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // +7 jours
        }

        modal.classList.add('active');
    }

    populateProjectSelect() {
        const select = document.getElementById('taskProject');
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

    async saveTask() {
        const form = document.getElementById('taskForm');
        if (!form.checkValidity()) {
            Utils.showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }

        const taskData = {
            id: document.getElementById('taskId').value || Utils.generateId(),
            title: document.getElementById('taskTitle').value,
            project_id: document.getElementById('taskProject').value || '',
            assigned_to: document.getElementById('taskAssigned').value,
            priority: document.getElementById('taskPriority').value,
            status: document.getElementById('taskStatus').value,
            deadline: document.getElementById('taskDeadline').value,
            estimated_hours: document.getElementById('taskEstimated').value || 0,
            actual_hours: document.getElementById('taskActual').value || 0,
            checklist: document.getElementById('taskChecklist').value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Si la tâche est marquée comme terminée, ajouter la date de complétion
        if (taskData.status === 'completed' && !taskData.completed_at) {
            taskData.completed_at = new Date().toISOString();
        }

        try {
            const isEdit = !!document.getElementById('taskId').value;
            await sheetsAPI.saveData('Tasks', taskData, isEdit);

            Utils.showToast(isEdit ? 'Tâche modifiée avec succès' : 'Tâche créée avec succès', 'success');

            this.closeModal();
            await this.loadData();
        } catch (error) {
            console.error('Erreur sauvegarde tâche:', error);
            Utils.showToast('Erreur lors de la sauvegarde', 'error');
        }
    }

    async deleteTask(taskId) {
        const confirm = await Utils.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?');
        if (!confirm) return;

        try {
            await sheetsAPI.deleteData('Tasks', taskId);
            Utils.showToast('Tâche supprimée avec succès', 'success');
            await this.loadData();
        } catch (error) {
            console.error('Erreur suppression tâche:', error);
            Utils.showToast('Erreur lors de la suppression', 'error');
        }
    }

    async toggleTaskStatus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const newStatus = task.status === 'completed' ? 'todo' : 'completed';
        const updatedTask = {
            ...task,
            status: newStatus,
            completed_at: newStatus === 'completed' ? new Date().toISOString() : '',
            updated_at: new Date().toISOString()
        };

        try {
            await sheetsAPI.updateData('Tasks', taskId, updatedTask);
            Utils.showToast(`Tâche marquée comme ${newStatus === 'completed' ? 'terminée' : 'à faire'}`, 'success');
            await this.loadData();
        } catch (error) {
            console.error('Erreur changement statut:', error);
            Utils.showToast('Erreur lors du changement de statut', 'error');
        }
    }

    viewTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const project = this.projects.find(p => p.id === task.project_id);

        const viewModal = document.createElement('div');
        viewModal.className = 'modal';
        viewModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${task.title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="task-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Projet:</span>
                                <span class="detail-value">${project?.name || 'Sans projet'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Assigné à:</span>
                                <span class="detail-value">${task.assigned_to || 'Non assigné'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Priorité:</span>
                                <span class="detail-value">
                                    <span class="badge ${this.getPriorityBadgeClass(task.priority)}">
                                        ${this.getPriorityLabel(task.priority)}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Statut:</span>
                                <span class="detail-value">
                                    <span class="status-badge status-${task.status?.toLowerCase() || 'todo'}">
                                        ${this.getStatusLabel(task.status)}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Deadline:</span>
                                <span class="detail-value">${Utils.formatDate(task.deadline)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Heures estimées:</span>
                                <span class="detail-value">${task.estimated_hours || 0}h</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Heures réelles:</span>
                                <span class="detail-value">${task.actual_hours || 0}h</span>
                            </div>
                            ${task.completed_at ? `
                                <div class="detail-item">
                                    <span class="detail-label">Terminée le:</span>
                                    <span class="detail-value">${Utils.formatDate(task.completed_at)}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${task.checklist ? `
                            <div class="detail-section">
                                <h4>Checklist</h4>
                                <div class="checklist">
                                    ${task.checklist.split('\n').map(item => `
                                        <div class="checklist-item">
                                            <input type="checkbox" ${item.startsWith('[x]') ? 'checked' : ''}>
                                            <span>${item.replace('[x]', '').replace('[ ]', '').trim()}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                    <button type="button" class="btn btn-primary" onclick="tasks.editTask('${task.id}'); this.closest('.modal').remove()">
                        Modifier
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(viewModal);
        viewModal.classList.add('active');
    }

    updateStats() {
        const stats = {
            total: this.tasks.length,
            todo: this.tasks.filter(t => t.status === 'todo').length,
            in_progress: this.tasks.filter(t => t.status === 'in_progress').length,
            completed: this.tasks.filter(t => t.status === 'completed').length,
            overdue: this.tasks.filter(t => this.isTaskOverdue(t)).length
        };

        const statsElement = document.getElementById('tasks-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stats-summary">
                    <div class="stat-item">
                        <span class="stat-number">${stats.total}</span>
                        <span class="stat-label">Total</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.todo}</span>
                        <span class="stat-label">À faire</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.in_progress}</span>
                        <span class="stat-label">En cours</span>
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
        // Recherche tâches
        const searchInput = document.getElementById('taskSearch');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchTasks(e.target.value);
            }, 300));
        }

        // Filtres
        const filterSelect = document.getElementById('taskFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterTasks(e.target.value);
            });
        }
    }

    async searchTasks(query) {
        if (!query) {
            this.renderTasksTable();
            return;
        }

        const filtered = this.tasks.filter(task =>
            task.title?.toLowerCase().includes(query.toLowerCase()) ||
            task.assigned_to?.toLowerCase().includes(query.toLowerCase())
        );

        this.renderFilteredTasks(filtered);
    }

    async filterTasks(filter) {
        if (!filter || filter === 'all') {
            this.renderTasksTable();
            return;
        }

        const filtered = this.tasks.filter(task =>
            task.status === filter || task.priority === filter
        );

        this.renderFilteredTasks(filtered);
    }

    renderFilteredTasks(filtered) {
        const tbody = document.querySelector('#tasks-table tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Aucun résultat trouvé</h3>
                        <p>Aucune tâche ne correspond à votre recherche/filtre</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(task => {
            const project = this.projects.find(p => p.id === task.project_id);

            return `
                <tr class="task-row ${this.getTaskRowClass(task)}">
                    <td>${task.title}</td>
                    <td>${task.assigned_to || 'Non assigné'}</td>
                    <td>
                        <span class="badge ${this.getPriorityBadgeClass(task.priority)}">
                            ${this.getPriorityLabel(task.priority)}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge status-${task.status?.toLowerCase() || 'todo'}">
                            ${this.getStatusLabel(task.status)}
                        </span>
                    </td>
                    <td>${Utils.formatDate(task.deadline)}</td>
                    <td>
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${this.calculateTaskProgress(task)}%"></div>
                            <span class="progress-text">${this.calculateTaskProgress(task)}%</span>
                        </div>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="tasks.viewTask('${task.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="tasks.editTask('${task.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    editTask(taskId) {
        this.openTaskModal(taskId);
    }
}

// Initialiser le gestionnaire de tâches
const tasks = new TasksManager();