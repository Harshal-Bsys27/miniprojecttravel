// Smooth scrolling for anchor links
document.addEventListener("DOMContentLoaded", function() {
    // Select all anchor links with a hash
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    // Add a click event listener to each anchor link
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
});
