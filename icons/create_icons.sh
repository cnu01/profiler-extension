#!/bin/bash

# Create Icon Files Script for LinkedIn Profile Profiler Extension
# This script creates simple placeholder PNG icons from the SVG template

echo "🎨 Creating extension icons..."

# Check if ImageMagick or similar is available
if command -v convert >/dev/null 2>&1; then
    echo "✅ ImageMagick found - creating PNG icons from SVG"
    
    # Create PNG icons at different sizes
    convert icon.svg -resize 16x16 icon16.png
    convert icon.svg -resize 32x32 icon32.png
    convert icon.svg -resize 48x48 icon48.png
    convert icon.svg -resize 128x128 icon128.png
    
    echo "✅ Icons created successfully!"
    
elif command -v rsvg-convert >/dev/null 2>&1; then
    echo "✅ rsvg-convert found - creating PNG icons from SVG"
    
    # Create PNG icons at different sizes
    rsvg-convert -w 16 -h 16 icon.svg > icon16.png
    rsvg-convert -w 32 -h 32 icon.svg > icon32.png
    rsvg-convert -w 48 -h 48 icon.svg > icon48.png
    rsvg-convert -w 128 -h 128 icon.svg > icon128.png
    
    echo "✅ Icons created successfully!"
    
else
    echo "⚠️  No SVG to PNG converter found"
    echo "📋 Manual steps needed:"
    echo ""
    echo "1. Open icon.svg in any image editor (GIMP, Photoshop, online converter)"
    echo "2. Export as PNG at these sizes:"
    echo "   - icon16.png (16x16 pixels)"
    echo "   - icon32.png (32x32 pixels)" 
    echo "   - icon48.png (48x48 pixels)"
    echo "   - icon128.png (128x128 pixels)"
    echo ""
    echo "3. Or use online tools:"
    echo "   - https://convertio.co/svg-png/"
    echo "   - https://www.iloveimg.com/resize-image"
    echo ""
    echo "4. After creating icons, update manifest.json to re-enable icon references"
fi

echo ""
echo "🚀 Extension should now load in Chrome!"
echo "📁 Location: $(pwd)"
