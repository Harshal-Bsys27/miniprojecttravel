document.addEventListener('DOMContentLoaded', () => {
    const hotelSearchForm = document.getElementById('hotelSearchForm');
    const hotelResults = document.getElementById('hotelResults');
    const destinationInput = document.querySelector('input[placeholder="Where are you going?"]');

    function showLoading() {
        hotelResults.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>`;
    }

    function showError(message) {
        hotelResults.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">${message}</div>
            </div>`;
    }

    hotelSearchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const destination = destinationInput.value;
        if (!destination) {
            showError('Please enter a destination');
            return;
        }

        showLoading();
        try {
            // Search for regions using Hotels.com Provider API
            const searchUrl = 'https://hotels-com-provider.p.rapidapi.com/v2/regions';
            const queryParams = new URLSearchParams({
                query: destination,
                domain: 'IN',
                locale: 'en_IN'
            });

            const response = await fetch(`${searchUrl}?${queryParams}`, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': 'a312aca722msh005a7eb253d5006p1472f4jsn4ea8daea7da9',
                    'X-RapidAPI-Host': 'hotels-com-provider.p.rapidapi.com'
                }
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();
            if (!data.data || data.data.length === 0) {
                throw new Error('No hotels found in this location');
            }

            displayHotels(processSearchResults(data.data));
        } catch (error) {
            console.error('API Error:', error);
            showError(error.message);
        }
    });

    function processSearchResults(results) {
        return results.map(item => ({
            id: item.id || '',
            name: item.regionNames?.fullName || item.regionNames?.displayName || item.name,
            location: item.caption || item.hierarchyInfo?.country || '',
            description: item.hierarchyInfo?.city || item.regionNames?.displayName || '',
            rating: 4.5,
            price: 4999,
            image: getHotelImage(item.type, item.regionNames?.displayName),
            bookingUrl: `https://www.makemytrip.com/hotels/hotel-listing/?checkin=${getFormattedDate()}&city=${encodeURIComponent(item.regionNames?.displayName || item.name)}&country=${encodeURIComponent(item.hierarchyInfo?.country || 'India')}&checkout=${getFormattedDate(1)}`
        }));
    }

    function getHotelImage(type, locationName) {
        const images = {
            CITY: [
                'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb',
                'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9',
                'https://images.unsplash.com/photo-1564501049412-61c2a3083791'
            ],
            REGION: [
                'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4',
                'https://images.unsplash.com/photo-1584132967334-10e028bd69f7',
                'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa'
            ],
            HOTEL: [
                'https://images.unsplash.com/photo-1455587734955-081b22074882',
                'https://images.unsplash.com/photo-1578683010236-d716f9a3f461',
                'https://images.unsplash.com/photo-1578991624414-276ef23a534f'
            ]
        };

        const index = locationName ? 
            locationName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 3 : 
            Math.floor(Math.random() * 3);

        return (images[type] || images.HOTEL)[index];
    }

    function getFormattedDate(daysToAdd = 0) {
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);
        return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    }

    function createHotelCard(hotel) {
        return `
            <div class="col-md-6 mb-4">
                <div class="card hotel-card h-100">
                    <img src="${hotel.image}" class="card-img-top" alt="${hotel.name}" style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title mb-0">${hotel.name}</h5>
                            <span class="badge bg-primary">${hotel.rating} ★</span>
                        </div>
                        <p class="card-text text-muted mb-2">
                            <i class="fas fa-map-marker-alt me-2"></i>${hotel.location}
                        </p>
                        <p class="card-text mb-3">${hotel.description}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="price-display">
                                <small class="text-muted">Starting from</small>
                                <h5 class="mb-0">₹${hotel.price}</h5>
                            </div>
                            <div class="button-group">
                                <button class="btn btn-outline-primary btn-sm me-2" onclick="viewOnMap('${encodeURIComponent(hotel.name + ', ' + hotel.location)}')">
                                    <i class="fas fa-map-marked-alt me-1"></i>View on Map
                                </button>
                                <a href="${hotel.bookingUrl}" target="_blank" class="btn btn-outline-success btn-sm me-2">
                                    <i class="fas fa-external-link-alt me-1"></i>Book on MakeMyTrip
                                </a>
                                <button class="btn btn-primary btn-sm select-hotel-btn" data-hotel='${JSON.stringify(hotel)}'>
                                    <i class="fas fa-check me-1"></i>Select
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    window.viewOnMap = function(location) {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${location}`;
        window.open(mapUrl, '_blank');
    };

    document.addEventListener('click', function(e) {
        const selectButton = e.target.closest('.select-hotel-btn');
        if (selectButton) {
            const hotelData = JSON.parse(selectButton.getAttribute('data-hotel'));
            const checkInDate = document.querySelector('input[type="date"]').value;
            const checkOutDate = document.querySelector('input[type="date"]:last-of-type').value;
            
            if (!checkInDate || !checkOutDate) {
                alert('Please select check-in and check-out dates first');
                return;
            }
            
            selectHotel(hotelData);
        }
    });

    let selectedHotel = null;

    window.selectHotel = function(hotelData) {
        selectedHotel = hotelData;
        const checkInDate = document.querySelector('input[type="date"]').value;
        const checkOutDate = document.querySelector('input[type="date"]:last-of-type').value;
        const nights = calculateNights(checkInDate, checkOutDate);
        updateBookingSummary();
        
        const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal'));
        bookingModal.show();
    };

    function updateBookingSummary() {
        const checkInDate = document.querySelector('input[type="date"]').value;
        const checkOutDate = document.querySelector('input[type="date"]:last-of-type').value;
        const nights = calculateNights(checkInDate, checkOutDate) || 1; // Default to 1 if dates are same/invalid
        const guests = parseInt(document.getElementById('numberOfGuests')?.value) || 1;
        const baseAmount = selectedHotel.price * nights;
        const guestMultiplier = guests > 2 ? 1 + ((guests - 2) * 0.5) : 1;
        const totalAmount = Math.round(baseAmount * guestMultiplier);
        const taxAmount = Math.round(totalAmount * 0.18);
        const finalAmount = totalAmount + taxAmount;

        const summary = document.getElementById('hotelSummary');
        summary.innerHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">${selectedHotel.name}</h5>
                    <p class="text-muted mb-2">${selectedHotel.location}</p>
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <p class="mb-1">Check-in: ${checkInDate}</p>
                            <p class="mb-1">Check-out: ${checkOutDate}</p>
                            <p class="mb-1">Duration: ${nights} night(s)</p>
                            <p class="mb-1">Guests: ${guests}</p>
                        </div>
                        <div class="text-end">
                            <div class="mb-2">
                                <small class="text-muted">Base Amount</small>
                                <p class="mb-0">₹${baseAmount}</p>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Guest Adjustment (×${guestMultiplier})</small>
                                <p class="mb-0">₹${totalAmount - baseAmount}</p>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Taxes & Fees (18%)</small>
                                <p class="mb-0">₹${taxAmount}</p>
                            </div>
                            <div>
                                <small class="text-muted">Total Amount</small>
                                <h5 class="mb-0">₹${finalAmount}</h5>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    document.getElementById('numberOfGuests').addEventListener('change', updateBookingSummary);

    document.getElementById('hotelBookingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const bookingData = {
            hotel: selectedHotel,
            guest: {
                name: document.getElementById('guestName').value,
                email: document.getElementById('guestEmail').value,
                phone: document.getElementById('guestPhone').value,
                numberOfGuests: document.getElementById('numberOfGuests').value,
                specialRequests: document.getElementById('specialRequests').value
            },
            dates: {
                checkIn: document.querySelector('input[type="date"]').value,
                checkOut: document.querySelector('input[type="date"]:last-of-type').value
            }
        };

        showPaymentModal(bookingData);
    });

    function showPaymentModal(bookingData) {
        const nights = calculateNights(bookingData.dates.checkIn, bookingData.dates.checkOut);
        const baseAmount = bookingData.hotel.price * nights;
        const guestMultiplier = bookingData.guest.numberOfGuests > 2 ? 1 + ((bookingData.guest.numberOfGuests - 2) * 0.5) : 1;
        const totalAmount = Math.round(baseAmount * guestMultiplier);
        const taxAmount = Math.round(totalAmount * 0.18);
        const finalAmount = totalAmount + taxAmount;
        
        document.getElementById('paymentSummary').innerHTML = `
            <div class="border-bottom pb-3 mb-3">
                <h6 class="mb-3">Booking Summary</h6>
                <div class="d-flex justify-content-between mb-2">
                    <span>Room Rate (${nights} nights)</span>
                    <span>₹${bookingData.hotel.price} × ${nights}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>Guest Adjustment (${bookingData.guest.numberOfGuests} guests)</span>
                    <span>× ${guestMultiplier.toFixed(2)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>
                    <span>₹${totalAmount}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>Taxes & Fees (18%)</span>
                    <span>₹${taxAmount}</span>
                </div>
                <div class="d-flex justify-content-between fw-bold">
                    <span>Total Amount</span>
                    <span>₹${finalAmount}</span>
                </div>
            </div>
        `;
        // Store for invoice generation
        window.bookingSummary = {
            ...bookingData,
            totalAmount: finalAmount,
            baseAmount: totalAmount,
            taxAmount: taxAmount
        };

        bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
        const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
        paymentModal.show();
    }

    document.getElementById('paymentForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const button = this.querySelector('button[type="submit"]');
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        generateBookingConfirmation();
    });

    function generateBookingConfirmation() {
        const bookingId = 'HTL' + Date.now().toString().slice(-6);
        const booking = window.bookingSummary;

        const invoiceNo = `INV-HTL-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${bookingId}`;
        const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

        const nights = calculateNights(booking.dates.checkIn, booking.dates.checkOut) || 1;
        const guests = parseInt(booking.guest.numberOfGuests) || 1;

        const roomRate = Number(booking.hotel.price) || 0;
        const roomAmount = Math.round(roomRate * nights);
        const subtotal = Math.round(Number(booking.baseAmount) || 0);
        const taxAmount = Math.round(Number(booking.taxAmount) || 0);
        const totalAmount = Math.round(Number(booking.totalAmount) || 0);

        const guestAdjustment = Math.max(0, subtotal - roomAmount);

        const formatINR = (value) => {
            const v = Number(value) || 0;
            return v.toLocaleString('en-IN');
        };

        const invoiceContent = document.getElementById('invoiceContent');
        invoiceContent.innerHTML = `
            <div class="invoice-modern">
                <div class="invoice-header">
                    <div class="header-brand">
                        <div class="brand-left">
                            <div class="brand-logo">
                                <i class="fas fa-hotel"></i>
                            </div>
                            <div class="brand-info">
                                <h1>LetsTravel Hotels</h1>
                                <p>Tax Invoice / Booking Confirmation</p>
                            </div>
                        </div>
                        <div class="booking-meta">
                            <div class="booking-id">${invoiceNo}</div>
                            <div class="booking-date">Issued: ${currentDate}</div>
                        </div>
                    </div>
                </div>

                <div class="invoice-content">
                    <div class="info-cards">
                        <div class="guest-card">
                            <div class="card-icon"><i class="fas fa-user-circle"></i></div>
                            <h4>Guest</h4>
                            <div class="details">
                                <p class="mb-1"><strong>${booking.guest.name}</strong></p>
                                <p class="mb-1"><i class="fas fa-envelope"></i> ${booking.guest.email}</p>
                                <p class="mb-1"><i class="fas fa-phone"></i> ${booking.guest.phone}</p>
                                <p class="mb-0"><i class="fas fa-users"></i> ${guests} guest(s)</p>
                            </div>
                        </div>

                        <div class="hotel-card">
                            <div class="card-icon"><i class="fas fa-building"></i></div>
                            <h4>Property</h4>
                            <div class="details">
                                <p class="mb-1"><strong>${booking.hotel.name}</strong></p>
                                <p class="mb-1"><i class="fas fa-map-marker-alt"></i> ${booking.hotel.location}</p>
                                <p class="mb-1"><i class="fas fa-receipt"></i> Booking ID: ${bookingId}</p>
                                <p class="mb-0"><i class="fas fa-check-circle"></i> Status: Paid</p>
                            </div>
                        </div>
                    </div>

                    <div class="payment-summary" style="margin-top: 1.5rem;">
                        <h4><i class="fas fa-calendar-alt"></i> Stay Details</h4>
                        <div class="summary-grid">
                            <div class="summary-row"><span>Check-in</span><span>${booking.dates.checkIn}</span></div>
                            <div class="summary-row"><span>Check-out</span><span>${booking.dates.checkOut}</span></div>
                            <div class="summary-row"><span>Nights</span><span>${nights}</span></div>
                            <div class="summary-row"><span>Rooms</span><span>1</span></div>
                            <div class="summary-row"><span>Guests</span><span>${guests}</span></div>
                            ${booking.guest.specialRequests ? `
                              <div class="summary-row"><span>Requests</span><span>${booking.guest.specialRequests}</span></div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="payment-summary" style="margin-top: 1.5rem;">
                        <h4><i class="fas fa-receipt"></i> Charges</h4>
                        <div class="table-responsive" style="border-radius: 12px; overflow: hidden;">
                            <table class="table table-sm mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th>Description</th>
                                        <th class="text-end">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Room charges (₹${formatINR(roomRate)} × ${nights} night(s))</td>
                                        <td class="text-end">₹${formatINR(roomAmount)}</td>
                                    </tr>
                                    <tr>
                                        <td>Guest adjustment</td>
                                        <td class="text-end">₹${formatINR(guestAdjustment)}</td>
                                    </tr>
                                    <tr>
                                        <td>Taxes & fees (18%)</td>
                                        <td class="text-end">₹${formatINR(taxAmount)}</td>
                                    </tr>
                                    <tr class="table-primary">
                                        <td><strong>Total Paid</strong></td>
                                        <td class="text-end"><strong>₹${formatINR(totalAmount)}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="text-muted small mt-2">
                            Note: This is a demo invoice. Values are for presentation only.
                        </div>
                    </div>

                    <div class="verification-section">
                        <div class="qr-section">
                            <img
                              src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(invoiceNo)}"
                              alt="Invoice QR Code"
                              class="qr-code"
                            >
                            <p>Scan to verify invoice</p>
                        </div>
                        <div class="payment-status">
                            <span class="status-badge">
                                <i class="fas fa-check-circle"></i> Booking Confirmed
                            </span>
                        </div>
                    </div>
                </div>

                <div class="invoice-footer">
                    <div class="support-info">
                        <p><i class="fas fa-envelope"></i> support@letstravel.com</p>
                        <p><i class="fas fa-phone"></i> +91 1234567890</p>
                        <p class="disclaimer">Computer-generated document • Please carry valid ID at check-in</p>
                    </div>
                </div>
            </div>
        `;

        bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
        const invoiceModal = new bootstrap.Modal(document.getElementById('invoiceModal'));
        invoiceModal.show();
    }

    function calculateNights(checkIn, checkOut) {
        const oneDay = 24 * 60 * 60 * 1000;
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const nights = Math.round(Math.abs((end - start) / oneDay));
        return nights > 0 ? nights : 1; // Ensure minimum 1 night
    }

    function displayHotels(hotels) {
        const resultsContainer = document.getElementById('hotelResults');
        resultsContainer.innerHTML = hotels.map(hotel => createHotelCard(hotel)).join('');
    }

    ['priceRange', 'starRating', 'sortBy'].forEach(filterId => {
        document.getElementById(filterId).addEventListener('change', () => {
            const hotels = document.querySelectorAll('.hotel-card');
            if (hotels.length) {
                displayHotels(Array.from(hotels).map(hotel => ({
                    name: hotel.querySelector('.card-title').textContent,
                    star: hotel.querySelectorAll('.mb-2 ⭐').length,
                    price: {
                        lead: {
                            amount: parseInt(hotel.querySelector('.card-text strong').textContent.replace(/[^0-9]/g, '')),
                            formatted: hotel.querySelector('.card-text strong').textContent
                        }
                    },
                })));
            }
        });
    });

    // Add event listeners for real-time updates
    const updateTriggers = ['numberOfGuests', 'input[type="date"]'];
    updateTriggers.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.addEventListener('change', () => {
                if (selectedHotel) {
                    updateBookingSummary();
                }
            });
        });
    });

    window.printInvoice = function() {
        const invoiceContent = document.getElementById('invoiceContent').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Booking Invoice - LetsTravel</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                <style>
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-wrapper {
                        width: 210mm;
                        min-height: 297mm;
                        padding: 20mm;
                        margin: 0 auto;
                        background: white;
                    }
                    .invoice-modern {
                        margin: 0;
                        padding: 0;
                    }
                    .invoice-header {
                        background: linear-gradient(135deg, #0d6efd, #0dcaf0) !important;
                        color: white !important;
                        padding: 2rem;
                        border-radius: 10px;
                        margin-bottom: 2rem;
                    }
                    .info-cards {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 2rem;
                        margin: 2rem 0;
                    }
                    .guest-card, .hotel-card {
                        background: #f8f9fa;
                        padding: 1.5rem;
                        border-radius: 10px;
                        border: 1px solid #dee2e6;
                    }
                    .card-icon {
                        background: linear-gradient(135deg, #0d6efd, #0dcaf0) !important;
                        color: white !important;
                    }
                    .status-badge {
                        background: linear-gradient(135deg, #198754, #20c997) !important;
                        color: white !important;
                    }
                    @media print {
                        html, body {
                            width: 210mm;
                            height: 297mm;
                        }
                        .print-wrapper {
                            margin: 0;
                            border: none;
                            padding: 20mm;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-wrapper">
                    ${invoiceContent}
                </div>
                <div class="no-print text-center mt-4">
                    <button onclick="window.print()" class="btn btn-primary">Print Invoice</button>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };
});
