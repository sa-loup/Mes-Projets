class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        this.checkSession();
        this.setupEventListeners();
    }

    async checkSession() {
        const userData = sessionStorage.getItem('user_session');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUIForLoggedInUser();
        }
    }

    async login(email, password) {
        console.log('Tentative de connexion pour:', email);
        try {
            // Récupérer les utilisateurs
            const users = await sheetsAPI.fetchData('Users');
            console.log('Utilisateurs récupérés:', users.length);

            const user = users.find(u => u.email === email);

            if (!user) {
                console.error('Utilisateur non trouvé:', email);
                throw new Error('Utilisateur non trouvé');
            }

            // Vérifier le mot de passe (simple hash pour démo)
            const hashedPassword = this.simpleHash(password);
            console.log('Vérification du mot de passe...');

            if (user.password_hash !== hashedPassword) {
                console.error('Mot de passe incorrect pour:', email);
                throw new Error('Mot de passe incorrect');
            }

            // Mettre à jour la session
            this.currentUser = {
                id: user.id,
                email: user.email,
                role: user.role,
                full_name: user.full_name,
                last_login: new Date().toISOString()
            };

            // Sauvegarder en session
            sessionStorage.setItem('user_session', JSON.stringify(this.currentUser));
            console.log('Session sauvegardée pour:', this.currentUser.full_name);

            // IMPORTANT: Désactivé temporairement pour éviter l'erreur 401
            // La mise à jour du last_login nécessite des permissions OAuth2
            // Pour le développement, nous sautons cette étape

            console.log('Mise à jour last_login désactivée (besoin OAuth2 pour écriture)');

            // Ancien code qui causait l'erreur 401:
            // await sheetsAPI.updateData('Users', user.id, {
            //     ...user,
            //     last_login: new Date().toISOString()
            // });

            // Redirection
            console.log('Redirection vers dashboard.html...');
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error('Erreur login détaillée:', error);
            this.showError(error.message);
        }
    }

    logout() {
        sessionStorage.removeItem('user_session');
        this.currentUser = null;
        window.location.href = 'index.html';
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role?.toLowerCase() === 'admin';
    }

    canEdit() {
        return this.isAdmin();
    }

    canDelete() {
        return this.isAdmin();
    }

    canCreate() {
        // Tout le monde peut créer selon la demande
        return this.isAuthenticated();
    }

    simpleHash(str) {
        // Hash simple pour démo (remplacer par bcrypt en production)
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    updateUIForLoggedInUser() {
        // Mettre à jour l'interface utilisateur
        const userElements = document.querySelectorAll('.user-name, .user-role');
        userElements.forEach(el => {
            if (el.classList.contains('user-name')) {
                el.textContent = this.currentUser.full_name;
            }
            if (el.classList.contains('user-role')) {
                el.textContent = this.currentUser.role;
            }
        });
    }

    showError(message) {
        // Afficher un message d'erreur
        const errorDiv = document.getElementById('error-message') ||
            document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        document.querySelector('.login-container')?.appendChild(errorDiv);

        // Style pour le message d'erreur
        errorDiv.style.cssText = `
            background-color: var(--danger-color);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 16px;
            text-align: center;
            animation: fadeIn 0.3s ease-out;
        `;

        setTimeout(() => {
            errorDiv.style.opacity = '0';
            errorDiv.style.transition = 'opacity 0.3s ease-out';
            setTimeout(() => errorDiv.remove(), 300);
        }, 5000);
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Login form
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;

                    // Afficher un indicateur de chargement
                    const submitBtn = loginForm.querySelector('button[type="submit"]');
                    const originalText = submitBtn.innerHTML;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
                    submitBtn.disabled = true;

                    this.login(email, password).finally(() => {
                        // Réinitialiser le bouton en cas d'erreur
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    });
                });
            }

            // Logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            }
        });
    }

    protectPage() {
        if (!this.isAuthenticated()) {
            console.warn('Utilisateur non authentifié, redirection vers login');
            window.location.href = 'index.html';
        }
    }

    // Méthode pour mettre à jour le last_login manuellement (si OAuth2 configuré)
    async updateLastLogin(userId) {
        try {
            const users = await sheetsAPI.fetchData('Users');
            const user = users.find(u => u.id === userId);

            if (user) {
                // Uniquement si l'API est configurée avec OAuth2
                await sheetsAPI.updateData('Users', userId, {
                    ...user,
                    last_login: new Date().toISOString()
                });
                console.log('Last login mis à jour');
            }
        } catch (error) {
            console.warn('Impossible de mettre à jour last_login (API en lecture seule):', error);
        }
    }
}

const auth = new AuthSystem();

// Exposer globalement pour compatibilité et debug
window.auth = auth;
window.login = (email, password) => auth.login(email, password);