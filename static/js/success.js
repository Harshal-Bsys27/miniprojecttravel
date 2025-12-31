// Load order details when page loads
window.onload = function() {
    try {
        const orderDetails = JSON.parse(localStorage.getItem('orderDetails'));
        if (!orderDetails) {
            throw new Error('No order details found');
        }
        displayOrderDetails(orderDetails);
    } catch (error) {
        console.error('Error loading order details:', error);
        document.getElementById('orderInfo').innerHTML = `
            <div class="alert alert-danger">
                Error loading order details. Please try again or contact support.
            </div>
        `;
    }
};

function displayOrderDetails(details) {
    if (!details) return;
    
    const orderInfo = document.getElementById('orderInfo');
    orderInfo.innerHTML = `
        <p><strong>Package:</strong> ${(details.package || 'Default').toUpperCase()} Package</p>
        <p><strong>Customer:</strong> ${details.customerName || 'N/A'}</p>
        <p><strong>Email:</strong> ${details.email || 'N/A'}</p>
        <p><strong>Date:</strong> ${details.date || new Date().toLocaleDateString()}</p>
        <p><strong>Package Cost:</strong> ₹${details.packageCost || 0}/-</p>
        <p><strong>GST (18%):</strong> ₹${details.gstAmount || 0}/-</p>
        <p><strong>Total Amount:</strong> ₹${details.totalAmount || 0}/-</p>
        <p><strong>Shipping Method:</strong> ${details.shippingMethod || 'Standard'}</p>
    `;
}

function generatePDF() {
    try {
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const orderDetails = JSON.parse(localStorage.getItem('orderDetails'));

        // Set font size and type
        doc.setFont("helvetica");
        
        // Add logo and header
        doc.setFontSize(24);
        doc.setTextColor(54, 133, 251);
        doc.text('letstravel.com', 105, 20, { align: 'center' });
        
        // Add invoice title
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text('INVOICE', 105, 35, { align: 'center' });
        
        // Add invoice details
        doc.setFontSize(12);
        doc.text(`Date: ${orderDetails.date}`, 20, 50);
        doc.text(`Invoice No: INV-${Date.now().toString().slice(-6)}`, 20, 60);
        
        // Add customer details
        doc.text('Bill To:', 20, 80);
        doc.text(`Name: ${orderDetails.customerName}`, 20, 90);
        doc.text(`Email: ${orderDetails.email}`, 20, 100);
        doc.text(`Address: ${orderDetails.address || 'N/A'}`, 20, 110);
        
        // Add package details using autoTable
        doc.autoTable({
            startY: 130,
            head: [['Item', 'Details']],
            body: [
                ['Package Type', `${orderDetails.package.toUpperCase()} Package`],
                ['Package Cost', `₹${orderDetails.packageCost}/-`],
                ['GST (18%)', `₹${orderDetails.gstAmount}/-`],
                ['Shipping Method', orderDetails.shippingMethod],
                ['Total Amount', `₹${orderDetails.totalAmount}/-`]
            ],
            theme: 'striped',
            headStyles: { 
                fillColor: [54, 133, 251],
                textColor: [255, 255, 255]
            },
            margin: { top: 10 }
        });
        
        // Add footer
        doc.setFontSize(10);
        doc.text('Thank you for choosing letstravel.com', 105, 250, { align: 'center' });
        doc.setFontSize(8);
        doc.text('This is a computer generated invoice', 105, 255, { align: 'center' });
        
        // Save the PDF
        doc.save(`letstravel-invoice-${Date.now()}.pdf`);
        
    } catch (error) {
        console.error('PDF Generation Error:', error);
        alert('PDF generation failed. Error: ' + error.message);
    }
}
