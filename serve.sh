#!/bin/bash
# Check if http-server is installed
if ! command -v http-server &> /dev/null; then
    echo "http-server is not installed. Installing now..."
    npm install -g http-server
fi

# Setup variables for platform independence and host specificity
OS=$(uname -s)
export OS

# Build the project
echo "Building project..."
npm run build

# Start server with caching disabled and CORS enabled
echo "Starting server with caching disabled..."
cd http_root || exit
http-server -c-1 --cors --silent &

# Wait for the port to become available
while ! nc -z localhost 8080; do
    sleep 0.1
done

# Open URL based on operating system
case $OS in
    "Linux")
        # List of possible Chrome executable names
        browsers=(
            "google-chrome"
            "google-chrome-stable"
            "chromium"
            "chromium-browser"
            "com.google.Chrome" # Flatpak
            "org.chromium.Chromium" # Flatpak
        )

        # Function to check if a command exists
        command_exists() {
            command -v "$1" >/dev/null 2>&1
        }

        # Function to try flatpak run
        try_flatpak() {
            if command_exists flatpak; then
                flatpak run "$1" --incognito "$URL" 2>/dev/null && return 0
            fi
            return 1
        }

        # URL to open
        URL="http://localhost:8080/"

        # Try each browser until one works
        for browser in "${browsers[@]}"; do
            # Check if it's a flatpak package
            if [[ $browser == com.* ]] || [[ $browser == org.* ]]; then
                if try_flatpak "$browser"; then
                    echo "Successfully launched using Flatpak: $browser"
                    exit 0
                fi
            # Try regular command
            elif command_exists "$browser"; then
                if "$browser" --incognito "$URL" 2>/dev/null; then
                    echo "Successfully launched: $browser"
                    exit 0
                fi
            fi
        done
        echo "Error: Could not find any compatible Chrome/Chromium browser"
        exit 1
        ;;

    "Darwin")
        open -a "Google Chrome" --args --incognito "http://localhost:8080/"
        ;;

    *)
        echo "Unsupported operating system: $OS"
        exit 1
        ;;
esac

wait
#EOF