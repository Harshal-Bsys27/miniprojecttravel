class AccommodationService {
    constructor() {
        this.apiKey = '5ae2e3f221c38a28845f05b6e387458fb7ae5c6fb13acd13c7457258';
        this.baseUrl = 'https://api.opentripmap.com/0.1/en';
    }

    // ... your existing searchHotels and getHotelDetails methods ...

    static showBookingModal(hotelData) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'bookingModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header" style="background: linear-gradient(135deg, #2937f0 0%, #9f1ae2 100%)">
                        <h5 class="modal-title text-white">${hotelData.name}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="row g-4">
                            <!-- Hotel Information -->
                            <div class="col-md-6">
                                <div class="card border-0 shadow-sm h-100">
                                    <div class="card-body">
                                        <h6 class="mb-3">Hotel Information</h6>
                                        <p><i class="fas fa-map-marker-alt text-primary"></i> ${hotelData.address || 'Location available on booking'}</p>
                                        <p><i class="fas fa-star text-warning"></i> ${hotelData.rate || 'Rating pending'}</p>
                                        ${hotelData.kinds ? `
                                            <div class="mt-3">
                                                <h6 class="mb-2">Amenities:</h6>
                                                <div class="d-flex flex-wrap gap-2">
                                                    ${hotelData.kinds.split(',').map(kind => `
                                                        <span class="badge bg-light text-dark">
                                                            ${kind.replace(/_/g, ' ')}
                                                        </span>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                            <!-- Map and Location -->
                            <div class="col-md-6">
                                <div class="card border-0 shadow-sm h-100">
                                    <div class="card-body">
                                        <h6 class="mb-3">Location</h6>
                                        <div class="map-placeholder text-center p-4 bg-light rounded mb-3">
                                            <i class="fas fa-map-marked-alt fa-3x text-muted mb-3"></i>
                                            <p class="mb-0">Click below to view location</p>
                                        </div>
                                        <div class="d-grid gap-2">
                                            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelData.name + ' ' + hotelData.address)}"
                                               target="_blank"
                                               class="btn btn-primary">
                                                <i class="fas fa-map-marked-alt me-2"></i>View on Google Maps
                                            </a>
                                            <a href="https://www.tripadvisor.com/Search?q=${encodeURIComponent(hotelData.name + ' ' + hotelData.address)}"
                                               target="_blank"
                                               class="btn btn-outline-primary">
                                                <i class="fas fa-star me-2"></i>Read Reviews
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Booking Options -->
                            <div class="col-md-6">
                                <div class="card border-0 shadow-sm h-100">
                                    <div class="card-body">
                                        <h6 class="mb-4">Book Through</h6>
                                        <div class="d-grid gap-3">
                                            ${this.generateBookingLinks(hotelData)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>  
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    static generateBookingLinks(hotel) {
        const bookingSites = [
            {
                name: 'Booking.com',
                icon: 'building',
                url: `https://www.booking.com/search.html?ss=${encodeURIComponent(hotel.name)}`
            },
            {
                name: 'MakeMyTrip',
                icon: 'hotel',
                url: `https://www.makemytrip.com/hotels/hotel-listing/?checkin=&checkout=&city=${encodeURIComponent(hotel.name)}`
            },
            {
                name: 'Agoda',
                icon: 'bed',
                url: `https://www.agoda.com/search?city=${encodeURIComponent(hotel.name)}`
            }
        ];

        return bookingSites.map(site => `
            <a href="${site.url}" 
               target="_blank" 
               class="btn btn-outline-primary btn-lg">
                <i class="fas fa-${site.icon} me-2"></i>${site.name}
            </a>
        `).join('');
    }
}

// Initialize booking buttons
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.booking-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.accommodation-card');
            const hotelData = {
                name: card.querySelector('h4').textContent,
                address: card.querySelector('.text-muted').textContent,
                rate: card.querySelector('.rating')?.textContent || '4.5',
                kinds: Array.from(card.querySelectorAll('.amenities-list li'))
                    .map(li => li.textContent.trim())
                    .join(',')
            };
            AccommodationService.showBookingModal(hotelData);
        });
    });
});