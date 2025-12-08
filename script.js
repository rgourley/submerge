// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add subtle parallax effect to hero
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.transform = `translateY(${scrolled * 0.3}px)`;
        hero.style.opacity = 1 - (scrolled / 800);
    }
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe cards and sections - run after page loads
function setupObservers() {
    document.querySelectorAll('.release-card, .artist-card, .about-text').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Setup observers after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(setupObservers, 500);
    });
} else {
    setTimeout(setupObservers, 500);
}

// Also observe dynamically added elements
const dynamicObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
                if (node.classList && node.classList.contains('artist-card')) {
                    node.style.opacity = '0';
                    node.style.transform = 'translateY(20px)';
                    node.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                    observer.observe(node);
                }
                // Also check for artist cards inside added nodes
                node.querySelectorAll && node.querySelectorAll('.artist-card').forEach(card => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                    observer.observe(card);
                });
            }
        });
    });
});

// Observe the artists grid for new artist cards
const artistsGrid = document.querySelector('.artists-grid');
if (artistsGrid) {
    dynamicObserver.observe(artistsGrid, { childList: true, subtree: true });
}

