document.addEventListener('DOMContentLoaded', () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItemsList = document.getElementById('cart-items-list');
    const cartEmpty = document.getElementById('cart-empty');
    const subtotalElement = document.getElementById('subtotal');
    const shippingElement = document.getElementById('shipping');
    const totalElement = document.getElementById('total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    // Afficher les articles du panier
    function displayCartItems() {
        if (cart.length === 0) {
            cartEmpty.style.display = 'block';
            cartItemsList.style.display = 'none';
            checkoutBtn.disabled = true;
        } else {
            cartEmpty.style.display = 'none';
            cartItemsList.style.display = 'block';
            checkoutBtn.disabled = false;
            
            cartItemsList.innerHTML = '';
            
            cart.forEach((item, index) => {
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                cartItem.innerHTML = `
                    <div class="cart-item-image">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        ${item.color ? `<p>Couleur: ${item.color}</p>` : ''}
                        ${item.size ? `<p>Taille: ${item.size}</p>` : ''}
                        <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn minus" data-index="${index}">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn plus" data-index="${index}">+</button>
                    </div>
                    <button class="remove-item" data-index="${index}">×</button>
                `;
                cartItemsList.appendChild(cartItem);
            });
            
            // Ajouter les événements
            document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
                btn.addEventListener('click', decreaseQuantity);
            });
            
            document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
                btn.addEventListener('click', increaseQuantity);
            });
            
            document.querySelectorAll('.remove-item').forEach(btn => {
                btn.addEventListener('click', removeItem);
            });
        }
        
        updateCartSummary();
        updateCartCount();
    }
    
    // Mettre à jour le résumé
    function updateCartSummary() {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = 5.99;
        const total = subtotal + shipping;
        
        subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
        shippingElement.textContent = `$${shipping.toFixed(2)}`;
        totalElement.textContent = `$${total.toFixed(2)}`;
    }
    
    // Mettre à jour le compteur du panier
    function updateCartCount() {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        document.getElementById('cart-count').textContent = totalItems;
    }
    
    // Diminuer la quantité
    function decreaseQuantity(e) {
        const index = e.target.getAttribute('data-index');
        
        if (cart[index].quantity > 1) {
            cart[index].quantity -= 1;
        } else {
            cart.splice(index, 1);
        }
        
        saveCart();
        displayCartItems();
    }
    
    // Augmenter la quantité
    function increaseQuantity(e) {
        const index = e.target.getAttribute('data-index');
        cart[index].quantity += 1;
        saveCart();
        displayCartItems();
    }
    
    // Supprimer l'article
    function removeItem(e) {
        const index = e.target.getAttribute('data-index');
        cart.splice(index, 1);
        saveCart();
        displayCartItems();
    }
    
    // Sauvegarder le panier
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
    }
    
    // Passer à la caisse
    checkoutBtn.addEventListener('click', () => {
        window.location.href = '../checkout.html';
    });
    
    // Initialisation
    displayCartItems();
});