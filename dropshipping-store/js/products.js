// Gestion des onglets
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Désactiver tous les onglets
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Activer l'onglet sélectionné
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// Gestion des miniatures
document.querySelectorAll('.thumbnail-images img').forEach(thumb => {
    thumb.addEventListener('click', () => {
        const mainImage = document.getElementById('main-product-image');
        mainImage.src = thumb.src;
        mainImage.alt = thumb.alt;
    });
});

// Gestion du panier
document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    const productId = 1; // À remplacer par l'ID réel du produit
    const quantity = parseInt(document.getElementById('product-quantity').value);
    const color = document.getElementById('color-select').value;
    const size = document.getElementById('size-select').value;
    
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    const existingItem = cart.find(item => item.id === productId && item.color === color && item.size === size);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: productId,
            name: document.getElementById('product-title').textContent,
            price: parseFloat(document.getElementById('product-price').textContent.replace('$', '')),
            image: document.getElementById('main-product-image').src,
            quantity: quantity,
            color: color,
            size: size
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    alert('Produit ajouté au panier');
});

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
    const countElements = document.querySelectorAll('#cart-count');
    countElements.forEach(element => {
        element.textContent = totalItems;
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', updateCartCount);