function handleBooking(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const hotelName = button.closest('.card-body').querySelector('.card-title').textContent;
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Show loading overlay
    loadingOverlay.classList.add('show');
    button.disabled = true;

    // Simulate loading and redirect
    setTimeout(() => {
        loadingOverlay.classList.remove('show');
        button.disabled = false;
        window.open(button.href, '_blank');
    }, 1500);

    // Track the booking
    console.log(`Booking initiated for ${hotelName}`);
}

function filterHotels() {
    const priceRange = document.getElementById('priceRange').value;
    const sortBy = document.getElementById('sortBy').value;
    const hotels = document.querySelectorAll('.col-md-4');

    hotels.forEach(hotel => {
        const price = parseInt(hotel.querySelector('.price').textContent.replace(/[^0-9]/g, ''));
        let show = true;

        // Price range filtering
        if (priceRange !== 'all') {
            const [min, max] = priceRange.split('-').map(val => parseInt(val) || Infinity);
            show = price >= min && (max === Infinity ? true : price <= max);
        }

        hotel.style.display = show ? 'block' : 'none';
    });

    // Sorting
    const hotelArray = Array.from(hotels);
    hotelArray.sort((a, b) => {
        const priceA = parseInt(a.querySelector('.price').textContent.replace(/[^0-9]/g, ''));
        const priceB = parseInt(b.querySelector('.price').textContent.replace(/[^0-9]/g, ''));
        
        if (sortBy === 'price-asc') return priceA - priceB;
        if (sortBy === 'price-desc') return priceB - priceA;
        if (sortBy === 'rating') {
            const ratingA = a.querySelectorAll('.fa-star').length;
            const ratingB = b.querySelectorAll('.fa-star').length;
            return ratingB - ratingA;
        }
    });

    const container = document.querySelector('.row');
    hotelArray.forEach(hotel => container.appendChild(hotel));
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('priceRange').addEventListener('change', filterHotels);
    document.getElementById('sortBy').addEventListener('change', filterHotels);

    // Add click handlers to all booking buttons
    document.querySelectorAll('.booking-btn').forEach(button => {
        button.addEventListener('click', handleBooking);
    });
});