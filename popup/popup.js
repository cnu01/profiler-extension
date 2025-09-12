// DOM Elements
const elements = {
    loadingState: document.getElementById('loadingState'),
    successState: document.getElementById('successState'),
    errorState: document.getElementById('errorState'),
    
    // Profile elements
    profileImage: document.getElementById('profileImage'),
    profileName: document.getElementById('profileName'),
    profileTitle: document.getElementById('profileTitle'),
    fullNameValue: document.getElementById('fullNameValue'),
    emailValue: document.getElementById('emailValue'),
    companyValue: document.getElementById('companyValue'),
    positionValue: document.getElementById('positionValue'),
    linkedinLink: document.getElementById('linkedinLink'),
    
    // Buttons
    copyFullName: document.getElementById('copyFullName'),
    copyEmail: document.getElementById('copyEmail'),
    copyCompany: document.getElementById('copyCompany'),
    copyPosition: document.getElementById('copyPosition'),
    copyLinkedin: document.getElementById('copyLinkedin'),
    refreshBtn: document.getElementById('refreshBtn'),
    analyzeAgainBtn: document.getElementById('analyzeAgainBtn'),
    settingsBtn: document.getElementById('settingsBtn')
};

// State management
let currentProfileData = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await initializePopup();
});

// Close popup when clicking outside
document.addEventListener('click', (e) => {
    if (e.target === document.body || e.target === document.documentElement) {
        window.close();
    }
});

// Handle escape key to close popup
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.close();
    }
});

async function initializePopup() {
    try {
        // Check if we're on a LinkedIn profile page
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        
        if (!isLinkedInProfilePage(currentTab.url)) {
            showError('Not a LinkedIn Profile', 'Please navigate to a LinkedIn profile page (linkedin.com/in/username) to use this extension.');
            return;
        }
        
        // Show loading state
        showState('loading');
        
        // Extract basic profile data for photo and LinkedIn URL
        const linkedinData = await extractBasicProfileData(currentTab);
        
        // Fetch Hunter.io data in background
        await fetchHunterDataInBackground(linkedinData);
        
    } catch (error) {
        showError('Initialization Error', 'Failed to initialize the extension. Please try again.');
    }
}

function isLinkedInProfilePage(url) {
    return url && url.includes('linkedin.com/in/');
}

async function ensureContentScriptInjected(tabId) {
    try {
        // Try to ping the content script first
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await chrome.tabs.sendMessage(tabId, { action: 'ping' });
                return;
            } catch (error) {
                if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
        
        // Inject content script if not already active
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content/content.js']
        });
        
        // Wait for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify injection worked
        await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        
    } catch (error) {
        throw new Error('Failed to inject content script');
    }
}

async function extractBasicProfileData(tab) {
    try {
        // Ensure content script is injected
        await ensureContentScriptInjected(tab.id);
        
        // Extract LinkedIn data for photo only
        const response = await Promise.race([
            chrome.tabs.sendMessage(tab.id, { action: 'extractProfileData' }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout: Content script did not respond')), 10000)
            )
        ]);
        
        if (!response?.success) {
            throw new Error(response?.error || 'Could not extract basic profile data from this page');
        }
        
        const profileData = response.data;
        
        if (!profileData?.fullName) {
            throw new Error('No profile name found');
        }
        
        // Store LinkedIn URL and photo for display
        currentProfileData = {
            linkedinUrl: tab.url,
            profileImage: profileData.profileImage,
            linkedinFullName: profileData.fullName || 'Unknown',
            linkedinDesignation: profileData.designation || null,
            linkedinOrganisation: profileData.organisation || null
        };
        
        // Show initial state with LinkedIn photo
        showInitialProfileData(currentProfileData);
        
        return profileData;
        
    } catch (error) {
        throw error;
    }
}

async function fetchHunterDataInBackground(linkedinData) {
    try {
        const hunterResponse = await chrome.runtime.sendMessage({
            action: 'fetchHunterData',
            data: linkedinData
        });
        
        if (hunterResponse?.success) {
            // Update profile data with Hunter.io information
            currentProfileData = {
                ...currentProfileData,
                ...hunterResponse.data
            };
            
            showHunterProfileData(hunterResponse.data);
        } else {
            showNoDataFound(hunterResponse?.error || 'No data available from Hunter.io');
        }
    } catch (error) {
        showNoDataFound('Failed to fetch data from Hunter.io');
    }
}

function showState(state) {
    // Hide all states first
    const allStates = [
        elements.loadingState,
        elements.successState, 
        elements.errorState
    ];
    
    allStates.forEach(el => {
        if (el) {
            el.classList.add('hidden');
        }
    });
    
    // Show requested state
    switch (state) {
        case 'loading':
            if (elements.loadingState) {
                elements.loadingState.classList.remove('hidden');
            }
            break;
        case 'success':
            if (elements.successState) {
                elements.successState.classList.remove('hidden');
            }
            break;
        case 'error':
            if (elements.errorState) {
                elements.errorState.classList.remove('hidden');
            }
            break;
    }
}

function showInitialProfileData(data) {
    // Update profile information with LinkedIn data
    if (elements.profileName) {
        elements.profileName.textContent = data.linkedinFullName || 'Unknown';
    }
    
    if (elements.profileTitle) {
        elements.profileTitle.textContent = 'Fetching from Hunter.io...';
    }
    
    // Set all Hunter.io fields to searching
    if (elements.fullNameValue) {
        elements.fullNameValue.textContent = 'Searching...';
    }
    
    if (elements.emailValue) {
        elements.emailValue.textContent = 'Searching...';
    }
    
    if (elements.companyValue) {
        elements.companyValue.textContent = 'Searching...';
    }
    
    if (elements.positionValue) {
        elements.positionValue.textContent = 'Searching...';
    }
    
    if (elements.linkedinLink && data.linkedinUrl) {
        elements.linkedinLink.href = data.linkedinUrl;
    }
    
    // Update profile image
    if (data.profileImage && elements.profileImage) {
        elements.profileImage.src = data.profileImage;
        elements.profileImage.style.display = 'block';
        const avatarFallback = elements.profileImage.parentElement.querySelector('.avatar-fallback');
        if (avatarFallback) {
            avatarFallback.style.display = 'none';
        }
    } else if (elements.profileImage) {
        elements.profileImage.style.display = 'none';
        const avatarFallback = elements.profileImage.parentElement.querySelector('.avatar-fallback');
        if (avatarFallback) {
            avatarFallback.style.display = 'flex';
        }
    }
    
    showState('success');
}

function showHunterProfileData(data) {
    // Update profile information with Hunter.io data only
    const fullName = (data.first_name && data.last_name) ? 
        `${data.first_name} ${data.last_name}`.trim() : 
        null;
    
    if (elements.profileName) {
        // Use Hunter.io name if available, otherwise use LinkedIn name for display only
        elements.profileName.textContent = fullName || currentProfileData.linkedinFullName || 'Unknown';
    }
    
    if (elements.profileTitle) {
        // Use Hunter.io data for title, fallback to LinkedIn data only for display
        const hunterPosition = data.position;
        const hunterCompany = data.company;
        
        if (hunterPosition && hunterCompany) {
            elements.profileTitle.textContent = `${hunterPosition} at ${hunterCompany}`;
        } else if (hunterPosition) {
            elements.profileTitle.textContent = hunterPosition;
        } else if (hunterCompany) {
            elements.profileTitle.textContent = hunterCompany;
        } else {
            // Fall back to LinkedIn data only for visual display
            const linkedinPosition = currentProfileData.linkedinDesignation;
            const linkedinCompany = currentProfileData.linkedinOrganisation;
            
            if (linkedinPosition && linkedinCompany) {
                elements.profileTitle.textContent = `${linkedinPosition} at ${linkedinCompany}`;
            } else if (linkedinPosition) {
                elements.profileTitle.textContent = linkedinPosition;
            } else if (linkedinCompany) {
                elements.profileTitle.textContent = linkedinCompany;
            } else {
                elements.profileTitle.textContent = 'Hunter.io data retrieved';
            }
        }
    }
    
    // Update Hunter.io specific fields - STRICT: Only use Hunter.io data
    if (elements.fullNameValue) {
        elements.fullNameValue.textContent = fullName || 'Not Found';
        if (fullName) {
            elements.copyFullName.style.display = 'flex';
        } else {
            elements.copyFullName.style.display = 'none';
        }
    }
    
    if (elements.emailValue) {
        elements.emailValue.textContent = data.email || 'Not Found';
        if (data.email) {
            elements.copyEmail.style.display = 'flex';
        } else {
            elements.copyEmail.style.display = 'none';
        }
    }
    
    if (elements.companyValue) {
        elements.companyValue.textContent = data.company || 'Not Found';
        if (data.company) {
            elements.copyCompany.style.display = 'flex';
        } else {
            elements.copyCompany.style.display = 'none';
        }
    }
    
    if (elements.positionValue) {
        elements.positionValue.textContent = data.position || 'Not Found';
        if (data.position) {
            elements.copyPosition.style.display = 'flex';
        } else {
            elements.copyPosition.style.display = 'none';
        }
    }
    
    showState('success');
}

function showNoDataFound(message) {
    // Update Hunter.io fields to show no data found - STRICT: No fallback to scraped data
    if (elements.fullNameValue) {
        elements.fullNameValue.textContent = 'Not Found';
        elements.copyFullName.style.display = 'none';
    }
    
    if (elements.emailValue) {
        elements.emailValue.textContent = 'Not Found';
        elements.copyEmail.style.display = 'none';
    }
    
    if (elements.companyValue) {
        elements.companyValue.textContent = 'Not Found';
        elements.copyCompany.style.display = 'none';
    }
    
    if (elements.positionValue) {
        elements.positionValue.textContent = 'Not Found';
        elements.copyPosition.style.display = 'none';
    }
    
    if (elements.profileTitle) {
        // For visual display only, use LinkedIn data if available
        const linkedinPosition = currentProfileData.linkedinDesignation;
        const linkedinCompany = currentProfileData.linkedinOrganisation;
        
        if (linkedinPosition && linkedinCompany) {
            elements.profileTitle.textContent = `${linkedinPosition} at ${linkedinCompany}`;
        } else if (linkedinPosition) {
            elements.profileTitle.textContent = linkedinPosition;
        } else if (linkedinCompany) {
            elements.profileTitle.textContent = linkedinCompany;
        } else {
            elements.profileTitle.textContent = message || 'No data found in Hunter.io';
        }
    }
    
    showState('success');
}

function showError(title, message) {
    const errorSection = elements.errorState;
    if (errorSection) {
        const errorTitle = errorSection.querySelector('h2');
        const errorMessage = errorSection.querySelector('p');
        
        if (errorTitle) errorTitle.textContent = title;
        if (errorMessage) errorMessage.textContent = message;
    }
    
    showState('error');
}

// Event listeners
if (elements.copyFullName) {
    elements.copyFullName.addEventListener('click', async () => {
        if (currentProfileData && currentProfileData.first_name && currentProfileData.last_name) {
            const fullName = `${currentProfileData.first_name} ${currentProfileData.last_name}`.trim();
            await copyToClipboard(fullName, elements.copyFullName);
        }
    });
}

if (elements.copyEmail) {
    elements.copyEmail.addEventListener('click', async () => {
        if (currentProfileData && currentProfileData.email) {
            await copyToClipboard(currentProfileData.email, elements.copyEmail);
        }
    });
}

if (elements.copyCompany) {
    elements.copyCompany.addEventListener('click', async () => {
        if (currentProfileData && currentProfileData.company) {
            await copyToClipboard(currentProfileData.company, elements.copyCompany);
        }
    });
}

if (elements.copyPosition) {
    elements.copyPosition.addEventListener('click', async () => {
        if (currentProfileData && currentProfileData.position) {
            await copyToClipboard(currentProfileData.position, elements.copyPosition);
        }
    });
}

if (elements.copyLinkedin) {
    elements.copyLinkedin.addEventListener('click', async () => {
        if (currentProfileData && currentProfileData.linkedinUrl) {
            await copyToClipboard(currentProfileData.linkedinUrl, elements.copyLinkedin);
        }
    });
}

if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener('click', () => {
        initializePopup();
    });
}

if (elements.analyzeAgainBtn) {
    elements.analyzeAgainBtn.addEventListener('click', () => {
        initializePopup();
    });
}

if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
}

// Helper function for copy to clipboard with visual feedback
async function copyToClipboard(text, buttonElement) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Visual feedback
        const originalContent = buttonElement.innerHTML;
        buttonElement.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        
        setTimeout(() => {
            buttonElement.innerHTML = originalContent;
        }, 1000);
        
    } catch (error) {
        // Silently fail
    }
}