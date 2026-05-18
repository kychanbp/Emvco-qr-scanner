// EMVCo MPM (Merchant-Presented Mode) TLV Parser
// Based on EMV QR Code Specification for Payment Systems v1.0+
// All parsing local; no external calls.

const EMVCO_TAGS = {
  '00': { name: 'Payload Format Indicator', desc: '"01" for EMV QRCPS-MPM' },
  '01': { name: 'Point of Initiation Method', desc: '11=static, 12=dynamic' },
  '52': { name: 'Merchant Category Code (MCC)', desc: 'ISO 18245' },
  '53': { name: 'Transaction Currency', desc: 'ISO 4217 numeric (3-digit)' },
  '54': { name: 'Transaction Amount', desc: 'Only present on dynamic QRs' },
  '55': { name: 'Tip or Convenience Indicator', desc: '01/02/03' },
  '56': { name: 'Value of Convenience Fee Fixed', desc: '' },
  '57': { name: 'Value of Convenience Fee Percentage', desc: '' },
  '58': { name: 'Country Code', desc: 'ISO 3166-1 alpha-2' },
  '59': { name: 'Merchant Name', desc: '' },
  '60': { name: 'Merchant City', desc: '' },
  '61': { name: 'Postal Code', desc: '' },
  '62': { name: 'Additional Data Field Template', desc: 'Nested TLV', nested: true },
  '63': { name: 'CRC', desc: 'CRC-16/CCITT-FALSE' },
  '64': { name: 'Merchant Info — Language Template', desc: 'Nested', nested: true },
};

// Tags 02-51: Merchant Account Information (network-specific, nested)
for (let i = 2; i <= 51; i++) {
  const t = i.toString().padStart(2, '0');
  EMVCO_TAGS[t] = { name: `Merchant Account Information ${t}`, desc: 'Network-specific, nested', nested: true };
}
// Tags 65-79: Reserved EMVCo
for (let i = 65; i <= 79; i++) {
  const t = i.toString();
  EMVCO_TAGS[t] = { name: `RFU EMVCo ${t}`, desc: 'Reserved for future use' };
}
// Tags 80-99: Unreserved (custom/network)
for (let i = 80; i <= 99; i++) {
  const t = i.toString();
  EMVCO_TAGS[t] = { name: `Unreserved Template ${t}`, desc: 'Network-specific, often nested', nested: true };
}

// Sub-tags within Additional Data Field Template (tag 62)
const ADDITIONAL_DATA_TAGS = {
  '01': 'Bill Number',
  '02': 'Mobile Number',
  '03': 'Store Label',
  '04': 'Loyalty Number',
  '05': 'Reference Label',
  '06': 'Customer Label',
  '07': 'Terminal Label',
  '08': 'Purpose of Transaction',
  '09': 'Additional Consumer Data Request',
  '10': 'Merchant Tax ID',
  '11': 'Merchant Channel',
};

// Sub-tags within Merchant Account Info (tags 02-51) — generic pattern
const MERCHANT_ACCOUNT_TAGS = {
  '00': 'Globally Unique Identifier (GUID / AID)',
  '01': 'Network-specific (acquirer / participant ID)',
  '02': 'Network-specific (merchant account / sub-merchant)',
  '03': 'Network-specific',
  '04': 'Network-specific',
  '05': 'Network-specific',
};

// Known scheme GUIDs (helps annotate which payment rail the QR belongs to)
const SCHEME_GUIDS = {
  'SG.PAYNOW': 'PayNow (Singapore)',
  'SG.COM.NETS': 'NETS (Singapore)',
  'MY.PAYNET.DUITNOW': 'DuitNow (Malaysia)',
  'MY.COM.MYDUITNOWTNGD': 'DuitNow (TNG)',
  'ID.CO.QRIS.WWW': 'QRIS (Indonesia)',
  'A000000677010111': 'PromptPay (Thailand)',
  'A000000615': 'PayNet / DuitNow QR (Malaysia, AID)',
  'A0000006150001': 'PayNet / DuitNow QR (Malaysia, AID)',
  'A000000727': 'VietQR (Vietnam)',
  'COM.GRAB': 'Grab',
  'HK.COM.HKICL': 'FPS (Hong Kong)',
  'COM.QR.WORLDPAY': 'Worldpay',
  'COM.STRIPE': 'Stripe',
};

// ISO 18245 MCC codes — comprehensive list. Sourced from the ISO 18245 standard
// and Stripe's open MCC reference (stripe.com/docs/issuing/categories).
//
// Special ranges that look like specific codes but are typically catch-alls:
//   3000-3299 = Airlines (specific airline codes — too many to list individually; we mark as "Airline")
//   3351-3441 = Car rentals (specific brand codes — marked as "Car rental")
//   3501-3999 = Hotels (specific hotel chain codes — marked as "Hotel / lodging")
const MCC_LOOKUP = {
  // Agriculture, forestry, fishing
  '0742': 'Veterinary services',
  '0763': 'Agricultural cooperatives',
  '0780': 'Landscaping / horticultural',
  '0782': 'Landscape / horticultural services',
  '0783': 'Lawn / garden services',
  // Contractors
  '1520': 'General contractors',
  '1711': 'Heating / plumbing / A/C',
  '1731': 'Electrical contractors',
  '1740': 'Masonry / tile',
  '1750': 'Carpentry',
  '1761': 'Roofing / siding',
  '1771': 'Concrete work',
  '1799': 'Special trade contractors',
  // Airlines (specific carrier codes 3000-3299)
  '3000': 'Airline (UAL/United)',
  '3001': 'Airline (American)',
  '3005': 'Airline (British Airways)',
  '3007': 'Airline (Air France)',
  '3008': 'Airline (Lufthansa)',
  '3009': 'Airline (Air Canada)',
  '3010': 'Airline (KLM)',
  '3011': 'Airline (Air India)',
  '3012': 'Airline (Qantas)',
  '3013': 'Airline (Alitalia)',
  '3014': 'Airline (Saudi Arabian)',
  '3015': 'Airline (Swissair)',
  '3016': 'Airline (Aerolineas Argentinas)',
  '3018': 'Airline (Pakistan Intl)',
  '3019': 'Airline (Air New Zealand)',
  '3025': 'Airline (Iberia)',
  '3034': 'Airline (Cathay Pacific)',
  '3041': 'Airline (China Eastern)',
  '3042': 'Airline (Japan Airlines)',
  '3047': 'Airline (Singapore Airlines)',
  '3051': 'Airline (Malaysia Airlines)',
  '3057': 'Airline (Korean Air)',
  '3058': 'Airline (Thai Airways)',
  '3061': 'Airline (Vietnam Airlines)',
  '3066': 'Airline (Garuda Indonesia)',
  '3075': 'Airline (Singapore Airlines)',
  '3082': 'Airline (Korean Air)',
  '3099': 'Airline (Cathay Pacific)',
  '3144': 'Airline (Virgin Atlantic)',
  '3196': 'Airline (Royal Jordanian)',
  '3245': 'Airline (Etihad)',
  '3246': 'Airline (Easyjet)',
  '3247': 'Airline (Ryanair)',
  '3256': 'Airline (Alaska)',
  '3259': 'Airline (American Airlines / specific carrier)',
  '3260': 'Airline (Spirit Airlines)',
  '3261': 'Airline (Frontier Airlines)',
  '3266': 'Airline (Air Asia)',
  '3296': 'Airline (Air Berlin)',
  // Car rentals (specific brand 3351-3441)
  '3351': 'Car rental (Affiliated Auto Rental)',
  '3352': 'Car rental (American International)',
  '3353': 'Car rental (Brooks Rent-A-Car)',
  '3354': 'Car rental (Action Auto Rental)',
  '3355': 'Car rental (Sixt)',
  '3357': 'Car rental (Hertz)',
  '3359': 'Car rental (Payless)',
  '3360': 'Car rental (Snappy)',
  '3361': 'Car rental (Airways)',
  '3362': 'Car rental (Altra)',
  '3364': 'Car rental (Agency Rent-A-Car)',
  '3366': 'Car rental (Budget)',
  '3368': 'Car rental (Holiday)',
  '3370': 'Car rental (Rent-a-Wreck)',
  '3374': 'Car rental (Accent)',
  '3376': 'Car rental (Ajax)',
  '3380': 'Car rental (Triangle)',
  '3381': 'Car rental (Europcar)',
  '3385': 'Car rental (Tropical)',
  '3386': 'Car rental (Showcase)',
  '3387': 'Car rental (Alamo)',
  '3389': 'Car rental (Avis)',
  '3390': 'Car rental (Dollar)',
  '3391': 'Car rental (Europe by Car)',
  '3393': 'Car rental (National)',
  '3394': 'Car rental (Kemwell)',
  '3395': 'Car rental (Thrifty)',
  '3396': 'Car rental (Tilden)',
  '3398': 'Car rental (Economy)',
  '3400': 'Car rental (Inta)',
  '3405': 'Car rental (Enterprise)',
  '3409': 'Car rental (General)',
  '3412': 'Car rental (A1)',
  '3414': 'Car rental (Godfrey National)',
  '3420': 'Car rental (ANSA International)',
  '3421': 'Car rental (Allstate)',
  '3423': 'Car rental (Avcar)',
  '3425': 'Car rental (Automate)',
  '3427': 'Car rental (Avon)',
  '3428': 'Car rental (Carey)',
  '3429': 'Car rental (Insurance)',
  '3430': 'Car rental (Executive)',
  '3431': 'Car rental (Hansa)',
  '3432': 'Car rental (Melbourne)',
  '3433': 'Car rental (Eurodollar)',
  '3434': 'Car rental (Ajax)',
  '3435': 'Car rental (Olympic)',
  '3436': 'Car rental (Same Day)',
  '3437': 'Car rental (Action)',
  '3438': 'Car rental (Budget Truck)',
  '3439': 'Car rental (Holiday)',
  '3440': 'Car rental (Rent-a-Wreck)',
  '3441': 'Car rental (Ace)',
  // Hotels / lodging (specific chains 3501-3999) — abbreviated
  '3501': 'Hotel (Holiday Inn)',
  '3502': 'Hotel (Best Western)',
  '3503': 'Hotel (Sheraton)',
  '3504': 'Hotel (Hilton)',
  '3505': 'Hotel (Forte / Trusthouse)',
  '3506': 'Hotel (Golden Tulip)',
  '3507': 'Hotel (Friendship)',
  '3508': 'Hotel (Quality Inn)',
  '3509': 'Hotel (Marriott)',
  '3510': 'Hotel (Days Inn)',
  '3511': 'Hotel (Arabella)',
  '3512': 'Hotel (Inter-Continental)',
  '3513': 'Hotel (Westin)',
  '3514': 'Hotel (Amerihost)',
  '3515': 'Hotel (Rodeway)',
  '3516': 'Hotel (LaQuinta)',
  '3517': 'Hotel (Americana)',
  '3518': 'Hotel (Sol)',
  '3519': 'Hotel (Pullman International)',
  '3520': 'Hotel (Meridien)',
  '3521': 'Hotel (Crest)',
  '3522': 'Hotel (Tokyo)',
  '3523': 'Hotel (Peninsula)',
  '3524': 'Hotel (Welcomgroup)',
  '3525': 'Hotel (Dunfey)',
  '3526': 'Hotel (Prince)',
  '3527': 'Hotel (Downtowner Passport)',
  '3528': 'Hotel (Red Lion)',
  '3529': 'Hotel (CP)',
  '3530': 'Hotel (Renaissance / Stouffer)',
  '3531': 'Hotel (Astir)',
  '3532': 'Hotel (Sun Route)',
  '3533': 'Hotel (Hotel Ibis)',
  '3534': 'Hotel (Southern Pacific)',
  '3535': 'Hotel (Hilton International)',
  '3536': 'Hotel (Amfac)',
  '3537': 'Hotel (ANA)',
  '3538': 'Hotel (Concorde)',
  '3539': 'Hotel (Summerfield Suites)',
  '3540': 'Hotel (Iberotel)',
  '3541': 'Hotel (Hotel Okura)',
  '3542': 'Hotel (Royal)',
  '3543': 'Hotel (Four Seasons)',
  '3544': 'Hotel (Cigahotels)',
  '3545': 'Hotel (Shangri-la)',
  '3546': 'Hotel (Hotels Of America)',
  '3547': 'Hotel (Princess)',
  '3548': 'Hotel (Hungar)',
  '3549': 'Hotel (Sokos)',
  '3550': 'Hotel (Doral)',
  '3551': 'Hotel (Helmsley)',
  '3552': 'Hotel (Doubletree)',
  '3553': 'Hotel (Embassy Suites)',
  '3554': 'Hotel (Penta)',
  '3555': 'Hotel (Loews)',
  '3556': 'Hotel (Lancaster)',
  '3557': 'Hotel (Wyndham)',
  '3558': 'Hotel (Rica)',
  '3559': 'Hotel (Inter Hotels)',
  '3560': 'Hotel (Sas Hotels)',
  '3561': 'Hotel (Rica Hotels)',
  '3562': 'Hotel (National 9 Inns)',
  '3563': 'Hotel (Disneyland Hotels)',
  '3564': 'Hotel (Princess)',
  '3565': 'Hotel (Hyatt)',
  '3566': 'Hotel (Sofitel)',
  '3567': 'Hotel (Novotel)',
  '3568': 'Hotel (Steigenberger)',
  '3570': 'Hotel (Knights Inn)',
  '3571': 'Hotel (Metropole)',
  '3572': 'Hotel (Circus Circus)',
  '3573': 'Hotel (Caesars)',
  '3574': 'Hotel (Nikko)',
  '3575': 'Hotel (Hotel Mercure)',
  '3576': 'Hotel (Hotel Ibis)',
  '3577': 'Hotel (Sonesta)',
  '3578': 'Hotel (Omni)',
  '3579': 'Hotel (Cunard)',
  '3580': 'Hotel (Hotels Concorde)',
  '3581': 'Hotel (Robinson Club)',
  '3582': 'Hotel (Hotels Melia)',
  '3583': 'Hotel (Auberge des Governeurs)',
  '3584': 'Hotel (Regal 8 Inns)',
  '3585': 'Hotel (Mirage)',
  '3586': 'Hotel (Colony)',
  '3587': 'Hotel (Breckenridge Resort)',
  '3588': 'Hotel (Bally\'s)',
  '3589': 'Hotel (Trump\'s)',
  '3590': 'Hotel (Hotel Mercure)',
  '3591': 'Hotel (Sandman)',
  '3592': 'Hotel (Mandarin Oriental)',
  '3593': 'Hotel (Frantel)',
  '3594': 'Hotel (Pannonia)',
  '3595': 'Hotel (Sandals)',
  '3596': 'Hotel (Hotels Pullman International)',
  '3597': 'Hotel (Hudson)',
  '3598': 'Hotel (Maritim)',
  '3599': 'Hotel (Movenpick)',
  '3600': 'Hotel (Travel Lodge)',
  '3601': 'Hotel (Park Inn)',
  '3602': 'Hotel (Vagabond)',
  '3603': 'Hotel (Mansfield)',
  '3604': 'Hotel (Disney Resort)',
  '3611': 'Hotel (Sheraton)',
  '3612': 'Hotel (Ritz Carlton)',
  '3613': 'Hotel (Conrad)',
  '3614': 'Hotel (Movenpick)',
  // Transportation
  '4111': 'Local / suburban commuter transport',
  '4112': 'Passenger railways',
  '4119': 'Ambulance services',
  '4121': 'Taxi / limousine',
  '4131': 'Bus lines',
  '4214': 'Motor freight / trucking',
  '4215': 'Courier services',
  '4225': 'Storage / warehousing',
  '4411': 'Cruise lines',
  '4457': 'Boat rentals',
  '4468': 'Marinas / yacht clubs',
  '4511': 'Airlines',
  '4582': 'Airports / flying fields',
  '4722': 'Travel agencies / tour operators',
  '4784': 'Tolls / road fees',
  '4789': 'Transportation services NEC',
  // Utilities
  '4812': 'Telecom equipment',
  '4814': 'Telecom services',
  '4815': 'Monthly telecom service',
  '4816': 'Computer network services',
  '4821': 'Telegraph services',
  '4829': 'Wire transfer / money order',
  '4899': 'Cable / pay TV',
  '4900': 'Utilities — electric/gas/water',
  // Retail — general
  '5111': 'Stationery / office supplies',
  '5122': 'Drugs / pharmaceuticals (wholesale)',
  '5172': 'Petroleum / petroleum products',
  '5192': 'Books / periodicals (wholesale)',
  '5211': 'Building materials / hardware',
  '5251': 'Hardware stores',
  '5261': 'Nurseries / lawn / garden',
  '5271': 'Mobile home dealers',
  '5300': 'Wholesale clubs',
  '5309': 'Duty-free stores',
  '5310': 'Discount stores',
  '5311': 'Department stores',
  '5331': 'Variety stores',
  '5399': 'Misc general merchandise',
  // Food & beverage retail
  '5411': 'Grocery / supermarket',
  '5422': 'Meat / freezer / locker provisioners',
  '5441': 'Candy / nut / confectionery',
  '5451': 'Dairy products stores',
  '5462': 'Bakeries',
  '5499': 'Misc food / convenience stores',
  // Apparel
  '5511': 'Auto / truck dealers (new/used)',
  '5521': 'Auto / truck dealers (used only)',
  '5531': 'Auto / home supply stores',
  '5532': 'Tire dealers',
  '5533': 'Auto parts / accessories',
  '5541': 'Service stations',
  '5542': 'Automated fuel dispensers',
  '5551': 'Boat dealers',
  '5561': 'Recreational / utility trailers',
  '5571': 'Motorcycle dealers',
  '5592': 'Motor home dealers',
  '5598': 'Snowmobile dealers',
  '5599': 'Misc auto / aircraft / farm equipment',
  '5611': 'Men\'s / boys\' clothing',
  '5621': 'Women\'s ready-to-wear',
  '5631': 'Women\'s accessory / specialty',
  '5641': 'Children\'s / infants\' wear',
  '5651': 'Family clothing',
  '5655': 'Sports / riding apparel',
  '5661': 'Shoe stores',
  '5681': 'Furriers / fur shops',
  '5691': 'Men\'s / women\'s clothing',
  '5697': 'Tailors / alterations',
  '5698': 'Wig / toupee shops',
  '5699': 'Misc apparel / accessory',
  // Home & furnishings
  '5712': 'Furniture / home furnishings',
  '5713': 'Floor covering stores',
  '5714': 'Drapery / upholstery',
  '5718': 'Fireplace / fireplace screens',
  '5719': 'Misc home furnishings',
  '5722': 'Household appliance stores',
  '5732': 'Electronics stores',
  '5733': 'Music stores — instruments / sheet music',
  '5734': 'Computer software stores',
  '5735': 'Record / music shops',
  // Restaurants & food
  '5811': 'Caterers',
  '5812': 'Eating places / restaurants',
  '5813': 'Bars / lounges / discos',
  '5814': 'Fast food restaurants',
  // Drug / health
  '5912': 'Pharmacies / drug stores',
  '5921': 'Package stores — beer / wine / liquor',
  '5931': 'Used merchandise / secondhand',
  '5932': 'Antique shops',
  '5933': 'Pawn shops',
  '5935': 'Wrecking / salvage yards',
  '5937': 'Antique reproductions',
  '5940': 'Bicycle shops',
  '5941': 'Sporting goods',
  '5942': 'Bookstores',
  '5943': 'Stationery / office supplies',
  '5944': 'Jewelry / watch / clock / silverware',
  '5945': 'Hobby / toy / game shops',
  '5946': 'Camera / photographic supply',
  '5947': 'Gift / card / novelty / souvenir',
  '5948': 'Luggage / leather goods',
  '5949': 'Sewing / needlework / fabric',
  '5950': 'Glassware / crystal',
  '5960': 'Direct marketing — insurance services',
  '5961': 'Mail order / catalogues',
  '5962': 'Direct marketing — travel',
  '5963': 'Door-to-door sales',
  '5964': 'Direct marketing — catalog merchant',
  '5965': 'Direct marketing — combined catalog/retail',
  '5966': 'Direct marketing — outbound telemarketing',
  '5967': 'Direct marketing — inbound telemarketing',
  '5968': 'Direct marketing — subscription',
  '5969': 'Direct marketing — other',
  '5970': 'Artist supply / craft shops',
  '5971': 'Art dealers / galleries',
  '5972': 'Stamp / coin stores',
  '5973': 'Religious goods stores',
  '5975': 'Hearing aids',
  '5976': 'Orthopedic goods',
  '5977': 'Cosmetic stores',
  '5978': 'Typewriter stores',
  '5983': 'Fuel — heating / cooking',
  '5992': 'Florists',
  '5993': 'Cigar / tobacco stores',
  '5994': 'News dealers / newsstands',
  '5995': 'Pet shops / pet food / supplies',
  '5996': 'Swimming pools — sales',
  '5997': 'Electric razor stores',
  '5998': 'Tent / awning shops',
  '5999': 'Misc retail',
  // Financial
  '6010': 'Financial institutions — manual cash',
  '6011': 'Financial institutions — ATM',
  '6012': 'Financial institutions — merchandise',
  '6051': 'Quasi-cash — money orders / FX',
  '6211': 'Securities brokers / dealers',
  '6300': 'Insurance — sales / underwriting',
  '6513': 'Real estate agents / managers',
  '6532': 'Payment transactions — member-acquired',
  '6533': 'Payment transactions — merchant',
  '6540': 'Stored value card / load',
  // Services
  '7011': 'Hotels / motels / resorts',
  '7012': 'Timeshares',
  '7032': 'Sporting / recreation camps',
  '7033': 'Trailer parks / campgrounds',
  '7210': 'Laundry / dry cleaning',
  '7211': 'Laundries — family / commercial',
  '7216': 'Dry cleaners',
  '7217': 'Carpet / upholstery cleaning',
  '7221': 'Photographic studios',
  '7230': 'Beauty / barber shops',
  '7251': 'Shoe repair / hat cleaning',
  '7261': 'Funeral services / crematoriums',
  '7273': 'Dating / escort services',
  '7276': 'Tax preparation services',
  '7277': 'Counseling — debt / marriage / personal',
  '7278': 'Buying / shopping services',
  '7296': 'Clothing rental',
  '7297': 'Massage parlors',
  '7298': 'Health / beauty spas',
  '7299': 'Misc personal services',
  '7311': 'Advertising services',
  '7321': 'Consumer credit reporting',
  '7333': 'Commercial photography / art / graphics',
  '7338': 'Quick copy / reproduction / blueprint',
  '7339': 'Stenographic / secretarial support',
  '7342': 'Exterminating / disinfecting',
  '7349': 'Cleaning / maintenance / janitorial',
  '7361': 'Employment agencies / temp help',
  '7372': 'Computer programming / data processing',
  '7375': 'Information retrieval services',
  '7379': 'Computer maintenance / repair',
  '7392': 'Management / consulting / PR',
  '7393': 'Detective / protective / security',
  '7394': 'Equipment rental / leasing',
  '7395': 'Photofinishing labs / photo dev',
  '7399': 'Business services NEC',
  '7512': 'Car rental agencies',
  '7513': 'Truck / utility trailer rentals',
  '7519': 'Motor home / RV rental',
  '7523': 'Parking lots / garages',
  '7531': 'Auto body repair',
  '7534': 'Tire retreading / repair',
  '7535': 'Auto paint shops',
  '7538': 'Automotive service shops',
  '7542': 'Car washes',
  '7549': 'Towing services',
  '7622': 'Electronics repair',
  '7623': 'Air conditioning / refrigeration repair',
  '7629': 'Electrical / small appliance repair',
  '7631': 'Watch / clock / jewelry repair',
  '7641': 'Furniture / refinishing / repair',
  '7692': 'Welding repair',
  '7699': 'Repair shops / services NEC',
  '7829': 'Motion picture / video production',
  '7832': 'Cinema / motion picture theatres',
  '7841': 'Video tape rental stores',
  '7911': 'Dance halls / studios / schools',
  '7922': 'Theatrical producers / ticket agencies',
  '7929': 'Bands / orchestras / entertainers',
  '7932': 'Pool / billiard establishments',
  '7933': 'Bowling alleys',
  '7941': 'Commercial sports / pro sports',
  '7991': 'Tourist attractions / exhibits',
  '7992': 'Public golf courses',
  '7993': 'Video amusement game supplies',
  '7994': 'Video game arcades / establishments',
  '7995': 'Betting — casinos / lottery',
  '7996': 'Amusement parks / circuses / fairs',
  '7997': 'Membership clubs — country / golf',
  '7998': 'Aquariums / dolphinariums / zoos',
  '7999': 'Recreation services NEC',
  // Healthcare
  '8011': 'Doctors',
  '8021': 'Dentists / orthodontists',
  '8031': 'Osteopaths',
  '8041': 'Chiropractors',
  '8042': 'Optometrists / ophthalmologists',
  '8043': 'Opticians / optical goods',
  '8044': 'Optical goods / eyeglasses',
  '8049': 'Podiatrists / chiropodists',
  '8050': 'Nursing / personal care facilities',
  '8062': 'Hospitals',
  '8071': 'Medical / dental labs',
  '8099': 'Medical services / health NEC',
  // Education
  '8211': 'Elementary / secondary schools',
  '8220': 'Colleges / universities',
  '8241': 'Correspondence schools',
  '8244': 'Business / secretarial schools',
  '8249': 'Vocational / trade schools',
  '8299': 'Schools / educational services (other)',
  // Other services
  '8351': 'Child care services',
  '8398': 'Charitable / social organizations',
  '8641': 'Civic / social / fraternal associations',
  '8651': 'Political organizations',
  '8661': 'Religious organizations',
  '8675': 'Automobile associations',
  '8699': 'Membership organizations NEC',
  '8734': 'Testing laboratories',
  '8911': 'Architectural / engineering / surveying',
  '8931': 'Accounting / auditing / bookkeeping',
  '8999': 'Professional services NEC',
  // Government
  '9211': 'Court costs / alimony / child support',
  '9222': 'Fines',
  '9223': 'Bail / bond payments',
  '9311': 'Tax payments',
  '9399': 'Government services NEC',
  '9402': 'Postal services — government only',
  '9405': 'U.S. federal government agencies',
  '9700': 'Automated referral services',
  '9702': 'Emergency services (GCAS)',
  '9950': 'Intra-company purchases',
};

const CURRENCY_LOOKUP = {
  '458': 'MYR (Malaysia)',
  '702': 'SGD (Singapore)',
  '360': 'IDR (Indonesia)',
  '764': 'THB (Thailand)',
  '704': 'VND (Vietnam)',
  '344': 'HKD (Hong Kong)',
  '156': 'CNY (China)',
  '840': 'USD',
  '978': 'EUR',
  '826': 'GBP',
  '392': 'JPY',
  '410': 'KRW',
  '608': 'PHP',
};

// Acquirer prefixes in the merchant account number (sub-tag 02 of merchant account info).
// Matched by longest prefix. Entries are case-insensitive at lookup time.
const ACQUIRER_PREFIXES = {
  // Malaysia — banks
  'PBB': 'Public Bank Berhad',
  'PBE': 'Public Bank Berhad',
  'MBB': 'Maybank',
  'MAYBANK': 'Maybank',
  'MAY': 'Maybank',
  'CIMB': 'CIMB Bank',
  'CIM': 'CIMB Bank',
  'HLB': 'Hong Leong Bank',
  'RHB': 'RHB Bank',
  'AMB': 'AmBank',
  'AMBANK': 'AmBank',
  'UOB': 'UOB Malaysia',
  'HSB': 'HSBC Malaysia',
  'HSBC': 'HSBC Malaysia',
  'SCB': 'Standard Chartered Malaysia',
  'ALB': 'Alliance Bank',
  'AIB': 'Alliance Bank',
  'BIM': 'Bank Islam Malaysia',
  'BSN': 'Bank Simpanan Nasional',
  'BMM': 'Bank Muamalat',
  'OCB': 'OCBC Malaysia',
  'CIT': 'Citibank Malaysia',
  'AFB': 'Affin Bank',
  // Malaysia — e-money
  'TNG': 'Touch \'n Go eWallet',
  'TNGD': 'Touch \'n Go eWallet',
  'BOOST': 'Boost',
  'GRAB': 'GrabPay',
  'GRABPAY': 'GrabPay',
  'SPAY': 'ShopeePay',
  'SHOPEEPAY': 'ShopeePay',
  'BIGPAY': 'BigPay',
  'MAE': 'Maybank MAE',
  // Singapore — common banks (PayNow scheme)
  'DBS': 'DBS Bank',
  'OCBC': 'OCBC Bank',
  'UOBSG': 'UOB Singapore',
  // Generic identifier from participant ID (numeric) — most schemes don't expose this cleanly
};

// Common PayNet participant codes seen in QR tag 26 sub-tag 01.
// Coverage is approximate; verify against known QRs you collect.
const PAYNET_PARTICIPANTS = {
  '501854': 'CIMB Bank',          // confirmed via Kuantan field visit 2026-05-18 (MILANO OPTICAL)
  '562003': 'Maybank',
  '564162': 'Public Bank Berhad', // confirmed
  '564169': 'AmBank',             // confirmed via QRAMB prefix (PERABOT WOON WAH)
  '566001': 'RHB Bank',
  '566203': 'AmBank',
  '566205': 'UOB Malaysia',
  '566207': 'OCBC Malaysia',
  '566208': 'Standard Chartered Malaysia',
  '566209': 'HSBC Malaysia',
  '566210': 'Alliance Bank',
  '566211': 'Bank Islam',
  '566212': 'Bank Simpanan Nasional',
  '566213': 'Bank Muamalat',
  '566214': 'Affin Bank',
  '566215': 'Citibank Malaysia',
  '588830': 'Hong Leong Bank',    // confirmed via Kuantan field visit 2026-05-18 (CHAN + P ONE)
};

const COUNTRY_LOOKUP = {
  'MY': 'Malaysia',
  'SG': 'Singapore',
  'ID': 'Indonesia',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'HK': 'Hong Kong',
  'CN': 'China',
  'PH': 'Philippines',
  'JP': 'Japan',
  'KR': 'South Korea',
  'US': 'United States',
};

// Fallback labels for MCC range buckets that aren't in the main lookup.
function rangeFallback(mcc) {
  if (!/^\d{4}$/.test(mcc)) return '';
  const n = parseInt(mcc, 10);
  if (n >= 3000 && n <= 3299) return 'Airline (carrier-specific code)';
  if (n >= 3351 && n <= 3441) return 'Car rental (brand-specific code)';
  if (n >= 3501 && n <= 3999) return 'Hotel / lodging (chain-specific code)';
  return '';
}

// Parse a TLV string into an ordered list of { tag, length, value } objects
function parseTLV(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (i + 4 > s.length) {
      out.push({ tag: '??', length: 0, value: s.slice(i), error: 'truncated' });
      break;
    }
    const tag = s.substring(i, i + 2);
    const len = parseInt(s.substring(i + 2, i + 4), 10);
    if (isNaN(len) || i + 4 + len > s.length) {
      out.push({ tag, length: 0, value: s.slice(i + 4), error: 'invalid length' });
      break;
    }
    const value = s.substring(i + 4, i + 4 + len);
    out.push({ tag, length: len, value });
    i += 4 + len;
  }
  return out;
}

// CRC-16/CCITT-FALSE
// poly 0x1021, init 0xFFFF, no reflection, xorout 0x0000
// Works on bytes (UTF-8 encoded) — EMVCo payloads can contain multi-byte characters.
function crc16(str) {
  const bytes = new TextEncoder().encode(str);
  let crc = 0xFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Annotate a parsed TLV entry with friendly metadata
function annotate(entry, context = 'root') {
  const tag = entry.tag;
  let name = '';
  let nested = false;
  let parsedValue = entry.value;
  let extra = '';

  if (context === 'root') {
    const meta = EMVCO_TAGS[tag];
    if (meta) {
      name = meta.name;
      nested = meta.nested === true;
    } else {
      name = `Unknown tag ${tag}`;
    }
    if (tag === '52') {
      extra = MCC_LOOKUP[entry.value] || rangeFallback(entry.value);
    }
    if (tag === '53') extra = CURRENCY_LOOKUP[entry.value] || '';
    if (tag === '58') extra = COUNTRY_LOOKUP[entry.value] || '';
  } else if (context === 'merchant_account') {
    name = MERCHANT_ACCOUNT_TAGS[tag] || `Sub-tag ${tag}`;
    if (tag === '00') {
      extra = SCHEME_GUIDS[entry.value] || '';
    }
  } else if (context === 'additional_data') {
    name = ADDITIONAL_DATA_TAGS[tag] || `Sub-tag ${tag}`;
  } else {
    name = `Sub-tag ${tag}`;
  }

  const annotated = { tag, length: entry.length, value: parsedValue, name, extra };
  if (entry.error) annotated.error = entry.error;

  if (nested) {
    let subContext = 'generic';
    const tagNum = parseInt(tag, 10);
    if (tagNum >= 2 && tagNum <= 51) subContext = 'merchant_account';
    else if (tag === '62') subContext = 'additional_data';
    else if (tagNum >= 80 && tagNum <= 99) subContext = 'merchant_account';
    annotated.children = parseTLV(entry.value).map(e => annotate(e, subContext));
  }
  return annotated;
}

// Top-level decode: parse + annotate + validate CRC
function decodePayload(payload) {
  const raw = payload.trim();
  const entries = parseTLV(raw);
  const annotated = entries.map(e => annotate(e, 'root'));

  // Validate CRC: tag 63 covers everything up to and including "6304"
  let crcValid = null;
  const crcEntry = annotated.find(e => e.tag === '63');
  if (crcEntry) {
    const crcStart = raw.lastIndexOf('6304');
    if (crcStart > -1) {
      const dataForCrc = raw.substring(0, crcStart + 4);
      const computed = crc16(dataForCrc);
      crcValid = computed.toUpperCase() === crcEntry.value.toUpperCase();
      crcEntry.crcComputed = computed;
    }
  }

  return {
    raw,
    entries: annotated,
    crcValid,
    summary: buildSummary(annotated),
  };
}

// Detect acquirer from a merchant account string by longest-prefix match.
function detectAcquirerFromAccount(accountStr) {
  if (!accountStr) return '';
  const upper = accountStr.toUpperCase();
  let best = '';
  for (const prefix of Object.keys(ACQUIRER_PREFIXES)) {
    if (upper.startsWith(prefix) && prefix.length > best.length) {
      best = prefix;
    }
  }
  return best ? ACQUIRER_PREFIXES[best] : '';
}

// Flatten a few key fields for the history view
function buildSummary(entries) {
  const get = t => entries.find(e => e.tag === t);
  const merchant = get('59');
  const city = get('60');
  const mcc = get('52');
  const currency = get('53');
  const amount = get('54');
  const country = get('58');
  const initiation = get('01');

  // Walk merchant account templates to find scheme + acquirer
  let scheme = '';
  let acquirer = '';
  let participantId = '';
  for (const e of entries) {
    const n = parseInt(e.tag, 10);
    if ((n >= 2 && n <= 51) || (n >= 80 && n <= 99)) {
      const children = e.children || [];
      const guid = children.find(c => c.tag === '00');
      const participant = children.find(c => c.tag === '01');
      const account = children.find(c => c.tag === '02');

      if (!scheme && guid) {
        scheme = guid.extra || guid.value || '';
      }
      if (!participantId && participant) {
        participantId = participant.value || '';
      }
      // Try participant code first (more reliable)
      if (!acquirer && participant && PAYNET_PARTICIPANTS[participant.value]) {
        acquirer = PAYNET_PARTICIPANTS[participant.value];
      }
      // Fall back to account prefix
      if (!acquirer && account) {
        acquirer = detectAcquirerFromAccount(account.value);
      }
      if (scheme && acquirer) break;
    }
  }

  return {
    merchant: merchant?.value || '(no name)',
    city: city?.value || '',
    country: country?.extra || country?.value || '',
    mcc: mcc?.value || '',
    mccLabel: mcc?.extra || '',
    currency: currency?.extra || currency?.value || '',
    amount: amount?.value || '',
    initiation: initiation?.value === '11' ? 'static' : initiation?.value === '12' ? 'dynamic' : '',
    scheme,
    acquirer,
    participantId,
  };
}

window.EMVCO = { parseTLV, decodePayload, crc16, EMVCO_TAGS };
