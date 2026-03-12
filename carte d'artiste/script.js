const card = document.querySelector('.artist-card');

card.addEventListener('mousemove', (e) => {
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  card.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255, 255, 255, 0.83), #1e1e1e)`;
});

card.addEventListener('mouseleave', () => {
  card.style.background = '#1e1e1e';
});


document.querySelectorAll('.platform-links a').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      ripple.style.left = `${e.offsetX}px`;
      ripple.style.top = `${e.offsetY}px`;
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
});

