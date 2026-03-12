document.addEventListener('DOMContentLoaded', () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const orderItems = document.getElementById('order-items');
    const orderSubtotal = document.getElementById('order-subtotal');
    const orderShipping = document.getElementById('order-shipping');
    const orderTotal = document.getElementById('order-total');
    const checkoutForm = document.getElementById('checkout-form');
    const creditCardInfo = document.getElementById('credit-card-info');
    const paypalInfo = document.getElementById('paypal-info');
    
    // Afficher les articles de la commande
    function displayOrderItems() {
        orderItems.innerHTML = '';
        
        if (cart.length === 0) {
            window.location.href = '../cart.html';
            return;
        }
        
        cart.forEach(item => {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            orderItem.innerHTML = `
                <div class="order-item-name">
                    ${item.name} <span>× ${item.quantity}</span>
                </div>
                <div class="order-item-price">
                    $${(item.price * item.quantity).toFixed(2)}
                </div>
            `;
            orderItems.appendChild(orderItem);
        });
        
        // Calculer les totaux
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = 5.99;
        const total = subtotal + shipping;
        
        orderSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        orderShipping.textContent = `$${shipping.toFixed(2)}`;
        orderTotal.textContent = `$${total.toFixed(2)}`;
    }
    
    // Gestion des méthodes de paiement
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.id === 'credit-card') {
                creditCardInfo.style.display = 'block';
                paypalInfo.style.display = 'none';
            } else if (radio.id === 'paypal') {
                creditCardInfo.style.display = 'none';
                paypalInfo.style.display = 'block';
            }
        });
    });
    
    // Validation du formulaire
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Validation simple
        let isValid = true;
        
        document.querySelectorAll('#checkout-form [required]').forEach(field => {
            if (!field.value.trim()) {
                field.style.borderColor = 'red';
                isValid = false;
            } else {
                field.style.borderColor = '';
            }
        });
        
        if (isValid) {
            // Simuler un traitement de paiement
            setTimeout(() => {
                // Vider le panier
                localStorage.removeItem('cart');
                
                // Rediriger vers une page de confirmation
                window.location.href = 'confirmation.html';
            }, 1000);
        } else {
            alert('Veuillez remplir tous les champs obligatoires');
        }
    });
    
    // Mettre à jour le compteur du panier
    function updateCartCount() {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        document.getElementById('cart-count').textContent = totalItems;
    }
    
    // Initialisation
    displayOrderItems();
    updateCartCount();
});