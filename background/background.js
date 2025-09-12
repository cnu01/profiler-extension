// Background script for the Profile Hunter extension

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open options page on first install
        chrome.runtime.openOptionsPage();
    }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'fetchHunterData':
            handleHunterDataFetch(request.data, sendResponse);
            return true; // Keep message channel open for async response
            
        case 'testApiKey':
            handleApiKeyTest(request.apiKey, sendResponse);
            return true;
            
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

// Handle Hunter.io data fetching
async function handleHunterDataFetch(profileData, sendResponse) {
    try {
        // Get API key from storage
        const result = await chrome.storage.local.get(['hunterApiKey']);
        const apiKey = result.hunterApiKey;
        
        if (!apiKey) {
            sendResponse({ 
                success: false, 
                error: 'Hunter.io API key not configured. Please go to extension settings to add your API key.',
                code: 'NO_API_KEY'
            });
            return;
        }
        
        // Validate profile data
        if (!profileData) {
            sendResponse({ 
                success: false, 
                error: 'No profile data provided for Hunter.io lookup',
                code: 'MISSING_DATA'
            });
            return;
        }
        
        if (!profileData.fullName || profileData.fullName.trim() === '' || profileData.fullName === 'Unknown') {
            sendResponse({ 
                success: false, 
                error: 'Missing profile name for Hunter.io lookup. Please ensure the LinkedIn profile is fully loaded.',
                code: 'MISSING_NAME'
            });
            return;
        }
        
        if (!profileData.organisation || profileData.organisation.trim() === '' || 
            profileData.organisation === 'Not specified' || profileData.organisation === 'Freelancer / Open to work' ||
            profileData.organisation === 'LangChain' || profileData.organisation.length < 3) {
            
            sendResponse({ 
                success: false, 
                error: 'Missing company information for Hunter.io lookup. This profile may not have current employment data.',
                code: 'MISSING_COMPANY'
            });
            return;
        }
        
        // Parse name
        const nameParts = profileData.fullName.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        const company = profileData.organisation.trim();
        
        // Try Hunter.io email finder API
        const hunterData = await fetchHunterEmailFinder(company, firstName, lastName, apiKey);
        
        if (hunterData) {
            sendResponse({ 
                success: true, 
                data: {
                    first_name: hunterData.first_name || firstName,
                    last_name: hunterData.last_name || lastName,
                    email: hunterData.email || 'Not available',
                    company: hunterData.company || company,
                    position: hunterData.position || 'Not specified',
                    score: hunterData.score || 0,
                    domain: hunterData.domain || '',
                    verification: hunterData.verification || null
                }
            });
        } else {
            sendResponse({ 
                success: false, 
                error: `No data found for ${firstName} ${lastName} at ${company}`,
                code: 'DATA_NOT_FOUND'
            });
        }
        
    } catch (error) {
        console.error('Background: Hunter.io fetch error:', error);
        sendResponse({ 
            success: false, 
            error: error.message,
            code: 'FETCH_ERROR'
        });
    }
}

// Fetch data from Hunter.io email finder API
async function fetchHunterEmailFinder(company, firstName, lastName, apiKey) {
    try {
        const url = `https://api.hunter.io/v2/email-finder?company=${encodeURIComponent(company)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid Hunter.io API key');
            } else if (response.status === 429) {
                throw new Error('Hunter.io API rate limit exceeded');
            } else {
                throw new Error(`Hunter.io API error: ${data.errors?.[0]?.details || 'Unknown error'}`);
            }
        }

        if (data.data) {
            return data.data;
        }

        return null;

    } catch (error) {
        throw error;
    }
}

// Test Hunter.io API key
async function handleApiKeyTest(apiKey, sendResponse) {
    try {
        const testUrl = `https://api.hunter.io/v2/account?api_key=${apiKey}`;
        const response = await fetch(testUrl);
        const data = await response.json();
        
        if (response.ok && data.data) {
            // Parse the actual Hunter.io API response structure
            const accountData = data.data;
            
            sendResponse({ 
                success: true, 
                data: {
                    // User information
                    first_name: accountData.first_name || 'Unknown',
                    last_name: accountData.last_name || 'Unknown',
                    email: accountData.email || 'Unknown',
                    
                    // Plan information
                    plan_name: accountData.plan_name || 'Unknown',
                    plan_level: accountData.plan_level || 0,
                    reset_date: accountData.reset_date || 'Unknown',
                    team_id: accountData.team_id || 0,
                    
                    // Usage information - handle both old and new response structures
                    requests_used: accountData.requests?.searches?.used || accountData.calls?.used || 0,
                    requests_available: accountData.requests?.searches?.available || accountData.calls?.available || 0,
                    
                    // Detailed request breakdown
                    searches_used: accountData.requests?.searches?.used || 0,
                    searches_available: accountData.requests?.searches?.available || 0,
                    verifications_used: accountData.requests?.verifications?.used || 0,
                    verifications_available: accountData.requests?.verifications?.available || 0,
                    credits_used: accountData.requests?.credits?.used || 0,
                    credits_available: accountData.requests?.credits?.available || 0,
                    
                    // Legacy support for older API response format
                    plan: accountData.plan_name || accountData.plan?.name || 'Unknown'
                }
            });
        } else {
            console.error('Hunter.io API key test failed:', data);
            sendResponse({ 
                success: false, 
                error: data.errors?.[0]?.details || 'Invalid API key or network error'
            });
        }
        
    } catch (error) {
        console.error('API key test error:', error);
        sendResponse({ 
            success: false, 
            error: 'Failed to test API key: ' + error.message
        });
    }
}

