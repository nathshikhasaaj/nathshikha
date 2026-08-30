/**
 * Shipping Service & PIN Code Location Resolver
 * Handles location categorization and server-side shipping charge calculation.
 */

// Configurable list of PIN codes considered as Khopoli City
export const KHOPOLI_PINCODES = [
  '410203', // Khopoli / Camp
  '410204', // Khopoli Town / Industrial Area
  '410216', // Khalapur / Khopoli vicinity
  '410222'  // Khopoli East / surrounding
];

// Standard Indian Postal Circle Prefix Mapping
const PIN_PREFIX_STATE_MAP = {
  '11': 'Delhi',
  '12': 'Haryana',
  '13': 'Haryana',
  '14': 'Punjab',
  '15': 'Punjab',
  '16': 'Punjab',
  '17': 'Himachal Pradesh',
  '18': 'Jammu and Kashmir',
  '19': 'Jammu and Kashmir',
  '20': 'Uttar Pradesh',
  '21': 'Uttar Pradesh',
  '22': 'Uttar Pradesh',
  '23': 'Uttar Pradesh',
  '24': 'Uttarakhand',
  '25': 'Uttar Pradesh',
  '26': 'Uttarakhand',
  '27': 'Uttar Pradesh',
  '28': 'Uttar Pradesh',
  '30': 'Rajasthan',
  '31': 'Rajasthan',
  '32': 'Rajasthan',
  '33': 'Rajasthan',
  '34': 'Rajasthan',
  '36': 'Gujarat',
  '37': 'Gujarat',
  '38': 'Gujarat',
  '39': 'Gujarat',
  '40': 'Maharashtra',
  '41': 'Maharashtra',
  '42': 'Maharashtra',
  '43': 'Maharashtra',
  '44': 'Maharashtra',
  '45': 'Madhya Pradesh',
  '46': 'Madhya Pradesh',
  '47': 'Madhya Pradesh',
  '48': 'Madhya Pradesh',
  '49': 'Chhattisgarh',
  '50': 'Telangana',
  '51': 'Andhra Pradesh',
  '52': 'Andhra Pradesh',
  '53': 'Andhra Pradesh',
  '56': 'Karnataka',
  '57': 'Karnataka',
  '58': 'Karnataka',
  '59': 'Karnataka',
  '60': 'Tamil Nadu',
  '61': 'Tamil Nadu',
  '62': 'Tamil Nadu',
  '63': 'Tamil Nadu',
  '64': 'Tamil Nadu',
  '67': 'Kerala',
  '68': 'Kerala',
  '69': 'Kerala',
  '70': 'West Bengal',
  '71': 'West Bengal',
  '72': 'West Bengal',
  '73': 'West Bengal',
  '74': 'West Bengal',
  '75': 'Odisha',
  '76': 'Odisha',
  '77': 'Odisha',
  '78': 'Assam',
  '79': 'North East India',
  '80': 'Bihar',
  '81': 'Bihar',
  '82': 'Jharkhand',
  '83': 'Jharkhand',
  '84': 'Bihar',
  '85': 'Bihar'
};

/**
 * Validate 6-digit Indian PIN Code format
 */
export function isValidPincode(pincode) {
  if (!pincode) return false;
  const clean = String(pincode).trim();
  return /^[1-9][0-9]{5}$/.test(clean);
}

/**
 * Resolve location (City, State, Khopoli status) for a given PIN code
 */
export async function resolvePincodeLocation(pincode) {
  const cleanPin = String(pincode || '').trim();
  if (!isValidPincode(cleanPin)) {
    return {
      valid: false,
      error: 'Please enter a valid 6-digit PIN code'
    };
  }

  // 1. Check if in Khopoli City Config
  if (KHOPOLI_PINCODES.includes(cleanPin)) {
    return {
      valid: true,
      pincode: cleanPin,
      city: 'Khopoli',
      state: 'Maharashtra',
      isKhopoli: true,
      isMaharashtra: true,
      locationType: 'khopoli'
    };
  }

  // 2. Try online Postal PIN code API with fast timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        const stateName = po.State || '';
        const cityName = po.District || po.Block || po.Name || stateName;
        const isMaharashtra = stateName.toLowerCase().includes('maharashtra');

        return {
          valid: true,
          pincode: cleanPin,
          city: cityName,
          state: stateName,
          isKhopoli: false,
          isMaharashtra,
          locationType: isMaharashtra ? 'maharashtra' : 'outside_maharashtra'
        };
      }
    }
  } catch (err) {
    // Gracefully fallback to prefix resolver on network error/timeout
  }

  // 3. Fallback: Prefix-based lookup
  const prefix2 = cleanPin.slice(0, 2);
  const prefix3 = cleanPin.slice(0, 3);

  // Goa is 403xxx
  if (prefix3 === '403') {
    return {
      valid: true,
      pincode: cleanPin,
      city: 'Goa',
      state: 'Goa',
      isKhopoli: false,
      isMaharashtra: false,
      locationType: 'outside_maharashtra'
    };
  }

  const detectedState = PIN_PREFIX_STATE_MAP[prefix2] || 'India';
  const isMaharashtra = detectedState === 'Maharashtra';

  return {
    valid: true,
    pincode: cleanPin,
    city: isMaharashtra ? 'Maharashtra' : detectedState,
    state: detectedState,
    isKhopoli: false,
    isMaharashtra,
    locationType: isMaharashtra ? 'maharashtra' : 'outside_maharashtra'
  };
}

/**
 * Get available shipping options based on resolved location
 */
export function getShippingOptionsForLocation(locationResult) {
  if (!locationResult || !locationResult.valid) {
    return [];
  }

  // Option 1: Self Pickup is always available across all locations
  const options = [
    {
      id: 'self_pickup',
      name: 'Self Pickup',
      charge: 0,
      badge: 'FREE',
      description: 'Collect your order directly from our location in Khopoli'
    }
  ];

  // Option 2: Contextual Delivery Option
  if (locationResult.isKhopoli) {
    options.push({
      id: 'khopoli_delivery',
      name: 'Khopoli City Delivery',
      charge: 0,
      badge: 'FREE',
      description: 'Free local doorstep delivery within Khopoli City'
    });
  } else if (locationResult.isMaharashtra) {
    options.push({
      id: 'maharashtra_delivery',
      name: 'Maharashtra Delivery',
      charge: 100,
      badge: '₹100',
      description: 'Express shipping to anywhere across Maharashtra'
    });
  } else {
    options.push({
      id: 'outside_maharashtra_delivery',
      name: 'Outside Maharashtra Delivery',
      charge: 120,
      badge: '₹120',
      description: 'Standard domestic delivery to states outside Maharashtra'
    });
  }

  return options;
}

/**
 * Calculate and validate final shipping charge server-side
 */
export async function calculateShippingCharge(pincode, requestedMethodId) {
  const location = await resolvePincodeLocation(pincode);
  if (!location.valid) {
    throw new Error(location.error || 'Invalid PIN code provided.');
  }

  const options = getShippingOptionsForLocation(location);

  // Match requested method, or default to the delivery option
  let selectedOption = options.find((opt) => opt.id === requestedMethodId);
  if (!selectedOption) {
    // If self_pickup was requested
    if (requestedMethodId === 'self_pickup' || requestedMethodId === 'Self Pickup') {
      selectedOption = options.find((opt) => opt.id === 'self_pickup');
    } else {
      // Default to the delivery option (second item in options)
      selectedOption = options[1] || options[0];
    }
  }

  return {
    valid: true,
    pincode: location.pincode,
    city: location.city,
    state: location.state,
    locationType: location.locationType,
    shippingMethodId: selectedOption.id,
    shippingMethodName: selectedOption.name,
    shippingCharge: selectedOption.charge,
    options
  };
}
