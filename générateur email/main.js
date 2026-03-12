document.addEventListener('DOMContentLoaded', function() {
    // Éléments DOM
    const recipientInput = document.getElementById('recipient');
    const objectInput = document.getElementById('object');
    const toneSelect = document.getElementById('tone');
    const urgencySelect = document.getElementById('urgency');
    const contentTextarea = document.getElementById('content');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');
    const sendBtn = document.getElementById('send-btn');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    const emailPreview = document.getElementById('email-preview');
    const actionButtons = document.getElementById('action-buttons');
    const objectCount = document.getElementById('object-count');
    const contentCount = document.getElementById('content-count');
    const settingsBtn = document.getElementById('settings-btn');
    const composeTab = document.querySelector('[data-tab="compose"]');
    const settingsTab = document.querySelector('[data-tab="settings"]');
    const composeTabContent = document.getElementById('compose-tab');
    const settingsTabContent = document.getElementById('settings-tab');
    const templateCards = document.querySelectorAll('.template-card');
    const suggestionItems = document.querySelectorAll('.suggestion-item');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    
    // Variables d'état
    let selectedTemplate = 'demande';
    let emailHistory = [];
    
    // Charger les paramètres depuis le localStorage
    loadSettings();
    
    // Écouteurs d'événements
    templateCards.forEach(card => {
        card.addEventListener('click', function() {
            templateCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            selectedTemplate = this.dataset.template;
            updatePlaceholders();
        });
    });
    
    suggestionItems.forEach(item => {
        item.addEventListener('click', function() {
            contentTextarea.value = this.textContent;
            updateWordCount();
        });
    });
    
    objectInput.addEventListener('input', updateCharCount);
    contentTextarea.addEventListener('input', updateWordCount);
    
    generateBtn.addEventListener('click', generateEmail);
    clearBtn.addEventListener('click', clearForm);
    copyBtn.addEventListener('click', copyEmail);
    sendBtn.addEventListener('click', sendEmail);
    saveTemplateBtn.addEventListener('click', saveTemplate);
    
    settingsBtn.addEventListener('click', openSettings);
    composeTab.addEventListener('click', () => switchTab('compose'));
    settingsTab.addEventListener('click', () => switchTab('settings'));
    saveSettingsBtn.addEventListener('click', saveSettings);
    
    // Fonctions
    function updatePlaceholders() {
        const contentPlaceholders = {
            'demande': "Décrivez votre demande en quelques mots (ex: J'ai besoin d'informations sur le projet X pour le rapport du 15 juin)",
            'reponse': "Décrivez les éléments de réponse (ex: Le projet est en bonne voie, nous aurons les résultats finaux la semaine prochaine)",
            'relance': "Précisez l'objet de votre relance (ex: Le document que vous deviez m'envoyer pour le dossier client Y)",
            'annonce': "Décrivez l'annonce ou l'information à partager (ex: Réunion importante demain à 10h en salle B)",
            'remerciement': "Décrivez le contexte de vos remerciements (ex: Pour votre aide précieuse sur le dossier complexe la semaine dernière)",
            'reclamation': "Décrivez le problème rencontré (ex: Le produit livré ne correspond pas à la commande initiale)"
        };
        
        const objectPlaceholders = {
            'demande': "Demande de [précisez]",
            'reponse': "Réponse : [sujet]",
            'relance': "Relance : [sujet]",
            'annonce': "Annonce : [sujet]",
            'remerciement': "Remerciements",
            'reclamation': "Réclamation : [sujet]"
        };
        
        contentTextarea.placeholder = contentPlaceholders[selectedTemplate] || "Décrivez le contenu de votre email...";
        objectInput.placeholder = objectPlaceholders[selectedTemplate] || "Objet de l'email";
    }
    
    function updateCharCount() {
        const count = objectInput.value.length;
        objectCount.textContent = count;
        
        if (count > 50) {
            objectCount.classList.add('word-count-warning');
        } else {
            objectCount.classList.remove('word-count-warning');
        }
        
        if (count > 60) {
            objectCount.classList.add('word-count-danger');
        } else {
            objectCount.classList.remove('word-count-danger');
        }
    }
    
    function updateWordCount() {
        const text = contentTextarea.value.trim();
        const wordCount = text ? text.split(/\s+/).length : 0;
        contentCount.textContent = wordCount;
        
        if (wordCount < 10) {
            contentCount.classList.add('word-count-warning');
        } else {
            contentCount.classList.remove('word-count-warning');
        }
    }
    
    function generateEmail() {
        const recipient = recipientInput.value.trim();
        const object = objectInput.value.trim();
        const tone = toneSelect.value;
        const urgency = urgencySelect.value;
        const content = contentTextarea.value.trim();
        
        if (!recipient || !object || !content) {
            showAlert('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }
        
        const email = buildEmail(recipient, object, tone, urgency, content, selectedTemplate);
        displayEmail(email);
        actionButtons.style.display = 'flex';
        
        // Sauvegarder dans l'historique
        if (document.getElementById('save-history').checked) {
            saveToHistory(object, content);
        }
    }
    
    function buildEmail(recipient, object, tone, urgency, content, template) {
        // Formules d'appel selon le ton
        const greetings = {
            'formel': `Madame, Monsieur${recipient.includes(',') ? '' : ' ' + recipient},\n\n`,
            'courant': `Bonjour ${recipient},\n\n`,
            'amical': `Salut ${recipient.split(',')[0]},\n\n`
        };
        
        // Formules de politesse selon le ton
        const closings = {
            'formel': `\n\nJe reste à votre disposition pour tout complément d'information.\n\n`,
            'courant': `\n\nN'hésitez pas à me faire savoir si vous avez des questions.\n\n`,
            'amical': `\n\nDis-moi si tu as besoin de plus d'infos !\n\n`
        };
        
        // Contenu selon le type d'email
        const templates = {
            'demande': `Je me permets de vous contacter afin de vous faire part de ma demande concernant :\n${content}\n\nJe vous serais gré de bien vouloir m'indiquer les modalités pour y répondre.`,
            'reponse': `Concernant votre demande, voici les éléments de réponse :\n${content}\n\nJ'espère que ces informations répondent à votre question.`,
            'relance': `Je me permets de vous relancer concernant :\n${content}\n\nPourriez-vous me faire un retour dans les meilleurs délais ?`,
            'annonce': `J'ai le plaisir de vous informer que :\n${content}\n\nJe reste disponible pour toute question supplémentaire.`,
            'remerciement': `Je tenais à vous remercier pour ${content}.\n\nVotre aide/contribution a été précieuse et je l'apprécie grandement.`,
            'reclamation': `Je me permets de vous faire part de mon mécontentement concernant :\n${content}\n\nJe souhaiterais que cette situation soit rectifiée au plus vite.`
        };
        
        // Signature
        let signature = '';
        if (document.getElementById('include-signature').checked) {
            const name = document.getElementById('signature-name').value || '[Votre nom]';
            const position = document.getElementById('signature-position').value || '[Votre poste]';
            const department = document.getElementById('signature-department').value || '[Votre service]';
            const contact = document.getElementById('signature-contact').value || '';
            
            signature = `Cordialement${tone === 'amical' ? ',' : ''}\n${name}\n${position}`;
            if (department) signature += `\n${department}`;
            if (contact) signature += `\n${contact}`;
        }
        
        // Indicateur d'urgence
        let urgencyIndicator = '';
        if (urgency === 'important') {
            urgencyIndicator = ' [IMPORTANT]';
        } else if (urgency === 'urgent') {
            urgencyIndicator = ' [URGENT]';
        }
        
        // Construction de l'email
        let email = `Objet : ${object}${urgencyIndicator}\n\n`;
        email += greetings[tone] || greetings['courant'];
        email += templates[template] || content;
        email += closings[tone] || closings['courant'];
        email += signature;
        
        return email;
    }
    
    function displayEmail(email) {
        // Formatage pour l'affichage HTML
        const formattedEmail = email
            .replace(/\n/g, '<br>')
            .replace(/\[IMPORTANT\]/g, '<span style="color: var(--warning-color); font-weight: bold;">[IMPORTANT]</span>')
            .replace(/\[URGENT\]/g, '<span style="color: var(--danger-color); font-weight: bold;">[URGENT]</span>');
        
        emailPreview.innerHTML = `
            <div class="email-header">
                <strong>Objet :</strong> ${formattedEmail.split('<br><br>')[0]}
            </div>
            <div class="email-body">
                ${formattedEmail.split('<br><br>').slice(1).join('<br><br>')}
            </div>
        `;
    }
    
    function clearForm() {
        recipientInput.value = '';
        objectInput.value = '';
        contentTextarea.value = '';
        emailPreview.innerHTML = '<p style="color: #999; text-align: center;">Votre email apparaitra ici après génération</p>';
        actionButtons.style.display = 'none';
        updateCharCount();
        updateWordCount();
    }
    
    function copyEmail() {
        const emailText = emailPreview.innerText;
        navigator.clipboard.writeText(emailText).then(() => {
            showAlert('Email copié dans le presse-papiers !', 'success');
        }).catch(err => {
            showAlert('Erreur lors de la copie : ' + err, 'error');
        });
    }
    
    function sendEmail() {
        const subject = objectInput.value;
        const body = emailPreview.innerText;
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        window.open(mailtoLink);
    }
    
    function saveTemplate() {
        const templateName = prompt("Donnez un nom à ce modèle :");
        if (templateName) {
            showAlert(`Modèle "${templateName}" sauvegardé !`, 'success');
            // Ici, vous pourriez ajouter la logique pour sauvegarder dans le localStorage
        }
    }
    
    function saveToHistory(subject, content) {
        const now = new Date();
        const historyItem = {
            subject,
            content,
            date: now.toLocaleString('fr-FR')
        };
        
        emailHistory.unshift(historyItem);
        if (emailHistory.length > 10) emailHistory.pop();
        
        updateHistoryDisplay();
    }
    
    function updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        emailHistory.forEach(item => {
            const historyElement = document.createElement('div');
            historyElement.className = 'history-item';
            historyElement.innerHTML = `
                <div class="history-title">${item.subject}</div>
                <div class="history-date">${item.date}</div>
            `;
            
            historyElement.addEventListener('click', () => {
                // Pré-remplir le formulaire avec cet historique
                objectInput.value = item.subject;
                contentTextarea.value = item.content;
                updateCharCount();
                updateWordCount();
            });
            
            historyList.appendChild(historyElement);
        });
    }
    
    function openSettings() {
        switchTab('settings');
    }
    
    function switchTab(tabName) {
        composeTab.classList.toggle('active', tabName === 'compose');
        settingsTab.classList.toggle('active', tabName === 'settings');
        composeTabContent.classList.toggle('active', tabName === 'compose');
        settingsTabContent.classList.toggle('active', tabName === 'settings');
    }
    
    function loadSettings() {
        // Charger les paramètres depuis le localStorage
        if (localStorage.getItem('mailProSettings')) {
            const settings = JSON.parse(localStorage.getItem('mailProSettings'));
            
            document.getElementById('include-signature').checked = settings.includeSignature !== false;
            document.getElementById('signature-name').value = settings.signatureName || '';
            document.getElementById('signature-position').value = settings.signaturePosition || '';
            document.getElementById('signature-department').value = settings.signatureDepartment || '';
            document.getElementById('signature-contact').value = settings.signatureContact || '';
            document.getElementById('spell-check').checked = settings.spellCheck !== false;
            document.getElementById('tone-suggestions').checked = settings.toneSuggestions !== false;
            document.getElementById('save-history').checked = settings.saveHistory !== false;
        }
    }
    
    function saveSettings() {
        const settings = {
            includeSignature: document.getElementById('include-signature').checked,
            signatureName: document.getElementById('signature-name').value,
            signaturePosition: document.getElementById('signature-position').value,
            signatureDepartment: document.getElementById('signature-department').value,
            signatureContact: document.getElementById('signature-contact').value,
            spellCheck: document.getElementById('spell-check').checked,
            toneSuggestions: document.getElementById('tone-suggestions').checked,
            saveHistory: document.getElementById('save-history').checked
        };
        
        localStorage.setItem('mailProSettings', JSON.stringify(settings));
        showAlert('Paramètres sauvegardés avec succès !', 'success');
        switchTab('compose');
    }
    
    function showAlert(message, type) {
        const alertBox = document.createElement('div');
        alertBox.style.position = 'fixed';
        alertBox.style.top = '20px';
        alertBox.style.right = '20px';
        alertBox.style.padding = '15px 20px';
        alertBox.style.borderRadius = '5px';
        alertBox.style.color = 'white';
        alertBox.style.fontWeight = '600';
        alertBox.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
        alertBox.style.zIndex = '1000';
        alertBox.style.animation = 'slideIn 0.3s, fadeOut 0.5s 2.5s';
        alertBox.style.transform = 'translateX(0)';
        
        if (type === 'success') {
            alertBox.style.backgroundColor = 'var(--success-color)';
        } else if (type === 'error') {
            alertBox.style.backgroundColor = 'var(--danger-color)';
        } else {
            alertBox.style.backgroundColor = 'var(--primary-color)';
        }
        
        alertBox.textContent = message;
        document.body.appendChild(alertBox);
        
        setTimeout(() => {
            alertBox.style.transform = 'translateX(100%)';
            setTimeout(() => document.body.removeChild(alertBox), 300);
        }, 2000);
    }
    
    // Initialisation
    updatePlaceholders();
    updateCharCount();
    updateWordCount();
});