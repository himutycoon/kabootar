// Indian cities for city autocomplete — expanded list
export const INDIAN_CITIES = [
  // Metro / major
  "Ahmedabad","Amritsar","Aurangabad","Bangalore","Bhopal",
  "Bhubaneswar","Chandigarh","Chennai","Coimbatore","Delhi",
  "Faridabad","Ghaziabad","Goa","Gurgaon","Guwahati",
  "Hyderabad","Indore","Jaipur","Jalandhar","Jammu",
  "Jodhpur","Kanpur","Kochi","Kolkata","Kozhikode",
  "Lucknow","Ludhiana","Madurai","Mangalore","Meerut",
  "Mumbai","Mysore","Nagpur","Nashik","Noida",
  "Patna","Prayagraj","Pune","Raipur","Rajkot",
  "Ranchi","Srinagar","Surat","Thane","Thiruvananthapuram",
  "Tiruchirappalli","Udaipur","Vadodara","Varanasi",
  "Vijayawada","Visakhapatnam","Agra","Dehradun",
  // Bihar
  "Darbhanga","Muzaffarpur","Gaya","Bhagalpur","Hajipur",
  "Begusarai","Samastipur","Sitamarhi","Madhubani","Motihari",
  "Purnia","Siwan","Chapra","Munger","Nalanda",
  "Nawada","Buxar","Arrah","Supaul","Katihar","Araria",
  "Jehanabad","Kishanganj","Forbesganj",
  // Jharkhand
  "Jamshedpur","Dhanbad","Bokaro",
  // Uttar Pradesh
  "Agra","Aligarh","Bareilly","Gorakhpur","Mathura",
  // Rajasthan
  "Ajmer","Bikaner","Kota",
  // MP / Chhattisgarh
  "Gwalior","Jabalpur","Bilaspur","Bhilai",
  // Gujarat
  "Anand","Gandhinagar","Junagadh","Mehsana",
  // Punjab / Haryana
  "Ambala","Hisar","Karnal","Patiala","Rohtak",
  // Karnataka
  "Belgaum","Gulbarga","Hubli","Mangalore","Mysore",
  // AP / Telangana
  "Guntur","Kakinada","Nellore","Tirupati","Warangal",
  // Maharashtra
  "Kolhapur","Latur","Nanded","Solapur",
  // TN / Kerala
  "Salem","Tiruvallur","Palakkad","Thrissur",
  // Odisha
  "Cuttack","Rourkela",
  // WB / Assam
  "Siliguri","Asansol","Durgapur","Dibrugarh","Silchar",
  // North-East
  "Aizawl","Imphal","Itanagar","Kohima","Shillong",
  // HP / Uttarakhand
  "Haridwar","Rishikesh","Shimla","Dharamshala",
  // J&K / Ladakh
  "Leh","Kargil",
].sort();

// Deduplicate
const unique = [...new Set(INDIAN_CITIES)].sort();
INDIAN_CITIES.length = 0;
INDIAN_CITIES.push(...unique);

// Generic prefix-then-contains matcher over any city list (used for both the
// full INDIAN_CITIES list and an admin-restricted allowed-cities list)
export function filterFromList(query, list) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  const starts = list.filter(c => c.toLowerCase().startsWith(q));
  const contains = list.filter(c => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, 8);
}

export function filterCities(query) {
  return filterFromList(query, INDIAN_CITIES);
}

export function isValidCity(value, list = INDIAN_CITIES) {
  if (!value) return false;
  return list.some(c => c.toLowerCase() === value.toLowerCase());
}

// Popular cities shown when input is focused but empty
export const POPULAR_CITIES_TOP = [
  'Delhi','Mumbai','Patna','Kolkata','Lucknow',
  'Bangalore','Hyderabad','Chennai','Darbhanga','Muzaffarpur',
];
