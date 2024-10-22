document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.destination-card');
    const detailsSection = document.getElementById('destination-details');
    const detailsTitle = document.getElementById('details-title');
    const detailsDescription = document.getElementById('details-description');
    const closeDetailsButton = document.getElementById('close-details');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            const name = card.getAttribute('data-name');
            detailsTitle.textContent = name;
            detailsDescription.textContent = `Detailed information about ${name} will be available soon.`;
            detailsSection.classList.remove('hidden');
        });
    });

    closeDetailsButton.addEventListener('click', () => {
        detailsSection.classList.add('hidden');
    });
});
//check