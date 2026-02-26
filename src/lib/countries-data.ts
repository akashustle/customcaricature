// International countries with major states/regions and cities
export type CountryData = {
  states: Record<string, string[]>;
};

export const COUNTRIES_DATA: Record<string, CountryData> = {
  "United States": {
    states: {
      "California": ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento"],
      "New York": ["New York City", "Buffalo", "Rochester", "Albany"],
      "Texas": ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth"],
      "Florida": ["Miami", "Orlando", "Tampa", "Jacksonville"],
      "Illinois": ["Chicago", "Springfield", "Naperville"],
      "Pennsylvania": ["Philadelphia", "Pittsburgh", "Allentown"],
      "Ohio": ["Columbus", "Cleveland", "Cincinnati"],
      "Georgia": ["Atlanta", "Savannah", "Augusta"],
      "Michigan": ["Detroit", "Grand Rapids", "Ann Arbor"],
      "New Jersey": ["Newark", "Jersey City", "Trenton"],
      "Virginia": ["Virginia Beach", "Richmond", "Norfolk"],
      "Washington": ["Seattle", "Spokane", "Tacoma"],
      "Massachusetts": ["Boston", "Worcester", "Cambridge"],
      "Arizona": ["Phoenix", "Tucson", "Mesa"],
      "Colorado": ["Denver", "Colorado Springs", "Aurora"],
      "Tennessee": ["Nashville", "Memphis", "Knoxville"],
      "Maryland": ["Baltimore", "Annapolis", "Rockville"],
      "Minnesota": ["Minneapolis", "Saint Paul", "Rochester"],
      "Wisconsin": ["Milwaukee", "Madison", "Green Bay"],
      "Oregon": ["Portland", "Salem", "Eugene"],
      "Nevada": ["Las Vegas", "Reno", "Henderson"],
      "Connecticut": ["Hartford", "New Haven", "Stamford"],
      "North Carolina": ["Charlotte", "Raleigh", "Durham"],
    },
  },
  "United Kingdom": {
    states: {
      "England": ["London", "Manchester", "Birmingham", "Liverpool", "Leeds", "Bristol", "Oxford", "Cambridge"],
      "Scotland": ["Edinburgh", "Glasgow", "Aberdeen", "Dundee"],
      "Wales": ["Cardiff", "Swansea", "Newport"],
      "Northern Ireland": ["Belfast", "Derry", "Lisburn"],
    },
  },
  "United Arab Emirates": {
    states: {
      "Dubai": ["Dubai"],
      "Abu Dhabi": ["Abu Dhabi", "Al Ain"],
      "Sharjah": ["Sharjah"],
      "Ajman": ["Ajman"],
      "Ras Al Khaimah": ["Ras Al Khaimah"],
      "Fujairah": ["Fujairah"],
      "Umm Al Quwain": ["Umm Al Quwain"],
    },
  },
  "Canada": {
    states: {
      "Ontario": ["Toronto", "Ottawa", "Mississauga", "Hamilton"],
      "British Columbia": ["Vancouver", "Victoria", "Surrey"],
      "Quebec": ["Montreal", "Quebec City", "Laval"],
      "Alberta": ["Calgary", "Edmonton", "Red Deer"],
      "Manitoba": ["Winnipeg", "Brandon"],
      "Saskatchewan": ["Saskatoon", "Regina"],
      "Nova Scotia": ["Halifax"],
      "New Brunswick": ["Fredericton", "Saint John"],
    },
  },
  "Australia": {
    states: {
      "New South Wales": ["Sydney", "Newcastle", "Wollongong"],
      "Victoria": ["Melbourne", "Geelong", "Ballarat"],
      "Queensland": ["Brisbane", "Gold Coast", "Cairns"],
      "Western Australia": ["Perth", "Fremantle"],
      "South Australia": ["Adelaide"],
      "Tasmania": ["Hobart", "Launceston"],
      "ACT": ["Canberra"],
    },
  },
  "Singapore": {
    states: {
      "Singapore": ["Singapore"],
    },
  },
  "Saudi Arabia": {
    states: {
      "Riyadh": ["Riyadh"],
      "Makkah": ["Makkah", "Jeddah", "Taif"],
      "Madinah": ["Madinah"],
      "Eastern Province": ["Dammam", "Dhahran", "Khobar"],
    },
  },
  "Qatar": {
    states: {
      "Doha": ["Doha"],
      "Al Wakrah": ["Al Wakrah"],
      "Al Rayyan": ["Al Rayyan"],
    },
  },
  "Kuwait": {
    states: {
      "Al Asimah": ["Kuwait City"],
      "Hawalli": ["Hawalli"],
      "Farwaniya": ["Farwaniya"],
    },
  },
  "Bahrain": {
    states: {
      "Capital": ["Manama"],
      "Muharraq": ["Muharraq"],
    },
  },
  "Oman": {
    states: {
      "Muscat": ["Muscat"],
      "Dhofar": ["Salalah"],
    },
  },
  "Germany": {
    states: {
      "Bavaria": ["Munich", "Nuremberg", "Augsburg"],
      "Berlin": ["Berlin"],
      "Hamburg": ["Hamburg"],
      "Hesse": ["Frankfurt", "Wiesbaden"],
      "North Rhine-Westphalia": ["Cologne", "Düsseldorf", "Dortmund", "Essen"],
      "Baden-Württemberg": ["Stuttgart", "Heidelberg", "Freiburg"],
    },
  },
  "France": {
    states: {
      "Île-de-France": ["Paris", "Versailles"],
      "Provence-Alpes-Côte d'Azur": ["Marseille", "Nice", "Cannes"],
      "Auvergne-Rhône-Alpes": ["Lyon", "Grenoble"],
      "Nouvelle-Aquitaine": ["Bordeaux"],
      "Occitanie": ["Toulouse", "Montpellier"],
    },
  },
  "Japan": {
    states: {
      "Tokyo": ["Tokyo"],
      "Osaka": ["Osaka"],
      "Kyoto": ["Kyoto"],
      "Hokkaido": ["Sapporo"],
      "Kanagawa": ["Yokohama"],
      "Aichi": ["Nagoya"],
    },
  },
  "South Korea": {
    states: {
      "Seoul": ["Seoul"],
      "Busan": ["Busan"],
      "Incheon": ["Incheon"],
      "Gyeonggi": ["Suwon", "Seongnam"],
    },
  },
  "Thailand": {
    states: {
      "Bangkok": ["Bangkok"],
      "Chiang Mai": ["Chiang Mai"],
      "Phuket": ["Phuket"],
      "Pattaya": ["Pattaya"],
    },
  },
  "Malaysia": {
    states: {
      "Kuala Lumpur": ["Kuala Lumpur"],
      "Selangor": ["Shah Alam", "Petaling Jaya"],
      "Penang": ["George Town"],
      "Johor": ["Johor Bahru"],
    },
  },
  "Indonesia": {
    states: {
      "Jakarta": ["Jakarta"],
      "Bali": ["Denpasar", "Ubud"],
      "West Java": ["Bandung"],
      "East Java": ["Surabaya"],
    },
  },
  "South Africa": {
    states: {
      "Gauteng": ["Johannesburg", "Pretoria"],
      "Western Cape": ["Cape Town"],
      "KwaZulu-Natal": ["Durban"],
    },
  },
  "Nigeria": {
    states: {
      "Lagos": ["Lagos"],
      "Abuja": ["Abuja"],
      "Rivers": ["Port Harcourt"],
    },
  },
  "Kenya": {
    states: {
      "Nairobi": ["Nairobi"],
      "Mombasa": ["Mombasa"],
    },
  },
  "New Zealand": {
    states: {
      "Auckland": ["Auckland"],
      "Wellington": ["Wellington"],
      "Canterbury": ["Christchurch"],
    },
  },
  "Sri Lanka": {
    states: {
      "Western Province": ["Colombo", "Negombo"],
      "Central Province": ["Kandy"],
      "Southern Province": ["Galle"],
    },
  },
  "Nepal": {
    states: {
      "Bagmati": ["Kathmandu", "Lalitpur"],
      "Gandaki": ["Pokhara"],
    },
  },
  "Bangladesh": {
    states: {
      "Dhaka Division": ["Dhaka"],
      "Chittagong Division": ["Chittagong"],
      "Sylhet Division": ["Sylhet"],
    },
  },
  "Pakistan": {
    states: {
      "Sindh": ["Karachi", "Hyderabad"],
      "Punjab": ["Lahore", "Rawalpindi", "Faisalabad"],
      "Islamabad Capital": ["Islamabad"],
      "Khyber Pakhtunkhwa": ["Peshawar"],
    },
  },
  "Philippines": {
    states: {
      "Metro Manila": ["Manila", "Quezon City", "Makati"],
      "Cebu": ["Cebu City"],
      "Davao": ["Davao City"],
    },
  },
  "Vietnam": {
    states: {
      "Ho Chi Minh City": ["Ho Chi Minh City"],
      "Hanoi": ["Hanoi"],
      "Da Nang": ["Da Nang"],
    },
  },
  "Turkey": {
    states: {
      "Istanbul": ["Istanbul"],
      "Ankara": ["Ankara"],
      "Izmir": ["Izmir"],
      "Antalya": ["Antalya"],
    },
  },
  "Egypt": {
    states: {
      "Cairo": ["Cairo"],
      "Alexandria": ["Alexandria"],
      "Giza": ["Giza"],
    },
  },
  "Italy": {
    states: {
      "Lazio": ["Rome"],
      "Lombardy": ["Milan"],
      "Veneto": ["Venice"],
      "Tuscany": ["Florence"],
      "Campania": ["Naples"],
    },
  },
  "Spain": {
    states: {
      "Madrid": ["Madrid"],
      "Catalonia": ["Barcelona"],
      "Andalusia": ["Seville", "Malaga"],
      "Valencia": ["Valencia"],
    },
  },
  "Netherlands": {
    states: {
      "North Holland": ["Amsterdam"],
      "South Holland": ["Rotterdam", "The Hague"],
      "Utrecht": ["Utrecht"],
    },
  },
  "Switzerland": {
    states: {
      "Zurich": ["Zurich"],
      "Geneva": ["Geneva"],
      "Bern": ["Bern"],
    },
  },
  "Sweden": {
    states: {
      "Stockholm": ["Stockholm"],
      "Västra Götaland": ["Gothenburg"],
      "Skåne": ["Malmö"],
    },
  },
  "Ireland": {
    states: {
      "Leinster": ["Dublin"],
      "Munster": ["Cork", "Limerick"],
    },
  },
  "China": {
    states: {
      "Beijing": ["Beijing"],
      "Shanghai": ["Shanghai"],
      "Guangdong": ["Guangzhou", "Shenzhen"],
      "Zhejiang": ["Hangzhou"],
      "Sichuan": ["Chengdu"],
    },
  },
  "Brazil": {
    states: {
      "São Paulo": ["São Paulo"],
      "Rio de Janeiro": ["Rio de Janeiro"],
      "Minas Gerais": ["Belo Horizonte"],
    },
  },
  "Mexico": {
    states: {
      "Mexico City": ["Mexico City"],
      "Jalisco": ["Guadalajara"],
      "Nuevo León": ["Monterrey"],
    },
  },
  "Russia": {
    states: {
      "Moscow": ["Moscow"],
      "Saint Petersburg": ["Saint Petersburg"],
    },
  },
  "Maldives": {
    states: {
      "Malé": ["Malé"],
    },
  },
  "Mauritius": {
    states: {
      "Port Louis": ["Port Louis"],
    },
  },
  "Fiji": {
    states: {
      "Central": ["Suva"],
      "Western": ["Nadi"],
    },
  },
};

export const getCountries = (): string[] => {
  return Object.keys(COUNTRIES_DATA).sort();
};

export const getCountryStates = (country: string): string[] => {
  return Object.keys(COUNTRIES_DATA[country]?.states || {}).sort();
};

export const getCountryCities = (country: string, state: string): string[] => {
  return COUNTRIES_DATA[country]?.states[state] || [];
};
