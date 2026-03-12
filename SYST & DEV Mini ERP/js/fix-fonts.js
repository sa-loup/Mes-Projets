// fix-fonts.js - Empêche les erreurs de polices

(function() {
    'use strict';
    
    // 1. Intercepte les requêtes de polices
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (typeof url === 'string' && 
            (url.includes('sf-pro-text') || url.includes('.woff2'))) {
            console.log('Blocked font request:', url);
            return Promise.reject(new Error('Font loading blocked'));
        }
        return originalFetch.call(this, url, options);
    };
    
    // 2. Intercepte les insertions de CSS
    const originalInsertRule = CSSStyleSheet.prototype.insertRule;
    CSSStyleSheet.prototype.insertRule = function(rule, index) {
        if (typeof rule === 'string' && 
            (rule.includes('sf-pro-text') || 
             rule.includes('SFProText') || 
             rule.includes('.woff2'))) {
            console.warn('Blocked problematic font rule');
            return -1;
        }
        return originalInsertRule.call(this, rule, index);
    };
    
    // 3. Remplace les polices problématiques dans le DOM
    document.addEventListener('DOMContentLoaded', function() {
        // Force l'utilisation de polices sûres
        document.body.style.fontFamily = 
            "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, " +
            "'Roboto', 'Helvetica Neue', Arial, sans-serif";
    });
    
    // 4. Surveille les ajouts dynamiques de styles
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeName === 'STYLE' || node.nodeName === 'LINK') {
                        if (node.textContent && node.textContent.includes('sf-pro-text')) {
                            node.parentNode.removeChild(node);
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.head, { childList: true });
    
    console.log('Font fix applied successfully');
})();