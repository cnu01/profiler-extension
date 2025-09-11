// Background script for the LinkedIn Profile Profiler extension
console.log('LinkedIn Profile Profiler: Background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details.reason);
    
    if (details.reason === 'install') {
        // Open options page on first install
        chrome.runtime.openOptionsPage();
    }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'fetchEmail':
            handleEmailFetch(request.data, sendResponse);
            return true; // Keep message channel open for async response
            
        case 'testApiKey':
            handleApiKeyTest(request.apiKey, sendResponse);
            return true;
            
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

// Handle email fetching via Hunter.io API
async function handleEmailFetch(profileData, sendResponse) {
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
                error: 'No profile data provided for email lookup',
                code: 'MISSING_DATA'
            });
            return;
        }
        
        if (!profileData.fullName || profileData.fullName.trim() === '' || profileData.fullName === 'Unknown') {
            sendResponse({ 
                success: false, 
                error: 'Missing profile name for email lookup. Please ensure the LinkedIn profile is fully loaded.',
                code: 'MISSING_NAME'
            });
            return;
        }
        
        if (!profileData.organisation || profileData.organisation.trim() === '' || 
            profileData.organisation === 'Not specified' || profileData.organisation === 'Freelancer / Open to work' ||
            profileData.organisation === 'LangChain' || profileData.organisation.length < 3) {
            
            if (profileData.organisation === 'LangChain') {
                sendResponse({ 
                    success: false, 
                    error: 'The extracted company "LangChain" appears to be from the bio, not current employment. Please ensure this profile has clear current job information.',
                    code: 'INVALID_COMPANY'
                });
            } else {
                sendResponse({ 
                    success: false, 
                    error: 'Missing company information for email lookup. This profile may not have current employment data.',
                    code: 'MISSING_COMPANY'
                });
            }
            return;
        }
        
        // Use organisation/company name directly as domain
        const domain = profileData.organisation.trim().toLowerCase();
        if (!domain) {
            sendResponse({ 
                success: false, 
                error: `Could not determine company domain from "${profileData.organisation}"`,
                code: 'INVALID_DOMAIN'
            });
            return;
        }
        
        // Parse name
        const nameParts = profileData.fullName.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        
        // Try Hunter.io email finder first
        let emailData = await tryEmailFinder(domain, firstName, lastName, apiKey);
        
        // If email finder fails, try domain search
        if (!emailData) {
            emailData = await tryDomainSearch(domain, firstName, lastName, apiKey);
        }
        
        if (emailData) {
            console.log('=== EMAIL FOUND SUCCESSFULLY ===');
            console.log('Email details:', emailData);
            console.log('Email address:', emailData.email);
            console.log('Confidence score:', emailData.confidence);
            console.log('Source:', emailData.source);
            sendResponse({ 
                success: true, 
                data: emailData
            });
        } else {
            console.log('=== NO EMAIL FOUND ===');
            console.log('Search attempted for:', `${firstName} ${lastName} at ${domain}`);
            sendResponse({ 
                success: false, 
                error: `No email found for ${firstName} ${lastName} at ${domain}`,
                code: 'EMAIL_NOT_FOUND'
            });
        }
        
    } catch (error) {
        console.error('Background: Email fetch error:', error);
        sendResponse({ 
            success: false, 
            error: error.message,
            code: 'FETCH_ERROR'
        });
    }
}

// Try Hunter.io email finder API
async function tryEmailFinder(domain, firstName, lastName, apiKey) {
   
        const url = `https://api.hunter.io/v2/email-finder?company=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${apiKey}`;

        console.log('=== CALLING HUNTER.IO EMAIL FINDER ===');
        console.log('URL:', url.replace(apiKey, '[HIDDEN]'));
        console.log('Searching for:', `${firstName} ${lastName} at ${domain}`);

        const response = await fetch(url);
        const data = await response.json();

        console.log('Email finder API response:', data);

        if (!response.ok) {
            console.error('Hunter.io API error:', data);

            if (response.status === 401) {
                throw new Error('Invalid Hunter.io API key');
            } else if (response.status === 429) {
                throw new Error('Hunter.io API rate limit exceeded');
            } else {
                throw new Error(`Hunter.io API error: ${data.errors?.[0]?.details || 'Unknown error'}`);
            }
        }

        if (data.data && data.data.email) {
            console.log('Email found via email finder:', data.data.email);
            console.log('Confidence:', data.data.confidence);
            return {
                email: data.data.email,
                confidence: data.data.confidence || 0,
                source: 'email_finder'
            };
        }

        console.log('No email found via email finder');
        return null;

}

// Try Hunter.io domain search as fallback
async function tryDomainSearch(domain, firstName, lastName, apiKey) {
    try {
        const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=50&api_key=${apiKey}`;
        
        console.log('=== CALLING HUNTER.IO DOMAIN SEARCH ===');
        console.log('Domain:', domain);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('Domain search API response:', data);
        
        if (!response.ok) {
            console.error('Hunter.io domain search error:', data);
            return null;
        }
        
        if (data.data && data.data.emails && data.data.emails.length > 0) {
            const emails = data.data.emails;
            const firstNameLower = firstName.toLowerCase();
            const lastNameLower = lastName.toLowerCase();
            
            console.log(`Found ${emails.length} emails in domain. Looking for matches with ${firstNameLower} ${lastNameLower}`);
            
            // Look for exact matches first
            for (const emailObj of emails) {
                const email = emailObj.value.toLowerCase();
                const emailPart = email.split('@')[0];
                
                if (emailPart.includes(firstNameLower) && emailPart.includes(lastNameLower)) {
                    console.log('Found exact match:', emailObj.value);
                    return {
                        email: emailObj.value,
                        confidence: emailObj.confidence || 50,
                        source: 'domain_search_exact'
                    };
                }
            }
            
            // Look for partial matches
            for (const emailObj of emails) {
                const email = emailObj.value.toLowerCase();
                const emailPart = email.split('@')[0];
                
                if (emailPart.includes(firstNameLower) || emailPart.includes(lastNameLower)) {
                    console.log('Found partial match:', emailObj.value);
                    return {
                        email: emailObj.value,
                        confidence: Math.max(emailObj.confidence || 30, 30),
                        source: 'domain_search_partial'
                    };
                }
            }
            
            console.log('No matching emails found in domain search');
        }
        
        return null;
        
    } catch (error) {
        console.error('Domain search API error:', error);
        return null;
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

