/**
 * US Hospital Registry — organized by state.
 * Each entry: { id, name, city, state, stateCode }
 * Default facility: Lincoln Hospital, Damariscotta, ME.
 */

export const HOSPITALS = [
  { id: 'lincoln-damariscotta', name: 'Lincoln Hospital', city: 'Damariscotta', state: 'Maine', stateCode: 'ME' },
  { id: 'midcoast-brunswick', name: 'Mid Coast Hospital', city: 'Brunswick', state: 'Maine', stateCode: 'ME' },
  { id: 'maine-medical', name: 'Maine Medical Center', city: 'Portland', state: 'Maine', stateCode: 'ME' },
  { id: 'mass-general', name: 'Massachusetts General', city: 'Boston', state: 'Massachusetts', stateCode: 'MA' },
  { id: 'brigham-womens', name: "Brigham & Women's", city: 'Boston', state: 'Massachusetts', stateCode: 'MA' },
  { id: 'nyu-langone', name: 'NYU Langone', city: 'New York', state: 'New York', stateCode: 'NY' },
  { id: 'mount-sinai', name: 'Mount Sinai', city: 'New York', state: 'New York', stateCode: 'NY' },
  { id: 'columbia-presbyterian', name: 'Columbia Presbyterian', city: 'New York', state: 'New York', stateCode: 'NY' },
  { id: 'upmc-pittsburgh', name: 'UPMC Presbyterian', city: 'Pittsburgh', state: 'Pennsylvania', stateCode: 'PA' },
  { id: 'penn-medicine', name: 'Penn Medicine', city: 'Philadelphia', state: 'Pennsylvania', stateCode: 'PA' },
  { id: 'johns-hopkins', name: 'Johns Hopkins', city: 'Baltimore', state: 'Maryland', stateCode: 'MD' },
  { id: 'howard-university', name: 'Howard University Hospital', city: 'Washington', state: 'District of Columbia', stateCode: 'DC' },
  { id: 'medstar-georgetown', name: 'MedStar Georgetown', city: 'Washington', state: 'District of Columbia', stateCode: 'DC' },
  { id: 'duke-university', name: 'Duke University Hospital', city: 'Durham', state: 'North Carolina', stateCode: 'NC' },
  { id: 'unc-medical', name: 'UNC Medical Center', city: 'Chapel Hill', state: 'North Carolina', stateCode: 'NC' },
  { id: 'musc-charleston', name: 'MUSC Health', city: 'Charleston', state: 'South Carolina', stateCode: 'SC' },
  { id: 'emory-university', name: 'Emory University Hospital', city: 'Atlanta', state: 'Georgia', stateCode: 'GA' },
  { id: 'grady-memorial', name: 'Grady Memorial', city: 'Atlanta', state: 'Georgia', stateCode: 'GA' },
  { id: 'jackson-memorial', name: 'Jackson Memorial', city: 'Miami', state: 'Florida', stateCode: 'FL' },
  { id: 'mayo-jacksonville', name: 'Mayo Clinic Jacksonville', city: 'Jacksonville', state: 'Florida', stateCode: 'FL' },
  { id: 'tampa-general', name: 'Tampa General', city: 'Tampa', state: 'Florida', stateCode: 'FL' },
  { id: 'vanderbilt-university', name: 'Vanderbilt University Medical', city: 'Nashville', state: 'Tennessee', stateCode: 'TN' },
  { id: 'uab-birmingham', name: 'UAB Hospital', city: 'Birmingham', state: 'Alabama', stateCode: 'AL' },
  { id: 'ummc-jackson', name: 'UMMC', city: 'Jackson', state: 'Mississippi', stateCode: 'MS' },
  { id: 'ochsner-nola', name: 'Ochsner Medical Center', city: 'New Orleans', state: 'Louisiana', stateCode: 'LA' },
  { id: 'uams-littlerock', name: 'UAMS Medical Center', city: 'Little Rock', state: 'Arkansas', stateCode: 'AR' },
  { id: 'md-anderson', name: 'MD Anderson', city: 'Houston', state: 'Texas', stateCode: 'TX' },
  { id: 'parkland-dallas', name: 'Parkland Memorial', city: 'Dallas', state: 'Texas', stateCode: 'TX' },
  { id: 'ut-southwestern', name: 'UT Southwestern', city: 'Dallas', state: 'Texas', stateCode: 'TX' },
  { id: 'ou-medical', name: 'OU Medical Center', city: 'Oklahoma City', state: 'Oklahoma', stateCode: 'OK' },
  { id: 'ku-medical', name: 'KU Medical Center', city: 'Kansas City', state: 'Kansas', stateCode: 'KS' },
  { id: 'nebraska-medicine', name: 'Nebraska Medicine', city: 'Omaha', state: 'Nebraska', stateCode: 'NE' },
  { id: 'mayo-rochester', name: 'Mayo Clinic', city: 'Rochester', state: 'Minnesota', stateCode: 'MN' },
  { id: 'hennepin-county', name: 'Hennepin County Medical', city: 'Minneapolis', state: 'Minnesota', stateCode: 'MN' },
  { id: 'froedtert-milwaukee', name: 'Froedtert Hospital', city: 'Milwaukee', state: 'Wisconsin', stateCode: 'WI' },
  { id: 'ui-hospitals', name: 'UI Hospitals & Clinics', city: 'Iowa City', state: 'Iowa', stateCode: 'IA' },
  { id: 'barnes-jewish', name: 'Barnes-Jewish Hospital', city: 'St. Louis', state: 'Missouri', stateCode: 'MO' },
  { id: 'northwestern-memorial', name: 'Northwestern Memorial', city: 'Chicago', state: 'Illinois', stateCode: 'IL' },
  { id: 'rush-university', name: 'Rush University Medical', city: 'Chicago', state: 'Illinois', stateCode: 'IL' },
  { id: 'iu-health', name: 'IU Health Methodist', city: 'Indianapolis', state: 'Indiana', stateCode: 'IN' },
  { id: 'cleveland-clinic', name: 'Cleveland Clinic', city: 'Cleveland', state: 'Ohio', stateCode: 'OH' },
  { id: 'osu-wexner', name: 'OSU Wexner Medical', city: 'Columbus', state: 'Ohio', stateCode: 'OH' },
  { id: 'michigan-medicine', name: 'Michigan Medicine', city: 'Ann Arbor', state: 'Michigan', stateCode: 'MI' },
  { id: 'henry-ford', name: 'Henry Ford Hospital', city: 'Detroit', state: 'Michigan', stateCode: 'MI' },
  { id: 'yale-new-haven', name: 'Yale New Haven', city: 'New Haven', state: 'Connecticut', stateCode: 'CT' },
  { id: 'ri-hospital', name: 'Rhode Island Hospital', city: 'Providence', state: 'Rhode Island', stateCode: 'RI' },
  { id: 'dartmouth-hitchcock', name: 'Dartmouth-Hitchcock', city: 'Lebanon', state: 'New Hampshire', stateCode: 'NH' },
  { id: 'uvm-medical', name: 'UVM Medical Center', city: 'Burlington', state: 'Vermont', stateCode: 'VT' },
  { id: 'uchealth-aurora', name: 'UCHealth Anschutz', city: 'Aurora', state: 'Colorado', stateCode: 'CO' },
  { id: 'university-utah', name: 'University of Utah Hospital', city: 'Salt Lake City', state: 'Utah', stateCode: 'UT' },
  { id: 'unm-hospital', name: 'UNM Hospital', city: 'Albuquerque', state: 'New Mexico', stateCode: 'NM' },
  { id: 'banner-university', name: 'Banner University Medical', city: 'Tucson', state: 'Arizona', stateCode: 'AZ' },
  { id: 'barrow-neuro', name: 'Barrow Neurological', city: 'Phoenix', state: 'Arizona', stateCode: 'AZ' },
  { id: 'lv-university', name: 'UMC of Southern Nevada', city: 'Las Vegas', state: 'Nevada', stateCode: 'NV' },
  { id: 'cedars-sinai', name: 'Cedars-Sinai', city: 'Los Angeles', state: 'California', stateCode: 'CA' },
  { id: 'ucsf-medical', name: 'UCSF Medical Center', city: 'San Francisco', state: 'California', stateCode: 'CA' },
  { id: 'stanford-health', name: 'Stanford Health Care', city: 'Stanford', state: 'California', stateCode: 'CA' },
  { id: 'ucla-medical', name: 'UCLA Medical Center', city: 'Los Angeles', state: 'California', stateCode: 'CA' },
  { id: 'ohsu-portland', name: 'OHSU Hospital', city: 'Portland', state: 'Oregon', stateCode: 'OR' },
  { id: 'uw-medical', name: 'UW Medical Center', city: 'Seattle', state: 'Washington', stateCode: 'WA' },
  { id: 'harborview-seattle', name: 'Harborview Medical', city: 'Seattle', state: 'Washington', stateCode: 'WA' },
  { id: 'providence-anchorage', name: 'Providence Alaska Medical', city: 'Anchorage', state: 'Alaska', stateCode: 'AK' },
  { id: 'queens-honolulu', name: "Queen's Medical Center", city: 'Honolulu', state: 'Hawaii', stateCode: 'HI' },
  { id: 'cabell-huntington', name: 'Cabell Huntington', city: 'Huntington', state: 'West Virginia', stateCode: 'WV' },
  { id: 'uva-health', name: 'UVA Health', city: 'Charlottesville', state: 'Virginia', stateCode: 'VA' },
  { id: 'christiana-care', name: 'ChristianaCare', city: 'Newark', state: 'Delaware', stateCode: 'DE' },
  { id: 'sanford-health', name: 'Sanford Medical Center', city: 'Fargo', state: 'North Dakota', stateCode: 'ND' },
  { id: 'sanford-sioux', name: 'Sanford USD Medical', city: 'Sioux Falls', state: 'South Dakota', stateCode: 'SD' },
  { id: 'billings-clinic', name: 'Billings Clinic', city: 'Billings', state: 'Montana', stateCode: 'MT' },
  { id: 'st-lukes-boise', name: "St. Luke's Health", city: 'Boise', state: 'Idaho', stateCode: 'ID' },
  { id: 'cheyenne-regional', name: 'Cheyenne Regional', city: 'Cheyenne', state: 'Wyoming', stateCode: 'WY' },
];

/** Default hospital */
export const DEFAULT_HOSPITAL = HOSPITALS[0]; // Lincoln Hospital

/** Group hospitals by state for the selector */
export function getHospitalsByState() {
  const map = new Map();
  HOSPITALS.forEach(h => {
    const key = h.state;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(h);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([state, hospitals]) => ({ state, hospitals }));
}
