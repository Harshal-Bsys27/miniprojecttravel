const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
let searchTimeout;
const searchInput = document.getElementById('searchQuery');
const cuisineSelect = document.getElementById('cuisine');
const dietSelect = document.getElementById('diet');

// Add event listeners
searchInput.addEventListener('input', debounceSearch);
cuisineSelect.addEventListener('change', updateResults);
dietSelect.addEventListener('change', updateResults);

function debounceSearch(e) {
    clearTimeout(searchTimeout);
    const query = e.target.value;
    
    if (query.length < 2) {
        document.getElementById('resultsContent').innerHTML = '';
        return;
    }

    searchTimeout = setTimeout(() => {
        searchFood(query);
    }, 500);
}

async function searchFood(query) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    try {
        loadingIndicator.classList.remove('d-none');
        
        // Get meals by search term
        const response = await fetch(`${BASE_URL}/search.php?s=${query}`);
        const data = await response.json();

        // Apply filters
        const filteredMeals = filterMeals(data.meals || [], {
            cuisine: document.getElementById('cuisine').value,
            diet: document.getElementById('diet').value
        });

        displayResults(filteredMeals);
    } catch (error) {
        console.error('Search error:', error);
        showError('Failed to fetch results. Please try again.');
    } finally {
        loadingIndicator.classList.add('d-none');
    }
}

function filterMeals(meals, filters) {
    return meals.filter(meal => {
        const matchesCuisine = !filters.cuisine || 
            meal.strArea.toLowerCase() === filters.cuisine.toLowerCase();
        const matchesDiet = !filters.diet || 
            (filters.diet === 'vegetarian' && meal.strCategory.toLowerCase().includes('vegetarian'));
        return matchesCuisine && matchesDiet;
    });
}

function displayResults(meals) {
    const resultsContent = document.getElementById('resultsContent');
    
    if (!meals || meals.length === 0) {
        resultsContent.innerHTML = '<p class="text-center">No results found</p>';
        return;
    }

    const resultsHTML = meals.map(meal => `
        <div class="card mb-3 restaurant-card">
            <div class="row g-0">
                <div class="col-md-4">
                    <img src="${meal.strMealThumb}" class="img-fluid restaurant-img" 
                         alt="${meal.strMeal}">
                </div>
                <div class="col-md-8">
                    <div class="card-body">
                        <h5 class="card-title">${meal.strMeal}</h5>
                        <div class="restaurant-info">
                            <p><i class="fas fa-globe"></i> Cuisine: ${meal.strArea}</p>
                            <p><i class="fas fa-tag"></i> Category: ${meal.strCategory}</p>
                            ${meal.strTags ? `
                                <p><i class="fas fa-tags"></i> Tags: ${meal.strTags}</p>
                            ` : ''}
                        </div>
                        <button class="btn btn-primary mt-2" onclick="showMealDetails('${meal.idMeal}')">
                            View Recipe
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    resultsContent.innerHTML = resultsHTML;
}

async function showMealDetails(id) {
    try {
        const loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.classList.remove('d-none');

        const response = await fetch(`${BASE_URL}/lookup.php?i=${id}`);
        const data = await response.json();
        const meal = data.meals[0];

        // Get ingredients and measurements
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
            if (meal[`strIngredient${i}`]) {
                ingredients.push({
                    ingredient: meal[`strIngredient${i}`],
                    measure: meal[`strMeasure${i}`]
                });
            }
        }

        const modalHTML = `
            <div class="modal fade" id="recipeModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${meal.strMeal}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <img src="${meal.strMealThumb}" class="img-fluid mb-3" alt="${meal.strMeal}">
                            <h6>Ingredients:</h6>
                            <ul>
                                ${ingredients.map(ing => 
                                    `<li>${ing.measure} ${ing.ingredient}</li>`
                                ).join('')}
                            </ul>
                            <h6>Instructions:</h6>
                            <p>${meal.strInstructions}</p>
                            ${meal.strYoutube ? `
                                <h6>Video Tutorial:</h6>
                                <a href="${meal.strYoutube}" target="_blank" class="btn btn-danger">
                                    <i class="fab fa-youtube"></i> Watch on YouTube
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body and show it
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('recipeModal'));
        modal.show();

        // Clean up modal after hiding
        document.getElementById('recipeModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    } catch (error) {
        console.error('Error fetching recipe details:', error);
        showError('Failed to fetch recipe details.');
    } finally {
        loadingIndicator.classList.add('d-none');
    }
}

function showError(message) {
    const resultsContent = document.getElementById('resultsContent');
    resultsContent.innerHTML = `
        <div class="alert alert-danger" role="alert">
            ${message}
        </div>
    `;
}

function updateResults() {
    const query = document.getElementById('searchQuery').value;
    if (query.length >= 2) {
        searchFood(query);
    }
}
