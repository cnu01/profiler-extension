# Profile Hunter Chrome Extension

A modern Chrome extension that fetches LinkedIn profile data from Hunter.io API including Full Name, Email, Company, and Position.

![Extension Preview](https://img.shields.io/badge/Chrome-Extension-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🚀 Features

- **Hunter.io Integration**: Fetches comprehensive profile data from Hunter.io API.
- **Complete Profile Data**: Returns Full Name, Email, Company/Organization, and Position.
- **LinkedIn Photo Support**: Displays LinkedIn profile photos alongside Hunter.io data.
- **Modern Minimalist UI**: Clean, aesthetic interface with Nord blue accent color (#5E81AC).
- **Real-time API Testing**: Tests Hunter.io connectivity and provides usage statistics.
- **Privacy First**: Secure API key storage, data fetched directly from Hunter.io.
- **Professional Icons**: Complete SVG icon set with magnifying glass design.
- **Enhanced UX**: Popup closes on click-outside and ESC key, smooth interactions.
- **Unified Design**: Consistent minimal theme across popup and settings pages.

## 📸 Screenshots

The extension features a minimalist interface with:
- Clean white background with subtle gray accents
- Nord blue (#5E81AC) accent color for interactive elements
- Inter font typography for modern readability
- Smooth loading states and error handling
- One-click copying for all data fields
- Professional magnifying glass icons throughout
- Consistent design between popup and settings pages
- Enhanced popup behavior (ESC key and click-outside to close)

## 🛠 Installation

### Prerequisites
- Google Chrome browser
- Hunter.io API key (free tier available)

### Step 1: Download the Extension
1. Download the ZIP file from the repository
2. Extract it to a folder on your computer

### Step 2: Load in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the extracted extension folder
5. The extension should now appear in your Chrome toolbar

### Step 3: Configure Hunter.io API Key
1. Click the extension icon and go to "Settings" by clicking the gear icon
2. Get your free API key from [Hunter.io](https://hunter.io/pricing)
3. Enter your API key in the settings page
4. Click "Test API Key" to verify it works
5. Click "Save Settings"

## 🔑 Getting Your Hunter.io API Key

### Free Plan (25 requests/month)
1. Visit [Hunter.io](https://hunter.io/pricing)
2. Sign up for a free account
3. Verify your email address
4. Navigate to your API dashboard
5. Copy your API key
6. Paste it in the extension settings

### API Key Security
- Your API key is stored locally in Chrome's secure storage
- It's never shared with third parties
- Only used for Hunter.io API calls

## 🎯 How to Use

### Basic Usage
1. **Navigate** to any LinkedIn profile page (e.g., `linkedin.com/in/username`)
2. **Click** the Profile Hunter extension icon in your Chrome toolbar
3. **Wait** for the extension to fetch profile data from Hunter.io
4. **View** the results in the popup window
5. **Copy** any data field with one click
6. **Close** the popup by pressing ESC or clicking outside

### Settings Access
- Click the gear icon (⚙️) in the popup to access settings
- Test your API key connectivity
- View your Hunter.io usage statistics

### Test Profile
Try the extension with this LinkedIn profile:
```
https://www.linkedin.com/in/raman-ghai-8bb7b418/
```

### What Data is Fetched from Hunter.io
- **Full Name**: First and last name from Hunter.io database
- **Email**: Professional email address 
- **Company**: Current employer/organization
- **Position**: Job title/designation
- **Profile Photo**: LinkedIn profile picture (for display)
- **Profile URL**: Direct link to LinkedIn profile

### Hunter.io API Response Format
```json
{
  "data": {
    "first_name": "John",
    "last_name": "Doe", 
    "email": "john.doe@company.com",
    "score": 98,
    "domain": "company.com",
    "company": "Company Name",
    "position": "Software Engineer",
    "verification": {
      "date": "2025-09-11",
      "status": "valid"
    }
  }
}
```

## 🔧 Troubleshooting

### Common Issues

#### "Not a LinkedIn Profile" Error
- Make sure you're on a LinkedIn profile page (`linkedin.com/in/username`)
- Refresh the page and try again
- Check that you're logged into LinkedIn

#### "No Data Found" Error
- The person might not be in Hunter.io's database
- Try with different LinkedIn profiles
- Check your Hunter.io API key in settings

#### "API Key Required" Error
- Configure your Hunter.io API key in settings
- Verify the API key is correct by testing it
- Check your Hunter.io account status

#### "Email Not Found" Error
- Hunter.io doesn't have email data for this person/company
- Try with profiles from larger, well-known companies
- This is normal - not all emails are discoverable

### API Rate Limits
- Free Hunter.io plan: 25 requests/month
- Requests reset monthly
- Check usage in extension settings
- Upgrade Hunter.io plan if needed

## 📁 Project Structure

```
linkedin-profiler-extension/
├── manifest.json              # Extension configuration and icon declarations
├── popup/
│   ├── popup.html            # Main popup interface with favicon
│   ├── popup.css             # Modern minimal styling
│   └── popup.js              # Enhanced popup functionality (ESC, click-outside)
├── content/
│   └── content.js            # LinkedIn data extraction
├── background/
│   └── background.js         # Hunter.io API integration
├── options/
│   ├── options.html          # Settings page with unified design
│   ├── options.css           # Minimal settings styling 
│   └── options.js            # Settings functionality (error-free)
├── icons/
│   ├── favicon.svg           # Browser tab favicon (16x16)
│   ├── icon16.svg            # Extension toolbar icon
│   ├── icon32.svg            # Extension management icon
│   ├── icon48.svg            # Extension details icon
│   └── icon128.svg           # Chrome Web Store icon
└── README.md                # This file (updated)
```

## 🛡 Privacy & Security

- **No Data Collection**: We don't collect or store any personal data
- **Local Processing**: All profile extraction happens locally
- **Secure Storage**: API keys stored in Chrome's encrypted storage
- **HTTPS Only**: All API calls use secure connections
- **No Tracking**: No analytics or user tracking

## 🚀 Technical Details

### Technologies Used
- **Manifest V3**: Latest Chrome extension standard with proper icon declarations
- **Vanilla JavaScript**: No external dependencies, optimized code
- **CSS Grid/Flexbox**: Modern responsive design with CSS variables
- **Chrome APIs**: Storage, tabs, scripting, runtime
- **Inter Font**: Modern, readable UI typography
- **SVG Icons**: Scalable vector graphics for crisp display at all sizes
- **Nord Color Palette**: Professional blue accent (#5E81AC) for consistency

### Browser Support
- Chrome 88+
- Chromium-based browsers (Edge, Brave, etc.)

### Permissions Required
- `activeTab`: Access current LinkedIn tab
- `storage`: Save API key securely
- `scripting`: Extract profile data
- `host_permissions`: LinkedIn and Hunter.io domains


### Development Setup
1. Clone the repository
2. Load the extension in developer mode
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

