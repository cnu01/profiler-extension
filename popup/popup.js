// DOM Elements
const elements = {
    loadingState: document.getElementById('loadingState'),
    successState: document.getElementById('successState'),
    errorState: document.getElementById('errorState'),
    
    // Profile elements
    profileImage: document.getElementById('profileImage'),
    profileName: document.getElementById('profileName'),
    profileTitle: document.getElementById('profileTitle'),
    emailValue: document.getElementById('emailValue'),
    organizationValue: document.getElementById('organizationValue'),
    designationValue: document.getElementById('designationValue'),
    linkedinLink: document.getElementById('linkedinLink'),
    
    // Buttons
    settingsBtn: document.getElementById('settingsBtn'),
    copyEmail: document.getElementById('copyEmail'),
    copyOrganization: document.getElementById('copyOrganization'),
    copyDesignation: document.getElementById('copyDesignation'),
    copyLinkedin: document.getElementById('copyLinkedin'),
    refreshBtn: document.getElementById('refreshBtn'),
    analyzeAgainBtn: document.getElementById('analyzeAgainBtn'),
    exportBtn: document.getElementById('exportBtn')
};

// State management
let currentProfileData = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await initializePopup();
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
        
        // Extract profile data
        await extractProfileData(currentTab);
        
    } catch (error) {
        console.error('Error initializing popup:', error);
        showError('Initialization Error', 'Failed to initialize the extension. Please try again.');
    }
}

function isLinkedInProfilePage(url) {
    return url && url.includes('linkedin.com/in/');
}

async function ensureContentScriptInjected(tabId) {
    try {
        // Try to ping the content script first with multiple attempts
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
        
        // Wait for the script to initialize and verify it's working
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify injection worked
        try {
            await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        } catch (error) {
            throw new Error('Content script injection failed to activate');
        }
        
    } catch (error) {
        console.error('Popup: Error injecting content script:', error);
        throw new Error('Failed to inject content script: ' + error.message);
    }
}

async function extractProfileData(tab) {
    try {
        console.log('Popup: Extracting data from tab:', tab.id);
        
        // Ensure content script is injected
        await ensureContentScriptInjected(tab.id);
        
        // Extract LinkedIn data
        const response = await Promise.race([
            chrome.tabs.sendMessage(tab.id, { action: 'extractProfileData' }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout: Content script did not respond')), 10000)
            )
        ]);
        
        if (!response?.success) {
            throw new Error(response?.error || 'Could not extract profile data from this page');
        }
        
        const linkedinData = response.data;
        
        if (!linkedinData?.fullName) {
            throw new Error('No profile name found');
        }
        
        // Store basic profile data
        currentProfileData = {
            ...linkedinData,
            linkedinUrl: tab.url
        };
        
        // Show profile data immediately
        showProfileData(currentProfileData, tab.url);
        
        // Fetch email in background
        fetchEmailInBackground(linkedinData);
        
    } catch (error) {
        console.error('Popup: Error extracting profile data:', error);
        showError('Extraction Failed', error.message);
    }
}

async function fetchEmailInBackground(linkedinData) {
    try {
        console.log('=== FETCHING EMAIL FROM HUNTER.IO ===');
        console.log('LinkedIn data sent to Hunter:', linkedinData);
        
        const emailResponse = await chrome.runtime.sendMessage({
            action: 'fetchEmail',
            data: linkedinData
        });
        
        console.log('Hunter.io API response:', emailResponse);
        
        if (emailResponse?.success) {
            console.log('Email found successfully:', emailResponse.data);
            elements.emailValue.textContent = emailResponse.data.email;
            elements.copyEmail.style.display = 'flex';
            currentProfileData.email = emailResponse.data.email;
            currentProfileData.emailConfidence = emailResponse.data.confidence;
            currentProfileData.emailSource = emailResponse.data.source;
        } else {
            console.log('Email not found. Error:', emailResponse?.error);
            elements.emailValue.textContent = 'Not available';
            elements.copyEmail.style.display = 'none';
        }
    } catch (error) {
        console.error('Popup: Error fetching email:', error);
        elements.emailValue.textContent = 'Not available';
        elements.copyEmail.style.display = 'none';
    }
}

// Remove the unused functions since we're now using background script
// extractLinkedInData, getHunterApiKey, fetchEmailFromHunter, extractDomainFromCompany

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
        default:
            console.warn('Unknown state:', state);
    }
}

function showProfileData(data, linkedinUrl) {
    // Store the current profile data
    currentProfileData = {
        ...data,
        linkedinUrl: linkedinUrl
    };
    
    // Update profile information with fallbacks
    if (elements.profileName) {
        elements.profileName.textContent = data.fullName || 'Unknown';
    }
    
    if (elements.profileTitle) {
        const designation = data.designation || 'Not specified';
        const organization = data.organisation || 'Not specified';
        
        // Combine designation and organization for profile title
        if (designation !== 'Not specified' && organization !== 'Not specified') {
            elements.profileTitle.textContent = `${designation} at ${organization}`;
        } else if (designation !== 'Not specified') {
            elements.profileTitle.textContent = designation;
        } else if (organization !== 'Not specified') {
            elements.profileTitle.textContent = organization;
        } else {
            elements.profileTitle.textContent = 'No job information available';
        }
    }
    
    if (elements.designationValue) {
        elements.designationValue.textContent = data.designation || 'Not specified';
    }
    
    if (elements.organizationValue) {
        elements.organizationValue.textContent = data.organisation || 'Not specified';
    }
    
    if (elements.emailValue) {
        // Don't overwrite if email is already set from API response
        if (!elements.emailValue.textContent || elements.emailValue.textContent === 'Searching...') {
            elements.emailValue.textContent = 'Searching...';
        }
    }
    
    if (elements.linkedinLink && linkedinUrl) {
        elements.linkedinLink.href = linkedinUrl;
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

function showError(title, message) {
    console.error(`${title}: ${message}`);
    
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
if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
}

if (elements.copyEmail) {
    elements.copyEmail.addEventListener('click', async () => {
        if (currentProfileData && currentProfileData.email) {
            try {
                await navigator.clipboard.writeText(currentProfileData.email);
                
                // Visual feedback
                const originalContent = elements.copyEmail.innerHTML;
                elements.copyEmail.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
                
                setTimeout(() => {
                    elements.copyEmail.innerHTML = originalContent;
                }, 1000);
                
            } catch (error) {
                console.error('Failed to copy email:', error);
            }
        }
    });
}

if (elements.copyOrganization) {
    elements.copyOrganization.addEventListener('click', async () => {
        if (currentProfileData && currentProfileData.organisation) {
            try {
                await navigator.clipboard.writeText(currentProfileData.organisation);
                
                // Visual feedback
                const originalContent = elements.copyOrganization.innerHTML;
                elements.copyOrganization.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
                
                setTimeout(() => {
                    elements.copyOrganization.innerHTML = originalContent;
                }, 1000);
                
            } catch (error) {
                console.error('Failed to copy organization:', error);
            }
        }
    });
}

if (elements.copyDesignation) {
    elements.copyDesignation.addEventListener('click', async () => {
        if (currentProfileData && currentProfileData.designation) {
            try {
                await navigator.clipboard.writeText(currentProfileData.designation);
                
                // Visual feedback
                const originalContent = elements.copyDesignation.innerHTML;
                elements.copyDesignation.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
                
                setTimeout(() => {
                    elements.copyDesignation.innerHTML = originalContent;
                }, 1000);
                
            } catch (error) {
                console.error('Failed to copy designation:', error);
            }
        }
    });
}

if (elements.copyLinkedin) {
    elements.copyLinkedin.addEventListener('click', async () => {
        if (currentProfileData && currentProfileData.linkedinUrl) {
            try {
                await navigator.clipboard.writeText(currentProfileData.linkedinUrl);
                
                // Visual feedback
                const originalContent = elements.copyLinkedin.innerHTML;
                elements.copyLinkedin.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
                
                setTimeout(() => {
                    elements.copyLinkedin.innerHTML = originalContent;
                }, 1000);
                
            } catch (error) {
                console.error('Failed to copy LinkedIn URL:', error);
            }
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

if (elements.exportBtn) {
    elements.exportBtn.addEventListener('click', () => {
        if (currentProfileData) {
            const dataStr = JSON.stringify(currentProfileData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `linkedin_profile_${currentProfileData.fullName || 'unknown'}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
        }
    });
}
