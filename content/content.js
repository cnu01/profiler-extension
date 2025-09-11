// Content script for LinkedIn profile data extraction
console.log('LinkedIn Profile Profiler: Content script loaded');

// Enhanced LinkedIn data extraction with better selectors and error handling
function extractLinkedInProfileData() {
    const data = {
        fullName: null,
        designation: null,
        organisation: null,
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

        // Try alternative approach - look for any text that looks like a name
        if (!data.fullName) {
            const allText = document.body.innerText;
            const lines = allText.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.length > 5 && trimmed.length < 50) {
                    const words = trimmed.split(' ');
                    if (words.length >= 2 && words.length <= 4) {
                        const looksLikeName = words.every(word => 
                            word.length > 0 && 
                            word[0] === word[0].toUpperCase() &&
                            /^[A-Za-z\s.-]+$/.test(word)
                        );
                        
                        if (looksLikeName && !trimmed.toLowerCase().includes('engineer') && 
                            !trimmed.toLowerCase().includes('developer') && 
                            !trimmed.toLowerCase().includes('manager') &&
                            !trimmed.toLowerCase().includes('linkedin') &&
                            !trimmed.toLowerCase().includes('profile')) {
                            data.fullName = trimmed;
                            break;
                        }
                    }
                }
            }
        }

        // Extract current position/designation and organization from Experience section
        console.log('=== EXTRACTING EXPERIENCE DATA ===');
        const experienceSection = document.querySelector('[id*="experience"], [data-section="experience"], .experience-section, .pv-profile-section--experience, main section:has([id*="experience"])');
        
        if (experienceSection) {
            console.log('Found experience section');
            console.log('Experience section HTML preview:', experienceSection.innerHTML.substring(0, 500));

            // Dynamically select all experience entries using LinkedIn's DOM structure
            let experienceEntries = experienceSection.querySelectorAll('.pvs-list__item--line-separated, .pvs-entity, .experience-item, li[data-occludable-job-id], .artdeco-list__item, .pvs-list__item, li.pvs-list__paged-list-item, .pv-entity__position-group-pager li');
            if (experienceEntries.length === 0) {
                experienceEntries = experienceSection.querySelectorAll('li, .profile-section-card, [data-entity-hovercard-id]');
            }
            console.log(`Found ${experienceEntries.length} experience entries (structural selectors)`);

            // Extract job title and company name from the first (most recent) experience entry
            if (experienceEntries.length > 0) {
                const firstEntry = experienceEntries[0];
                console.log('Processing first experience entry:', firstEntry.innerHTML.substring(0, 200));

                // Job title: usually in h3, strong, or span (not a link)
                let jobTitle = null;
                const jobTitleSelectors = ['h3', 'strong', 'span:not(a)', '.pvs-entity__caption-wrapper span:not(a)', '.pvs-entity__caption-wrapper div:not(a)'];
                for (const selector of jobTitleSelectors) {
                    const el = firstEntry.querySelector(selector);
                    if (el && el.textContent.trim().length > 2 && el.textContent.trim().length < 100) {
                        jobTitle = el.textContent.trim();
                        break;
                    }
                }

                // Company name: usually in a link to company page
                let companyName = null;
                const companySelectors = ['a[href*="linkedin.com/company"]', 'a[data-field*="company"]', '.pvs-entity__caption-wrapper a', '.pvs-entity__summary-info a'];
                for (const selector of companySelectors) {
                    const el = firstEntry.querySelector(selector);
                    if (el && el.textContent.trim().length > 2 && el.textContent.trim().length < 80) {
                        companyName = el.textContent.trim();
                        break;
                    }
                }

                // Fallback: If company name not found, try to extract from job title (e.g., "Data Scientist @ NoBroker.com")
                if (!companyName && jobTitle && jobTitle.includes(' @ ')) {
                    const parts = jobTitle.split(' @ ');
                    if (parts.length === 2) {
                        companyName = parts[1].split(' | ')[0].replace(/\.com$|\.in$|\.ai$/,'').trim();
                        jobTitle = parts[0].trim();
                    }
                }

                // Set extracted values
                if (jobTitle) {
                    data.designation = jobTitle;
                }
                if (companyName) {
                    data.organisation = companyName;
                }
                console.log(`Extracted job title: "${jobTitle}", company name: "${companyName}"`);
            }
            
            if (experienceEntries.length > 0) {
                const firstEntry = experienceEntries[0];
                console.log('Processing first experience entry:', firstEntry.innerHTML.substring(0, 200));
                
                // Extract job title (designation) - look for h3 or strong text elements
                const titleSelectors = [
                    'h3',
                    '[aria-hidden="true"]',
                    '.visually-hidden',
                    'strong',
                    '.pvs-entity__caption-wrapper span:not(a)',
                    '.pvs-entity__caption-wrapper div:not(a)'
                ];
                
                let foundTitle = false;
                for (const selector of titleSelectors) {
                    const titleElements = firstEntry.querySelectorAll(selector);
                    console.log(`Title selector ${selector}: found ${titleElements.length} elements`);
                    
                    for (const titleElement of titleElements) {
                        const titleText = titleElement.textContent.trim();
                        console.log(`Checking title text: "${titleText}"`);
                        
                        // Skip if this element contains a link (likely a company name)
                        if (titleElement.querySelector('a')) {
                            console.log('Skipping title element containing link');
                            continue;
                        }
                        
                        // Check if this looks like a job title
                        if (titleText.length > 2 && titleText.length < 100 &&
                            !titleText.toLowerCase().includes('logo') &&
                            !titleText.toLowerCase().includes('company') &&
                            !titleText.toLowerCase().includes('see more') &&
                            !titleText.toLowerCase().includes('show all') &&
                            !titleText.toLowerCase().includes('full-time') &&
                            !titleText.toLowerCase().includes('part-time') &&
                            !titleText.toLowerCase().includes('·') &&
                            !titleText.includes('yrs') &&
                            !titleText.includes('mos') &&
                            !titleText.toLowerCase().includes('omega') &&  // Avoid company name
                            !titleText.toLowerCase().includes('masai') &&   // Avoid company name
                            !titleText.toLowerCase().includes('services') &&
                            !titleText.toLowerCase().includes('consultants') &&
                            !titleText.toLowerCase().includes('private') &&
                            !titleText.toLowerCase().includes('limited')) {
                            
                            // Additional validation for job titles
                            const jobTitlePatterns = [
                                /engineer/i, /developer/i, /manager/i, /director/i, 
                                /analyst/i, /consultant/i, /designer/i, /lead/i,
                                /specialist/i, /architect/i, /senior/i, /junior/i,
                                /product/i, /software/i, /data/i, /full[- ]?stack/i,
                                /frontend/i, /backend/i, /devops/i, /qa/i, /intern/i,
                                /coordinator/i, /associate/i, /executive/i, /trainee/i,
                                /student/i, /intern/i, /apprentice/i
                            ];
                            
                            const hasJobPattern = jobTitlePatterns.some(pattern => pattern.test(titleText));
                            
                            if (hasJobPattern) {
                                data.designation = titleText.replace(/\s+/g, ' ').trim();
                                console.log('Found job title:', data.designation);
                                foundTitle = true;
                                break;
                            } else {
                                console.log('Rejected title text (no job pattern)');
                            }
                        } else {
                            console.log('Rejected title text (failed basic validation)');
                        }
                    }
                    if (foundTitle) break;
                }
                
                // Extract company name - look for links to company pages
                const companySelectors = [
                    'a[href*="linkedin.com/company"]',
                    'a[data-field*="company"]',
                    '.pvs-entity__caption-wrapper a',
                    '.pvs-entity__summary-info a'
                ];
                
                let foundCompany = false;
                for (const selector of companySelectors) {
                    const companyElements = firstEntry.querySelectorAll(selector);
                    console.log(`Company selector ${selector}: found ${companyElements.length} elements`);
                    
                    for (const companyElement of companyElements) {
                        const companyText = companyElement.textContent.trim();
                        console.log(`Checking company text: "${companyText}"`);
                        
                        // Skip empty elements or elements with logo/image text
                        if (!companyText || companyText.length < 3) {
                            console.log('Skipping empty or too short company text');
                            continue;
                        }
                        
                        // Clean up the company text
                        let cleanCompanyText = companyText;
                        
                        // Remove common suffixes and noise
                        cleanCompanyText = cleanCompanyText.replace(/\s*logo\s*$/i, '');
                        cleanCompanyText = cleanCompanyText.replace(/\s*image\s*$/i, '');
                        cleanCompanyText = cleanCompanyText.replace(/\s*icon\s*$/i, '');
                        cleanCompanyText = cleanCompanyText.replace(/\s*graphic\s*$/i, '');
                        cleanCompanyText = cleanCompanyText.replace(/\s*·.*$/i, '');
                        cleanCompanyText = cleanCompanyText.replace(/\s*-.*$/i, '');
                        cleanCompanyText = cleanCompanyText.replace(/\s*\|.*$/i, '');
                        cleanCompanyText = cleanCompanyText.replace(/Full-time.*$/i, '');
                        cleanCompanyText = cleanCompanyText.replace(/Part-time.*$/i, '');
                        cleanCompanyText = cleanCompanyText.replace(/\d+\s*(yrs?|mos?|years?|months?).*$/i, '');
                        
                        // Remove duplicate text (e.g., "MasaiMasai" -> "Masai")
                        const words = cleanCompanyText.split(/\s+/);
                        if (words.length >= 2) {
                            const firstWord = words[0];
                            if (words.every(word => word === firstWord)) {
                                cleanCompanyText = firstWord;
                            }
                        }
                        
                        cleanCompanyText = cleanCompanyText.trim();
                        
                        console.log(`Cleaned company text: "${cleanCompanyText}"`);
                        
                        // Check if this looks like a valid company name
                        if (cleanCompanyText.length > 2 && cleanCompanyText.length < 80 &&
                            !cleanCompanyText.toLowerCase().includes('see more') &&
                            !cleanCompanyText.toLowerCase().includes('show all') &&
                            !cleanCompanyText.toLowerCase().includes('experience') &&
                            !cleanCompanyText.toLowerCase().includes('employment') &&
                            !cleanCompanyText.toLowerCase().includes('logo') &&
                            !cleanCompanyText.toLowerCase().includes('image') &&
                            cleanCompanyText.charAt(0) === cleanCompanyText.charAt(0).toUpperCase()) {
                            
                            data.organisation = cleanCompanyText;
                            console.log('Found company name:', data.organisation);
                            foundCompany = true;
                            break;
                        } else {
                            console.log('Rejected company text (failed validation)');
                        }
                    }
                    if (foundCompany) break;
                }
            }
        }
        
        // Fallback: Try to find position from other locations if experience section approach failed
        if (!data.designation) {
            console.log('=== FALLBACK: SEARCHING FOR DESIGNATION ===');
            const alternativeSelectors = [
                'main [aria-labelledby*="experience"] h3',
                'section[data-section="experience"] h3',
                '.pv-profile-section.experience h3',
                '.pvs-entity h3',
                '.pvs-list__item h3',
                'main h3[data-field*="title"]',
                'main h3:not([aria-hidden="true"])',
                '.pv-entity__summary-info h3:not([aria-hidden="true"])',
                'h3[data-field="experience_company_title"]',
                '.text-heading-xlarge.inline.t-24.v-align-middle.break-words', // Name selector as fallback
                'h1 + div .text-body-medium', // Usually right after name
                '.pv-text-details__left-panel .text-body-medium:first-of-type'
            ];
            
            for (const selector of alternativeSelectors) {
                const elements = document.querySelectorAll(selector);
                console.log(`Selector ${selector}: found ${elements.length} elements`);
                
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];
                    const text = element.textContent.trim();
                    console.log(`Element ${i}: "${text}"`);
                    
                    if (text.length > 2 && text.length < 200 && 
                        !text.toLowerCase().includes('company') && 
                        !text.toLowerCase().includes('experience') &&
                        !text.toLowerCase().includes('see more') &&
                        !text.toLowerCase().includes('show all') &&
                        !text.toLowerCase().includes('open to work') &&
                        !text.toLowerCase().includes('followers') &&
                        !text.toLowerCase().includes('connections') &&
                        !text.toLowerCase().includes('·')) {
                        
                        // Check if this looks like "Job Title @ Company" format
                        if (text.includes(' @ ')) {
                            const parts = text.split(' @ ');
                            const jobTitle = parts[0].trim();
                            const company = parts[1].split(' | ')[0].trim(); // Take first company if multiple
                            
                            console.log(`Found "Title @ Company" format: "${jobTitle}" @ "${company}"`);
                            
                            // Validate job title
                            if (jobTitle.length > 2 && jobTitle.length < 100) {
                                data.designation = jobTitle;
                                if (!data.organisation && company.length > 2) {
                                    // Clean company name
                                    let cleanCompany = company.replace(/\.com$/, '').replace(/\.in$/, '').replace(/\.ai$/, '');
                                    data.organisation = cleanCompany;
                                }
                                console.log(`Set designation: "${data.designation}", organisation: "${data.organisation}"`);
                                break;
                            }
                        } else {
                            // Regular job title
                            data.designation = text;
                            console.log(`Set designation (regular): "${data.designation}"`);
                            break;
                        }
                    }
                }
                if (data.designation) break;
            }
        }
        
        // Last resort: Pattern matching in page text
        if (!data.designation) {
            const allElements = document.querySelectorAll('*');
            const jobTitlePatterns = [
                /engineer/i, /developer/i, /manager/i, /director/i, 
                /analyst/i, /consultant/i, /designer/i, /lead/i,
                /specialist/i, /architect/i, /senior/i, /junior/i,
                /product/i, /software/i, /data/i, /full[- ]?stack/i,
                /frontend/i, /backend/i, /devops/i, /qa/i, /intern/i
            ];
            
            for (const element of allElements) {
                if (element.children.length === 0) {
                    const text = element.textContent.trim();
                    
                    if (text.length > 5 && text.length < 80) {
                        const hasJobTitlePattern = jobTitlePatterns.some(pattern => pattern.test(text));
                        
                        if (hasJobTitlePattern && 
                            !text.toLowerCase().includes('company') &&
                            !text.toLowerCase().includes('see more') &&
                            !text.toLowerCase().includes('followers') &&
                            !text.toLowerCase().includes('connections') &&
                            !text.toLowerCase().includes('week ') &&
                            !text.toLowerCase().includes('built') &&
                            !text.toLowerCase().includes('🚀')) {
                            
                            data.designation = text;
                            break;
                        }
                    }
                }
            }
        }

        // Extract current organisation from Experience section
        let currentOrganisation = null;
        
        let expSection = experienceSection;
        if (!expSection) {
            expSection = document.querySelector('[id*="experience"], [data-section="experience"], .experience-section, .pv-profile-section--experience, main section:has([id*="experience"])');
        }
        
        if (expSection) {
            console.log('=== SEARCHING FOR ORGANIZATION NAME ===');
            const companySelectors = [
                '.pvs-entity__path-node a[data-field="experience_company_logo"]',
                '.pvs-entity__summary-info a[href*="linkedin.com/company"]',
                '.pvs-entity a[data-control-name*="background_details_company"]',
                '.pvs-entity__caption-wrapper a[href*="company"]',
                '.pvs-list__item a[href*="company"]',
                '.pvs-entity .pvs-entity__sub-components a',
                '.pvs-entity a[aria-hidden="true"]',
                'a[data-field*="company"]',
                'a[href*="linkedin.com/company"]'
            ];
            
            let foundOrganisation = false;
            
            for (const selector of companySelectors) {
                const elements = expSection.querySelectorAll(selector);
                console.log(`Company selector ${selector}: found ${elements.length} elements`);
                
                for (let i = 0; i < Math.min(elements.length, 5); i++) {
                    const element = elements[i];
                    const text = element.textContent.trim();
                    console.log(`Checking company element ${i}: "${text}"`);
                    
                    if (text.length > 2 && text.length < 80 &&
                        !text.toLowerCase().includes('show all') &&
                        !text.toLowerCase().includes('see more') &&
                        !text.toLowerCase().includes('open to work') &&
                        !text.toLowerCase().includes('·') &&
                        !text.toLowerCase().includes('experience') &&
                        !text.toLowerCase().includes('employment') &&
                        !text.toLowerCase().includes('company') &&
                        !text.toLowerCase().includes('view profile') &&
                        !text.toLowerCase().includes('linkedin') &&
                        !text.toLowerCase().includes('logo')) {
                        
                        if (!text.includes('@') && !text.includes('http') && 
                            text.charAt(0) === text.charAt(0).toUpperCase()) {
                            
                            let cleanCompanyName = text;
                            
                            // Remove employment type indicators
                            cleanCompanyName = cleanCompanyName.replace(/\s*·\s*(Full-time|Part-time|Contract|Internship|Freelance|Temporary).*$/i, '');
                            cleanCompanyName = cleanCompanyName.replace(/\s*-\s*(Full-time|Part-time|Contract|Internship|Freelance|Temporary).*$/i, '');
                            cleanCompanyName = cleanCompanyName.replace(/\s*\|\s*(Full-time|Part-time|Contract|Internship|Freelance|Temporary).*$/i, '');
                            
                            // Remove duplicate company names
                            const words = cleanCompanyName.split(/\s+/);
                            if (words.length >= 4) {
                                const firstHalf = words.slice(0, Math.floor(words.length / 2)).join(' ');
                                const secondHalf = words.slice(Math.floor(words.length / 2)).join(' ');
                                if (firstHalf === secondHalf) {
                                    cleanCompanyName = firstHalf;
                                }
                            }
                            
                            cleanCompanyName = cleanCompanyName.replace(/\s+/g, ' ').trim();
                            
                            console.log(`Cleaned company name: "${cleanCompanyName}"`);
                            
                            if (cleanCompanyName.length > 1 && cleanCompanyName.length < 60) {
                                currentOrganisation = cleanCompanyName;
                                console.log(`Selected organization: "${currentOrganisation}"`);
                                foundOrganisation = true;
                                break;
                            }
                        }
                    } else {
                        console.log(`Rejected company text: "${text}" (failed validation)`);
                    }
                }
                
                if (foundOrganisation) break;
            }
            
            // Fallback to text analysis if structured approach fails
            if (!foundOrganisation) {
                console.log('=== FALLBACK: TEXT ANALYSIS FOR ORGANIZATION ===');
                const allTextElements = expSection.querySelectorAll('*');
                const companyCandidates = [];
                
                for (const element of allTextElements) {
                    if (element.children.length === 0 && element.textContent.trim()) {
                        const text = element.textContent.trim();
                        if (text.length > 3 && text.length < 60 && 
                            text.charAt(0) === text.charAt(0).toUpperCase()) {
                            companyCandidates.push({
                                text: text,
                                element: element.tagName,
                                href: element.href || 'none'
                            });
                        }
                    }
                }
                
                console.log(`Found ${companyCandidates.length} company candidates`);
                
                for (let idx = 0; idx < Math.min(companyCandidates.length, 10); idx++) {
                    const candidate = companyCandidates[idx];
                    const text = candidate.text;
                    console.log(`Candidate ${idx}: "${text}" (element: ${candidate.element}, href: ${candidate.href})`);
                    
                    if (!text.toLowerCase().includes('experience') &&
                        !text.toLowerCase().includes('see more') &&
                        !text.toLowerCase().includes('show all') &&
                        !text.toLowerCase().includes('open to work') &&
                        !text.toLowerCase().includes('full-stack') &&
                        !text.toLowerCase().includes('engineer') &&
                        !text.toLowerCase().includes('developer') &&
                        !text.toLowerCase().includes('langchain') &&
                        !text.toLowerCase().includes('week ') &&
                        !text.toLowerCase().includes('🚀') &&
                        !text.toLowerCase().includes('logo') &&
                        !text.toLowerCase().includes('omega') &&  // Block specific problematic text
                        !text.toLowerCase().includes('services') &&
                        !text.toLowerCase().includes('consultants') &&
                        !text.toLowerCase().includes('private limited') &&
                        text.length > 3 && text.length < 50) {
                        
                        let cleanCompanyName = text;
                        
                        // Remove employment type indicators
                        cleanCompanyName = cleanCompanyName.replace(/\s*·\s*(Full-time|Part-time|Contract|Internship|Freelance|Temporary).*$/i, '');
                        cleanCompanyName = cleanCompanyName.replace(/\s*-\s*(Full-time|Part-time|Contract|Internship|Freelance|Temporary).*$/i, '');
                        cleanCompanyName = cleanCompanyName.replace(/\s*\|\s*(Full-time|Part-time|Contract|Internship|Freelance|Temporary).*$/i, '');
                        
                        // Remove duplicate company names
                        const words = cleanCompanyName.split(/\s+/);
                        if (words.length >= 4) {
                            const firstHalf = words.slice(0, Math.floor(words.length / 2)).join(' ');
                            const secondHalf = words.slice(Math.floor(words.length / 2)).join(' ');
                            if (firstHalf === secondHalf) {
                                cleanCompanyName = firstHalf;
                            }
                        }
                        
                        cleanCompanyName = cleanCompanyName.trim();
                        
                        console.log(`Cleaned candidate: "${cleanCompanyName}"`);
                        
                        if (cleanCompanyName.length > 2 && cleanCompanyName.length < 50) {
                            currentOrganisation = cleanCompanyName;
                            console.log(`Selected from fallback: "${currentOrganisation}"`);
                            foundOrganisation = true;
                            break;
                        }
                    } else {
                        console.log(`Rejected candidate "${text}" (failed validation)`);
                    }
                }
            }
        }
        
        if (currentOrganisation) {
            data.organisation = currentOrganisation;
        }
        
        // Fallback to older selectors if still not found
        if (!data.organisation) {
            console.log('=== FALLBACK: OLDER SELECTORS FOR ORGANIZATION ===');
            const orgSelectors = [
                '.pv-entity__secondary-title',
                'a[data-control-name="background_details_company"]',
                '.pv-entity__company-summary-info h3 span[aria-hidden="true"]',
                '.experience-item__subtitle a',
                '.pv-entity__summary-info h4',
                '.experience-group .pv-entity__company-summary-info h3',
                '.pv-profile-section .pv-entity__company-summary-info',
                '.text-body-medium:not(.break-words)', // Try to find company names
                '.pv-text-details__left-panel .text-body-medium:nth-of-type(2)', // Second text element after name
                'main section div[data-field*="company"]'
            ];

            for (const selector of orgSelectors) {
                const orgElements = document.querySelectorAll(selector);
                console.log(`Selector ${selector}: found ${orgElements.length} elements`);
                
                for (let i = 0; i < Math.min(orgElements.length, 3); i++) {
                    const orgElement = orgElements[i];
                    const orgText = orgElement.textContent.trim();
                    console.log(`Element ${i}: "${orgText}"`);
                    
                    if (orgText) {
                        // Apply same filtering as above but check if it looks like a job title vs company
                        const looksLikeJobTitle = /^(associate|senior|junior|lead|principal|staff|director|manager|head|chief|vp|vice president|president|ceo|cto|cfo|architect|engineer|developer|analyst|scientist|specialist|consultant|coordinator|intern|trainee)/i.test(orgText);
                        
                        console.log(`"${orgText}" looks like job title: ${looksLikeJobTitle}`);
                        
                        if (!orgText.toLowerCase().includes('logo') &&
                            !orgText.toLowerCase().includes('omega') &&
                            !orgText.toLowerCase().includes('services') &&
                            !orgText.toLowerCase().includes('consultants') &&
                            !orgText.toLowerCase().includes('private limited') &&
                            !looksLikeJobTitle && // Skip if this looks like a job title
                            orgText.length > 2 &&
                            orgText.length < 80) {
                            
                            data.organisation = orgText;
                            console.log(`Selected from older selectors: "${data.organisation}"`);
                            break;
                        } else {
                            console.log(`Rejected older selector text: "${orgText}" (blocked keywords or job title)`);
                        }
                    }
                }
                if (data.organisation) break;
            }
        }

        // Try to extract from "Open to work" section
        if (!data.organisation) {
            console.log('=== CHECKING OPEN TO WORK SECTION ===');
            const openToWorkSection = document.querySelector('.pv-open-to-card, .open-to-work');
            if (openToWorkSection) {
                console.log('Found open to work section');
                const companyElements = openToWorkSection.querySelectorAll('.text-body-medium, .text-body-small');
                for (let i = 0; i < companyElements.length; i++) {
                    const element = companyElements[i];
                    const text = element.textContent.trim();
                    console.log(`Open to work element ${i}: "${text}"`);
                    
                    if (text.length > 2 && text.length < 100 && 
                        !text.toLowerCase().includes('open to') &&
                        !text.toLowerCase().includes('show details') &&
                        !text.toLowerCase().includes('role') &&
                        !text.toLowerCase().includes('omega') &&
                        !text.toLowerCase().includes('services') &&
                        !text.toLowerCase().includes('consultants') &&
                        !text.toLowerCase().includes('private limited')) {
                        data.organisation = text;
                        console.log(`Selected from open to work: "${data.organisation}"`);
                        break;
                    }
                }
            } else {
                console.log('No open to work section found');
            }
        }

        // Try to extract organisation from designation if pattern matches "Title at Company"
        if (!data.organisation && data.designation && data.designation.includes(' at ')) {
            const parts = data.designation.split(' at ');
            if (parts.length >= 2) {
                data.organisation = parts[parts.length - 1].trim();
                data.designation = parts.slice(0, -1).join(' at ').trim();
                console.log(`Extracted from "at" pattern - Designation: "${data.designation}", Organisation: "${data.organisation}"`);
            }
        }

        // Try to extract organisation from designation if pattern matches "Title @ Company"
        if (!data.organisation && data.designation && data.designation.includes(' @ ')) {
            const parts = data.designation.split(' @ ');
            if (parts.length >= 2) {
                let company = parts[parts.length - 1].split(' | ')[0].trim(); // Take first company if multiple
                company = company.replace(/\.com$/, '').replace(/\.in$/, '').replace(/\.ai$/, '');
                data.organisation = company;
                data.designation = parts[0].trim(); // Keep only the job title
                console.log(`Extracted from "@" pattern - Designation: "${data.designation}", Organisation: "${data.organisation}"`);
            }
        }

        // Special handling for "Open to work" profiles
        if (!data.organisation) {
            const openToWorkIndicators = document.querySelectorAll('.pv-open-to-card, [data-test-id="open-to-work"]');
            if (openToWorkIndicators.length > 0) {
                data.organisation = "Freelancer / Open to work";
            }
        }

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

        // Extract location
        const locationSelectors = [
            '.text-body-small.inline.t-black--light.break-words',
            '.pv-text-details__left-panel .text-body-small',
            'span.text-body-small.inline.t-black--light.break-words'
        ];

        for (const selector of locationSelectors) {
            const locationElement = document.querySelector(selector);
            if (locationElement && locationElement.textContent.trim()) {
                const locationText = locationElement.textContent.trim();
                if (locationText.length < 50 && !locationText.includes('•')) {
                    data.location = locationText;
                    break;
                }
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
            let cleanOrg = data.organisation.replace(/\s+/g, ' ').trim();
            
            // Remove common suffixes that indicate this is not a clean company name
            cleanOrg = cleanOrg.replace(/\s*logo\s*$/i, '');
            cleanOrg = cleanOrg.replace(/\s*image\s*$/i, '');
            cleanOrg = cleanOrg.replace(/\s*icon\s*$/i, '');
            cleanOrg = cleanOrg.replace(/\s*graphic\s*$/i, '');
            
            // Remove employment type suffixes that might have been missed
            cleanOrg = cleanOrg.replace(/\s*·\s*(Full-time|Part-time|Contract|Internship|Freelance|Temporary).*$/i, '');
            cleanOrg = cleanOrg.replace(/\s*-\s*(Full-time|Part-time|Contract|Internship|Freelance|Temporary).*$/i, '');
            cleanOrg = cleanOrg.replace(/\s*\|\s*(Full-time|Part-time|Contract|Internship|Freelance|Temporary).*$/i, '');
            
            // Remove duplicate company names
            const words = cleanOrg.split(/\s+/);
            if (words.length >= 4) {
                const firstHalf = words.slice(0, Math.floor(words.length / 2)).join(' ');
                const secondHalf = words.slice(Math.floor(words.length / 2)).join(' ');
                if (firstHalf === secondHalf) {
                    cleanOrg = firstHalf;
                }
            }
            
            data.organisation = cleanOrg.trim();
        }

        console.log('=== FINAL EXTRACTED DATA ===');
        console.log('Full Name:', data.fullName);
        console.log('Designation:', data.designation);
        console.log('Organisation:', data.organisation);
        console.log('Location:', data.location);
        console.log('Profile Image:', data.profileImage ? 'Found' : 'Not found');
        
        return data;

    } catch (error) {
        console.error('Error extracting LinkedIn profile data:', error);
        return data;
    }
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
    console.log('Content script received message:', request);
    
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
            waitForProfileLoad().then(() => {
                console.log('Profile data ready for extraction');
            }).catch(() => {
                console.log('Profile load failed');
            });
        }, 1000);
    });
} else {
    setTimeout(() => {
        waitForProfileLoad().then(() => {
            console.log('Profile data ready for extraction');
        }).catch(() => {
            console.log('Profile load failed');
        });
    }, 1000);
}
