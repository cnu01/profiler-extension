# Icon Placeholder Files

Since we can't generate actual PNG icons in this environment, here are the icon requirements:

## Icon Specifications
- **16x16px** - Toolbar icon (small)
- **32x32px** - Toolbar icon (medium)  
- **48x48px** - Extension management page
- **128x128px** - Chrome Web Store

## Design Guidelines
- Use the same gradient as the popup: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Include a star/profile icon in white
- Rounded corners (border-radius: ~20% of size)
- Clean, modern design

## Temporary Solution
For testing, you can:
1. Use any placeholder PNG images with the correct dimensions
2. Create icons using any image editor (Photoshop, GIMP, Canva, etc.)
3. Use online icon generators
4. The extension will work without icons (Chrome will use defaults)

## Icon Files Needed
- `icon16.png` (16x16 pixels)
- `icon32.png` (32x32 pixels)  
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Place these files in the `/icons/` directory for the extension to work properly.
