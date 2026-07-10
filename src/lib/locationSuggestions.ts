export type LocationSuggestion = {
  city: string;
  state: string;
  country: string;
  pincode: string;
  aliases?: string[];
};

const LOCATIONS: LocationSuggestion[] = [
  { city: "Bengaluru", state: "Karnataka", country: "India", pincode: "560001", aliases: ["bangalore"] },
  { city: "Peenya", state: "Karnataka", country: "India", pincode: "560058" },
  { city: "Mysuru", state: "Karnataka", country: "India", pincode: "570001", aliases: ["mysore"] },
  { city: "Hubballi", state: "Karnataka", country: "India", pincode: "580020", aliases: ["hubli"] },
  { city: "Mumbai", state: "Maharashtra", country: "India", pincode: "400001" },
  { city: "Pune", state: "Maharashtra", country: "India", pincode: "411001" },
  { city: "Chakan", state: "Maharashtra", country: "India", pincode: "410501" },
  { city: "Nashik", state: "Maharashtra", country: "India", pincode: "422001" },
  { city: "Nagpur", state: "Maharashtra", country: "India", pincode: "440001" },
  { city: "Delhi", state: "Delhi", country: "India", pincode: "110001" },
  { city: "Noida", state: "Uttar Pradesh", country: "India", pincode: "201301" },
  { city: "Ghaziabad", state: "Uttar Pradesh", country: "India", pincode: "201001" },
  { city: "Kanpur", state: "Uttar Pradesh", country: "India", pincode: "208001" },
  { city: "Lucknow", state: "Uttar Pradesh", country: "India", pincode: "226001" },
  { city: "Gurugram", state: "Haryana", country: "India", pincode: "122001", aliases: ["gurgaon"] },
  { city: "Faridabad", state: "Haryana", country: "India", pincode: "121001" },
  { city: "Chennai", state: "Tamil Nadu", country: "India", pincode: "600001" },
  { city: "Coimbatore", state: "Tamil Nadu", country: "India", pincode: "641001" },
  { city: "Hyderabad", state: "Telangana", country: "India", pincode: "500001" },
  { city: "Ahmedabad", state: "Gujarat", country: "India", pincode: "380001" },
  { city: "Vatva", state: "Gujarat", country: "India", pincode: "382445" },
  { city: "Surat", state: "Gujarat", country: "India", pincode: "395003" },
  { city: "Vadodara", state: "Gujarat", country: "India", pincode: "390001" },
  { city: "Rajkot", state: "Gujarat", country: "India", pincode: "360001" },
  { city: "Kolkata", state: "West Bengal", country: "India", pincode: "700001" },
  { city: "Jaipur", state: "Rajasthan", country: "India", pincode: "302001" },
  { city: "Indore", state: "Madhya Pradesh", country: "India", pincode: "452001" },
  { city: "Bhopal", state: "Madhya Pradesh", country: "India", pincode: "462001" },
  { city: "Ludhiana", state: "Punjab", country: "India", pincode: "141001" },
  { city: "Patna", state: "Bihar", country: "India", pincode: "800001" },
  { city: "Visakhapatnam", state: "Andhra Pradesh", country: "India", pincode: "530001" },
  { city: "Thane", state: "Maharashtra", country: "India", pincode: "400601" },
];

const normalize = (value: string) => value.trim().toLowerCase();

export function getLocationSuggestions(value?: string, limit = 3) {
  const term = normalize(value ?? "");
  if (term.length < 2) {
    return [];
  }

  return LOCATIONS.filter((location) => {
    const names = [location.city, location.state, ...(location.aliases ?? [])].map(normalize);
    return names.some((name) => name === term || name.startsWith(term) || name.includes(term));
  }).slice(0, limit);
}

export function getBestLocationSuggestion(value?: string) {
  return getLocationSuggestions(value, 1)[0];
}
