document.addEventListener("DOMContentLoaded", function() {
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default anchor behavior

            const targetId = this.getAttribute('href').substring(1); // Get the target section ID
            const targetElement = document.getElementById(targetId); // Find the target element

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop, // Scroll to the target element's top offset
                    behavior: 'smooth' // Smooth scrolling
                });
            }
        });
    });

    // Dynamic content loading example
    const loadMoreButton = document.querySelector('#load-more-button');
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', function() {
            // Example of loading more packages dynamically
            const newPackages = [
                {
                    category: 'domestic',
                    image: 'https://via.placeholder.com/300x200',
                    title: 'Goa Beach Holiday',
                    description: 'Relax on the beautiful beaches of Goa with this all-inclusive package.',
                    link: 'https://example.com/goa'
                },
                {
                    category: 'international',
                    image: 'https://via.placeholder.com/300x200',
                    title: 'Tokyo Adventure',
                    description: 'Immerse yourself in the vibrant culture of Tokyo with guided tours and local cuisine.',
                    link: 'https://example.com/tokyo'
                }
            ];

            newPackages.forEach(pkg => {
                const container = document.querySelector(`#${pkg.category} .package-container`);
                if (container) {
                    const article = document.createElement('article');
                    article.classList.add('package');

                    article.innerHTML = `
                        <img src="${pkg.image}" alt="${pkg.title}">
                        <h3>${pkg.title}</h3>
                        <p>${pkg.description}</p>
                        <a href="${pkg.link}" class="btn">Learn More</a>
                    `;
                    
                    container.appendChild(article);
                }
            });

            // Hide the button after loading more content (optional)
            loadMoreButton.style.display = 'none';
        });
    }
});
