// Initialisation globale de l'application
class App {
    constructor() {
        this.init();
    }

    init() {
        this.setupGlobalEventListeners();
        this.setupSidebar();
        this.checkAuth();
    }

    setupGlobalEventListeners() {
        // Gestion du menu responsive
        document.addEventListener('click', (e) => {
            if (e.target.matches('.menu-toggle') || e.target.closest('.menu-toggle')) {
                document.getElementById('sidebar').classList.toggle('active');
            }

            // Fermer sidebar en cliquant à l'extérieur sur mobile
            if (window.innerWidth <= 1024) {
                if (!e.target.closest('.sidebar') && !e.target.closest('.menu-toggle')) {
                    document.getElementById('sidebar')?.classList.remove('active');
                }
            }
        });

        // Gestion des tabs
        document.addEventListener('click', (e) => {
            if (e.target.matches('.tab')) {
                const tabId = e.target.dataset.tab;
                this.switchTab(tabId, e.target);
            }
        });

        // Fermer les modals
        document.addEventListener('click', (e) => {
            if (e.target.matches('.modal-close, .modal')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                }
            }
        });

        // Empêcher la fermeture du modal en cliquant à l'intérieur
        document.addEventListener('click', (e) => {
            if (e.target.closest('.modal-content')) {
                e.stopPropagation();
            }
        });
    }

    switchTab(tabId, clickedTab) {
        // Mettre à jour l'onglet actif
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        clickedTab.classList.add('active');

        // Afficher le contenu correspondant
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabId}-tab`).classList.add('active');
    }

    setupSidebar() {
        // Ajouter le menu Utilisateurs pour les admins
        const sidebarMenu = document.querySelector('.sidebar-menu');
        const logoutBtn = document.getElementById('logout-btn');

        if (auth.isAdmin() && !document.querySelector('a[href="users.html"]')) {
            const usersItem = document.createElement('a');
            usersItem.href = 'users.html';
            usersItem.className = 'menu-item';
            usersItem.innerHTML = '<i class="fas fa-user-shield"></i> <span>Utilisateurs</span>';
            sidebarMenu.insertBefore(usersItem, logoutBtn.previousElementSibling);
        }

        // Activer l'élément de menu courant
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        document.querySelectorAll('.menu-item').forEach(item => {
            const href = item.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'dashboard.html')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    checkAuth() {
        // Ne vérifier l'authentification que sur les pages protégées
        const publicPages = ['index.html', ''];
        const currentPage = window.location.pathname.split('/').pop();

        if (!publicPages.includes(currentPage)) {
            if (!sessionStorage.getItem('user_session')) {
                window.location.href = 'index.html';
            }
        }
    }

    static showLoading(element) {
        element.innerHTML = '<div class="loading-spinner"></div>';
        element.classList.add('loading');
    }

    static hideLoading(element) {
        element.classList.remove('loading');
    }

    static formatDateForInput(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    }

    static formatDateTimeForInput(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});