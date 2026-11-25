#!/bin/bash
# ==============================================================================
# ColorLab Forma Setup Pro - 1-Click Installer (macOS)
# Developed by Yahia Bin Zaman | https://github.com/yahiabinzaman
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
TARGET_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/com.colorlab.formasetup"

echo "=========================================================="
echo " ColorLab Forma Setup Pro v1.3 - 1-Click Installer (Mac)  "
echo " Developed by Yahia Bin Zaman                           "
echo "=========================================================="
echo ""

# Enable CEP PlayerDebugMode for all CSXS versions
for ver in 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    defaults write com.adobe.CSXS.$ver PlayerDebugMode 1 2>/dev/null || true
done

# Ensure CEP directory exists and copy cleanly without .git / .DS_Store
mkdir -p "$HOME/Library/Application Support/Adobe/CEP/extensions"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

shopt -s dotglob 2>/dev/null || true
cp -R "$DIR/"* "$TARGET_DIR/" 2>/dev/null || true
shopt -u dotglob 2>/dev/null || true
rm -rf "$TARGET_DIR/.git" "$TARGET_DIR/.DS_Store" 2>/dev/null || true

# Copy standalone JSX scripts to ~/Documents/Adobe Scripts (always writable) and Illustrator Presets
USER_SCRIPTS="$HOME/Documents/Adobe Scripts"
mkdir -p "$USER_SCRIPTS"
COPIED_PRESET=0
for jsx_name in "Forma_Setup_Pro_QuickRun.jsx" "Ready_File_Generator_QuickRun.jsx" "Print_Demo_BackToBack.jsx"; do
    if [ -f "$DIR/$jsx_name" ]; then
        cp -f "$DIR/$jsx_name" "$USER_SCRIPTS/" 2>/dev/null || true
        for app_dir in /Applications/Adobe\ Illustrator*; do
            if [ -d "$app_dir" ]; then
                for script_dir in "$app_dir"/Presets.localized/*/Scripts "$app_dir"/Presets/*/Scripts; do
                    if [ -d "$script_dir" ] && [ -w "$script_dir" ]; then
                        cp -f "$DIR/$jsx_name" "$script_dir/" && COPIED_PRESET=1
                    fi
                done
            fi
        done
    fi
done

echo "=========================================================="
echo " [SUCCESS] ColorLab Forma Setup Pro v1.3 installed!"
echo " Extension: $TARGET_DIR"
echo " Scripts:   $USER_SCRIPTS"
if [ "$COPIED_PRESET" -eq 0 ]; then
    echo " [INFO] Presets/Scripts requires admin; run scripts via"
    echo "        File > Scripts > Other Script... from $USER_SCRIPTS"
fi
echo " Restart Adobe Illustrator and open:"
echo " Window > Extensions > ColorLab Forma Setup Pro"
echo "=========================================================="

# Show native macOS notification
osascript -e 'display notification "Forma Setup Pro v1.3 installed! Restart Illustrator to use." with title "ColorLab Forma Setup Pro"' 2>/dev/null || true

read -p "Press Enter to exit..."
