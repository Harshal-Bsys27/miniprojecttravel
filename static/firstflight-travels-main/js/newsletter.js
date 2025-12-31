async function handleSubscribe(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('emailInput');
    const messageElement = document.getElementById('subscribeMessage');
    const email = emailInput.value;
    
    messageElement.textContent = 'Subscribing...';
    messageElement.style.display = 'block';
    messageElement.style.color = '#ffffff';
    
    try {
        const response = await emailjs.send("service_nu6swuo", "template_x021qrx", {
            to_name: email.split('@')[0],
            to_email: email,
            reply_to: email,
            from_name: "Letstravel Team",
            subject: "Welcome to Letstravel Newsletter!",
            message: "Thank you for subscribing to our newsletter. Get ready for amazing travel updates!"
        });

        console.log("Email sent successfully:", response);
        messageElement.textContent = '🎉 Welcome aboard! Check your email for confirmation.';
        messageElement.style.color = '#4CAF50';
        emailInput.value = '';
        
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000);
        
    } catch (error) {
        console.error("Error sending email:", error);
        messageElement.textContent = 'Oops! Something went wrong. Please try again.';
        messageElement.style.color = '#ff6b6b';
    }
    
    return false;
}
