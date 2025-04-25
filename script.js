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
 *    - Within 7 miles of SF: Shows westbound trains
 *    - East of SF: Shows eastbound trains
 *    - West of SF: Shows westbound trains
 * 3. Updates every 2 minutes with fresh departure times
 *
 * DISPLAY INFORMATION
 * - Station name and distance from your location
 * - Train line colors with direction arrows (→● or ●←)
 * - Next departure times for each line
 * - Distance from San Francisco
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
const BART_API_KEY = "YOUR_API_KEY"; // Get your key from https://www.bart.gov/schedules/developers/api
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
  const url = `${BART_API_BASE}/stn.aspx?cmd=stns&key=${BART_API_KEY}&json=y`;
  const req = new Request(url);
  const json = await req.loadJSON();
  return json.root.stations.station;
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
  const url = `${BART_API_BASE}/etd.aspx?cmd=etd&orig=${station.abbr}&key=${BART_API_KEY}&json=y`;
  const req = new Request(url);
  const json = await req.loadJSON();
  return json.root.station[0].etd;
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

  for (const destination of etd) {
    for (const estimate of destination.estimate) {
      const lineColor = getLineColor(
        destination.abbreviation,
        estimate.direction
      );
      if (lineColor in departures) {
        departures[lineColor].push({
          destination: destination.destination,
          minutes: estimate.minutes,
          length: estimate.length,
          direction: estimate.direction,
        });
      }
    }
  }

  return departures;
}

function formatLastUpdated(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

function filterRoutesByDirection(departures, latitude, longitude) {
  const isEast = isEastOfSFBorder(latitude, longitude);
  const filteredDepartures = {};

  for (const [color, trains] of Object.entries(departures)) {
    filteredDepartures[color] = trains.filter((train) => {
      const isEastbound =
        train.direction === "South" || train.direction === "East";
      return isEast ? isEastbound : !isEastbound;
    });
  }

  return filteredDepartures;
}

// Get current location and find closest station
const currentLocation = await Location.current();
const closest = await findClosestStation(currentLocation);

// Create widget
async function createWidget(closest) {
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

  const distance = w.addText(`${closest.distance.toFixed(1)} km away`);
  distance.textColor = ColorScheme.accentBlue;
  distance.font = Font.systemFont(12);

  // Direction indicator with distance from SF
  const distanceFromSF = calculateDistanceFromSF(
    currentLocation.latitude,
    currentLocation.longitude
  );
  const direction = isEastOfSFBorder(
    currentLocation.latitude,
    currentLocation.longitude
  )
    ? "Eastbound"
    : "Westbound";
  const directionText = w.addText(
    `${direction} (${distanceFromSF.toFixed(1)} mi from SF)`
  );
  directionText.textColor = ColorScheme.accentBlue;
  directionText.font = Font.systemFont(12);

  w.addSpacer(8);

  // Get real-time departures
  const etd = await getStationDepartures(closest.station);
  const allDepartures = formatDepartures(etd);
  const departures = filterRoutesByDirection(
    allDepartures,
    currentLocation.latitude,
    currentLocation.longitude
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
        `${nextTrain.destination}: ${nextTrain.minutes} min`
      );
      trainInfo.textColor = ColorScheme.primaryText;
      trainInfo.font = Font.systemFont(12);

      if (trains.length > 1) {
        const nextTrains = lineStack.addText(
          ` +${trains
            .slice(1, 3)
            .map((t) => t.minutes)
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
      `No ${direction.toLowerCase()} trains at this time`
    );
    noTrains.textColor = ColorScheme.secondaryText;
    noTrains.font = Font.systemFont(12);
  }

  // Add last updated timestamp
  w.addSpacer(4);
  const footer = w.addStack();
  footer.centerAlignContent();

  const updateIcon = footer.addImage(SFSymbol.named("arrow.clockwise").image);
  updateIcon.imageSize = new Size(10, 10);
  updateIcon.tintColor = ColorScheme.secondaryText;

  footer.addSpacer(2);

  const now = new Date();
  const nextUpdate = new Date(now.getTime() + REFRESH_INTERVAL_MINUTES * 60000);
  const timestamp = footer.addText(
    `Updated ${formatLastUpdated(now)} (next: ${formatLastUpdated(nextUpdate)})`
  );
  timestamp.textColor = ColorScheme.secondaryText;
  timestamp.font = Font.systemFont(10);

  return w;
}

// Modify table view
async function createTable(closest) {
  const table = new UITable();
  table.showSeparators = true;

  // Station info
  const header = new UITableRow();
  header.addText("Nearest BART Station");
  header.isHeader = true;
  table.addRow(header);

  const stationRow = new UITableRow();
  stationRow.addText(closest.station.name);
  stationRow.addText(`${closest.distance.toFixed(1)} km`);
  table.addRow(stationRow);

  const addressRow = new UITableRow();
  addressRow.addText(closest.station.address);
  table.addRow(addressRow);

  // Direction indicator with SF distance
  const distanceFromSF = calculateDistanceFromSF(
    currentLocation.latitude,
    currentLocation.longitude
  );
  const direction = isEastOfSFBorder(
    currentLocation.latitude,
    currentLocation.longitude
  )
    ? "Eastbound"
    : "Westbound";
  const directionRow = new UITableRow();
  directionRow.backgroundColor = ColorScheme.rowBackground;
  directionRow.addText(
    `${direction} (${distanceFromSF.toFixed(1)} mi from SF)`
  );
  table.addRow(directionRow);

  // Last updated timestamp
  const now = new Date();
  const nextUpdate = new Date(now.getTime() + REFRESH_INTERVAL_MINUTES * 60000);
  const updateRow = new UITableRow();
  updateRow.backgroundColor = ColorScheme.rowBackground;
  updateRow.addText(
    `Last Updated: ${formatLastUpdated(
      now
    )}\nNext update in ${REFRESH_INTERVAL_MINUTES} minutes (${formatLastUpdated(
      nextUpdate
    )})`
  );
  table.addRow(updateRow);

  // Departures
  const etd = await getStationDepartures(closest.station);
  const allDepartures = formatDepartures(etd);
  const departures = filterRoutesByDirection(
    allDepartures,
    currentLocation.latitude,
    currentLocation.longitude
  );

  // Add section for each line color
  let hasTrains = false;
  for (const [color, trains] of Object.entries(departures)) {
    if (trains.length > 0) {
      hasTrains = true;
      const lineHeader = new UITableRow();
      const isEastbound = color.endsWith("E");
      const direction = isEastbound ? "Eastbound" : "Westbound";
      const lineName = color.slice(0, -1); // Remove E/W suffix
      lineHeader.addText(`${lineName} Line (${direction})`);
      lineHeader.backgroundColor = ColorScheme.rowBackground;
      table.addRow(lineHeader);

      for (const train of trains.slice(0, 3)) {
        const trainRow = new UITableRow();
        trainRow.addText(train.destination);
        trainRow.addText(`${train.minutes} min`);
        trainRow.addText(`${train.length} car`);
        trainRow.addText(train.direction);
        table.addRow(trainRow);
      }
    }
  }

  // Show message if no trains in desired direction
  if (!hasTrains) {
    const noTrainsRow = new UITableRow();
    noTrainsRow.addText(`No ${direction.toLowerCase()} trains at this time`);
    noTrainsRow.textColor = Color.gray;
    table.addRow(noTrainsRow);
  }

  return table;
}

// Modify the main execution
if (config.runsInWidget) {
  const widget = await createWidget(closest);
  Script.setWidget(widget);
} else {
  const table = await createTable(closest);
  await QuickLook.present(table);
}

Script.complete();
