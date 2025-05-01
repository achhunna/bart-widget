# BART Widget for Scriptable

A real-time BART (Bay Area Rapid Transit) departure widget for iOS, built using the [Scriptable](https://scriptable.app/) app. This widget automatically finds your nearest BART station and displays upcoming train departures, making it perfect for Bay Area commuters.

![BART Widget Preview](https://user-images.githubusercontent.com/your-username/bart-widget/preview.png)

## Features

- 🚉 **Automatic Station Detection**: Finds the closest BART station using your current location
- 🚂 **Smart Direction Display**:
  - Within 7 miles of SF: Shows westbound trains
  - East of SF: Shows eastbound trains
  - West of SF: Shows westbound trains
- 🎨 **Dynamic Styling**:
  - Supports both light and dark mode
  - Color-coded train lines with direction arrows (→● or ●←)
  - Clean, easy-to-read interface
- ⏱️ **Real-time Updates**:
  - Refreshes every minute
  - Shows next train in both minutes and actual time
  - Displays additional trains with actual times
  - Shows last updated timestamp
- 📍 **Location Context**:
  - Shows station name and distance from your location
  - Indicates walking time to station
  - Shows distance from San Francisco
  - Displays relevant train directions based on your location

## Supported Train Lines

- 🔴 Red Line (Richmond ↔ Millbrae)
- 💛 Yellow Line (Antioch ↔ SFO)
- 🟠 Orange Line (Berryessa ↔ Richmond)
- 💚 Green Line (Berryessa ↔ Daly City)

## Installation

1. Install [Scriptable](https://apps.apple.com/us/app/scriptable/id1405459188) from the App Store
2. Download `script.js` from this repository
3. Open Scriptable and create a new script
4. Copy and paste the contents of `script.js` into your new script
5. Get your API key from [BART API](https://www.bart.gov/schedules/developers/api)

## Widget Setup

1. Long press on your home screen or today view
2. Tap the + button to add a widget
3. Search for and select "Scriptable"
4. Choose your preferred widget size
5. Tap the widget to configure it
6. Select the script you created
7. **Important**: Add your BART API key
   - Long press the widget
   - Choose "Edit Widget"
   - In the "Parameter" field, paste your BART API key
   - The widget will not function correctly without a valid API key
8. Make sure location services are enabled for Scriptable

## Views

### Widget View

- Compact display of nearest station and upcoming trains
- Color-coded line indicators with direction arrows
- Next train shown in minutes and actual time (e.g., "5 min (3:45 PM)")
- Additional trains shown with actual times
- Last updated timestamp
- Walking distance and time to station

### Detailed View (Table)

- Tap the widget to open
- Full station information including address
- Detailed train information including:
  - Destination
  - Next train in minutes and actual time, additional trains in actual times
  - Train length (number of cars)
  - Direction

## Configuration

You can modify these variables in `script.js`:

```javascript
const REFRESH_INTERVAL_MINUTES = 1; // Widget refresh interval
const SF_BORDER_MILES = 7; // Distance threshold for direction switching
```

The BART API key is configured through the widget's Parameter field:

```javascript
const BART_API_KEY = args.widgetParameter || "YOUR_API_KEY"; // Uses widget parameter
```

To set your API key:

1. Get an API key from [BART API Website](https://www.bart.gov/schedules/developers/api)
2. Long press your widget
3. Choose "Edit Widget"
4. Paste your API key in the "Parameter" field

This approach keeps your API key secure and makes it easy to update.

## Requirements

- iOS 14.0 or later
- [Scriptable](https://scriptable.app/) app installed
- Location services enabled
- Internet connection for real-time updates

## Privacy

This widget requires:

- Location access to find the nearest station
- Internet access to fetch BART API data
  No personal data is collected or stored.

## Credits

- BART API: [https://www.bart.gov/schedules/developers/api](https://www.bart.gov/schedules/developers/api)
- Scriptable: [https://scriptable.app/](https://scriptable.app/)

## License

MIT License - feel free to modify and share!

## Support

If you encounter any issues or have suggestions for improvements, please open an issue in this repository.
