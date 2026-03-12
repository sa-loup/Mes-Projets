// Données des produits (simulées)
const products = [
    {
        id: 1,
        name: "Montre intelligente",
        price: 99.99,
        image: "images/smart-watch.jpg",
        description: "Montre intelligente avec suivi d'activité"
    },
    {
        id: 2,
        name: "Écouteurs sans fil",
        price: 59.99,
        image: "images/earbuds.jpg",
        description: "Écouteurs Bluetooth avec réduction de bruit"
    },
    {
        id: 3,
        name: "Support téléphone",
        price: 19.99,
        image: "images/phone-stand.jpg",
        description: "Support ajustable pour téléphone et tablette"
    }
];

// Panier
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Afficher les produits sur la page d'accueil
function displayFeaturedProducts() {
    const featuredContainer = document.getElementById('featured-products');
    
    if (featuredContainer) {
        products.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'product-card';
            productElement.innerHTML = `
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                    <button class="add-to-cart" data-id="${product.id}">Ajouter au panier</button>
                </div>
            `;
            featuredContainer.appendChild(productElement);
        });
        
        // Gestion des événements pour les boutons
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', addToCart);
        });
    }
}

// Ajouter au panier
function addToCart(e) {
    const productId = parseInt(e.target.getAttribute('data-id'));
    const product = products.find(p => p.id === productId);
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    updateCart();
}

// Mettre à jour le panier
function updateCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

// Mettre à jour le compteur du panier
function updateCartCount() {
    const countElement = document.getElementById('cart-count');
    if (countElement) {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        countElement.textContent = totalItems;
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    displayFeaturedProducts();
    updateCartCount();
});