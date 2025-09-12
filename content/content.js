// Content script for the Profile Hunter extension

// Enhanced LinkedIn data extraction focused on proper DOM structure
function extractLinkedInProfileData() {
    const data = {
        fullName: null,
        designation: null,
        organisation: null,
        domain: null,
        profileImage: null,
        location: null,
        summary: null
    };

    try {
        // Extract full name with updated selectors for current LinkedIn layout
        const nameSelectors = [
            'h1.text-heading-xlarge.inline.t-24.v-align-middle.break-words',
            'h1.text-heading-xlarge',
            '.pv-text-details__left-panel h1',
            '.ph5 h1',
            'h1.break-words',
            '.artdeco-entity-lockup__title h1',
            '.pv-top-card--list h1',
            '.pv-top-card .pv-entity__title h1',
            '.text-heading-xlarge',
            '[data-anonymize="person-name"]',
            '.profile-header h1',
            '.profile-topcard h1'
        ];

        for (const selector of nameSelectors) {
            const nameElement = document.querySelector(selector);
            if (nameElement && nameElement.textContent.trim()) {
                data.fullName = nameElement.textContent.trim();
                break;
            }
        }

        // Extract experience data from the new LinkedIn DOM structure
        // Extract organization/company name
        console.log('Extracting organization...');
        let companyName = null;

        // Try to find company/organization with enhanced logic
        const experienceSection = document.querySelector('#experience')?.parentElement?.nextElementSibling || 
                                  document.querySelector('[data-view-name="profile-component-entity"]');
        
        if (experienceSection) {
            // Get the first experience entry (most recent)
            const firstExperienceItem = experienceSection.querySelector('.artdeco-list__item, .pvs-list__item, li');
            
            if (firstExperienceItem) {
                // Extract company name - look for company links or bold company names
                const companySelectors = [
                    'a[data-field="experience_company_logo"] .hoverable-link-text.t-bold span[aria-hidden="true"]',
                    'a[data-field="experience_company_logo"] .display-flex.align-items-center span[aria-hidden="true"]',
                    '.hoverable-link-text.t-bold span[aria-hidden="true"]',
                    'a[href*="linkedin.com/company"] span[aria-hidden="true"]'
                ];
                
                // First, try to extract company name from the secondary line pattern
                // Look for "Company Name · Full-time" pattern OR standalone "Company Name" in .t-14.t-normal spans
                const secondaryPatterns = firstExperienceItem.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]');
                for (const element of secondaryPatterns) {
                    const text = element.textContent.trim();
                    
                    if (text.includes(' · ')) {
                        // Pattern: "Company Name · Employment-type"
                        const companyPart = text.split(' · ')[0].trim();
                        if (companyPart.length > 2 && companyPart.length < 80 && 
                            !isPositionText(companyPart) && 
                            !isDateText(companyPart)) {
                            data.organisation = companyPart;
                            break;
                        }
                    } else {
                        // Pattern: Standalone "Company Name" (like "Olacabs.com")
                        if (text.length > 2 && text.length < 80 && 
                            !isPositionText(text) && 
                            !isDateText(text) &&
                            !hasPositionCharacteristics(text) &&
                            !text.toLowerCase().includes('present') &&
                            !text.toLowerCase().includes('mo') &&
                            !text.toLowerCase().includes('yr')) {
                            data.organisation = text;
                            break;
                        }
                    }
                }
                
                // If company not found in secondary pattern, try original selectors
                if (!data.organisation) {
                    for (const selector of companySelectors) {
                        const companyElement = firstExperienceItem.querySelector(selector);
                        if (companyElement) {
                            const companyText = companyElement.textContent.trim();
                            
                            // Validate that this is actually a company name and not a position
                            if (companyText.length > 2 && companyText.length < 80 &&
                                !isPositionText(companyText) &&
                                !isDateText(companyText)) {
                                data.organisation = companyText;
                                break;
                            }
                        }
                    }
                }
                
                // Extract position/designation from sub-components or direct structure
                const subComponents = firstExperienceItem.querySelector('.pvs-entity__sub-components');
                
                if (subComponents) {
                    // Multiple positions at same company - get the most recent (first) one
                    const firstPosition = subComponents.querySelector('li .hoverable-link-text.t-bold span[aria-hidden="true"]');
                    if (firstPosition) {
                        const positionText = firstPosition.textContent.trim();
                        if (positionText.length > 2 && positionText.length < 100 &&
                            isPositionText(positionText) &&
                            !isDateText(positionText)) {
                            data.designation = positionText;
                        }
                    }
                } else {
                    // Single position - look for position text in main structure
                    const positionSelectors = [
                        '.hoverable-link-text.t-bold span[aria-hidden="true"]'
                    ];
                    
                    const allPositionElements = firstExperienceItem.querySelectorAll(positionSelectors.join(', '));
                    
                    for (const element of allPositionElements) {
                        const text = element.textContent.trim();
                        
                        // Skip if this is the company name we already found
                        if (data.organisation && text === data.organisation) {
                            continue;
                        }
                        
                        // Check if this looks like a position (job title)
                        if (text.length > 2 && text.length < 100 &&
                            (isPositionText(text) || hasPositionCharacteristics(text)) &&
                            !isDateText(text)) {
                            data.designation = text;
                            break;
                        }
                    }
                    
                    // Alternative: Look for position in second structure pattern
                    if (!data.designation) {
                        const alternativePattern = firstExperienceItem.querySelector('.t-14.t-normal span[aria-hidden="true"]');
                        if (alternativePattern) {
                            const text = alternativePattern.textContent.trim();
                            // Extract company from pattern like "OMEGA SERVICES · Full-time"
                            if (text.includes(' · ')) {
                                const companyPart = text.split(' · ')[0].trim();
                                if (!data.organisation && companyPart.length > 2 && companyPart.length < 80) {
                                    data.organisation = companyPart;
                                }
                            }
                        }
                        
                        // For single position companies, the position is usually the main bold text
                        const mainBoldText = firstExperienceItem.querySelector('.hoverable-link-text.t-bold span[aria-hidden="true"]');
                        if (mainBoldText && !data.designation) {
                            const text = mainBoldText.textContent.trim();
                            if (text !== data.organisation && (isPositionText(text) || hasPositionCharacteristics(text))) {
                                data.designation = text;
                            }
                        }
                    }
                }
            }
        }

        // Extract company domain
        console.log('Extracting company domain...');
        data.domain = extractCompanyDomain();
        console.log('Found company domain:', data.domain);

        // Extract profile image
        const imageSelectors = [
            'img[data-anonymize="headshot-photo"]',
            '.pv-top-card__photo img',
            '.profile-photo-edit__preview img',
            'button[aria-label*="photo"] img',
            '.pv-top-card-profile-picture img'
        ];

        for (const selector of imageSelectors) {
            const imgElement = document.querySelector(selector);
            if (imgElement && imgElement.src && !imgElement.src.includes('data:image')) {
                data.profileImage = imgElement.src;
                break;
            }
        }

        // Clean up the data
        if (data.fullName) {
            data.fullName = data.fullName.replace(/\s+/g, ' ').trim();
        }
        if (data.designation) {
            data.designation = data.designation.replace(/\s+/g, ' ').trim();
        }
        if (data.organisation) {
            data.organisation = data.organisation.replace(/\s+/g, ' ').trim();
        }

        return data;

    } catch (error) {
        console.error('Error extracting LinkedIn profile data:', error);
        return data;
    }
}

// Helper function to identify if text looks like a job position
function isPositionText(text) {
    const positionKeywords = [
        'engineer', 'developer', 'manager', 'director', 'analyst', 'consultant',
        'designer', 'lead', 'specialist', 'architect', 'senior', 'junior',
        'product', 'software', 'data', 'full-stack', 'frontend', 'backend',
        'devops', 'qa', 'intern', 'coordinator', 'associate', 'executive',
        'trainee', 'student', 'apprentice', 'curriculum', 'instructor',
        'marketing', 'support', 'customer', 'digital', 'pedagogy'
    ];
    
    const lowerText = text.toLowerCase();
    return positionKeywords.some(keyword => lowerText.includes(keyword));
}

// Helper function to identify position-like characteristics
function hasPositionCharacteristics(text) {
    const positionIndicators = [
        'ceo', 'cto', 'cfo', 'coo', 'founder', 'co-founder', 'president',
        'vice president', 'vp', 'head', 'chief', 'owner', 'partner',
        'supervisor', 'team lead', 'leader', 'administrator', 'officer'
    ];
    
    const lowerText = text.toLowerCase();
    
    // Check for executive/leadership positions
    const hasExecutiveTitle = positionIndicators.some(indicator => lowerText.includes(indicator));
    
    // Check for typical position patterns like "Senior X", "Junior X", etc.
    const hasPositionPattern = /^(senior|junior|lead|principal|staff|associate|assistant|deputy|interim)\s/i.test(text);
    
    // Check for "&" which often appears in titles like "Co-founder & CEO"
    const hasAmpersandPattern = text.includes('&') && text.split('&').length === 2;
    
    return hasExecutiveTitle || hasPositionPattern || hasAmpersandPattern;
}

// Helper function to identify if text looks like a date/duration
function isDateText(text) {
    const datePatterns = [
        /\d+\s*(yr|year|mo|month|mos)/i,
        /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
        /\d{4}\s*-\s*\d{4}/,
        /present/i,
        /full-time|part-time|contract|internship|freelance/i,
        /·/
    ];
    
    return datePatterns.some(pattern => pattern.test(text));
}

// Helper function to convert LinkedIn company slug to potential domain
function convertSlugToDomain(slug) {
    // Remove common suffixes and convert LinkedIn company slug to potential domain
    const cleanSlug = slug.toLowerCase()
        .replace(/-inc$|inc$/i, '')
        .replace(/-llc$|llc$/i, '')
        .replace(/-ltd$|ltd$/i, '')
        .replace(/-corp$|corp$/i, '')
        .replace(/-company$|company$/i, '')
        .replace(/-technologies$|technologies$/i, '')
        .replace(/-solutions$|solutions$/i, '')
        .replace(/-services$|services$/i, '')
        .replace(/-consulting$|consulting$/i, '')
        .replace(/-group$|group$/i, '')
        .replace(/^the-/, '')
        .replace(/-+/g, '');
    
    return cleanSlug + '.com';
}

// Helper function to extract company domain from LinkedIn
function extractCompanyDomain() {
    // Look for company links in experience section
    const companyLinks = document.querySelectorAll('a[href*="/company/"]');
    
    for (const link of companyLinks) {
        const href = link.href;
        const companyMatch = href.match(/\/company\/([^\/\?]+)/);
        if (companyMatch) {
            const companySlug = companyMatch[1];
            return convertSlugToDomain(companySlug);
        }
    }
    
    return null;
}

// Wait for the page to be fully loaded
function waitForProfileLoad() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 30;
        let attempts = 0;

        const checkForProfile = () => {
            attempts++;
            
            const nameExists = document.querySelector('h1.text-heading-xlarge, h1[data-anonymize="person-name"], .text-heading-xlarge, .profile-header h1');
            const profileExists = document.querySelector('.pv-top-card, .profile-topcard, .artdeco-entity-lockup');
            const pageLoaded = document.readyState === 'complete';
            
            if ((nameExists || profileExists) && pageLoaded) {
                resolve(true);
            } else if (attempts >= maxAttempts) {
                resolve(true); // Try extraction even if timeout
            } else {
                setTimeout(checkForProfile, 300);
            }
        };

        checkForProfile();
    });
}

// Message listener for popup requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === 'ping') {
        sendResponse({ success: true, message: 'Content script is active' });
        return true;
    }
    
    if (request.action === 'extractProfileData') {
        waitForProfileLoad()
            .then(() => {
                const profileData = extractLinkedInProfileData();
                sendResponse({ success: true, data: profileData });
            })
            .catch((error) => {
                console.error('Profile extraction failed:', error);
                sendResponse({ success: false, error: error.message });
            });
        
        return true; // Keep message channel open for async response
    }
});

// Auto-extract data when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            waitForProfileLoad();
        }, 1000);
    });
} else {
    setTimeout(() => {
        waitForProfileLoad();
    }, 1000);
}