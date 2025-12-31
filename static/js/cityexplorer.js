const OPENWEATHER_API_KEY = '4d8fb5b93d4af21d66a2948710284366';
// Add these variables at the top of the file, after OPENWEATHER_API_KEY
let mainMap = null;
let fullscreenMap = null;
let currentCity = null;

// Add these new functions at the end of the file
function initializeDefaultMap() {
    if (!mainMap) {
        mainMap = L.map('map').setView([20.5937, 78.9629], 4); // Center of India
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mainMap);
    }
}

// Update the existing initMap function
function initMap(lat, lon) {
    try {
        const mapContainer = document.getElementById('map');
        mapContainer.innerHTML = '';
        mainMap = L.map('map').setView([lat, lon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mainMap);
        
        currentCity = {
            lat: lat,
            lon: lon,
            name: document.getElementById('citySearch').value
        };
        
        L.marker([lat, lon])
            .bindPopup(`<strong>${currentCity.name}</strong>`)
            .addTo(mainMap)
            .openPopup();
    } catch (error) {
        console.error('Map initialization error:', error);
        showMapError();
    }
}

function openFullscreenMap() {
    const modal = new bootstrap.Modal(document.getElementById('fullscreenMapModal'));
    modal.show();
    
    document.getElementById('fullscreenMapModal').addEventListener('shown.bs.modal', function () {
        if (!fullscreenMap) {
            fullscreenMap = L.map('fullscreenMap');
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(fullscreenMap);
        }
        
        if (currentCity) {
            fullscreenMap.setView([currentCity.lat, currentCity.lon], 13);
            L.marker([currentCity.lat, currentCity.lon])
                .bindPopup(`<strong>${currentCity.name}</strong>`)
                .addTo(fullscreenMap)
                .openPopup();
        } else {
            fullscreenMap.setView([20.5937, 78.9629], 4); // Default to India's center
        }
        
        fullscreenMap.invalidateSize();
    });
}

// Add this line at the end of the file
document.addEventListener('DOMContentLoaded', initializeDefaultMap);

// Main search function
async function searchCity() {
    const cityName = document.getElementById('citySearch').value;
    if (!cityName) return;

    try {
        // Show loading state
        document.getElementById('cityResults').innerHTML = 
            '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

        // Fetch all data concurrently
        const [weatherData, wikiData, topPlaces] = await Promise.all([
            fetchWeatherData(cityName),
            fetchWikiInfo(cityName),
            fetchTopPlaces(cityName)
        ]);

        // Get current filter values
        const filters = getFilterValues();

        // Update UI with all data
        updateCityDisplay(cityName, weatherData, wikiData, topPlaces, filters);

    } catch (error) {
        showError('Sorry, we couldn\'t find information about this city. Please try again.');
    }
}

// Fetch weather data
async function fetchWeatherData(city) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        if (!response.ok) throw new Error('City not found');
        return await response.json();
    } catch (error) {
        console.error('Weather API Error:', error);
        return null;
    }
}

// Fetch Wikipedia information
async function fetchWikiInfo(city) {
    try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${city}`);
        if (!response.ok) return { extract: 'No description available' };
        return await response.json();
    } catch (error) {
        console.error('Wiki API Error:', error);
        return { extract: 'No description available' };
    }
}

// Fetch top places
async function fetchTopPlaces(city) {
    try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${city}_tourist_attractions`);
        const data = await response.json();
        return {
            places: [
                { name: "Historical Center", category: "historical", rating: 4.5, price: "medium" },
                { name: "Cultural District", category: "cultural", rating: 4.8, price: "high" },
                { name: "Modern Quarter", category: "modern", rating: 4.2, price: "low" },
                { name: "Local Market", category: "cultural", rating: 4.6, price: "low" },
                { name: "City Park", category: "nature", rating: 4.4, price: "free" }
            ]
        };
    } catch (error) {
        console.error('Places API Error:', error);
        return { places: [] };
    }
}

// Initialize map
function initMap(lat, lon) {
    try {
        const mapContainer = document.getElementById('map');
        mapContainer.innerHTML = '';
        const map = L.map('map').setView([lat, lon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        L.marker([lat, lon]).addTo(map);
    } catch (error) {
        console.error('Map initialization error:', error);
        showMapError();
    }
}

// Update city display
function updateCityDisplay(cityName, weatherData, wikiData, topPlaces, filters) {
    const resultsContainer = document.getElementById('cityResults');
    
    // Filter places based on criteria
    const filteredPlaces = filterPlaces(topPlaces.places, filters);

    resultsContainer.innerHTML = `
        <div class="city-details" data-aos="fade-up">
            ${generateWeatherSection(cityName, weatherData)}
            ${generateTopPlacesSection(filteredPlaces, filters)}
            ${generateCityDescription(cityName, wikiData)}
        </div>
    `;

    // Initialize map if coordinates are available
    if (weatherData?.coord) {
        initMap(weatherData.coord.lat, weatherData.coord.lon);
    }

    // Add filter badges
    if (Object.values(filters).some(value => value)) {
        addFilterBadges(filters);
    }
}

// Generate weather section HTML
function generateWeatherSection(cityName, weatherData) {
    return `
        <div class="row mb-4">
            <div class="col-md-8">
                <h2 class="display-4">${cityName}</h2>
                <div class="weather-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h3>${Math.round(weatherData.main.temp)}°C</h3>
                            <p class="mb-0">${weatherData.weather[0].description}</p>
                        </div>
                        <div class="weather-icon">
                            <img src="http://openweathermap.org/img/w/${weatherData.weather[0].icon}.png" 
                                 alt="Weather icon" class="weather-icon-lg">
                        </div>
                    </div>
                    ${generateWeatherDetails(weatherData)}
                </div>
            </div>
            <div class="col-md-4">
                <div id="map" class="map-container"></div>
            </div>
        </div>
    `;
}

// Generate weather details HTML
function generateWeatherDetails(weatherData) {
    return `
        <div class="weather-details mt-3">
            <div class="row text-center">
                <div class="col-4">
                    <i class="fas fa-tint"></i>
                    <p>${weatherData.main.humidity}%</p>
                    <small>Humidity</small>
                </div>
                <div class="col-4">
                    <i class="fas fa-wind"></i>
                    <p>${weatherData.wind.speed} m/s</p>
                    <small>Wind</small>
                </div>
                <div class="col-4">
                    <i class="fas fa-temperature-high"></i>
                    <p>${Math.round(weatherData.main.feels_like)}°C</p>
                    <small>Feels Like</small>
                </div>
            </div>
        </div>
    `;
}

// Generate top places section HTML
function generateTopPlacesSection(places, filters) {
    if (!places.length) return '';
    
    return `
        <div class="row mt-4">
            <h3>Top Places to Visit</h3>
            ${places.map(place => `
                <div class="col-md-4 mb-3">
                    <div class="place-card">
                        <h5>${place.name}</h5>
                        <span class="badge bg-primary">${place.category}</span>
                        <div class="rating">${'★'.repeat(Math.floor(place.rating))}${place.rating % 1 >= 0.5 ? '½' : ''}</div>
                        <div class="price-range">${'💰'.repeat(getPriceLevel(place.price))}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}
// Add after generateTopPlacesSection function

function generateCityDescription(cityName, wikiData) {
    return `
        <div class="row mt-4">
            <div class="col-12">
                <div class="city-description">
                    <h3>About ${cityName}</h3>
                    <p class="lead">${wikiData.extract}</p>
                </div>
            </div>
        </div>
    `;
}

// Filter places based on criteria
function filterPlaces(places, filters) {
    return places.filter(place => {
        const categoryMatch = !filters.category || place.category === filters.category;
        const ratingMatch = !filters.rating || place.rating >= parseFloat(filters.rating);
        const priceMatch = !filters.price || place.price === filters.price;
        return categoryMatch && ratingMatch && priceMatch;
    });
}

// Get current filter values
function getFilterValues() {
    return {
        category: document.getElementById('categoryFilter')?.value || '',
        rating: document.getElementById('ratingFilter')?.value || '',
        price: document.getElementById('priceFilter')?.value || ''
    };
}

// Apply filters
function applyFilters() {
    searchCity(); // Re-fetch and display with new filters
}

// Add filter badges
function addFilterBadges(filters) {
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-badges mt-3';
    
    Object.entries(filters).forEach(([key, value]) => {
        if (value) {
            filterContainer.innerHTML += `
                <span class="badge bg-primary me-2">${key}: ${value}</span>
            `;
        }
    });

    const cityResults = document.getElementById('cityResults');
    const existingBadges = cityResults.querySelector('.filter-badges');
    if (existingBadges) {
        existingBadges.remove();
    }
    cityResults.insertBefore(filterContainer, cityResults.firstChild);
}

// Helper functions
function getPriceLevel(price) {
    const levels = { free: 0, low: 1, medium: 2, high: 3 };
    return levels[price] || 0;
}

function showError(message) {
    document.getElementById('cityResults').innerHTML = `
        <div class="alert alert-danger" role="alert">${message}</div>
    `;
}

function showMapError() {
    document.getElementById('map').innerHTML = `
        <div class="alert alert-warning">Unable to load map. Please try again later.</div>
    `;
}