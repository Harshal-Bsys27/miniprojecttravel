class AmadeusService {
    constructor() {
        this.apiKey = 'G7m2KSPrIEY1wXR6BnMhlN0mg5HNmEiY';
        this.apiSecret = 'XPfIlhRM1fIO3Oyv';
        this.tokenData = null;
        this.baseURL = 'https://test.api.amadeus.com/v2';
    }

    async getToken() {
        if (this.tokenData && new Date(this.tokenData.expires_at) > new Date()) {
            return this.tokenData.access_token;
        }

        try {
            const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.apiSecret}`
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error_description || 'Authentication failed');
            }

            this.tokenData = await response.json();
            return this.tokenData.access_token;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    async searchFlights(originCode, destinationCode, date) {
        try {
            const token = await this.getToken();
            const url = `${this.baseURL}/shopping/flight-offers?` +
                `originLocationCode=${originCode}&` +
                `destinationLocationCode=${destinationCode}&` +
                `departureDate=${date}&` +
                `adults=1&` +
                `max=10&` +
                `currencyCode=INR`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.errors?.[0]?.detail || 'Flight search failed');
            }

            const data = await response.json();
            return data.data.map(flight => ({
                id: flight.id,
                price: flight.price.total,
                airline: flight.validatingAirlineCodes[0],
                departure: flight.itineraries[0].segments[0].departure,
                arrival: flight.itineraries[0].segments[0].arrival,
                duration: flight.itineraries[0].duration
            }));
        } catch (error) {
            console.error('Flight search failed:', error);
            throw error;
        }
    }
}