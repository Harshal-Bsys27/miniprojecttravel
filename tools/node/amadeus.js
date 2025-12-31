const Amadeus = require('amadeus');
require('dotenv').config();

class AmadeusService {
    constructor() {
        this.amadeus = new Amadeus({
            clientId: process.env.AMADEUS_CLIENT_ID,
            clientSecret: process.env.AMADEUS_CLIENT_SECRET
        });
        console.log('AmadeusService initialized');
    }

    async searchAirports(keyword) {
        try {
            console.log(`Searching airports with keyword: ${keyword}`);
            const response = await this.amadeus.referenceData.locations.get({
                keyword: keyword,
                subType: Amadeus.location.any,
                page: { limit: 5 }
            });

            if (!response.data) {
                throw new Error('No airports found');
            }

            return response.data.map(airport => ({
                code: airport.iataCode,
                name: airport.name,
                city: airport.address?.cityName || 'Unknown'
            }));
        } catch (error) {
            console.error('Airport search failed:', error);
            throw error;
        }
    }

    async searchFlights(originCode, destinationCode, date) {
        try {
            console.log(`Searching flights from ${originCode} to ${destinationCode} on ${date}`);
            const response = await this.amadeus.shopping.flightOffersSearch.get({
                originLocationCode: originCode,
                destinationLocationCode: destinationCode,
                departureDate: date,
                adults: '1',
                max: 5,
                currencyCode: 'INR'
            });

            return response.data.map(flight => ({
                id: flight.id,
                price: flight.price.total,
                airline: flight.validatingAirlineCodes[0],
                departure: flight.itineraries[0].segments[0].departure,
                arrival: flight.itineraries[0].segments[0].arrival
            }));
        } catch (error) {
            console.error('Flight search failed:', error);
            throw error;
        }
    }
}

// Test function
async function testAPI() {
    try {
        const service = new AmadeusService();
        
        // Test airport search
        console.log('\nTesting airport search...');
        const airports = await service.searchAirports('Delhi');
        console.log('Airports found:', JSON.stringify(airports, null, 2));

        // Get tomorrow's date in YYYY-MM-DD format
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const testDate = tomorrow.toISOString().split('T')[0];

        // Test flight search with tomorrow's date
        console.log('\nTesting flight search...');
        const flights = await service.searchFlights('DEL', 'BOM', testDate);
        console.log('Flights found:', JSON.stringify(flights, null, 2));

    } catch (error) {
        if (error.response && error.response.result && error.response.result.errors) {
            console.error('Test failed:', error.response.result.errors[0].detail);
        } else {
            console.error('Test failed:', error.message);
        }
    }
}
// Execute the test
testAPI();

module.exports = AmadeusService;