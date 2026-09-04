/**
 * Country → State/Province → Cities for preferred future locations.
 * Keyed by ISO country code from the identity country dropdown.
 * Phase 2 can replace this with a DB/API source.
 */
export const LOCATION_HIERARCHY = {
  US: {
    Alabama: ['Birmingham', 'Huntsville', 'Mobile', 'Montgomery'],
    Alaska: ['Anchorage', 'Fairbanks', 'Juneau'],
    Arizona: ['Chandler', 'Mesa', 'Phoenix', 'Scottsdale', 'Tucson'],
    Arkansas: ['Fayetteville', 'Fort Smith', 'Little Rock'],
    California: ['Los Angeles', 'Sacramento', 'San Diego', 'San Francisco', 'San Jose'],
    Colorado: ['Aurora', 'Colorado Springs', 'Denver', 'Fort Collins'],
    Connecticut: ['Bridgeport', 'Hartford', 'New Haven', 'Stamford'],
    Delaware: ['Dover', 'Newark', 'Wilmington'],
    Florida: ['Jacksonville', 'Miami', 'Orlando', 'Tampa'],
    Georgia: ['Atlanta', 'Augusta', 'Columbus', 'Savannah'],
    Hawaii: ['Hilo', 'Honolulu', 'Kailua'],
    Idaho: ['Boise', 'Idaho Falls', 'Meridian'],
    Illinois: ['Chicago', 'Naperville', 'Peoria', 'Springfield'],
    Indiana: ['Evansville', 'Fort Wayne', 'Indianapolis'],
    Iowa: ['Cedar Rapids', 'Des Moines', 'Iowa City'],
    Kansas: ['Kansas City', 'Overland Park', 'Topeka', 'Wichita'],
    Kentucky: ['Lexington', 'Louisville'],
    Louisiana: ['Baton Rouge', 'New Orleans', 'Shreveport'],
    Maine: ['Augusta', 'Bangor', 'Portland'],
    Maryland: ['Baltimore', 'Frederick', 'Rockville'],
    Massachusetts: ['Boston', 'Cambridge', 'Springfield', 'Worcester'],
    Michigan: ['Ann Arbor', 'Detroit', 'Grand Rapids', 'Lansing'],
    Minnesota: ['Minneapolis', 'Saint Paul', 'Rochester'],
    Mississippi: ['Biloxi', 'Jackson'],
    Missouri: ['Columbia', 'Kansas City', 'Saint Louis', 'Springfield'],
    Montana: ['Billings', 'Bozeman', 'Missoula'],
    Nebraska: ['Lincoln', 'Omaha'],
    Nevada: ['Henderson', 'Las Vegas', 'Reno'],
    'New Hampshire': ['Concord', 'Manchester', 'Nashua'],
    'New Jersey': ['Jersey City', 'Newark', 'Paterson', 'Trenton'],
    'New Mexico': ['Albuquerque', 'Santa Fe'],
    'New York': ['Albany', 'Buffalo', 'New York City', 'Rochester', 'Syracuse'],
    'North Carolina': ['Charlotte', 'Durham', 'Raleigh', 'Winston Salem'],
    'North Dakota': ['Bismarck', 'Fargo'],
    Ohio: ['Cincinnati', 'Cleveland', 'Columbus', 'Toledo'],
    Oklahoma: ['Norman', 'Oklahoma City', 'Tulsa'],
    Oregon: ['Eugene', 'Portland', 'Salem'],
    Pennsylvania: ['Allentown', 'Philadelphia', 'Pittsburgh'],
    'Rhode Island': ['Providence', 'Warwick'],
    'South Carolina': ['Charleston', 'Columbia', 'Greenville'],
    'South Dakota': ['Rapid City', 'Sioux Falls'],
    Tennessee: ['Chattanooga', 'Knoxville', 'Memphis', 'Nashville'],
    Texas: ['Austin', 'Dallas', 'El Paso', 'Houston', 'San Antonio'],
    Utah: ['Provo', 'Salt Lake City'],
    Vermont: ['Burlington', 'Montpelier'],
    Virginia: ['Alexandria', 'Norfolk', 'Richmond', 'Virginia Beach'],
    Washington: ['Bellevue', 'Seattle', 'Spokane', 'Tacoma'],
    'West Virginia': ['Charleston', 'Huntington'],
    Wisconsin: ['Green Bay', 'Madison', 'Milwaukee'],
    Wyoming: ['Casper', 'Cheyenne'],
    'District of Columbia': ['Washington'],
  },
  CA: {
    Alberta: ['Calgary', 'Edmonton', 'Red Deer'],
    'British Columbia': ['Burnaby', 'Surrey', 'Vancouver', 'Victoria'],
    Manitoba: ['Brandon', 'Winnipeg'],
    'New Brunswick': ['Fredericton', 'Moncton', 'Saint John'],
    'Newfoundland and Labrador': ["St. John's"],
    'Nova Scotia': ['Halifax'],
    Ontario: ['Mississauga', 'Ottawa', 'Toronto'],
    'Prince Edward Island': ['Charlottetown'],
    Quebec: ['Laval', 'Montreal', 'Quebec City'],
    Saskatchewan: ['Regina', 'Saskatoon'],
  },
  GB: {
    England: ['Birmingham', 'Leeds', 'Liverpool', 'London', 'Manchester'],
    Scotland: ['Edinburgh', 'Glasgow'],
    Wales: ['Cardiff', 'Swansea'],
    'Northern Ireland': ['Belfast'],
  },
  IN: {
    Delhi: ['New Delhi'],
    Karnataka: ['Bengaluru', 'Mysuru'],
    Maharashtra: ['Mumbai', 'Pune'],
    'Tamil Nadu': ['Chennai'],
    Telangana: ['Hyderabad'],
  },
  AU: {
    'New South Wales': ['Newcastle', 'Sydney', 'Wollongong'],
    Queensland: ['Brisbane', 'Gold Coast'],
    'South Australia': ['Adelaide'],
    Victoria: ['Geelong', 'Melbourne'],
    'Western Australia': ['Perth'],
  },
}

export function getStatesForCountry(countryCode) {
  const code = String(countryCode || '').trim().toUpperCase()
  const data = LOCATION_HIERARCHY[code]
  if (!data) return []
  return Object.keys(data).sort((a, b) => a.localeCompare(b))
}

export function getCitiesForState(countryCode, stateName) {
  const code = String(countryCode || '').trim().toUpperCase()
  const data = LOCATION_HIERARCHY[code]
  if (!data || !stateName) return []
  const exact = data[stateName]
  if (exact) return [...exact].sort((a, b) => a.localeCompare(b))
  const key = Object.keys(data).find((s) => s.toLowerCase() === String(stateName).toLowerCase())
  return key ? [...data[key]].sort((a, b) => a.localeCompare(b)) : []
}

export function regionLabelForCountry(countryCode) {
  const code = String(countryCode || '').trim().toUpperCase()
  if (code === 'CA') return 'Province'
  if (code === 'GB' || code === 'AU') return 'Region'
  return 'State'
}
