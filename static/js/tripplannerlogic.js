class TripPlanner {
    constructor() {
        this.tripForm = document.getElementById('trip-form');
        this.resultContainer = document.getElementById('trip-result');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.tripForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        const formData = {
            destination: document.getElementById('destination').value,
            budget: parseInt(document.getElementById('budget').value),
            duration: parseInt(document.getElementById('duration').value),
            interests: Array.from(document.getElementById('interests').selectedOptions).map(opt => opt.value),
            comments: document.getElementById('comments').value
        };

        this.showLoadingState();
        try {
            const plan = await this.generateTripPlan(formData);
            this.displayTripPlan(plan);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async generateTripPlan(formData) {
        const { destination, budget, duration, interests } = formData;
        const dailyBudget = Math.floor(budget / duration);

        // Calculate budget categories
        const budgetCategory = this.getBudgetCategory(dailyBudget);
        
        // Generate daily plans
        const dailyPlans = [];
        for (let day = 1; day <= duration; day++) {
            const dayPlan = await this.generateDayPlan(
                destination,
                budgetCategory,
                interests,
                dailyBudget,
                day
            );
            dailyPlans.push(dayPlan);
        }

        return {
            destination,
            totalBudget: budget,
            duration,
            budgetCategory,
            dailyPlans
        };
    }

    getBudgetCategory(dailyBudget) {
        if (dailyBudget < 2000) return 'budget';
        if (dailyBudget < 5000) return 'moderate';
        return 'luxury';
    }

    async generateDayPlan(destination, budgetCategory, interests, dailyBudget, dayNumber) {
        // Dynamic budget allocation
        const budgetAllocation = {
            accommodation: Math.round(dailyBudget * 0.4),
            activities: Math.round(dailyBudget * 0.3),
            food: Math.round(dailyBudget * 0.2),
            transport: Math.round(dailyBudget * 0.1)
        };

        return {
            dayNumber,
            activities: await this.suggestActivities(destination, interests, budgetAllocation.activities),
            meals: this.suggestMeals(budgetCategory, budgetAllocation.food),
            accommodation: this.suggestAccommodation(budgetCategory, budgetAllocation.accommodation),
            transport: this.suggestTransport(budgetCategory, budgetAllocation.transport),
            budgetBreakdown: budgetAllocation
        };
    }

    async suggestActivities(destination, interests, budget) {
        // This could be enhanced with real API data
        const activities = {
            culture: ['Local Museum Visit', 'Cultural Performance', 'Heritage Walk'],
            adventure: ['Hiking', 'Water Sports', 'Mountain Biking'],
            relaxation: ['Spa Treatment', 'Beach Day', 'Yoga Session'],
            food: ['Cooking Class', 'Food Tour', 'Wine Tasting'],
            history: ['Historical Site Visit', 'Guided Tour', 'Archaeological Site']
        };

        return interests.map(interest => ({
            type: interest,
            suggestion: activities[interest][Math.floor(Math.random() * activities[interest].length)],
            estimatedCost: Math.round(budget / interests.length)
        }));
    }

    suggestMeals(budgetCategory, budget) {
        const mealTypes = {
            budget: {
                breakfast: 'Local cafe or street food',
                lunch: 'Food court or local restaurant',
                dinner: 'Local dining establishment'
            },
            moderate: {
                breakfast: 'Hotel breakfast or cafe',
                lunch: 'Casual restaurant',
                dinner: 'Mid-range restaurant'
            },
            luxury: {
                breakfast: 'Gourmet breakfast',
                lunch: 'Fine dining restaurant',
                dinner: 'Premium dining experience'
            }
        };

        return {
            suggestions: mealTypes[budgetCategory],
            budget: {
                breakfast: Math.round(budget * 0.3),
                lunch: Math.round(budget * 0.3),
                dinner: Math.round(budget * 0.4)
            }
        };
    }

    suggestAccommodation(budgetCategory, budget) {
        const accommodations = {
            budget: ['Hostel', 'Budget Hotel', 'Guesthouse'],
            moderate: ['3-Star Hotel', 'Boutique Hotel', 'Serviced Apartment'],
            luxury: ['5-Star Hotel', 'Luxury Resort', 'Premium Villa']
        };

        return {
            type: accommodations[budgetCategory][Math.floor(Math.random() * accommodations[budgetCategory].length)],
            estimatedCost: budget
        };
    }

    suggestTransport(budgetCategory, budget) {
        const transport = {
            budget: ['Public Transport', 'Shared Rides', 'Walking'],
            moderate: ['Taxi', 'Rental Bike', 'Occasional Private Car'],
            luxury: ['Private Car Service', 'Premium Taxi', 'Chauffeur Service']
        };

        return {
            type: transport[budgetCategory][Math.floor(Math.random() * transport[budgetCategory].length)],
            estimatedCost: budget
        };
    }

    displayTripPlan(plan) {
        const html = `
            <div class="card shadow-lg mt-4">
                <div class="card-header bg-gradient-primary text-white" style="background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%)">
                    <h3 class="mb-0">Your ${plan.duration}-Day Trip to ${plan.destination}</h3>
                    <p class="mb-0">Total Budget: ₹${plan.totalBudget} (${plan.budgetCategory.toUpperCase()} category)</p>
                </div>
                <div class="card-body">
                    ${plan.dailyPlans.map(day => this.generateDayHTML(day)).join('')}
                </div>
                <div class="card-footer">
                    <button class="btn me-2" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white;" onclick="window.print()">
                        <i class="fas fa-print"></i> Print Itinerary
                    </button>
                    <button class="btn" style="background: linear-gradient(135deg, #2980b9 0%, #3498db 100%); color: white;" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Plan Another Trip
                    </button>
                </div>
            </div>
        `;

        this.resultContainer.innerHTML = html;
        this.resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    generateDayHTML(day) {
        return `
            <div class="day-plan mb-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-gradient bg-primary bg-opacity-75 text-white py-3">
                        <h4 class="mb-0">
                            <i class="fas fa-calendar-day"></i> Day ${day.dayNumber}
                        </h4>
                    </div>
                    <div class="card-body p-4">
                        <!-- Activities Section -->
                        <div class="activities mb-4">
                            <h5 class="text-primary mb-3">
                                <i class="fas fa-walking"></i> Daily Activities
                            </h5>
                            <div class="row g-3">
                                ${day.activities.map(activity => `
                                    <div class="col-md-6">
                                        <div class="card h-100 border-light shadow-sm hover-shadow">
                                            <div class="card-body">
                                                <h6 class="text-capitalize mb-2">${activity.type}</h6>
                                                <p class="mb-2 text-muted">
                                                    <i class="fas fa-map-marker-alt me-2"></i>${activity.suggestion}
                                                </p>
                                                <div class="text-end">
                                                    <span class="badge bg-primary bg-opacity-75 px-3 py-2">
                                                        ₹${activity.estimatedCost.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Meals Section -->
                        <div class="meals mb-4">
                            <h5 class="text-primary mb-3">
                                <i class="fas fa-utensils"></i> Dining Plan
                            </h5>
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <tbody>
                                        ${Object.entries(day.meals.suggestions).map(([meal, suggestion]) => `
                                            <tr>
                                                <td class="text-capitalize fw-bold" style="width: 120px;">${meal}</td>
                                                <td>${suggestion}</td>
                                                <td class="text-end">
                                                    <span class="badge bg-success bg-opacity-75 px-3 py-2">
                                                        ₹${day.meals.budget[meal].toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Accommodation & Transport -->
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="card h-100 border-light shadow-sm">
                                    <div class="card-body">
                                        <h5 class="text-primary mb-3">
                                            <i class="fas fa-bed"></i> Accommodation
                                        </h5>
                                        <p class="mb-2">${day.accommodation.type}</p>
                                        <div class="text-end">
                                            <span class="badge bg-info bg-opacity-75 px-3 py-2">
                                                ₹${day.accommodation.estimatedCost.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card h-100 border-light shadow-sm">
                                    <div class="card-body">
                                        <h5 class="text-primary mb-3">
                                            <i class="fas fa-car"></i> Transport
                                        </h5>
                                        <p class="mb-2">${day.transport.type}</p>
                                        <div class="text-end">
                                            <span class="badge bg-warning text-dark bg-opacity-75 px-3 py-2">
                                                ₹${day.transport.estimatedCost.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showLoadingState() {
        this.resultContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Generating your personalized trip plan...</p>
            </div>
        `;
    }

    showError(message) {
        this.resultContainer.innerHTML = `
            <div class="alert alert-danger mt-4">
                <i class="fas fa-exclamation-circle"></i> ${message}
            </div>
        `;
    }
}

// Initialize the trip planner when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TripPlanner();
});