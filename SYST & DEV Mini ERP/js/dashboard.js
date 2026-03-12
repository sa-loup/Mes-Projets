class Dashboard {
    constructor() {
        this.init();
    }

    async init() {
        // Vérifier l'authentification
        auth.protectPage();
        
        // Initialiser les données
        await this.loadDashboardData();
        
        // Initialiser les charts
        this.initCharts();
        
        // Mettre à jour l'interface utilisateur
        this.updateUserUI();
        
        // Configurer les écouteurs d'événements
        this.setupEventListeners();
    }

    async loadDashboardData() {
        try {
            // Charger toutes les données nécessaires
            const [projects, clients, tickets, invoices, tasks] = await Promise.all([
                sheetsAPI.fetchData('Projects'),
                sheetsAPI.fetchData('Clients'),
                sheetsAPI.fetchData('Tickets'),
                sheetsAPI.fetchData('Invoices'),
                sheetsAPI.fetchData('Tasks')
            ]);

            // Calculer les statistiques
            this.updateStats(projects, clients, tickets, invoices, tasks);
            
            // Mettre à jour les projets récents
            this.updateRecentProjects(projects.slice(0, 5));
            
            // Mettre à jour l'activité récente
            this.updateRecentActivity(projects, tickets, invoices);

        } catch (error) {
            console.error('Erreur chargement dashboard:', error);
        }
    }

    updateStats(projects, clients, tickets, invoices, tasks) {
        const statsGrid = document.getElementById('stats-grid');
        
        const stats = {
            projects: {
                value: projects.length,
                label: 'Projets Actifs',
                icon: 'fas fa-project-diagram',
                color: 'var(--primary-color)',
                change: '+12%'
            },
            clients: {
                value: clients.length,
                label: 'Clients',
                icon: 'fas fa-users',
                color: 'var(--secondary-color)',
                change: '+5%'
            },
            tickets: {
                value: tickets.filter(t => t.status !== 'Résolu').length,
                label: 'Tickets Ouverts',
                icon: 'fas fa-ticket-alt',
                color: 'var(--warning-color)',
                change: '-3%'
            },
            revenue: {
                value: invoices
                    .filter(i => i.status === 'Payé')
                    .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0)
                    .toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
                label: 'Revenus Totaux',
                icon: 'fas fa-euro-sign',
                color: 'var(--info-color)',
                change: '+18%'
            }
        };

        statsGrid.innerHTML = Object.values(stats).map(stat => `
            <div class="stat-card fade-in">
                <div class="stat-icon" style="background-color: ${stat.color}20; color: ${stat.color};">
                    <i class="${stat.icon}"></i>
                </div>
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
                <div class="stat-change" style="color: ${stat.change.startsWith('+') ? 'var(--secondary-color)' : 'var(--danger-color)'}">
                    ${stat.change}
                </div>
            </div>
        `).join('');
    }

    updateRecentProjects(projects) {
        const tbody = document.querySelector('#recent-projects tbody');
        
        tbody.innerHTML = projects.map(project => `
            <tr class="slide-in">
                <td>
                    <div class="project-name">${project.name}</div>
                    <small class="text-muted">#${project.id}</small>
                </td>
                <td>${project.client_name || 'N/A'}</td>
                <td>
                    <span class="status-badge status-${project.status?.toLowerCase() || 'pending'}">
                        ${this.getStatusLabel(project.status)}
                    </span>
                </td>
                <td>${this.formatDate(project.deadline)}</td>
                <td>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${project.progress || 0}%"></div>
                        <span class="progress-text">${project.progress || 0}%</span>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateRecentActivity(projects, tickets, invoices) {
        const activityList = document.getElementById('activity-list');
        
        // Combiner les activités récentes
        const activities = [
            ...projects.slice(0, 3).map(p => ({
                type: 'project',
                title: `Projet "${p.name}" créé`,
                time: p.created_at,
                icon: 'fas fa-project-diagram',
                color: 'var(--primary-color)'
            })),
            ...tickets.slice(0, 3).map(t => ({
                type: 'ticket',
                title: `Ticket "${t.title}" ouvert`,
                time: t.created_at,
                icon: 'fas fa-ticket-alt',
                color: 'var(--warning-color)'
            })),
            ...invoices.slice(0, 2).map(i => ({
                type: 'invoice',
                title: `Facture #${i.invoice_number} générée`,
                time: i.created_at,
                icon: 'fas fa-file-invoice-dollar',
                color: 'var(--secondary-color)'
            }))
        ];

        // Trier par date
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));

        activityList.innerHTML = activities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div class="activity-icon" style="background-color: ${activity.color}20; color: ${activity.color};">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">${this.formatTimeAgo(activity.time)}</div>
                </div>
            </div>
        `).join('');
    }

    initCharts() {
        // Chart: Projets par statut
        const projectsCtx = document.getElementById('projectsChart').getContext('2d');
        new Chart(projectsCtx, {
            type: 'doughnut',
            data: {
                labels: ['En cours', 'Terminé', 'En attente', 'Annulé'],
                datasets: [{
                    data: [12, 8, 3, 1],
                    backgroundColor: [
                        'var(--primary-color)',
                        'var(--secondary-color)',
                        'var(--warning-color)',
                        'var(--danger-color)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--text-secondary)',
                            padding: 20
                        }
                    }
                }
            }
        });

        // Chart: Revenus mensuels
        const revenueCtx = document.getElementById('revenueChart').getContext('2d');
        new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
                datasets: [{
                    label: 'Revenus (€)',
                    data: [12000, 19000, 15000, 25000, 22000, 30000],
                    borderColor: 'var(--primary-color)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'var(--border-color)'
                        },
                        ticks: {
                            color: 'var(--text-secondary)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'var(--border-color)'
                        },
                        ticks: {
                            color: 'var(--text-secondary)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'var(--text-secondary)'
                        }
                    }
                }
            }
        });

        // Chart: Tickets par priorité
        const ticketsCtx = document.getElementById('ticketsChart').getContext('2d');
        new Chart(ticketsCtx, {
            type: 'bar',
            data: {
                labels: ['Critique', 'Haute', 'Moyenne', 'Basse'],
                datasets: [{
                    label: 'Nombre de tickets',
                    data: [3, 7, 12, 5],
                    backgroundColor: [
                        'var(--danger-color)',
                        'var(--warning-color)',
                        'var(--info-color)',
                        'var(--secondary-color)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'var(--border-color)'
                        },
                        ticks: {
                            color: 'var(--text-secondary)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'var(--border-color)'
                        },
                        ticks: {
                            color: 'var(--text-secondary)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    getStatusLabel(status) {
        const statusMap = {
            'pending': 'En attente',
            'in_progress': 'En cours',
            'completed': 'Terminé',
            'cancelled': 'Annulé'
        };
        return statusMap[status?.toLowerCase()] || status || 'Inconnu';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('fr-FR');
    }

    formatTimeAgo(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return `Il y a ${diffMins} min`;
        } else if (diffHours < 24) {
            return `Il y a ${diffHours} h`;
        } else {
            return `Il y a ${diffDays} j`;
        }
    }

    updateUserUI() {
        // Mettre à jour le nom et l'avatar
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');
        
        if (auth.currentUser) {
            userName.textContent = auth.currentUser.full_name;
            userAvatar.textContent = auth.currentUser.full_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase();
        }
    }

    setupEventListeners() {
        // Menu toggle
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    }
}

// Initialiser le dashboard quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});