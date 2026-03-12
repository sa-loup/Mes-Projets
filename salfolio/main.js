document.addEventListener('DOMContentLoaded', function() {
    // Typing animation
    const typingText = document.querySelector('.typing-text');
    const texts = [
        "console.log('Bonjour, monde!');",
        "function developAwesomeWebsites() { ... }",
        "const salem = new FullStackDeveloper();"
    ];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;
    
    function type() {
        const currentText = texts[textIndex];
        
        if (isDeleting) {
            typingText.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 50;
        } else {
            typingText.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 100;
        }
        
        if (!isDeleting && charIndex === currentText.length) {
            isDeleting = true;
            typingSpeed = 1500; // Pause at end of text
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % texts.length;
            typingSpeed = 500; // Pause before typing next text
        }
        
        setTimeout(type, typingSpeed);
    }
    
    // Start typing animation after a short delay
    setTimeout(type, 1000);
    
    // Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    // Fonction pour mettre à jour la section active
    function setActiveSection() {
        const scrollPosition = window.scrollY + 100;
        let currentSection = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop - 50 && scrollPosition < sectionTop + sectionHeight - 50) {
                currentSection = section.getAttribute('id');
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
        
        // Mettre à jour la navigation
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === currentSection) {
                link.classList.add('active');
            }
        });
    }
    
    // Gestion du clic sur les liens de navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-section');
            const targetSection = document.getElementById(targetId);
            
            // Mettre à jour les classes actives
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            sections.forEach(s => s.classList.remove('active'));
            targetSection.classList.add('active');
            
            // Scroll vers la section
            window.scrollTo({
                top: targetSection.offsetTop,
                behavior: 'smooth'
            });
            
            // Mettre à jour l'URL sans recharger la page
            history.pushState(null, null, `#${targetId}`);
        });
    });
    
    // Gestion du scroll
    window.addEventListener('scroll', setActiveSection);
    
    // Initialisation au chargement
    function initializeActiveSection() {
        if (window.location.hash) {
            const sectionId = window.location.hash.substring(1);
            const correspondingLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
            
            if (correspondingLink) {
                navLinks.forEach(l => l.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                
                correspondingLink.classList.add('active');
                document.getElementById(sectionId).classList.add('active');
                window.scrollTo({
                    top: document.getElementById(sectionId).offsetTop,
                    behavior: 'auto'
                });
            }
        } else {
            navLinks[0].classList.add('active');
            sections[0].classList.add('active');
        }
    }
    
    initializeActiveSection();
    
    // Gestion du formulaire de contact
    const contactForm = document.getElementById('contactForm');
    const customAlert = document.getElementById('customAlert');
    const alertClose = document.querySelector('.alert-close');
    const alertTitle = document.querySelector('.alert-title');
    const alertMessage = document.querySelector('.alert-message');
    const alertIcon = document.querySelector('.alert-icon i');
    
    // Fermer l'alerte
    alertClose.addEventListener('click', () => {
        customAlert.style.display = 'none';
    });
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            
            try {
                // Changer le texte du bouton pendant l'envoi
                submitBtn.innerHTML = 'Envoi en cours... <i class="fas fa-spinner fa-spin"></i>';
                submitBtn.disabled = true;
                
                const formData = new FormData(this);
                const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    // Succès - réinitialiser le formulaire
                    this.reset();
                    
                    // Afficher l'alerte de succès
                    customAlert.classList.remove('error');
                    alertIcon.className = 'fas fa-check-circle';
                    alertTitle.textContent = 'Succès!';
                    alertMessage.textContent = 'Message envoyé avec succès! Je vous répondrai dès que possible.';
                    customAlert.style.display = 'flex';
                    
                    // Masquer automatiquement après 5 secondes
                    setTimeout(() => {
                        customAlert.style.display = 'none';
                    }, 5000);
                } else {
                    throw new Error('Erreur lors de l\'envoi du formulaire');
                }
            } catch (error) {
                console.error('Error:', error);
                
                // Afficher l'alerte d'erreur
                customAlert.classList.add('error');
                alertIcon.className = 'fas fa-exclamation-circle';
                alertTitle.textContent = 'Erreur!';
                alertMessage.textContent = 'Une erreur s\'est produite lors de l\'envoi du message. Veuillez réessayer.';
                customAlert.style.display = 'flex';
                
                // Masquer automatiquement après 5 secondes
                setTimeout(() => {
                    customAlert.style.display = 'none';
                }, 5000);
            } finally {
                // Réinitialiser le bouton
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Mise à jour de l'année dans le footer
    document.getElementById('year').textContent = new Date().getFullYear();
});


// vvvvvvvvvvvvvvvvvv

// Gestion spécifique du bouton "Me contacter"
document.getElementById('contact-button')?.addEventListener('click', function(e) {
    e.preventDefault();
    const contactSection = document.getElementById('contact');
    
    // Activer la section contact
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    contactSection.classList.add('active');
    
    // Activer le lien correspondant dans la navigation
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector('.nav-link[data-section="contact"]').classList.add('active');
    
    // Scroll vers la section
    window.scrollTo({
        top: contactSection.offsetTop,
        behavior: 'smooth'
    });
    
    // Mettre à jour l'URL
    history.pushState(null, null, '#contact');
});