// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: train;

/*** WIDGET SETUP ***
 * This widget shows real-time BART train departures from your nearest station
 *
 * HOW IT WORKS
 * The widget automatically:
 * 1. Finds your nearest BART station using your current location
 * 2. Shows trains based on your position relative to San Francisco:
 *    - East of SF: Shows only eastbound trains
 *    - West of SF: Shows only westbound trains
 *    - Within 7 miles of SF: Shows westbound trains
 * 3. Updates every minute with fresh departure times
 * 4. Sorts all trains by earliest departure time
 *
 * DISPLAY INFORMATION
 * - Station name and distance from your location
 * - Train line colors with direction arrows (→● or ●←)
 * - Next train shown in minutes and actual time (e.g., "5 min (3:45 PM)")
 * - Additional trains sorted by departure time
 * - Distance from San Francisco
 * - Last updated timestamp
 * - Only shows trains heading in relevant direction based on your location
 *
 * SUPPORTED LINES
 * Red (Richmond ↔ Millbrae), Yellow (Antioch ↔ SFO),
 * Orange (Berryessa ↔ Richmond), Green (Berryessa ↔ Daly City)
 *
 * TIPS
 * - Make sure location services are enabled
 * - The widget works best on your home screen or in Today View
 * - Tap the widget to see more detailed train information
 */

// Configuration
const REFRESH_INTERVAL_MINUTES = 1; // Widget will refresh every minute
const BART_API_KEY = args.widgetParameter || "YOUR_API_KEY"; // Use widget parameter or fallback
const BART_API_BASE = "https://api.bart.gov/api";

// San Francisco city center coordinates
const SF_LATITUDE = 37.7749;
const SF_LONGITUDE = -122.4194;
const SF_BORDER_MILES = 7;

// Color schemes for light and dark modes
const ColorScheme = {
  background: Color.dynamic(new Color("#ffffff"), new Color("#1c1c1e")),
  headerText: Color.dynamic(new Color("#000000"), new Color("#ffffff")),
  primaryText: Color.dynamic(new Color("#000000"), new Color("#ffffff")),
  secondaryText: Color.dynamic(new Color("#666666"), new Color("#999999")),
  accentBlue: Color.dynamic(new Color("#007AFF"), new Color("#0A84FF")),
  rowBackground: Color.dynamic(new Color("#f0f0f0"), new Color("#2c2c2e")),

  // Line colors for light mode and dark mode
  lines: {
    // Eastbound colors
    RedE: {
      light: new Color("#ff3b30"), // Bright red
      dark: new Color("#ff453a"), // Slightly lighter red
    },
    YellowE: {
      light: new Color("#ffd60a"), // Bright yellow
      dark: new Color("#ffd60a"), // Same yellow (good contrast in both modes)
    },
    OrangeE: {
      light: new Color("#ff9500"), // Bright orange
      dark: new Color("#ff9f0a"), // Slightly lighter orange
    },
    GreenE: {
      light: new Color("#32d74b"), // Bright green
      dark: new Color("#30d158"), // Slightly lighter green
    },

    // Westbound colors
    RedW: {
      light: new Color("#ff6b6b"), // Soft red
      dark: new Color("#ff6961"), // Slightly lighter soft red
    },
    YellowW: {
      light: new Color("#fff06b"), // Soft yellow
      dark: new Color("#ffe580"), // Slightly lighter soft yellow
    },
    OrangeW: {
      light: new Color("#ffb74d"), // Soft orange
      dark: new Color("#ffb340"), // Slightly lighter soft orange
    },
    GreenW: {
      light: new Color("#7ed321"), // Soft green
      dark: new Color("#30db5b"), // Slightly lighter soft green
    },
  },
};

async function loadStationList() {
  try {
    const url = `${BART_API_BASE}/stn.aspx?cmd=stns&key=${BART_API_KEY}&json=y`;
    const req = new Request(url);
    const json = await req.loadJSON();
    
    // Validate response structure
    if (!json || !json.root || !json.root.stations || !json.root.stations.station) {
      console.log('Invalid API response structure:', json);
      throw new Error('Invalid BART API response structure');
    }
    
    return json.root.stations.station;
  } catch (error) {
    console.log('Error loading station list:', error);
    throw error;
  }
}

function calculateDistanceFromSF(latitude, longitude) {
  const R = 3959; // Earth's radius in miles
  const dLat = ((latitude - SF_LATITUDE) * Math.PI) / 180;
  const dLon = ((longitude - SF_LONGITUDE) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((SF_LATITUDE * Math.PI) / 180) *
      Math.cos((latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
}

function isEastOfSFBorder(latitude, longitude) {
  const distanceFromSF = calculateDistanceFromSF(latitude, longitude);
  if (distanceFromSF <= SF_BORDER_MILES) {
    return false; // Within SF border, show westbound
  }
  return longitude > SF_LONGITUDE; // Outside border, use longitude
}

async function findClosestStation(currentLocation) {
  const stations = await loadStationList();
  let closestStation = null;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const station of stations) {
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      Number.parseFloat(station.gtfs_latitude),
      Number.parseFloat(station.gtfs_longitude)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestStation = station;
    }
  }

  return {
    station: closestStation,
    distance: minDistance,
  };
}

// Add back the calculateDistance function for finding nearest station
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

async function getStationDepartures(station) {
  try {
    const url = `${BART_API_BASE}/etd.aspx?cmd=etd&orig=${station.abbr}&key=${BART_API_KEY}&json=y`;
    const req = new Request(url);
    const json = await req.loadJSON();
    
    // Validate response structure
    if (!json || !json.root || !json.root.station || !json.root.station[0] || !json.root.station[0].etd) {
      console.log('Invalid API response structure:', json);
      throw new Error('Invalid BART API response structure');
    }
    
    return json.root.station[0].etd;
  } catch (error) {
    console.log('Error getting station departures:', error);
    throw error;
  }
}

function getLineColor(destination, direction) {
  // BART line color mapping with direction
  const lineColors = {
    // Eastbound trains
    ANTC: {
      North: "YellowE", // Antioch - Yellow Line Northbound (treated as East)
      South: "YellowW", // Antioch - Yellow Line Southbound (treated as West)
    },
    PITT: {
      North: "YellowE", // Pittsburg/Bay Point - Yellow Line Northbound (treated as East)
      South: "YellowW", // Pittsburg/Bay Point - Yellow Line Southbound (treated as West)
    },
    SFIA: {
      South: "YellowW", // SFO Airport - Yellow Line Southbound (treated as West)
      North: "YellowE", // SFO Airport - Yellow Line Northbound (treated as East)
    },
    MLBR: {
      South: "RedW", // Millbrae - Red Line Southbound (treated as West)
      North: "RedE", // Millbrae - Red Line Northbound (treated as East)
    },
    RICH: {
      North: "RedE", // Richmond - Red Line Northbound (treated as East)
      South: "OrangeW", // Richmond - Orange Line Southbound (treated as West)
    },
    BERY: {
      South: "GreenE", // Berryessa - Green Line Southbound (treated as East)
      North: "OrangeW", // Berryessa - Orange Line Northbound (treated as West)
    },
    DALY: {
      South: "GreenW", // Daly City - Green Line Southbound (treated as West)
      North: "GreenE", // Daly City - Green Line Northbound (treated as East)
    },
  };

  return lineColors[destination]?.[direction] || "Unknown";
}

function formatDepartures(etd) {
  const departures = {
    RedE: [], // Eastbound Red Line
    RedW: [], // Westbound Red Line
    YellowE: [], // Eastbound Yellow Line
    YellowW: [], // Westbound Yellow Line
    OrangeE: [], // Eastbound Orange Line
    OrangeW: [], // Westbound Orange Line
    GreenE: [], // Eastbound Green Line
    GreenW: [], // Westbound Green Line
  };

  const now = new Date();
  
  for (const destination of etd) {
    for (const estimate of destination.estimate) {
      const lineColor = getLineColor(
        destination.abbreviation,
        estimate.direction
      );
      if (lineColor in departures) {
        const departureTime = new Date(now.getTime() + (Number.parseInt(estimate.minutes) * 60000));
        departures[lineColor].push({
          destination: destination.destination,
          minutes: estimate.minutes,
          departureTime: formatLastUpdated(departureTime),
          actualDepartureTime: departureTime, // Store actual Date object for sorting
          length: estimate.length,
          direction: estimate.direction,
        });
      }
    }
  }

  // Sort each line's departures by time
  for (const line in departures) {
    departures[line].sort((a, b) => a.actualDepartureTime - b.actualDepartureTime);
  }

  return departures;
}

function formatLastUpdated(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : (hours > 12 ? hours % 12 : hours);
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

function filterRoutesByDirection(departures, latitude, longitude) {
  const isEast = isEastOfSFBorder(latitude, longitude);
  const filteredDepartures = {};

  // Get all trains and their line colors
  const allTrains = [];
  for (const [color, trains] of Object.entries(departures)) {
    for (const train of trains) {
      // Determine if the train is eastbound based on its direction
      const isTrainEastbound = train.direction === "South" || train.direction === "East";
      
      // Only add trains going in the correct direction based on location
      if ((isEast && isTrainEastbound) || (!isEast && !isTrainEastbound)) {
        allTrains.push({...train, lineColor: color});
      }
    }
  }

  // Sort all trains by departure time
  allTrains.sort((a, b) => a.actualDepartureTime - b.actualDepartureTime);

  // Reorganize back into line colors
  for (const train of allTrains) {
    const color = train.lineColor;
    if (!filteredDepartures[color]) {
      filteredDepartures[color] = [];
    }
    filteredDepartures[color].push(train);
  }

  return filteredDepartures;
}

// Helper function to format distance and walking time
function formatDistanceAndTime(distanceKm) {
  const distanceMiles = distanceKm * 0.621371; // Convert km to miles
  const walkingTimeMinutes = Math.round(distanceKm * 12); // Assume 5km/h walking speed (12 min per km)
  return {
    distance: `${distanceMiles.toFixed(1)} mi`,
    walkingTime: `${walkingTimeMinutes} min walk`
  };
}

// Store and retrieve last known location
function storeLastLocation(location) {
  const locationData = {
    latitude: location.latitude,
    longitude: location.longitude,
    timestamp: new Date().getTime()
  };
  Keychain.set('lastKnownLocation', JSON.stringify(locationData));
}

function getLastLocation() {
  try {
    const locationData = Keychain.get('lastKnownLocation');
    if (locationData) {
      return JSON.parse(locationData);
    }
  } catch (error) {
    console.log('Error retrieving last location:', error);
  }
  return null;
}

// Create widget
async function createWidget(closest, location) {
  const w = new ListWidget();
  w.backgroundColor = ColorScheme.background;

  // Set refresh interval
  const refreshDate = new Date();
  refreshDate.setMinutes(refreshDate.getMinutes() + REFRESH_INTERVAL_MINUTES);
  w.refreshAfterDate = refreshDate;

  // Station header
  const header = w.addText("Nearest BART Station");
  header.textColor = ColorScheme.headerText;
  header.font = Font.boldSystemFont(16);

  w.addSpacer(4);

  const stationName = w.addText(closest.station.name);
  stationName.textColor = ColorScheme.primaryText;
  stationName.font = Font.systemFont(14);

  const distanceInfo = formatDistanceAndTime(closest.distance);
  const distanceStack = w.addStack();
  distanceStack.spacing = 4;

  const distanceText = distanceStack.addText(distanceInfo.distance);
  distanceText.textColor = ColorScheme.accentBlue;
  distanceText.font = Font.systemFont(12);

  const bulletPoint = distanceStack.addText("•");
  bulletPoint.textColor = ColorScheme.secondaryText;
  bulletPoint.font = Font.systemFont(12);

  const walkingText = distanceStack.addText(distanceInfo.walkingTime);
  walkingText.textColor = ColorScheme.secondaryText;
  walkingText.font = Font.systemFont(12);

  // Direction indicator
  const distanceFromSF = calculateDistanceFromSF(
    location.latitude,
    location.longitude
  );

  w.addSpacer(8);

  // Get real-time departures
  const etd = await getStationDepartures(closest.station);
  const allDepartures = formatDepartures(etd);
  const departures = filterRoutesByDirection(
    allDepartures,
    location.latitude,
    location.longitude
  );

  let hasTrains = false;
  for (const [color, trains] of Object.entries(departures)) {
    if (trains.length > 0) {
      hasTrains = true;
      const lineStack = w.addStack();
      lineStack.spacing = 4;

      // Line indicator with direction
      const isEastbound = color.endsWith("E");
      const indicator = lineStack.addText(isEastbound ? "→●" : "●←");
      indicator.textColor = Color.dynamic(
        ColorScheme.lines[color].light,
        ColorScheme.lines[color].dark
      );
      indicator.font = Font.boldSystemFont(12);

      // Next train info
      const nextTrain = trains[0];
      const trainInfo = lineStack.addText(
        `${nextTrain.destination}: ${nextTrain.minutes === "0" || Number.isNaN(nextTrain.minutes) ? "Leaving Now" : `${nextTrain.minutes} min (${nextTrain.departureTime})`}`
      );
      trainInfo.textColor = ColorScheme.primaryText;
      trainInfo.font = Font.systemFont(12);

      if (trains.length > 1) {
        const nextTrains = lineStack.addText(
          ` +${trains
            .slice(1, 3)
            .map((t) => t.departureTime)
            .join(", ")}`
        );
        nextTrains.textColor = ColorScheme.secondaryText;
        nextTrains.font = Font.systemFont(10);
      }

      w.addSpacer(2);
    }
  }

  // Show message if no trains in desired direction
  if (!hasTrains) {
    const noTrains = w.addText(
      'No trains at this time'
    );
    noTrains.textColor = ColorScheme.secondaryText;
    noTrains.font = Font.systemFont(12);
  }

  // Add last updated timestamp
  w.addSpacer(4);
  const footer = w.addStack();
  footer.centerAlignContent();

  const updateIcon = footer.addImage(SFSymbol.named("clock").image);
  updateIcon.imageSize = new Size(10, 10);
  updateIcon.tintColor = ColorScheme.secondaryText;

  footer.addSpacer(2);

  const now = new Date();
  const timestamp = footer.addText(
    `Last Updated ${formatLastUpdated(now)}`
  );
  timestamp.textColor = ColorScheme.secondaryText;
  timestamp.font = Font.systemFont(10);

  return w;
}

// Modify table view
async function createTable(closest, location) {
  const table = new UITable();
  table.showSeparators = true;

  // Station info
  const header = new UITableRow();
  header.addText("Nearest BART Station");
  header.isHeader = true;
  table.addRow(header);

  const stationRow = new UITableRow();
  const distanceInfo = formatDistanceAndTime(closest.distance);
  stationRow.addText(closest.station.name);
  stationRow.addText(`${distanceInfo.distance} (${distanceInfo.walkingTime})`);
  table.addRow(stationRow);

  const addressRow = new UITableRow();
  addressRow.addText(closest.station.address);
  table.addRow(addressRow);

  // Calculate distance from SF for direction determination (but don't display)
  const distanceFromSF = calculateDistanceFromSF(
    location.latitude,
    location.longitude
  );

  // Last updated timestamp
  const now = new Date();
  const updateRow = new UITableRow();
  updateRow.backgroundColor = ColorScheme.rowBackground;
  updateRow.addText(
    `Last Updated: ${formatLastUpdated(now)}`
  );
  table.addRow(updateRow);

  // Departures
  const etd = await getStationDepartures(closest.station);
  const allDepartures = formatDepartures(etd);
  const departures = filterRoutesByDirection(
    allDepartures,
    location.latitude,
    location.longitude
  );

  // Add section for each line color
  let hasTrains = false;
  for (const [color, trains] of Object.entries(departures)) {
    if (trains.length > 0) {
      hasTrains = true;
      const lineHeader = new UITableRow();
      const isEastbound = color.endsWith("E");
      const lineName = color.slice(0, -1); // Remove E/W suffix
      lineHeader.addText(`${lineName} Line`);
      lineHeader.backgroundColor = ColorScheme.rowBackground;
      table.addRow(lineHeader);

      for (const train of trains.slice(0, 3)) {
        const trainRow = new UITableRow();
        trainRow.addText(train.destination);
        trainRow.addText(train === trains[0] ? 
          (train.minutes === "0" || Number.isNaN(nextTrain.minutes) ? "Leaving Now" : `${train.minutes} min (${train.departureTime})`) 
          : train.departureTime);
        trainRow.addText(`${train.length} car`);
        trainRow.addText(train.direction);
        table.addRow(trainRow);
      }
    }
  }

  // Show message if no trains in desired direction
  if (!hasTrains) {
    const noTrainsRow = new UITableRow();
    noTrainsRow.addText('No trains at this time');
    noTrainsRow.textColor = Color.gray;
    table.addRow(noTrainsRow);
  }

  return table;
}

// Create error widget
function createErrorWidget() {
  const widget = new ListWidget();
  widget.backgroundColor = ColorScheme.background;
  
  const stack = widget.addStack();
  stack.centerAlignContent();
  
  const errorSymbol = stack.addImage(SFSymbol.named("location.slash").image);
  errorSymbol.imageSize = new Size(20, 20);
  errorSymbol.tintColor = ColorScheme.secondaryText;
  
  stack.addSpacer(4);
  
  const text = stack.addText("Waiting for location");
  text.textColor = ColorScheme.primaryText;
  text.font = Font.systemFont(12);
  
  widget.addSpacer(4);
  
  const hint = widget.addText("Widget will update when location is available");
  hint.textColor = ColorScheme.secondaryText;
  hint.font = Font.systemFont(10);
  
  // Set refresh interval to try again soon
  const refreshDate = new Date();
  refreshDate.setMinutes(refreshDate.getMinutes() + 1);
  widget.refreshAfterDate = refreshDate;
  
  return widget;
}

// Main execution
async function run() {
  if (config.runsInWidget) {
    try {
      // First try to get current location
      let location;
      try {
        location = await Location.current();
        storeLastLocation(location);
      } catch (error) {
        console.log('Error getting current location:', error);
        location = getLastLocation();
        if (!location) {
          throw new Error('No location available');
        }
      }

      // Then try to get station data
      try {
        const closest = await findClosestStation(location);
        const widget = await createWidget(closest, location);
        if (location === getLastLocation()) {
          // Add cached location note
          const footer = widget.addStack();
          footer.centerAlignContent();
          const cacheNote = footer.addText('Using last known location');
          cacheNote.textColor = ColorScheme.secondaryText;
          cacheNote.font = Font.systemFont(8);
        }
        Script.setWidget(widget);
      } catch (error) {
        console.log('Error creating widget:', error);
        const errorWidget = new ListWidget();
        errorWidget.backgroundColor = ColorScheme.background;
        
        const stack = errorWidget.addStack();
        stack.centerAlignContent();
        
        const errorSymbol = stack.addImage(SFSymbol.named('exclamationmark.triangle').image);
        errorSymbol.imageSize = new Size(20, 20);
        errorSymbol.tintColor = ColorScheme.secondaryText;
        
        stack.addSpacer(4);
        
        const text = stack.addText('BART API Error');
        text.textColor = ColorScheme.primaryText;
        text.font = Font.systemFont(12);
        
        errorWidget.addSpacer(4);
        
        const hint = errorWidget.addText('Please check your API key and internet connection');
        hint.textColor = ColorScheme.secondaryText;
        hint.font = Font.systemFont(10);
        
        Script.setWidget(errorWidget);
      }
    } catch (error) {
      console.log('Widget error:', error);
      const errorWidget = createErrorWidget();
      Script.setWidget(errorWidget);
    }
  } else {
    try {
      // First try to get current location
      let location;
      try {
        location = await Location.current();
        storeLastLocation(location);
      } catch (error) {
        console.log('Error getting current location:', error);
        location = getLastLocation();
        if (!location) {
          throw new Error('No location available');
        }
      }

      // Then try to get station data
      try {
        const closest = await findClosestStation(location);
        const table = await createTable(closest, location);
        if (location === getLastLocation()) {
          // Add cached location note
          const cacheRow = new UITableRow();
          cacheRow.backgroundColor = ColorScheme.rowBackground;
          cacheRow.addText('Using last known location');
          table.addRow(cacheRow);
        }
        await QuickLook.present(table);
      } catch (error) {
        console.log('Error creating table:', error);
        const alert = new Alert();
        alert.title = 'BART API Error';
        alert.message = 'Please check your API key and internet connection';
        alert.addAction('OK');
        await alert.presentAlert();
      }
    } catch (error) {
      console.log('Table view error:', error);
      const alert = new Alert();
      alert.title = 'Location Not Available';
      alert.message = 'Please make sure location services are enabled for Scriptable.';
      alert.addAction('OK');
      await alert.presentAlert();
    }
  }
}

await run();
Script.complete();
