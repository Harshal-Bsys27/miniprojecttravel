// Function to check if all form fields are filled
function checkFormValidity(formEl) {
    if (!formEl) return true;

    const inputs = formEl.querySelectorAll('input, select');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.checkValidity()) {
            isValid = false;
        }
    });

    return isValid;
}

// Prefer the billing form if present (checkout page)
const billingForm = document.getElementById('billing-form');
if (billingForm) {
    billingForm.addEventListener('submit', function (event) {
        if (!checkFormValidity(billingForm)) {
            event.preventDefault();
            alert('Please fill out all required fields.');
        }
    });
}

const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');

// Regular expression to validate alphabet characters only
const alphabetRegex = /^[A-Za-z]+$/;

if (firstNameInput) {
    firstNameInput.addEventListener('blur', function () {
        const value = this.value.trim();
        if (!alphabetRegex.test(value)) {
            this.setCustomValidity('Please enter a valid first name using only alphabet characters.');
            this.classList.add('is-invalid');
        } else {
            this.setCustomValidity('');
            this.classList.remove('is-invalid');
        }
    });
}

if (lastNameInput) {
    lastNameInput.addEventListener('blur', function () {
        const value = this.value.trim();
        if (!alphabetRegex.test(value)) {
            this.setCustomValidity('Please enter a valid last name using only alphabet characters.');
            this.classList.add('is-invalid');
        } else {
            this.setCustomValidity('');
            this.classList.remove('is-invalid');
        }
    });
}

const usernameInput = document.getElementById('username');

// Regular expression to validate username (letters and digits only)
const usernameRegex = /^[a-zA-Z0-9]+$/;

if (usernameInput) {
    usernameInput.addEventListener('blur', function () {
        const value = this.value.trim();
        if (!usernameRegex.test(value)) {
            this.setCustomValidity('Your username should only contain letters and digits.');
            this.classList.add('is-invalid');
        } else {
            this.setCustomValidity('');
            this.classList.remove('is-invalid');
        }
    });
}

// Do not globally disable buttons based on a generic "first form" selector.
// (This page contains multiple forms; binding to the wrong one breaks UX.)

// Add event listener to the Zipcode input for validation
const zipInput = document.getElementById('zip');

if (zipInput) {
    zipInput.addEventListener('blur', function () {
        const value = this.value.trim();
        const isValidZip = /^\d{1,6}$/.test(value); // digits only, up to 6 digits
        if (!isValidZip) {
            this.setCustomValidity('Please enter a valid Zipcode.');
            this.classList.add('is-invalid');
        } else {
            this.setCustomValidity('');
            this.classList.remove('is-invalid');
        }
    });
}


// Add event listener to the email input for validation
const emailInput = document.getElementById('email');

if (emailInput) {
    emailInput.addEventListener('blur', function () {
        const email = this.value.trim();
        const isValidEmail = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!isValidEmail) {
            this.classList.add('is-invalid');
        } else {
            this.classList.remove('is-invalid');
        }
    });
}

const addressInput = document.getElementById('address');

if (addressInput) {
    addressInput.addEventListener('blur', validateAddress);
}

function validateAddress() {
    const input = this;
    const value = input.value.trim();
    const isValid = value !== '';

    if (!isValid) {
        input.setCustomValidity('Please enter your shipping address.');
        input.classList.add('is-invalid');
    } else {
        input.setCustomValidity('');
        input.classList.remove('is-invalid');
    }
}
// Add smooth page transitions
document.querySelectorAll('.navLinks a').forEach(link => {
  link.addEventListener('click', function(e) {
      if (!this.classList.contains('dropdown-toggle')) {
          const href = this.getAttribute('href');
          if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
              e.preventDefault();
              document.body.classList.add('page-transition');
              setTimeout(() => {
                  window.location.href = href;
              }, 300);
          }
      }
  });
});


//Selected Package Rate
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

const selectedPackage = getQueryParam("package");

let packageCost;
let briefDescription;
switch (selectedPackage) {
  case "bronze":
    packageCost = 9999;
    briefDescription = "Bronze Package - 2 Star Hotel, 5 Nights Stay";
    break;
  case "silver":
    packageCost = 19999;
    briefDescription = "Silver Package - 3 Star Hotel, 7 Nights Stay";
    break;
  case "gold":
    packageCost = 29999;
    briefDescription = "Gold Package - 4 Star Hotel, 10 Nights Stay";
    break;
  case "platinum":
    packageCost = 39999;
    briefDescription = "Platinum Package - 5 Star Hotel, 14 Nights Stay";
    break;
  default:
    packageCost = 9999;
    briefDescription = "Package Not Selected";
}

// Package cost calculations and display
function updatePrices() {
    const packageElement = document.getElementById("package-cost");
    const gstElement = document.getElementById("gst-amount");
    const totalElement = document.getElementById("total-cost");
    const descElement = document.getElementById("brief-description");

    // Calculate amounts
    const priceAfterDiscount = packageCost - promoCodeDiscount;
    const gstAmount = Math.round(priceAfterDiscount * 0.18); // 18% GST
    const finalTotal = priceAfterDiscount + gstAmount;

    // Update display (only if elements exist on this page)
    if (packageElement) packageElement.textContent = `${packageCost}/-`;
    if (gstElement) gstElement.textContent = `${gstAmount}/- (18% GST)`;
    if (totalElement) totalElement.textContent = `${finalTotal}/-`;
    if (descElement) descElement.textContent = briefDescription;
}

// Call this when DOM loads
document.addEventListener("DOMContentLoaded", updatePrices);

const promoCodeDiscount = 1000;
const priceAfterDiscount = packageCost - promoCodeDiscount;
const gstRate = 0.18; // 18% GST
const gstAmount = Math.round(priceAfterDiscount * gstRate); // Calculate GST amount
const finalTotal = priceAfterDiscount + gstAmount; // Total including GST

// Update all price displays
function updatePriceDisplays() {
    const gstElement = document.getElementById("gst-amount");
    const totalElement = document.getElementById("total-cost");
    const packageElement = document.getElementById("package-cost");
    
    if (gstElement && totalElement && packageElement) {
        packageElement.textContent = packageCost + "/-";
        gstElement.textContent = gstAmount + "/-";
        totalElement.textContent = finalTotal + " INR";
    }
}

// Call this function after DOM loads
document.addEventListener("DOMContentLoaded", updatePriceDisplays);

/*Free And express Delivary Code starts here*/

document.addEventListener("DOMContentLoaded", function () {
    const shippingSelect = document.getElementById("shipping-method");
    const totalSpan = document.getElementById("total-cost");
    const listGroup = document.querySelector(".list-group.cart") || document.querySelector(".list-group");

    if (!shippingSelect || !totalSpan || !listGroup) {
        return;
    }
  
    // This is the Function to update the shipping cost
    function updateShippingCost() {
      const selectedOption = shippingSelect.value;
      let shippingCost = 0;
  
      if (selectedOption === "standard") {
        shippingCost = 0;
      } else if (selectedOption === "express") {
        shippingCost = 85;
      }
  
      // This is function to remove existing shipping cost item
      const existingShippingItem = document.getElementById("shipping-cost-item");
      if (existingShippingItem) {
        existingShippingItem.remove();
      }
  
      // This is the function to create new shipping cost item
      const shippingItem = document.createElement("li");
      shippingItem.classList.add("list-group-item", "d-flex", "justify-content-between", "text-secondary");
      shippingItem.id = "shipping-cost-item";
      shippingItem.innerHTML = `
        <span>Shipping</span>
        <strong>${shippingCost === 0 ? "Free" : shippingCost + " INR"}</strong>
      `;
  
      // Here is the function to insert new shipping cost item before the total
      listGroup.insertBefore(shippingItem, totalSpan.parentNode);
  
      // To Update the total amount in the cart
      const grandTotal = finalTotal + shippingCost;
      totalSpan.textContent = `${grandTotal} INR`;
    }
  
    shippingSelect.addEventListener("change", updateShippingCost);
  
    updateShippingCost();
  });
//   adding dark mode feature
  // payment.js or add in a <script> tag at the end of the body
document.addEventListener('DOMContentLoaded', () => {
    const toggleCheckbox = document.getElementById('themeToggle');
    const body = document.body;
  
    // Load saved dark mode preference from localStorage
    if (localStorage.getItem('dark-mode') === 'enabled') {
      body.classList.add('dark-mode');
      toggleCheckbox.checked = true;
    } else {
      toggleCheckbox.checked = false;
    }
  
    toggleCheckbox.addEventListener('change', () => {
      if (toggleCheckbox.checked) {
        body.classList.add('dark-mode');
        localStorage.setItem('dark-mode', 'enabled');
      } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('dark-mode', 'disabled');
      }
    });
  });

// Theme toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('themeToggle');
    const body = document.body;

    // Check saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.classList.toggle('dark-mode', savedTheme === 'dark');

    themeBtn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
});

  // Add navigation functionality
document.addEventListener('DOMContentLoaded', function() {
  // Navigation elements
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.navLinks');
  const dropdowns = document.querySelectorAll('.dropdown');

  // Hamburger menu toggle
  if (hamburger) {
      hamburger.addEventListener('click', () => {
          navLinks.classList.toggle('active');
          hamburger.classList.toggle('active');
      });
  }

  // Dropdown functionality for mobile
  dropdowns.forEach(dropdown => {
      const link = dropdown.querySelector('a');
      const menu = dropdown.querySelector('.dropdown-menu');

      if (window.innerWidth <= 992) {
          link.addEventListener('click', (e) => {
              e.preventDefault();
              menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
          });
      }
  });

  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
          navLinks.classList.remove('active');
          hamburger.classList.remove('active');
      }
  });

  // Sticky navigation
  const nav = document.querySelector('.newNav');
  const navTop = nav.offsetTop;

  function stickyNavigation() {
      if (window.scrollY >= navTop) {
          nav.classList.add('sticky');
      } else {
          nav.classList.remove('sticky');
      }
  }

  window.addEventListener('scroll', stickyNavigation);
});

// Add scroll-based navigation visibility
let lastScroll = 0;
const navContainer = document.querySelector('.nav-container');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > lastScroll && currentScroll > 100) {
        // Scrolling down & past the initial 100px
        navContainer.classList.add('nav-hidden');
    } else {
        // Scrolling up
        navContainer.classList.remove('nav-hidden');
    }
    
    lastScroll = currentScroll;
});

// Update cart badge count
function updateCartBadge() {
  const cartBadge = document.querySelector('.cart-badge');
  const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  if (cartBadge) {
      cartBadge.textContent = cartItems.length;
      cartBadge.style.display = cartItems.length ? 'block' : 'none';
  }
}

// Initialize navigation features
function initializeNavigation() {
  updateCartBadge();
  
  // Active link highlighting
  const currentPath = window.location.pathname;
  document.querySelectorAll('.navLinks .link a').forEach(link => {
      if (link.getAttribute('href') === currentPath) {
          link.classList.add('active');
      }
  });
}

// Call initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeNavigation);

// Handle place order button click
document.querySelector('#payment-section button').addEventListener('click', function(e) {
    e.preventDefault();
    const form = document.querySelector('form');
    if (checkFormValidity()) {
        const shippingCost = document.getElementById('shipping-method').value === 'express' ? 85 : 0;
        const totalWithShipping = finalTotal + shippingCost;
        
        // Get tour type and additional details
        const tourType = document.body.getAttribute('data-tour-type') || 'General';
        const travelDate = document.getElementById('travel-date') ? document.getElementById('travel-date').value : new Date().toISOString().split('T')[0];
        
        const orderDetails = {
            tourType: tourType,
            package: selectedPackage,
            packageCost: packageCost,
            gstAmount: gstAmount,
            totalAmount: totalWithShipping,
            shippingMethod: document.getElementById('shipping-method').value,
            customerName: `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`,
            email: document.getElementById('email').value,
            address: `${document.getElementById('address').value}, ${document.getElementById('state').value}, ${document.getElementById('zip').value}`,
            date: new Date().toLocaleDateString(),
            travelDate: travelDate,
            duration: getDurationForPackage(selectedPackage),
            packageDetails: getPackageDetails(selectedPackage)
        };

        try {
            localStorage.setItem('orderDetails', JSON.stringify(orderDetails));
            window.location.href = 'payment-success.html';
        } catch (error) {
            console.error('Error saving order details:', error);
            alert('There was an error processing your order. Please try again.');
        }
    } else {
        alert('Please fill all required fields correctly');
    }
});

function getDurationForPackage(packageType) {
    const durations = {
        'bronze': '5 Days / 4 Nights',
        'silver': '7 Days / 6 Nights',
        'gold': '10 Days / 9 Nights',
        'platinum': '14 Days / 13 Nights'
    };
    return durations[packageType] || '5 Days / 4 Nights';
}

function getPackageDetails(packageType) {
    const details = {
        'bronze': '2 Star Hotel • Free Photo Session • Tour Guide',
        'silver': '3 Star Hotel • Free Photo Session • Tour Guide • Extra Activities',
        'gold': '4 Star Hotel • All Meals • Photo Session • Premium Tour Guide',
        'platinum': '5 Star Hotel • All Inclusive • VIP Service • Luxury Experience'
    };
    return details[packageType] || 'Standard Package';
}

