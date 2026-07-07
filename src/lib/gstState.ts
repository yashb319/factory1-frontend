export const gstStateCodes: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

export function stateNameFromGstNumber(value?: string | null) {
  const match = value?.trim().match(/^(\d{2})/);
  return match ? gstStateCodes[match[1]] : "";
}

export function normalizeIndianState(value?: string | null) {
  if (!value) {
    return "";
  }

  const direct = stateNameFromGstNumber(value);
  if (direct) {
    return direct.toLowerCase();
  }

  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const state = Object.values(gstStateCodes).find((entry) =>
    cleaned.includes(entry.toLowerCase())
  );

  return state ? state.toLowerCase() : cleaned;
}

export function inferIntraState(
  factoryState?: string | null,
  destinationState?: string | null
) {
  const factory = normalizeIndianState(factoryState);
  const destination = normalizeIndianState(destinationState);

  if (!factory || !destination) {
    return null;
  }

  return factory === destination;
}
