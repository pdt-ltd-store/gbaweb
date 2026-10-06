// Array to store all games for searching
let allGames = [];
let filteredGames = [];
const GAMES_PER_PAGE = 50;
let currentPage = 1;
let isListView = false;

// Session Storage Keys
const SESSION_STORAGE_KEY = 'downloadedGames';

// Session Storage Functions for Download Tracking
function getDownloadedGames() {
    try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error('Error reading downloaded games from session storage:', e);
        return {};
    }
}

function saveDownloadedGame(game) {
    try {
        const downloadedGames = getDownloadedGames();
        // Use download_link as unique identifier (or title if link is not unique)
        const gameId = game.download_link || game.title;
        downloadedGames[gameId] = {
            title: game.title,
            download_link: game.download_link,
            platform: game.platform,
            thumbnail: game.thumbnail,
            downloadedAt: new Date().toISOString()
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(downloadedGames));
        console.log(`✅ Saved download state for: ${game.title}`);
        return true;
    } catch (e) {
        console.error('Error saving downloaded game to session storage:', e);
        return false;
    }
}

function isGameDownloaded(game) {
    const downloadedGames = getDownloadedGames();
    const gameId = game.download_link || game.title;
    return downloadedGames.hasOwnProperty(gameId);
}

function getDownloadedGamesCount() {
    const downloadedGames = getDownloadedGames();
    return Object.keys(downloadedGames).length;
}



// Popular games list - will be prioritized at the top
const POPULAR_GAMES = [
    "Pokemon - Emerald Version",
    "Pokemon - Fire Red Version (V1.1)", 
    "Pokemon Ultra Violet (1.22) LSA (Fire Red Hack)",
    "Pokemon - Ruby Version (V1.1)",
    "Pokemon - Leaf Green Version (V1.1)",
    "Super Mario Advance 4 - Super Mario Bros. 3 (V1.1)",
    "Pokemon Jupiter - 6.04 (Ruby Hack)",
    "Legend Of Zelda, The - The Minish Cap",
    "Pokemon - Sapphire Version (V1.1)",
    "Grand Theft Auto Advance",
    "Super Mario Advance 2 - Super Mario World",
    "Pokemon Black - Special Palace Edition 1 By MB Hacks (Red Hack) Goomba V2.2",
    "Kirby - Nightmare In Dreamland",
    "Dragonball Z - Supersonic Warriors",
    "Classic NES - Super Mario Bros.",
    "Ultimate Spider-Man",
    "Pokemon Mystery Dungeon - Red Rescue Team",
    "Fire Emblem",
    "Kirby & The Amazing Mirror",
    "Mario Kart Super Circuit",
    "Dragonball - Advanced Adventure",
    "Need For Speed - Underground 2",
    "Sonic Advance",
    "Legend Of Zelda, The - A Link To The Past Four Swords",
    "Naruto - Ninja Council 2",
    "Crash Bandicoot - The Huge Adventure",
    "Harvest Moon - Friends Of Mineral Town",
    "Yu-Gi-Oh! - GX Duel Academy",
    "Mario & Luigi - Superstar Saga",
    "Yu-Gi-Oh! - The Sacred Cards",
    "Pokemon - Fire Red Version [a1]",
    "Dragonball Z - The Legacy Of Goku 2",
    "Final Fantasy 6 Advance",
    "Mortal Kombat Advance",
    "Sonic Advance 3",
    "Beyblade G-Revolution",
    "Metal Slug Advance",
    "Metroid - Zero Mission",
    "Fire Emblem - The Sacred Stones",
    "Pokemon Rojo Fuego (S)",
    "Dragonball GT - Transformation",
    "Super Mario Advance",
    "Mother 3 (Eng. Translation 1.1)",
    "Dragonball Z - The Legacy Of Goku",
    "Donkey Kong Country",
    "Golden Sun",
    "Final Fantasy - Tactics Advanced",
    "Castlevania - Aria Of Sorrow"
];



// Function to sort games by popularity
function sortGamesByPopularity(games) {
    return games.sort((a, b) => {
        const aIndex = POPULAR_GAMES.findIndex(title => 
            a.title.toLowerCase().includes(title.toLowerCase()) || 
            title.toLowerCase().includes(a.title.toLowerCase())
        );
        const bIndex = POPULAR_GAMES.findIndex(title => 
            b.title.toLowerCase().includes(title.toLowerCase()) || 
            title.toLowerCase().includes(b.title.toLowerCase())
        );
        
        // If both are popular games, sort by their index in POPULAR_GAMES
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }
        
        // If only one is popular, put it first
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // If neither is popular, maintain original order
        return 0;
    });
}

// Utility to get unique values for a field
function getUniqueValues(games, field) {
    return [...new Set(games.map(game => game[field]).filter(Boolean))];
}

// Populate filter dropdowns
function populateFilters(games) {
    const platformFilter = document.getElementById('platform-filter');
    const regionFilter = document.getElementById('region-filter');
    // Populate platform
    const platforms = getUniqueValues(games, 'platform');
    platformFilter.innerHTML = '<option value="">All</option>' +
        platforms.map(p => `<option value="${p}">${p}</option>`).join('');
    // Populate region
    const regions = getUniqueValues(games, 'region');
    regionFilter.innerHTML = '<option value="">All</option>' +
        regions.map(r => `<option value="${r}">${r}</option>`).join('');
}







// Load JSON data from file with retry mechanism
async function loadGames(retryCount = 0, fileName = 'games.json') {
    const maxRetries = 2;
    const retryDelay = 2000; // 2 seconds
    const fallbackFiles = ['games.json', 'gbaroms.json', 'sgame.json']; // Fallback options
    
    try {
        // Show loading message
        updateLoadingMessage(`Loading games... ${retryCount > 0 ? `(Attempt ${retryCount + 1}/${maxRetries + 1})` : ''}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced to 8s timeout
        
        const response = await fetch(fileName, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        if (!text.trim()) {
            throw new Error('Empty response from server');
        }
        
        let games;
        try {
            games = JSON.parse(text);
        } catch (parseError) {
            throw new Error('Invalid JSON format in response');
        }
        
        if (!Array.isArray(games)) {
            throw new Error('Invalid data format: Expected array of games');
        }
        
        const validGames = games.filter(game => 
            game && 
            game.download_link !== null && 
            game.title && 
            game.platform && 
            game.thumbnail
        );
        
        if (validGames.length === 0) {
            throw new Error("No valid games found in the data");
        }
        
        // Success! Hide loading and sort by popularity
        hideLoadingMessage();
        
        // Sort games by popularity
        const sortedGames = sortGamesByPopularity(validGames);
        
        allGames = sortedGames;
        filteredGames = sortedGames;
        populateFilters(sortedGames);
        displayGames(sortedGames);
        
        console.log(`✅ Successfully loaded ${validGames.length} games`);
        
        // Show downloaded games count
        const downloadedCount = getDownloadedGamesCount();
        if (downloadedCount > 0) {
            console.log(`📥 You have ${downloadedCount} downloaded game(s) in this session`);
        }
        

        
    } catch (error) {
        console.error(`❌ Error loading games (attempt ${retryCount + 1}):`, error);
        
        // Determine error type for better user feedback
        let errorMessage = error.message;
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out. Please check your connection and try again.';
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('HTTP 404')) {
            errorMessage = 'Games data file not found on server.';
        } else if (error.message.includes('HTTP 500')) {
            errorMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'Data format error. Please refresh the page.';
        }
        
        if (retryCount < maxRetries) {
            // Retry after delay
            const delayTime = retryDelay;
            updateLoadingMessage(`Loading failed. Retrying in ${delayTime/1000}s... (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => {
                loadGames(retryCount + 1, fileName);
            }, delayTime);
        } else {
            // Try fallback files if we haven't tried them yet
            const currentFileIndex = fallbackFiles.indexOf(fileName);
            const nextFileIndex = currentFileIndex + 1;
            
            if (nextFileIndex < fallbackFiles.length) {
                const nextFile = fallbackFiles[nextFileIndex];
                console.log(`🔄 Trying fallback file: ${nextFile}`);
                updateLoadingMessage(`Trying alternative data source: ${nextFile}...`);
                setTimeout(() => {
                    loadGames(0, nextFile); // Reset retry count for new file
                }, 1500);
            } else {
                // All files exhausted, show final error with better UX
                console.error('All loading attempts failed');
                showErrorMessage(errorMessage);
            }
        }
    }
}

// Helper functions for loading states
function updateLoadingMessage(message) {
    const gameList = document.getElementById('game-list');
    if (gameList) {
        gameList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--color-accent); font-size: 1.2em; padding: 40px;">
                <div class="loading-spinner" style="margin-bottom: 20px;">🎮</div>
                ${message}
            </div>
        `;
    }
}

function hideLoadingMessage() {
    // Loading will be replaced by actual games, so no need to explicitly hide
}

function showErrorMessage(errorMessage) {
    const gameList = document.getElementById('game-list');
    if (gameList) {
        gameList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <div style="color: #ff4444; font-size: 1.2em; margin-bottom: 20px;">
                    ❌ Error Loading Games
                </div>
                <div style="color: var(--color-text); margin-bottom: 20px; font-size: 0.9em;">
                    ${errorMessage}
                </div>
                <div style="margin-bottom: 20px; font-size: 0.8em; color: var(--color-accent); opacity: 0.8;">
                    💡 Try refreshing the page or check your internet connection
                </div>
                <button onclick="retryLoadGames()" class="retry-btn">
                    🔄 Retry Loading
                </button>
            </div>
        `;
    }
}

// Global retry function
function retryLoadGames() {
    console.log('🔄 User initiated retry...');
    loadGames(0); // Reset retry count
}

// Reload page function
function reloadPage() {
    console.log('🔄 Reloading page...');
    window.location.reload();
}

function renderPagination(totalGames, currentPage) {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(totalGames / GAMES_PER_PAGE);
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    let html = '';
    html += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>`;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
            html += `<button class="pagination-btn${i === currentPage ? ' active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span style="color:#bdb6c5;">...</span>';
        }
    }
    html += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>`;
    pagination.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    displayGames(filteredGames);
    renderPagination(filteredGames.length, currentPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Check if a game is popular
function isPopularGame(gameTitle) {
    return POPULAR_GAMES.some(title => 
        gameTitle.toLowerCase().includes(title.toLowerCase()) || 
        title.toLowerCase().includes(gameTitle.toLowerCase())
    );
}

// Display games in a responsive grid
function displayGames(games) {
    const gameList = document.getElementById('game-list');
    gameList.innerHTML = '';
    if (games.length === 0) {
        gameList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #f357a8; font-size: 1.2em;">No games found.</div>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    const start = (currentPage - 1) * GAMES_PER_PAGE;
    const end = start + GAMES_PER_PAGE;
    const pageGames = games.slice(start, end);
    pageGames.forEach(game => {
        const gameItem = document.createElement('div');
        gameItem.classList.add('game');
        if (isListView) gameItem.classList.add('list-item');
        
        // Check if game is downloaded
        const isDownloaded = isGameDownloaded(game);
        const downloadedClass = isDownloaded ? 'downloaded' : '';
        const downloadText = isDownloaded ? 'Downloaded' : 'Download';
        
        const popularBadge = isPopularGame(game.title) ? '<div class="popular-badge">🔥 Popular</div>' : '';
        const downloadedBadge = isDownloaded ? '<div class="downloaded-badge">Downloaded</div>' : '';
        
        gameItem.innerHTML = isListView ? `
            <div class="game-image-container">
                <img src="${game.thumbnail}" alt="${game.title}">
                ${popularBadge}
                ${downloadedBadge}
            </div>
            <div class="game-info">
                <h3>${game.title}</h3>
                <p><strong>Platform:</strong> ${game.platform}</p>
                <a href="${game.download_link}" class="download-btn ${downloadedClass}" target="_blank" data-game-id="${game.download_link || game.title}">
                    <span class="download-spinner"></span>
                    <span class="download-text">${downloadText}</span>
                </a>
            </div>
        ` : `
            <div class="game-image-container">
                <img src="${game.thumbnail}" alt="${game.title}">
                ${popularBadge}
                ${downloadedBadge}
            </div>
            <div class="game-info">
                <h3>${game.title}</h3>
                <p><strong>Platform:</strong> ${game.platform}</p>
                <a href="${game.download_link}" class="download-btn ${downloadedClass}" target="_blank" data-game-id="${game.download_link || game.title}">
                    <span class="download-spinner"></span>
                    <span class="download-text">${downloadText}</span>
                </a>
            </div>
        `;
        setTimeout(() => {
            const btn = gameItem.querySelector('.download-btn');
            btn.addEventListener('click', function(e) {
                // Save download state to session storage
                saveDownloadedGame(game);
                
                // Update button appearance immediately
                if (!btn.classList.contains('downloaded')) {
                    btn.classList.add('downloaded');
                    const downloadTextSpan = btn.querySelector('.download-text');
                    if (downloadTextSpan) {
                        downloadTextSpan.textContent = 'Downloaded';
                    }
                    
                    // Add downloaded badge to game card
                    const gameImageContainer = gameItem.querySelector('.game-image-container');
                    if (gameImageContainer && !gameImageContainer.querySelector('.downloaded-badge')) {
                        const badge = document.createElement('div');
                        badge.className = 'downloaded-badge';
                        badge.textContent = 'Downloaded';
                        gameImageContainer.appendChild(badge);
                    }
                }
                
                // Add loading state
                btn.classList.add('loading');
                
                // Remove loading state after download starts (after a short delay)
                setTimeout(() => {
                    btn.classList.remove('loading');
                }, 2000);
                
                // Ripple effect
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                const rect = btn.getBoundingClientRect();
                ripple.style.left = (e.clientX - rect.left) + 'px';
                ripple.style.top = (e.clientY - rect.top) + 'px';
                btn.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        }, 0);
        gameList.appendChild(gameItem);
    });
    renderPagination(games.length, currentPage);
}

// Main filter function
function filterGames() {
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    const platform = document.getElementById('platform-filter').value;
    const region = document.getElementById('region-filter').value;
    
    let filtered = allGames.filter(game => {
        const matchesSearch =
            game.title.toLowerCase().includes(searchQuery) ||
            game.platform.toLowerCase().includes(searchQuery);
        const matchesPlatform = !platform || game.platform === platform;
        const matchesRegion = !region || game.region === region;
        return matchesSearch && matchesPlatform && matchesRegion;
    });
    
    // Sort filtered results by popularity
    filteredGames = sortGamesByPopularity(filtered);
    
    currentPage = 1;
    displayGames(filteredGames);
    renderPagination(filteredGames.length, currentPage);
}

// Search function (delegates to filter)
function searchGames() {
    filterGames();
}

function toggleView() {
    isListView = !isListView;
    const grid = document.getElementById('game-list');
    const btn = document.getElementById('toggle-view-btn');
    const iconGrid = btn.querySelector('.icon-grid');
    const iconList = btn.querySelector('.icon-list');
    if (isListView) {
        grid.classList.add('list-view');
        btn.classList.add('active');
        iconGrid.style.display = 'none';
        iconList.style.display = 'inline';
    } else {
        grid.classList.remove('list-view');
        btn.classList.remove('active');
        iconGrid.style.display = 'inline';
        iconList.style.display = 'none';
    }
    displayGames(filteredGames);
}

// Removed theme toggle - using default dark theme

document.addEventListener('DOMContentLoaded', function() {
    // Loading overlay with improved mobile handling
    const overlay = document.getElementById('loading-overlay');
    let overlayHidden = false;
    
    function hideOverlay() {
        if (!overlayHidden && overlay) {
            overlayHidden = true;
            overlay.classList.add('hide');
            // Force hide after transition
            setTimeout(() => {
                if (overlay) {
                    overlay.style.display = 'none';
                    overlay.style.visibility = 'hidden';
                }
            }, 400);
        }
    }
    
    // Hide overlay when page is fully loaded
    window.addEventListener('load', function() {
        setTimeout(hideOverlay, 200);
    });
    
    // Fallback hide after 2 seconds
    setTimeout(hideOverlay, 2000);
    
    // Add timeout to show reload button if loading takes too long
    setTimeout(() => {
        if (!overlayHidden && overlay) {
            const loadingText = overlay.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = 'Loading is taking longer than expected...';
            }
        }
    }, 6000); // Show warning after 6 seconds
    
    // Force hide overlay if still visible after 10 seconds
    setTimeout(() => {
        if (!overlayHidden) {
            hideOverlay();
        }
    }, 10000);
});

// Enhanced initialization with network detection
function initializeApp() {
    // Check if we're online
    if (!navigator.onLine) {
        showErrorMessage('No internet connection. Please check your network and try again.');
        return;
    }
    
    // Load the games data with a safety timeout
    loadGames();
    
    // Safety fallback - if loading takes too long, show error
    setTimeout(() => {
        const gameList = document.getElementById('game-list');
        if (gameList && gameList.innerHTML.includes('Loading games')) {
            console.error('Loading timeout - showing error after 10 seconds');
            showErrorMessage('Loading is taking too long. Please refresh the page or check your connection.');
        }
    }, 10000); // Reduced to 10 second safety timeout
    
    // Force hide loading overlay after 12 seconds as ultimate fallback
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay && !overlay.classList.contains('hide')) {
            overlay.classList.add('hide');
            setTimeout(() => {
                if (overlay) {
                    overlay.style.display = 'none';
                    overlay.style.visibility = 'hidden';
                }
            }, 400);
        }
    }, 12000);
}

// Add online/offline event listeners
window.addEventListener('online', function() {
    console.log('🌐 Connection restored');
    if (document.getElementById('game-list').innerHTML.includes('No internet connection')) {
        loadGames();
    }
});

window.addEventListener('offline', function() {
    console.log('📡 Connection lost');
    showErrorMessage('Connection lost. Please check your internet connection.');
});



// Initialize app
initializeApp();
