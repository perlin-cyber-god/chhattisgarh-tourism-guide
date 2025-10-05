// app.js - Frontend JavaScript
const API_URL = 'http://localhost:5000/api';
let allPlaces = [];
let map;
let markers = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
const userIdentifier = 'user_' + Math.random().toString(36).substr(2, 9);

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadTrendingPlaces();
    loadAllPlaces();
    loadItineraries();
    initializeMap();
    loadStickyNotes();
    renderCalendar();
    loadCalendarEvents();
    
    // Enter key for search
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchPlaces();
    });
});

// Load trending places
async function loadTrendingPlaces() {
    try {
        const response = await fetch(`${API_URL}/places/trending/all`);
        const places = await response.json();
        displayPlaces(places, 'trendingPlaces');
    } catch (error) {
        console.error('Error loading trending places:', error);
        document.getElementById('trendingPlaces').innerHTML = '<p>Error loading places</p>';
    }
}

// Load all places
async function loadAllPlaces() {
    try {
        const response = await fetch(`${API_URL}/places`);
        allPlaces = await response.json();
        displayPlaces(allPlaces, 'allPlaces');
        updateMapPlacesList(allPlaces);
        
        // Extract unique categories
        const categories = [...new Set(allPlaces.map(p => p.category))];
        displayCategories(categories);
    } catch (error) {
        console.error('Error loading places:', error);
        document.getElementById('allPlaces').innerHTML = '<p>Error loading places</p>';
    }
}

// Display categories
function displayCategories(categories) {
    const container = document.getElementById('categories');
    container.innerHTML = `
        <button class="category-btn active" onclick="filterByCategory('')">All</button>
        ${categories.map(cat => `
            <button class="category-btn" onclick="filterByCategory('${cat}')">${cat}</button>
        `).join('')}
    `;
}

// Filter by category
function filterByCategory(category) {
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const filtered = category ? allPlaces.filter(p => p.category === category) : allPlaces;
    displayPlaces(filtered, 'allPlaces');
}

// Display places
function displayPlaces(places, containerId) {
    const container = document.getElementById(containerId);
    
    if (places.length === 0) {
        container.innerHTML = '<p>No places found</p>';
        return;
    }
    
    container.innerHTML = places.map(place => `
        <div class="card" onclick="showPlaceDetails('${place._id}')">
            <div class="card-image">
                ${place.images && place.images.length > 0 
                    ? `<img src="${place.images[0]}" style="width: 100%; height: 100%; object-fit: cover;" alt="${place.name}">`
                    : `<i class="fas fa-image"></i>`
                }
            </div>
            <div class="card-content">
                <h3 class="card-title">${place.name}</h3>
                <div class="card-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${place.district}</span>
                    <span><i class="fas fa-tag"></i> ${place.category}</span>
                </div>
                <p class="card-description">${place.description.substring(0, 120)}...</p>
                <div class="card-footer">
                    <div class="rating">
                        <i class="fas fa-star"></i> ${place.rating.toFixed(1)}
                    </div>
                    <div>
                        <i class="fas fa-eye"></i> ${place.viewCount} views
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Get RedBus link for a city
function getRedbusLink(district) {
    const cityMap = {
        'Raipur': 'raipur',
        'Bilaspur': 'bilaspur-chhattisgarh',
        'Durg': 'durg',
        'Bastar': 'jagdalpur',
        'Surguja': 'ambikapur',
        'Kawardha': 'kawardha',
        'Mahasamund': 'mahasamund'
    };
    const city = cityMap[district] || 'raipur';
    return `https://www.redbus.in/bus-tickets/${city}`;
}

// Show place details in modal
async function showPlaceDetails(placeId) {
    try {
        const response = await fetch(`${API_URL}/places/${placeId}`);
        const place = await response.json();
        
        document.getElementById('modalTitle').textContent = place.name;
        document.getElementById('modalMeta').innerHTML = `
            <p><i class="fas fa-map-marker-alt"></i> ${place.district} | 
            <i class="fas fa-tag"></i> ${place.category} | 
            <i class="fas fa-star"></i> ${place.rating.toFixed(1)}</p>
        `;
        
        document.getElementById('modalBody').innerHTML = `
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> About</h3>
                <p>${place.description}</p>
            </div>
            
            ${place.activities && place.activities.length > 0 ? `
            <div class="detail-section">
                <h3><i class="fas fa-hiking"></i> Activities</h3>
                <p>${place.activities.join(', ')}</p>
            </div>
            ` : ''}
            
            <div class="detail-section">
                <h3><i class="fas fa-clock"></i> Visiting Information</h3>
                <p><strong>Best Time:</strong> ${place.bestTimeToVisit || 'Year-round'}</p>
                <p><strong>Entry Fee:</strong> ${place.entryFee || 'Free'}</p>
                <p><strong>Timings:</strong> ${place.timings || 'Open 24/7'}</p>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-route"></i> How to Reach</h3>
                ${place.howToReach.byRoad ? `<p><strong>By Road:</strong> ${place.howToReach.byRoad}</p>` : ''}
                ${place.howToReach.byRail ? `<p><strong>By Rail:</strong> ${place.howToReach.byRail}</p>` : ''}
                ${place.howToReach.byAir ? `<p><strong>By Air:</strong> ${place.howToReach.byAir}</p>` : ''}
            </div>
            
            ${place.amenities && place.amenities.length > 0 ? `
            <div class="detail-section">
                <h3><i class="fas fa-concierge-bell"></i> Amenities</h3>
                <p>${place.amenities.join(', ')}</p>
            </div>
            ` : ''}
            
            <div class="detail-section">
                <button class="btn" onclick="addToWishlist('${place._id}')">
                    <i class="fas fa-heart"></i> Add to Wishlist
                </button>
                <button class="btn" onclick="openInMaps(${place.coordinates.lat}, ${place.coordinates.lng})">
                    <i class="fas fa-map"></i> Open in Maps
                </button>
                <a href="${getRedbusLink(place.district)}" target="_blank" class="redbus-btn">
                    <i class="fas fa-bus"></i> Book Bus on RedBus
                </a>
                <button class="btn" onclick="addToCalendar('${place._id}', '${place.name}')">
                    <i class="fas fa-calendar-plus"></i> Add to Calendar
                </button>
            </div>
            
            <div class="detail-section">
                <p style="color: var(--light-green); font-size: 0.9rem;">
                    <i class="fas fa-eye"></i> This place has been viewed ${place.viewCount} times
                </p>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-comments"></i> Reviews</h3>
                <div id="reviewsList"></div>
                <button class="btn" onclick="showReviewForm('${place._id}')">Write a Review</button>
            </div>
        `;
        
        document.getElementById('placeModal').style.display = 'block';
        loadReviews(placeId);
    } catch (error) {
        console.error('Error loading place details:', error);
    }
}

// Close modal
function closeModal() {
    document.getElementById('placeModal').style.display = 'none';
}

// Load reviews
async function loadReviews(placeId) {
    try {
        const response = await fetch(`${API_URL}/reviews/${placeId}`);
        const reviews = await response.json();
        
        const reviewsContainer = document.getElementById('reviewsList');
        if (reviews.length === 0) {
            reviewsContainer.innerHTML = '<p>No reviews yet. Be the first to review!</p>';
            return;
        }
        
        reviewsContainer.innerHTML = reviews.map(review => `
            <div style="background: var(--bg-cream); padding: 1rem; margin: 1rem 0; border-radius: 5px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <strong>${review.userName}</strong>
                    <span class="rating">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span>
                </div>
                <p>${review.comment}</p>
                <small>${new Date(review.createdAt).toLocaleDateString()}</small>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Show review form
function showReviewForm(placeId) {
    const form = `
        <div style="background: var(--bg-cream); padding: 1.5rem; margin: 1rem 0; border-radius: 5px;">
            <h4>Write Your Review</h4>
            <input type="text" id="reviewerName" placeholder="Your Name" style="width: 100%; padding: 0.7rem; margin: 0.5rem 0; border: 2px solid var(--accent-green); border-radius: 5px;">
            <select id="reviewRating" style="width: 100%; padding: 0.7rem; margin: 0.5rem 0; border: 2px solid var(--accent-green); border-radius: 5px;">
                <option value="5">5 Stars - Excellent</option>
                <option value="4">4 Stars - Very Good</option>
                <option value="3">3 Stars - Good</option>
                <option value="2">2 Stars - Fair</option>
                <option value="1">1 Star - Poor</option>
            </select>
            <textarea id="reviewComment" placeholder="Share your experience..." style="width: 100%; padding: 0.7rem; margin: 0.5rem 0; border: 2px solid var(--accent-green); border-radius: 5px; min-height: 100px;"></textarea>
            <button class="btn" onclick="submitReview('${placeId}')">Submit Review</button>
        </div>
    `;
    document.getElementById('reviewsList').insertAdjacentHTML('beforebegin', form);
}

// Submit review
async function submitReview(placeId) {
    const name = document.getElementById('reviewerName').value;
    const rating = document.getElementById('reviewRating').value;
    const comment = document.getElementById('reviewComment').value;
    
    if (!name || !comment) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                placeId,
                userName: name,
                rating: parseInt(rating),
                comment
            })
        });
        
        alert('Review submitted successfully!');
        showPlaceDetails(placeId); // Reload details
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Error submitting review');
    }
}

// Add to wishlist
async function addToWishlist(placeId) {
    try {
        await fetch(`${API_URL}/wishlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userIdentifier,
                placeId
            })
        });
        alert('Added to wishlist!');
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        alert('Error adding to wishlist');
    }
}

// Search places
async function searchPlaces() {
    const query = document.getElementById('searchInput').value;
    if (!query) return;
    
    try {
        const response = await fetch(`${API_URL}/places?search=${encodeURIComponent(query)}`);
        const places = await response.json();
        displayPlaces(places, 'allPlaces');
        document.getElementById('places').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error searching places:', error);
    }
}

// Apply filters
async function applyFilters() {
    const category = document.getElementById('categoryFilter').value;
    const district = document.getElementById('districtFilter').value;
    const sort = document.getElementById('sortFilter').value;
    
    let url = `${API_URL}/places?`;
    if (category) url += `category=${category}&`;
    if (district) url += `district=${district}&`;
    if (sort) url += `sort=${sort}&`;
    
    try {
        const response = await fetch(url);
        const places = await response.json();
        displayPlaces(places, 'allPlaces');
    } catch (error) {
        console.error('Error applying filters:', error);
    }
}

// Initialize map
function initializeMap() {
    map = L.map('map').setView([21.2787, 81.8661], 7); // Chhattisgarh coordinates
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    loadPlacesOnMap();
}

// Load places on map
async function loadPlacesOnMap() {
    try {
        const response = await fetch(`${API_URL}/places`);
        const places = await response.json();
        
        places.forEach(place => {
            const marker = L.marker([place.coordinates.lat, place.coordinates.lng])
                .addTo(map)
                .bindPopup(`
                    <strong>${place.name}</strong><br>
                    ${place.category}<br>
                    <button onclick="showPlaceDetails('${place._id}')">View Details</button>
                `);
            markers.push({ marker, place });
        });
    } catch (error) {
        console.error('Error loading places on map:', error);
    }
}

// Update map places list
function updateMapPlacesList(places) {
    const container = document.getElementById('mapPlacesList');
    container.innerHTML = places.map(place => `
        <div class="map-place-item" onclick="focusOnMap(${place.coordinates.lat}, ${place.coordinates.lng})">
            <strong>${place.name}</strong><br>
            <small>${place.district} - ${place.category}</small>
        </div>
    `).join('');
}

// Focus on map location
function focusOnMap(lat, lng) {
    map.setView([lat, lng], 13);
}

// Open in external maps
function openInMaps(lat, lng) {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
}

// Load itineraries
async function loadItineraries() {
    try {
        const response = await fetch(`${API_URL}/itineraries`);
        const itineraries = await response.json();
        
        const container = document.getElementById('itinerariesList');
        container.innerHTML = itineraries.map(itinerary => `
            <div class="card" onclick="showItineraryDetails('${itinerary._id}')">
                <div class="card-image">
                    <i class="fas fa-route"></i>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${itinerary.title}</h3>
                    <div class="card-meta">
                        <span><i class="fas fa-clock"></i> ${itinerary.duration}</span>
                        <span><i class="fas fa-tag"></i> ${itinerary.category}</span>
                    </div>
                    <p class="card-description">${itinerary.description}</p>
                    <div class="card-footer">
                        <span><i class="fas fa-map-marked-alt"></i> ${itinerary.places.length} Places</span>
                        <span><i class="fas fa-rupee-sign"></i> ${itinerary.estimatedBudget}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading itineraries:', error);
        document.getElementById('itinerariesList').innerHTML = '<p>Error loading itineraries</p>';
    }
}

// Show itinerary details
async function showItineraryDetails(itineraryId) {
    try {
        const response = await fetch(`${API_URL}/itineraries/${itineraryId}`);
        const itinerary = await response.json();
        
        document.getElementById('modalTitle').textContent = itinerary.title;
        document.getElementById('modalMeta').innerHTML = `
            <p><i class="fas fa-clock"></i> ${itinerary.duration} | 
            <i class="fas fa-rupee-sign"></i> ${itinerary.estimatedBudget}</p>
        `;
        
        document.getElementById('modalBody').innerHTML = `
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> About This Tour</h3>
                <p>${itinerary.description}</p>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-map-marked-alt"></i> Places Included</h3>
                ${itinerary.places.map((place, index) => `
                    <div style="background: var(--bg-cream); padding: 1rem; margin: 0.5rem 0; border-radius: 5px; cursor: pointer;" onclick="showPlaceDetails('${place._id}')">
                        <strong>Day ${index + 1}: ${place.name}</strong><br>
                        <small>${place.district} - ${place.category}</small>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.getElementById('placeModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading itinerary details:', error);
    }
}

// ========== AI CHATBOT FUNCTIONS ==========

function toggleChatbot() {
    const chatbot = document.getElementById('chatbotContainer');
    chatbot.classList.toggle('active');
}

async function sendChatMessage() {
    const input = document.getElementById('chatbotInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addChatMessage(message, 'user');
    input.value = '';
    
    // Show typing indicator
    addChatMessage('Typing...', 'bot', 'typing');
    
    try {
        const response = await fetch(`${API_URL}/chatbot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        const typingMsg = document.querySelector('.typing');
        if (typingMsg) typingMsg.remove();
        
        // Add bot response
        addChatMessage(data.response, 'bot');
    } catch (error) {
        console.error('Error:', error);
        const typingMsg = document.querySelector('.typing');
        if (typingMsg) typingMsg.remove();
        addChatMessage('Sorry, I encountered an error. Please try again.', 'bot');
    }
}

function addChatMessage(message, sender, className = '') {
    const messagesContainer = document.getElementById('chatbotMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender} ${className}`;
    messageDiv.textContent = message;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Placeholder functions that need to be implemented
function loadStickyNotes() {
    console.log('loadStickyNotes function needs to be implemented');
}

function renderCalendar() {
    console.log('renderCalendar function needs to be implemented');
}

function loadCalendarEvents() {
    console.log('loadCalendarEvents function needs to be implemented');
}

function addToCalendar(placeId, placeName) {
    console.log('addToCalendar function needs to be implemented', placeId, placeName);
}
