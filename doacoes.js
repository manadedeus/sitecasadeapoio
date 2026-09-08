const revealItems = document.querySelectorAll('.donation-intro, .donation-types, .donation-contact, .welcome-section, .donation-cards article');

revealItems.forEach((item) => item.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => revealObserver.observe(item));

const progressBar = document.querySelector('.scroll-progress');
window.addEventListener('scroll', () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.transform = `scaleX(${scrollable ? window.scrollY / scrollable : 0})`;
}, { passive: true });