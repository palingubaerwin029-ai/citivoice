const KABANKALAN_BARANGAY_COORDS = [
  { name: 'Barangay 1', lat: 9.998, lng: 122.814 },
  { name: 'Barangay 2', lat: 10.001, lng: 122.812 },
  { name: 'Barangay 3', lat: 9.995, lng: 122.816 },
  { name: 'Barangay 4', lat: 9.992, lng: 122.818 },
  { name: 'Barangay 5', lat: 10.005, lng: 122.816 },
  { name: 'Barangay 6', lat: 10.008, lng: 122.820 },
  { name: 'Barangay 7', lat: 10.012, lng: 122.825 },
  { name: 'Barangay 8', lat: 10.015, lng: 122.830 },
  { name: 'Barangay 9', lat: 10.000, lng: 122.808 },
  { name: 'Bantayan', lat: 9.726, lng: 122.788 },
  { name: 'Binicuil', lat: 9.965, lng: 122.805 },
  { name: 'Camansi', lat: 9.940, lng: 122.880 },
  { name: 'Camingawan', lat: 9.820, lng: 122.950 },
  { name: 'Camugao', lat: 9.955, lng: 122.835 },
  { name: 'Carol-an', lat: 9.860, lng: 122.920 },
  { name: 'Daan Banua', lat: 10.010, lng: 122.785 },
  { name: 'Hilamonan', lat: 10.005, lng: 122.845 },
  { name: 'Inapoy', lat: 9.810, lng: 122.880 },
  { name: 'Linao', lat: 10.020, lng: 122.800 },
  { name: 'Locotan', lat: 9.930, lng: 122.840 },
  { name: 'Magballo', lat: 9.850, lng: 122.830 },
  { name: 'Oringao', lat: 9.891, lng: 122.866 },
  { name: 'Orong', lat: 9.910, lng: 122.800 },
  { name: 'Pinaguinpinan', lat: 9.950, lng: 122.780 },
  { name: 'Salong', lat: 9.970, lng: 122.760 },
  { name: 'Tabugon', lat: 9.780, lng: 122.850 },
  { name: 'Tagoc', lat: 9.930, lng: 122.770 },
  { name: 'Tagukon', lat: 9.740, lng: 122.830 },
  { name: 'Talubangi', lat: 10.015, lng: 122.825 },
  { name: 'Tampalon', lat: 9.900, lng: 122.920 },
  { name: 'Tan-awan', lat: 9.840, lng: 122.980 },
  { name: 'Tapi', lat: 9.870, lng: 122.800 }
];

function getIncidentBarangay({ location_address, location_lat, location_lng, user_barangay }) {
  const address = (location_address || '').trim();

  // 1. Explicit street / landmark patterns
  if (address) {
    if (/Aquiles\s*-?\s*Zayco/i.test(address) || /Zayco\s+Ave/i.test(address)) {
      return 'Barangay 1';
    }
    if (/Guanzon/i.test(address)) return 'Barangay 1';
    if (/Tayum/i.test(address)) return 'Barangay 2';
    if (/Coloso/i.test(address)) return 'Barangay 1';
    if (/Bonifacio/i.test(address) || /Bañares/i.test(address) || /Banares/i.test(address)) return 'Barangay 3';

    // Check if address explicitly contains a known barangay name
    for (const b of KABANKALAN_BARANGAY_COORDS) {
      if (new RegExp(`\\b${b.name}\\b`, 'i').test(address)) {
        return b.name;
      }
    }

    const match = address.match(/(?:Barangay|Brgy\.?|Poblacion)\s+([A-Za-z0-9\s-]+?)(?:,|\.|$)/i);
    if (match && match[1]) {
      const trimmed = match[1].trim();
      if (/^\d+$/.test(trimmed)) return `Barangay ${trimmed}`;
      for (const b of KABANKALAN_BARANGAY_COORDS) {
        if (b.name.toLowerCase() === trimmed.toLowerCase()) return b.name;
      }
    }
  }

  // 2. Nearest coordinate pin
  const lat = parseFloat(location_lat);
  const lng = parseFloat(location_lng);
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
    let nearest = null;
    let minD = Infinity;
    for (const b of KABANKALAN_BARANGAY_COORDS) {
      const d = Math.hypot(b.lat - lat, b.lng - lng);
      if (d < minD) {
        minD = d;
        nearest = b.name;
      }
    }
    if (nearest) return nearest;
  }

  return user_barangay || 'Barangay 1';
}

module.exports = {
  KABANKALAN_BARANGAY_COORDS,
  getIncidentBarangay,
};
