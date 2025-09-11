// DOM Elements
const elements = {
    apiKeyInput: document.getElementById('apiKey'),
    toggleApiKey: document.getElementById('toggleApiKey'),
    testApiKeyBtn: document.getElementById('testApiKey'),
    saveApiKeyBtn: document.getElementById('saveApiKey'),
    apiStatus: document.getElementById('apiStatus'),
    successMessage: document.getElementById('successMessage'),
    errorMessage: document.getElementById('errorMessage'),
    errorText: document.getElementById('errorText'),
    statusText: document.getElementById('statusText'),
    planType: document.getElementById('planType'),
    requestsUsed: document.getElementById('requestsUsed'),
    requestsAvailable: document.getElementById('requestsAvailable')
};

// State
let isApiKeyVisible = false;

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
    initializeOptionsPage();
    setupEventListeners();
});

async function initializeOptionsPage() {
    try {
        // Load saved API key
        const result = await chrome.storage.local.get(['hunterApiKey']);
        if (result.hunterApiKey) {
            elements.apiKeyInput.value = result.hunterApiKey;
            enableButtons();
            
            // Automatically test the saved API key
            testApiKey(result.hunterApiKey, false);
        }
    } catch (error) {
        console.error('Error loading saved settings:', error);
        showError('Failed to load saved settings');
    }
}

function setupEventListeners() {
    // API Key input changes
    elements.apiKeyInput.addEventListener('input', () => {
        const hasValue = elements.apiKeyInput.value.trim().length > 0;
        enableButtons(hasValue);
        hideMessages();
        hideApiStatus();
    });

    // Toggle API key visibility
    elements.toggleApiKey.addEventListener('click', () => {
        toggleApiKeyVisibility();
    });

    // Test API key
    elements.testApiKeyBtn.addEventListener('click', () => {
        const apiKey = elements.apiKeyInput.value.trim();
        if (apiKey) {
            testApiKey(apiKey, true);
        }
    });

    // Save API key
    elements.saveApiKeyBtn.addEventListener('click', () => {
        const apiKey = elements.apiKeyInput.value.trim();
        if (apiKey) {
            saveApiKey(apiKey);
        }
    });

    // Keyboard shortcuts
    elements.apiKeyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const apiKey = elements.apiKeyInput.value.trim();
            if (apiKey) {
                saveApiKey(apiKey);
            }
        }
    });
}

function toggleApiKeyVisibility() {
    isApiKeyVisible = !isApiKeyVisible;
    
    if (isApiKeyVisible) {
        elements.apiKeyInput.type = 'text';
        elements.toggleApiKey.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94C17.26 18.62 15.76 20 12 20C6 20 2 15 2 12C2 10.5 2.38 9.16 3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9.9 4.24C10.54 4.08 11.26 4 12 4C18 4 22 9 22 12C22 12.65 21.87 13.26 21.64 13.82" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                <path d="M1 1L23 23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        elements.toggleApiKey.title = 'Hide API Key';
    } else {
        elements.apiKeyInput.type = 'password';
        elements.toggleApiKey.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
            </svg>
        `;
        elements.toggleApiKey.title = 'Show API Key';
    }
}

function enableButtons(enabled = true) {
    elements.testApiKeyBtn.disabled = !enabled;
    elements.saveApiKeyBtn.disabled = !enabled;
}

async function testApiKey(apiKey, showLoadingState = true) {
    try {
        if (showLoadingState) {
            setButtonLoading(elements.testApiKeyBtn, true);
            hideMessages();
            hideApiStatus();
        }

        // Send message to background script to test API key
        const response = await chrome.runtime.sendMessage({
            action: 'testApiKey',
            apiKey: apiKey
        });

        if (response.success) {
            showApiStatus(response.data);
            if (showLoadingState) {
                showSuccess('API key is valid and working!');
            }
        } else {
            hideApiStatus();
            showError(response.error || 'Invalid API key or network error');
        }

    } catch (error) {
        console.error('Error testing API key:', error);
        hideApiStatus();
        showError('Failed to test API key. Please check your connection.');
    } finally {
        if (showLoadingState) {
            setButtonLoading(elements.testApiKeyBtn, false);
        }
    }
}

async function saveApiKey(apiKey) {
    try {
        setButtonLoading(elements.saveApiKeyBtn, true);
        hideMessages();

        // First test the API key
        const testResponse = await chrome.runtime.sendMessage({
            action: 'testApiKey',
            apiKey: apiKey
        });

        if (!testResponse.success) {
            showError('Cannot save invalid API key. Please check your key and try again.');
            return;
        }

        // Save to storage
        await chrome.storage.local.set({ hunterApiKey: apiKey });
        
        showApiStatus(testResponse.data);
        showSuccess('Settings saved successfully!');
        
        console.log('API key saved successfully');

    } catch (error) {
        console.error('Error saving API key:', error);
        showError('Failed to save settings. Please try again.');
    } finally {
        setButtonLoading(elements.saveApiKeyBtn, false);
    }
}

function showApiStatus(data) {
    elements.statusText.textContent = 'Connected';
    
    // Display plan information with enhanced details
    const planDisplay = data.plan_name ? 
        `${data.plan_name} (Level ${data.plan_level || 0})` : 
        (data.plan || 'Unknown');
    elements.planType.textContent = planDisplay;
    
    // Display primary usage (searches) - this is most relevant for email lookup
    elements.requestsUsed.textContent = data.searches_used || data.requests_used || 0;
    elements.requestsAvailable.textContent = data.searches_available || data.requests_available || 0;
    
    // Add additional account info if elements exist
    const accountInfoElement = document.getElementById('accountInfo');
    if (accountInfoElement) {
        const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
        accountInfoElement.innerHTML = `
            <div class="account-details">
                <h3>Account Information</h3>
                <div class="account-info">
                    ${fullName ? `
                    <div class="info-item">
                        <span class="info-label">Name</span>
                        <span class="info-value">${fullName}</span>
                    </div>` : ''}
                    ${data.email ? `
                    <div class="info-item">
                        <span class="info-label">Email</span>
                        <span class="info-value">${data.email}</span>
                    </div>` : ''}
                    ${data.plan_name ? `
                    <div class="info-item">
                        <span class="info-label">Plan</span>
                        <span class="info-value">
                            <span class="plan-badge">${data.plan_name}</span>
                        </span>
                    </div>` : ''}
                    ${data.reset_date ? `
                    <div class="info-item">
                        <span class="info-label">Reset Date</span>
                        <span class="info-value">${new Date(data.reset_date).toLocaleDateString()}</span>
                    </div>` : ''}
                </div>
                <div class="usage-breakdown">
                    <h4>Usage Breakdown</h4>
                    <div class="usage-items">
                        <div class="usage-item">
                            <div class="usage-label">Searches</div>
                            <div class="usage-value">${data.searches_used || 0}</div>
                            <div class="usage-limit">of ${data.searches_available || 0}</div>
                        </div>
                        <div class="usage-item">
                            <div class="usage-label">Verifications</div>
                            <div class="usage-value">${data.verifications_used || 0}</div>
                            <div class="usage-limit">of ${data.verifications_available || 0}</div>
                        </div>
                        ${(data.credits_available || 0) > 0 ? `
                        <div class="usage-item">
                            <div class="usage-label">Credits</div>
                            <div class="usage-value">${data.credits_used || 0}</div>
                            <div class="usage-limit">of ${data.credits_available || 0}</div>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    elements.apiStatus.classList.remove('hidden', 'error');
    elements.apiStatus.classList.add('success');
}

function hideApiStatus() {
    elements.apiStatus.classList.add('hidden');
}

function showSuccess(message) {
    hideMessages();
    elements.successMessage.querySelector('span').textContent = message;
    elements.successMessage.classList.remove('hidden');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        elements.successMessage.classList.add('hidden');
    }, 3000);
}

function showError(message) {
    hideMessages();
    elements.errorText.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideMessages() {
    elements.successMessage.classList.add('hidden');
    elements.errorMessage.classList.add('hidden');
}

function setButtonLoading(button, loading) {
    const originalContent = button.getAttribute('data-original-content') || button.innerHTML;
    
    if (loading) {
        button.setAttribute('data-original-content', originalContent);
        button.disabled = true;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="loading">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 2C17.5228 2 22 6.47715 22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Testing...
        `;
    } else {
        button.disabled = false;
        button.innerHTML = originalContent;
        button.removeAttribute('data-original-content');
    }
}

// Utility function to validate API key format
function isValidApiKeyFormat(apiKey) {
    // Hunter.io API keys are typically alphanumeric and around 40 characters
    return apiKey && apiKey.length >= 30 && /^[a-zA-Z0-9]+$/.test(apiKey);
}

// Handle page visibility for auto-refresh
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && elements.apiKeyInput.value.trim()) {
        // Refresh API status when page becomes visible
        testApiKey(elements.apiKeyInput.value.trim(), false);
    }
});
