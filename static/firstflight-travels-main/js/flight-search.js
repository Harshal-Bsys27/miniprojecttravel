let selectedFlight = null;
const amadeusService = new AmadeusService();

// Add passenger form fields dynamically
document.getElementById('adultCount').addEventListener('change', updatePassengerForms);
document.getElementById('childCount').addEventListener('change', updatePassengerForms);
document.getElementById('infantCount').addEventListener('change', updatePassengerForms);

function updatePassengerForms() {
    const adultCount = parseInt(document.getElementById('adultCount').value);
    const childCount = parseInt(document.getElementById('childCount').value);
    const infantCount = parseInt(document.getElementById('infantCount').value);
    const container = document.getElementById('passengerForms');
    
    container.innerHTML = '';
    
    for(let i = 0; i < adultCount + childCount + infantCount; i++) {
        const type = i < adultCount ? 'Adult' : 
                    i < (adultCount + childCount) ? 'Child' : 'Infant';
        
        container.innerHTML += `
            <div class="passenger-form mb-4">
                <h6 class="border-bottom pb-2">Passenger ${i + 1} (${type})</h6>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">First Name</label>
                        <input type="text" class="form-control" name="passenger${i}FirstName" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Last Name</label>
                        <input type="text" class="form-control" name="passenger${i}LastName" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Date of Birth</label>
                        <input type="date" class="form-control" name="passenger${i}Dob" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Passport Number</label>
                        <input type="text" class="form-control" name="passenger${i}Passport" required>
                    </div>
                </div>
            </div>
        `;
    }
}

document.getElementById('flightSearchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const origin = document.getElementById('originCity').value.toUpperCase();
    const destination = document.getElementById('destinationCity').value.toUpperCase();
    const date = document.getElementById('departureDate').value;

    document.getElementById('loadingIndicator').classList.remove('d-none');
    document.getElementById('searchingMessage').classList.remove('d-none');
    
    try {
        const flights = await amadeusService.searchFlights(origin, destination, date);
        displayFlights(flights, origin, destination);
    } catch (error) {
        document.getElementById('flightResults').innerHTML = `
            <div class="alert alert-danger">
                Error searching flights: ${error.message}
            </div>`;
    } finally {
        document.getElementById('loadingIndicator').classList.add('d-none');
        document.getElementById('searchingMessage').classList.add('d-none');
    }
});

function displayFlights(flights, origin, destination) {
    const resultsDiv = document.getElementById('flightResults');
    if (!flights.length) {
        resultsDiv.innerHTML = '<div class="alert alert-info">No flights found for the selected route.</div>';
        return;
    }

    resultsDiv.innerHTML = flights.map(flight => `
        <div class="card flight-card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <h5 class="card-title">${flight.airline}</h5>
                        <p class="text-muted">Flight ${flight.id}</p>
                    </div>
                    <div class="col-md-3">
                        <p class="mb-1"><strong>${origin} → ${destination}</strong></p>
                        <p class="text-muted mb-0">
                            ${new Date(flight.departure.at).toLocaleTimeString()} - 
                            ${new Date(flight.arrival.at).toLocaleTimeString()}
                        </p>
                    </div>
                    <div class="col-md-3">
                        <h5>₹${Math.round(flight.price)}</h5>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-primary" onclick='selectFlight(${JSON.stringify(flight)})'>
                            Select
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function selectFlight(flight) {
    selectedFlight = flight;
    updateFlightSummary(flight);
    const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal'));
    bookingModal.show();
}

function calculateTotalAmount(flight) {
    if (!flight || !flight.price) {
        console.error('Invalid flight data:', flight);
        return 0;
    }
    
    const adultCount = parseInt(document.getElementById('adultCount').value) || 1;
    const childCount = parseInt(document.getElementById('childCount').value) || 0;
    const infantCount = parseInt(document.getElementById('infantCount').value) || 0;
    
    const basePrice = parseFloat(flight.price);
    const adultTotal = adultCount * basePrice;
    const childTotal = childCount * (basePrice * 0.75);
    const infantTotal = infantCount * (basePrice * 0.1);
    
    const subtotal = adultTotal + childTotal + infantTotal;
    const taxes = subtotal * 0.1;
    
    return Math.round(subtotal + taxes);
}

// Update flight summary when passenger count changes
['adultCount', 'childCount', 'infantCount'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
        if (selectedFlight) {
            updateFlightSummary(selectedFlight);
        }
    });
});

function updateFlightSummary(flight) {
    const totalAmount = calculateTotalAmount(flight);
    const adultCount = parseInt(document.getElementById('adultCount').value) || 1;
    const childCount = parseInt(document.getElementById('childCount').value) || 0;
    const infantCount = parseInt(document.getElementById('infantCount').value) || 0;
    const totalPassengers = adultCount + childCount + infantCount;

    const summary = document.getElementById('flightSummary');
    summary.innerHTML = `
        <div class="card bg-light">
            <div class="card-body">
                <h6 class="card-title">Flight Details</h6>
                <p class="mb-1">Airline: ${flight.airline}</p>
                <p class="mb-1">Departure: ${new Date(flight.departure.at).toLocaleString()}</p>
                <p class="mb-1">Arrival: ${new Date(flight.arrival.at).toLocaleString()}</p>
                <p class="mb-1">Base Price (per adult): ₹${Math.round(flight.price)}</p>
                <p class="mb-1">Number of Passengers: ${totalPassengers}</p>
                <p class="mb-0 text-primary fw-bold">Total Amount: ₹${Math.round(totalAmount)}</p>
            </div>
        </div>`;
}

document.getElementById('bookingForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!selectedFlight) {
        console.error('No flight selected');
        return;
    }

    const totalAmount = calculateTotalAmount(selectedFlight);
    const bookingData = {
        flight: selectedFlight,
        passengers: getPassengersData(),
        contact: {
            email: document.getElementById('contactEmail').value,
            phone: document.getElementById('contactPhone').value
        },
        totalAmount: totalAmount
    };

    showPaymentModal(bookingData);
});

function showPaymentModal(bookingData) {
    if (!bookingData || !bookingData.totalAmount) {
        console.error('Invalid booking data:', bookingData);
        return;
    }

    const adultCount = parseInt(document.getElementById('adultCount').value) || 1;
    const childCount = parseInt(document.getElementById('childCount').value) || 0;
    const infantCount = parseInt(document.getElementById('infantCount').value) || 0;
    
    const basePrice = parseFloat(bookingData.flight.price);
    const adultTotal = adultCount * basePrice;
    const childTotal = childCount * (basePrice * 0.75);
    const infantTotal = infantCount * (basePrice * 0.1);
    const subtotal = adultTotal + childTotal + infantTotal;
    const taxes = subtotal * 0.1;
    const total = subtotal + taxes;

    const paymentSummary = document.getElementById('paymentSummary');
    paymentSummary.innerHTML = `
        <div class="price-breakdown">
            <h6 class="mb-3 border-bottom pb-2">Price Breakdown</h6>
            
            <!-- Base Fares -->
            <div class="mb-3">
                <div class="fw-bold mb-2">Base Fares</div>
                ${adultCount > 0 ? `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span>Adults (${adultCount} × ₹${Math.round(basePrice)})</span>
                    <span>₹${Math.round(adultTotal)}</span>
                </div>` : ''}
                
                ${childCount > 0 ? `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span>Children (${childCount} × ₹${Math.round(basePrice * 0.75)})</span>
                    <span>₹${Math.round(childTotal)}</span>
                </div>` : ''}
                
                ${infantCount > 0 ? `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span>Infants (${infantCount} × ₹${Math.round(basePrice * 0.1)})</span>
                    <span>₹${Math.round(infantTotal)}</span>
                </div>` : ''}
            </div>

            <!-- Subtotal and Taxes -->
            <div class="border-top pt-2">
                <div class="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>
                    <span>₹${Math.round(subtotal)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>Taxes & Fees (10%)</span>
                    <span>₹${Math.round(taxes)}</span>
                </div>
                <div class="d-flex justify-content-between fw-bold text-primary fs-5 mt-2 pt-2 border-top">
                    <span>Total Amount</span>
                    <span>₹${Math.round(total)}</span>
                </div>
            </div>
        </div>
    `;

    // Close booking modal and show payment modal
    const bookingModal = bootstrap.Modal.getInstance(document.getElementById('bookingModal'));
    if (bookingModal) {
        bookingModal.hide();
    }
    
    setTimeout(() => {
        const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
        paymentModal.show();
    }, 500);
}

document.getElementById('paymentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const button = this.querySelector('button[type="submit"]');
    const modalBody = document.querySelector('#paymentModal .modal-body');
    
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

    try {
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Show success message
        modalBody.innerHTML = `
            <div class="text-center py-5">
                <div class="animation-container mb-4">
                    <i class="fas fa-check-circle text-success" style="font-size: 5rem;"></i>
                </div>
                <h3 class="text-success mb-3">Payment Successful!</h3>
                <p class="text-muted mb-4">Your payment has been processed successfully.</p>
                <div class="d-grid gap-2 col-6 mx-auto">
                    <button type="button" class="btn btn-primary" id="viewTicketBtn">
                        <i class="fas fa-ticket-alt me-2"></i>View E-Ticket
                    </button>
                </div>
            </div>
        `;

        // Add click handler for view ticket button
        document.getElementById('viewTicketBtn').addEventListener('click', () => {
            const paymentModal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
            paymentModal.hide();
            
            setTimeout(() => {
                const bookingData = {
                    flight: selectedFlight,
                    passengers: getPassengersData(),
                    contact: {
                        email: document.getElementById('contactEmail').value,
                        phone: document.getElementById('contactPhone').value
                    },
                    totalAmount: calculateTotalAmount(selectedFlight),
                    bookingId: generateBookingId()
                };
                generateDetailedInvoice(bookingData);
            }, 500);
        });

    } catch (error) {
        console.error('Payment failed:', error);
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-lock me-2"></i>Pay Securely';
        alert('Payment failed. Please try again.');
    }
});

// Ensure proper modal cleanup
['bookingModal', 'paymentModal', 'invoiceModal'].forEach(modalId => {
    const modal = document.getElementById(modalId);
    modal.addEventListener('hidden.bs.modal', function () {
        const form = this.querySelector('form');
        if (form) form.reset();
    });
});

function generateDetailedInvoice(bookingData) {
    const invoiceContent = document.getElementById('invoiceContent');
    const currentDate = new Date().toLocaleString();

    const adults = parseInt(document.getElementById('adultCount').value) || 1;
    const children = parseInt(document.getElementById('childCount').value) || 0;
    const infants = parseInt(document.getElementById('infantCount').value) || 0;

    const pnr = (Math.random().toString(36).substring(2, 8)).toUpperCase();
    const eTicketNo = 'ET' + Date.now().toString().slice(-10);
    const flightNo = `${bookingData.flight.airline || ''} ${bookingData.flight.id || ''}`.trim();

    const basePrice = parseFloat(bookingData.flight.price) || 0;
    const adultTotal = adults * basePrice;
    const childTotal = children * (basePrice * 0.75);
    const infantTotal = infants * (basePrice * 0.1);
    const subtotal = adultTotal + childTotal + infantTotal;
    const taxes = subtotal * 0.10;
    const total = subtotal + taxes;
    
    invoiceContent.innerHTML = `
        <style>
            @media print {
                @page {
                    size: A4;
                    margin: 0.5cm;
                }
                body * { visibility: hidden; }
                #invoiceContent, #invoiceContent * { visibility: visible; }
                #invoiceContent {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 20px;
                }
                .modal { padding: 0 !important; }
                .modal-dialog {
                    width: 100%;
                    max-width: none;
                    margin: 0;
                }
                .no-print { display: none; }
                .print-border { border: 1px solid #ddd !important; }
                .passenger-card { 
                    break-inside: avoid;
                    margin-bottom: 15px;
                    page-break-inside: avoid;
                }
            }
            .passenger-card {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
                border: 1px solid #e9ecef;
            }
            .ticket-header {
                background: linear-gradient(135deg, #0d6efd, #0a58ca);
                color: white;
                padding: 20px;
                border-radius: 8px 8px 0 0;
            }
            .flight-details {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .passenger-name {
                font-size: 1.2rem;
                font-weight: 600;
                color: #0d6efd;
            }
        </style>
        
        <div class="ticket-container">
            <!-- Header -->
            <div class="ticket-header text-center">
                <div class="d-flex align-items-center justify-content-center">
                    <i class="fas fa-plane-departure fa-3x me-3"></i>
                    <div>
                        <h2 class="mb-0">letstravel.com</h2>
                        <p class="mb-0">Flight E-Ticket</p>
                    </div>
                </div>
            </div>

            <div class="p-4">
                <!-- Ticket Meta -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h4 class="mb-1">E‑Ticket: <span class="text-primary">${eTicketNo}</span></h4>
                        <p class="text-muted mb-0">PNR: <strong>${pnr}</strong> • Issued: ${currentDate}</p>
                        <p class="text-muted mb-0">Booking Ref: ${bookingData.bookingId} • Flight: ${flightNo || '-'} </p>
                    </div>
                    <div>
                        <span class="badge bg-success p-2"><i class="fas fa-check-circle me-1"></i>Confirmed</span>
                    </div>
                </div>

                <!-- Flight Details -->
                <div class="flight-details">
                    <div class="row align-items-center">
                        <div class="col-4 text-center">
                            <h3>${bookingData.flight.departure.iataCode}</h3>
                            <h4>${new Date(bookingData.flight.departure.at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</h4>
                            <p class="mb-0">${new Date(bookingData.flight.departure.at).toLocaleDateString()}</p>
                        </div>
                        <div class="col-4 text-center">
                            <div class="flight-path">
                                <p class="mb-2">${bookingData.flight.airline} ${bookingData.flight.id}</p>
                                <i class="fas fa-plane text-primary"></i>
                                <p class="mt-2 mb-0">Duration: ${bookingData.flight.duration || calculateDuration(
                                    new Date(bookingData.flight.departure.at),
                                    new Date(bookingData.flight.arrival.at)
                                )}</p>
                            </div>
                        </div>
                        <div class="col-4 text-center">
                            <h3>${bookingData.flight.arrival.iataCode}</h3>
                            <h4>${new Date(bookingData.flight.arrival.at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</h4>
                            <p class="mb-0">${new Date(bookingData.flight.arrival.at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                <!-- Passenger Information -->
                <div class="passenger-list">
                    <h4 class="mb-3"><i class="fas fa-users me-2"></i>Passenger Details</h4>
                    ${bookingData.passengers.map((passenger, index) => {
                        const passengerType = index < adults ? 'Adult' :
                            index < (adults + children) ? 'Child' : 'Infant';
                        return `
                            <div class="passenger-card">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="passenger-name">
                                            ${passenger.firstName} ${passenger.lastName}
                                        </div>
                                        <p class="text-muted mb-0">
                                            <i class="fas fa-user me-1"></i>${passengerType}
                                        </p>
                                    </div>
                                    <div class="col-md-6 text-md-end">
                                        <h5 class="mb-1">
                                            <span class="badge bg-primary">
                                                <i class="fas fa-chair me-1"></i>
                                                Seat ${String.fromCharCode(65 + index)}${Math.floor(Math.random() * 30) + 1}
                                            </span>
                                        </h5>
                                        <small class="text-muted">Gate ${String.fromCharCode(65 + Math.floor(Math.random() * 8))}</small>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Fare Summary -->
                <div class="payment-summary bg-light p-3 rounded">
                    <h5 class="border-bottom pb-2 mb-3">Fare Summary</h5>
                    <div class="row">
                        <div class="col-md-7">
                            ${adults ? `<p class="mb-2">Adults (${adults} × ₹${Math.round(basePrice)})</p>` : ''}
                            ${children ? `<p class="mb-2">Children (${children} × ₹${Math.round(basePrice * 0.75)})</p>` : ''}
                            ${infants ? `<p class="mb-2">Infants (${infants} × ₹${Math.round(basePrice * 0.1)})</p>` : ''}
                            <p class="mb-2">Taxes & Fees (10%)</p>
                            <p class="fw-bold mb-0">Total Paid</p>
                        </div>
                        <div class="col-md-5 text-end">
                            ${adults ? `<p class="mb-2">₹${Math.round(adultTotal)}</p>` : ''}
                            ${children ? `<p class="mb-2">₹${Math.round(childTotal)}</p>` : ''}
                            ${infants ? `<p class="mb-2">₹${Math.round(infantTotal)}</p>` : ''}
                            <p class="mb-2">₹${Math.round(taxes)}</p>
                            <p class="fw-bold mb-0">₹${Math.round(total)}</p>
                        </div>
                    </div>
                    <div class="text-muted small mt-2">
                        Cabin: Economy • Baggage: Cabin 7kg • Check‑in baggage: as per airline policy
                    </div>
                </div>

                <!-- Footer Information -->
                <div class="mt-4 pt-3 border-top">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-1"><strong>Contact Information:</strong></p>
                            <p class="mb-0">Email: ${bookingData.contact.email}</p>
                            <p>Phone: ${bookingData.contact.phone}</p>
                        </div>
                        <div class="col-md-6">
                            <div class="alert alert-info mb-0">
                                <small>
                                    <i class="fas fa-info-circle me-1"></i>
                                    Web check‑in recommended. Arrive 2 hours before departure.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const invoiceModal = new bootstrap.Modal(document.getElementById('invoiceModal'));
    invoiceModal.show();
}

function generateBookingId() {
    return 'LT' + Date.now().toString().slice(-6) + 
           Math.random().toString(36).substring(2, 5).toUpperCase();
}

function generatePassengerList() {
    const passengers = document.querySelectorAll('.passenger-form');
    return Array.from(passengers).map((form, index) => `
        <div class="row mb-2">
            <div class="col-md-6">
                <p class="mb-0">
                    <strong>Passenger ${index + 1}:</strong> 
                    ${form.querySelector('[name$="FirstName"]').value} 
                    ${form.querySelector('[name$="LastName"]').value}
                </p>
            </div>
            <div class="col-md-6">
                <p class="mb-0">
                    <strong>Passport:</strong> 
                    ${form.querySelector('[name$="Passport"]').value}
                </p>
            </div>
        </div>
    `).join('');
}

function getPassengersData() {
    const passengers = [];
    const forms = document.querySelectorAll('.passenger-form');
    forms.forEach((form, index) => {
        passengers.push({
            firstName: form.querySelector(`[name="passenger${index}FirstName"]`).value,
            lastName: form.querySelector(`[name="passenger${index}LastName"]`).value,
            dob: form.querySelector(`[name="passenger${index}Dob"]`).value,
            passport: form.querySelector(`[name="passenger${index}Passport"]`).value
        });
    });
    return passengers;
}

function generateBookingReference() {
    return 'LT' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function generatePassengerSummary(booking) {
    const adultCount = parseInt(document.getElementById('adultCount').value);
    const childCount = parseInt(document.getElementById('childCount').value);
    const infantCount = parseInt(document.getElementById('infantCount').value);
    
    let html = '';
    if(adultCount > 0) {
        html += generatePassengerRow('Adult', adultCount, booking.flight.price);
    }
    if(childCount > 0) {
        html += generatePassengerRow('Child', childCount, booking.flight.price * 0.75);
    }
    if(infantCount > 0) {
        html += generatePassengerRow('Infant', infantCount, booking.flight.price * 0.1);
    }
    return html;
}

function generatePassengerRow(type, count, price) {
    return `
        <tr>
            <td>${type}</td>
            <td>${count}</td>
            <td>₹${Math.round(price)}</td>
            <td>₹${Math.round(price * count)}</td>
        </tr>
    `;
}

function calculateDuration(departure, arrival) {
    const diff = arrival - departure;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}