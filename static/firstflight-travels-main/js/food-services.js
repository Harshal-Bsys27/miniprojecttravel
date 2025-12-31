document.addEventListener('DOMContentLoaded', () => {
    async function searchRestaurants(location, cuisine, price) {
        const container = document.getElementById('restaurantResults');
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        try {
            loadingOverlay.style.display = 'flex';
            
            // Create Places service
            const service = new google.maps.places.PlacesService(document.createElement('div'));
            
            // Search query
            const query = `${cuisine || ''} restaurants in ${location}`;
            
            const request = {
                query: query,
                type: ['restaurant']
            };

            // Perform search
            service.textSearch(request, async (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    // Filter by price level if specified
                    let filteredResults = results;
                    if (price) {
                        const priceLevel = getPriceLevel(price);
                        filteredResults = results.filter(place => place.price_level <= priceLevel);
                    }

                    // Display results
                    displayResults(filteredResults);
                } else {
                    container.innerHTML = `
                        <div class="alert alert-danger text-center">
                            <i class="fas fa-exclamation-circle"></i> Failed to fetch restaurants
                        </div>`;
                }
                loadingOverlay.style.display = 'none';
            });

        } catch (error) {
            container.innerHTML = `
                <div class="alert alert-danger text-center">
                    <i class="fas fa-exclamation-circle"></i> ${error.message}
                </div>`;
            loadingOverlay.style.display = 'none';
        }
    }

    function getPriceLevel(price) {
        switch(price) {
            case 'budget': return 1;
            case 'moderate': return 2;
            case 'luxury': return 4;
            default: return 4;
        }
    }

    function displayResults(restaurants) {
        const container = document.getElementById('restaurantResults');
        
        if (!restaurants || restaurants.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle"></i> No restaurants found
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="row">
                ${restaurants.map(restaurant => `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card restaurant-card h-100">
                            <img src="${restaurant.photos?.[0]?.getUrl() || '../images.png/default-restaurant.jpg'}" 
                                 class="card-img-top restaurant-img" 
                                 alt="${restaurant.name}">
                            <div class="card-body">
                                <h5 class="card-title">${restaurant.name}</h5>
                                <p class="card-text">${restaurant.formatted_address}</p>
                                <div class="rating mb-2">
                                    <span class="text-warning">
                                        ${'★'.repeat(Math.round(restaurant.rating))}
                                    </span>
                                    <span class="text-muted">(${restaurant.user_ratings_total} reviews)</span>
                                </div>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="price-level">
                                        ${'$'.repeat(restaurant.price_level || 1)}
                                    </span>
                                    <div class="btn-group">
                                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.place_id}" 
                                           target="_blank" 
                                           class="btn btn-primary">
                                            <i class="fas fa-map-marker-alt"></i> View on Maps
                                        </a>
                                        <button class="btn btn-success" 
                                                onclick="bookRestaurant('${restaurant.place_id}', '${restaurant.name}')">
                                            <i class="fas fa-utensils"></i> Book
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
    }

    // Booking handler
    window.bookRestaurant = function(placeId, name) {
        // Try to find booking links
        const bookingUrls = {
            'zomato': `https://www.zomato.com/search?q=${encodeURIComponent(name)}`,
            'opentable': `https://www.opentable.com/s?term=${encodeURIComponent(name)}`,
            'google': `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`
        };

        // Create booking modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Book ${name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Choose your preferred booking platform:</p>
                        <div class="d-grid gap-2">
                            <a href="${bookingUrls.zomato}" target="_blank" class="btn btn-outline-primary">
                                Book on Zomato
                            </a>
                            <a href="${bookingUrls.opentable}" target="_blank" class="btn btn-outline-primary">
                                Book on OpenTable
                            </a>
                            <a href="${bookingUrls.google}" target="_blank" class="btn btn-outline-primary">
                                View on Google Maps
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Show modal
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
        
        // Remove modal after hiding
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    };

    // Event listener for search button
    document.getElementById('searchBtn').addEventListener('click', () => {
        const location = document.getElementById('location').value;
        const cuisine = document.getElementById('cuisine').value;
        const price = document.getElementById('priceRange').value;
        
        if (!location) {
            alert('Please select a location');
            return;
        }
        
        searchRestaurants(location, cuisine, price);
    });
});