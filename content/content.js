// LinkedIn Profile Hunter - Content Script
// Extracts profile data from LinkedIn profile pages

(function() {
    'use strict';
    
    // Global state
    let isProfileDataExtracted = false;
    let cachedProfileData = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const LOAD_TIMEOUT = 10000; // 10 seconds
    
    // Main profile data extraction function (using tested logic)
    function extractLinkedInProfileData() {
        try {
            const result = {
                fullName: null,
                designation: null,
                organisation: null,
                domain: null,
                profileImage: null,
                profileType: null,
                extractedAt: new Date().toISOString()
            };
            
            // Extract basic profile info
            result.fullName = extractFullName();
            result.profileImage = extractProfileImage();
            
            // Find Experience section
            const experienceSection = findExperienceSection();
            if (!experienceSection) {
                return result;
            }
            
            // Get the first experience block
            const firstExperienceBlock = getFirstExperienceBlock(experienceSection);
            if (!firstExperienceBlock) {
                return result;
            }
            
            // Detect profile structure type
            const profileType = detectProfileStructure(firstExperienceBlock);
            result.profileType = profileType;
            
            // Extract data based on structure type
            if (profileType === 'chain') {
                const chainData = extractChainStructureData(firstExperienceBlock);
                result.designation = chainData.designation;
                result.organisation = chainData.organisation;
            } else if (profileType === 'single') {
                const singleData = extractSingleStructureData(firstExperienceBlock);
                result.designation = singleData.designation;
                result.organisation = singleData.organisation;
            }
            
            // Generate domain
            if (result.organisation) {
                result.domain = generateDomain(result.organisation);
            }
            
            return result;
            
        } catch (error) {
            console.error('Error extracting profile data:', error);
            throw new Error(`Profile extraction failed: ${error.message}`);
        }
    }

    
    // Extract full name from profile header
    function extractFullName() {
        const nameSelectors = [
            'h1.text-heading-xlarge',
            'h1[data-anonymize="person-name"]',
            '.pv-text-details__left-panel h1',
            '.ph5 h1',
            '[data-field="name"] h1',
            '.pv-top-card .pv-top-card__name'
        ];
        
        for (const selector of nameSelectors) {
            try {
                const nameElement = document.querySelector(selector);
                if (nameElement && nameElement.textContent.trim()) {
                    return nameElement.textContent.trim();
                }
            } catch (error) {
                // Silent error handling
            }
        }
        
        return null;
    }
    
    // Extract profile image
    function extractProfileImage() {
        const imgSelectors = [
            '.pv-top-card-profile-picture__image',
            '.profile-photo-edit__preview',
            'img[data-anonymize="headshot-photo"]',
            '.pv-top-card__photo img',
            '.presence-entity__image img'
        ];
        
        for (const selector of imgSelectors) {
            try {
                const imgElement = document.querySelector(selector);
                if (imgElement && imgElement.src && !imgElement.src.includes('data:image')) {
                    return imgElement.src;
                }
            } catch (error) {
                // Silent error handling
            }
        }
        
        return null;
    }
    
    // Find the Experience section
    function findExperienceSection() {
        try {
            // Look for the section with Experience header
            const sections = document.querySelectorAll('section[data-view-name="profile-card"]');
            
            for (const section of sections) {
                const header = section.querySelector('h2');
                if (header && header.textContent.trim().toLowerCase().includes('experience')) {
                    return section;
                }
            }
            
            // Fallback: look for experience section by ID
            const experienceById = document.querySelector('#experience');
            if (experienceById) {
                return experienceById.closest('section');
            }
            
            return null;
            
        } catch (error) {
            return null;
        }
    }
    
    // Get the first experience block
    function getFirstExperienceBlock(experienceSection) {
        try {
            const experienceBlocks = experienceSection.querySelectorAll('[data-view-name="profile-component-entity"]');
            return experienceBlocks.length > 0 ? experienceBlocks[0] : null;
        } catch (error) {
            return null;
        }
    }
    
    // Detect if profile structure is chain or single
    function detectProfileStructure(experienceBlock) {
        try {
            // Check if this block has sub-components with nested list items
            const subComponentsList = experienceBlock.querySelector('.pvs-entity__sub-components ul');
            
            if (subComponentsList) {
                // Check if sub-components contain role entries (not just skills)
                const roleEntries = subComponentsList.querySelectorAll('li [data-view-name="profile-component-entity"]');
                if (roleEntries.length > 0) {
                    return 'chain';
                }
            }
            
            return 'single';
            
        } catch (error) {
            return 'single'; // Default fallback
        }
    }
    
    // Extract data from chain structure (multiple roles at same company)
    function extractChainStructureData(experienceBlock) {
        const result = { designation: null, organisation: null };
        
        try {
            // Company name: First .t-bold span at top level
            const companyElement = experienceBlock.querySelector('.t-bold span[aria-hidden="true"]');
            if (companyElement) {
                result.organisation = companyElement.textContent.trim();
            }
            
            // Latest role: First role in sub-components list
            const subComponentsList = experienceBlock.querySelector('.pvs-entity__sub-components ul');
            if (subComponentsList) {
                const firstRoleBlock = subComponentsList.querySelector('li [data-view-name="profile-component-entity"]');
                if (firstRoleBlock) {
                    const roleElement = firstRoleBlock.querySelector('.t-bold span[aria-hidden="true"]');
                    if (roleElement) {
                        result.designation = roleElement.textContent.trim();
                    }
                }
            }
            
        } catch (error) {
            // Silent error handling
        }
        
        return result;
    }
    
    // Extract data from single structure (one role per company)
    function extractSingleStructureData(experienceBlock) {
        const result = { designation: null, organisation: null };
        
        try {
            // Job title: First .t-bold span in the block
            const jobElement = experienceBlock.querySelector('.t-bold span[aria-hidden="true"]');
            if (jobElement) {
                result.designation = jobElement.textContent.trim();
            }
            
            // Company: span.t-14.t-normal span[aria-hidden="true"] (before "·")
            const companyElement = experienceBlock.querySelector('span.t-14.t-normal span[aria-hidden="true"]');
            if (companyElement) {
                let companyText = companyElement.textContent.trim();
                // Remove employment type (everything after "·")
                if (companyText.includes('·')) {
                    companyText = companyText.split('·')[0].trim();
                }
                result.organisation = companyText;
            }
            
        } catch (error) {
            // Silent error handling
        }
        
        return result;
    }
    
    // Generate clean domain from company name (tested logic)
    function generateDomain(companyName) {
        if (!companyName) return null;
        
        let domain = companyName.toLowerCase()
            // Remove common company suffixes
            .replace(/\b(inc|llc|ltd|corporation|corp|company|co|limited|pvt|private|services|solutions|technologies|tech|group|international|global)\b\.?/g, '')
            // Remove special characters and spaces
            .replace(/[^a-z0-9]/g, '')
            // Remove existing domain extensions
            .replace(/\b(com|org|net|edu|gov|mil|int|co|io|ai|ly|me|us|uk|ca|au|de|fr|jp|cn|in|br|ru|it|es|nl|se|no|dk|fi|pl|cz|hu|ro|bg|hr|si|sk|ee|lv|lt|mt|cy|lu|ie|pt|gr|tr|il|eg|za|ng|ke|gh|tz|ug|zw|mw|zm|bw|sz|ls|na|ao|mz|mg|mu|sc|re|yt|km|dj|so|et|er|sd|ss|ly|tn|dz|ma|eh|sn|gm|gw|sl|lr|ci|gh|tg|bj|ne|bf|ml|mr|cv|gn|lr|ci)\b/g, '')
            .trim();
        
        return domain ? `${domain}.com` : null;
    }
    
    // Clean text data (removed - using direct text as in test function)
    // Text cleaning removed to match test function behavior
    
    // Wait for profile to load completely (simplified)
    function waitForProfileLoad() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                resolve(); // Don't reject, just proceed
            }, 5000); // Reduced timeout to 5 seconds
            
            function checkProfile() {
                try {
                    // Check if basic profile elements are present
                    const nameElement = document.querySelector('h1.text-heading-xlarge, h1[data-anonymize="person-name"]');
                    const experienceSection = document.querySelector('section[data-view-name="profile-card"]');
                    
                    if (nameElement && experienceSection) {
                        clearTimeout(timeout);
                        resolve();
                        return;
                    }
                    
                    // If page is complete but elements not found, proceed anyway
                    if (document.readyState === 'complete') {
                        clearTimeout(timeout);
                        resolve();
                        return;
                    }
                    
                    // Check again in 200ms
                    setTimeout(checkProfile, 200);
                } catch (error) {
                    clearTimeout(timeout);
                    resolve(); // Don't reject
                }
            }
            
            checkProfile();
        });
    }

    
    // Chrome extension message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'ping':
                sendResponse({ success: true, message: 'Content script is active' });
                break;
                
            case 'extractProfileData':
                handleExtractProfileData(sendResponse);
                return true; // Keep message channel open for async response
                
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    });
    
    // Handle profile data extraction request (improved error handling)
    async function handleExtractProfileData(sendResponse) {
        try {
            // Return cached data if available and recent
            if (cachedProfileData && isProfileDataExtracted) {
                const cacheAge = new Date() - new Date(cachedProfileData.extractedAt);
                if (cacheAge < 30000) { // 30 seconds cache
                    sendResponse({ success: true, data: cachedProfileData });
                    return;
                }
            }
            
            // Wait for profile to load (with timeout handling)
            await waitForProfileLoad();
            
            // Extract profile data directly (no additional waiting)
            const profileData = extractLinkedInProfileData();
            
            // More lenient validation - just check if we got any useful data
            if (!profileData.fullName && !profileData.designation && !profileData.organisation) {
                throw new Error('No profile data could be extracted. This may not be a LinkedIn profile page or the page may not be fully loaded.');
            }
            
            // Cache the data
            cachedProfileData = profileData;
            isProfileDataExtracted = true;
            retryCount = 0;
            
            sendResponse({ success: true, data: profileData });
            
        } catch (error) {
            // Simplified retry logic - just try once more
            if (retryCount < 1) {
                retryCount++;
                
                setTimeout(() => {
                    handleExtractProfileData(sendResponse);
                }, 1000);
                
                return;
            }
            
            // Send error response
            sendResponse({ 
                success: false, 
                error: error.message || 'Failed to extract profile data',
                details: {
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                    retryCount: retryCount
                }
            });
        }
    }
    
    // Auto-detect profile changes (for SPA navigation)
    let currentUrl = window.location.href;
    
    function detectUrlChange() {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            
            // Reset state for new profile
            isProfileDataExtracted = false;
            cachedProfileData = null;
            retryCount = 0;
        }
    }
    
    // Monitor URL changes
    setInterval(detectUrlChange, 1000);
    
    // Listen for dynamic content changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if experience section was added/modified
                const experienceAdded = Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === Node.ELEMENT_NODE && 
                    (node.querySelector && node.querySelector('[data-view-name="profile-card"]'))
                );
                
                if (experienceAdded) {
                    isProfileDataExtracted = false;
                    cachedProfileData = null;
                }
            }
        });
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
        // Extension initialized
    });
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Reset cache when tab becomes visible (user might have navigated)
            setTimeout(() => {
                if (window.location.href !== currentUrl) {
                    detectUrlChange();
                }
            }, 1000);
        }
    });
    
})();