import { AITravelService } from './servicefile.js';

async function testItinerary() {
    const service = new AITravelService();
    try {
        const itinerary = await service.generateItinerary(
            'Mumbai',
            3,
            ['culture', 'food']
        );
        console.log('Generated Itinerary:', JSON.stringify(itinerary, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testItinerary();