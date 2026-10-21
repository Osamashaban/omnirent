// ---------------------------------------------------------------------------
// The fixed lists behind Settings › Property types.
//
// Channex accepts exactly 19 property types. Each Omnirent type is linked to
// one of them, and that value is the only thing ever sent to Channex. The
// Channex type also decides how Channex bills the listing: per unit for the 8
// vacation-rental types, per property for the 11 hotel types.
//
// "Name on each channel" is guidance for the team when they connect a channel:
// what the type is called on Booking.com, Airbnb and so on. The channel list
// and the per-channel type lists come from the design (sample data). They will
// be replaced by Channex's channel catalogue once the Channex connection is
// built; nothing here is sent anywhere.
// ---------------------------------------------------------------------------

export const VACATION_RENTAL_TYPES = [
  "apartment",
  "chalet",
  "villa",
  "holiday_home",
  "homestay",
  "boat",
  "country_house",
  "farm_stay",
] as const;

export const HOTEL_TYPES = [
  "apart_hotel",
  "guest_house",
  "hotel",
  "hostel",
  "resort",
  "lodge",
  "inn",
  "motel",
  "riad",
  "ryokan",
  "capsule_hotel",
] as const;

export const CHANNEX_TYPES: readonly string[] = [...VACATION_RENTAL_TYPES, ...HOTEL_TYPES];

export type Billing = "unit" | "property";

export function isChannexType(value: string): boolean {
  return CHANNEX_TYPES.includes(value);
}

export function billingFor(channexType: string): Billing {
  return (HOTEL_TYPES as readonly string[]).includes(channexType) ? "property" : "unit";
}

export type Channel = { id: string; name: string; color: string; initials: string; main: boolean };

// The six main channels show by default; the rest appear on search or "Show all".
export const CHANNELS: readonly Channel[] = [
  { id: "booking", name: "Booking.com", color: "#003580", initials: "B.", main: true },
  { id: "airbnb", name: "Airbnb", color: "#FF5A5F", initials: "A", main: true },
  { id: "agoda", name: "Agoda", color: "#5B2D90", initials: "ag", main: true },
  { id: "expedia", name: "Expedia / Vrbo", color: "#1E243A", initials: "E", main: true },
  { id: "hostelworld", name: "Hostelworld", color: "#F57C00", initials: "HW", main: true },
  { id: "google", name: "Google Vacation Rentals", color: "#4285F4", initials: "G", main: true },
  ...[
    "Trip.com", "Hotelbeds", "Tripadvisor", "Despegar", "Traveloka", "MakeMyTrip", "Goibibo", "Almosafer",
    "Gathern", "Wego", "Holidu", "HomeToGo", "Hopper", "Tiket.com", "HRS", "Ostrovok", "Feratel",
    "Lastminute.com", "eDreams", "Rakuten Travel", "Jalan", "Yanolja", "Klook", "Fliggy", "Meituan", "Qunar",
    "WebBeds", "Bakuun", "Travelstart", "Hotels.ng", "LekkeSlaap", "Plum Guide", "Atraveo", "Interhome",
    "Belvilla", "Casamundo", "Tujia", "Ryanair Rooms", "easyJet holidays", "Google Hotel Search", "Trivago",
    "Kayak", "Skyscanner", "Hostelz", "Bluepillow", "Glampings.com",
  ].map((name, i) => ({
    id: `o${i}`,
    name,
    color: ["#0F766E", "#7C3AED", "#B45309", "#BE185D", "#1D4ED8", "#15803D", "#9333EA", "#C2410C"][i % 8],
    initials: name.slice(0, 2),
    main: false,
  })),
];

const MAIN_INDEX: Record<string, number> = { booking: 0, airbnb: 1, agoda: 2, expedia: 3, hostelworld: 4 };

// What each Channex type is usually called on Booking.com, Airbnb, Agoda,
// Expedia and Hostelworld, in that order.
const SUGGESTIONS: Record<string, readonly [string, string, string, string, string]> = {
  apartment: ["Apartment (3)", "apartment", "Apartment", "Apartment (16)", "Apartment"],
  homestay: ["Homestay (5004)", "house", "Apartment", "Guest House (6)", "Guesthouse"],
  chalet: ["Chalet (7)", "chalet", "Chalet", "Chalet (10)", "Not supported"],
  villa: ["Villa (35)", "villa", "Villa", "Villa (14)", "Not supported"],
  holiday_home: ["Holiday Home (5006)", "house", "Villa", "Private Vacation Home (17)", "Not supported"],
  country_house: ["Country house (5007)", "house", "Country House", "Country House (29)", "Not supported"],
  farm_stay: ["Farm stay (15)", "farm_stay", "Country House", "Agritourism (40)", "Not supported"],
  boat: ["Boat (12)", "boat", "Boat", "House Boat (18)", "Not supported"],
  apart_hotel: ["ApartHotel (5000)", "aparthotel", "Serviced apartment", "Apart-hotel (22)", "Apartment"],
  guest_house: ["Guest House (40)", "guesthouse", "Guest House", "Guest House (6)", "Guesthouse"],
  hotel: ["Hotel (20)", "hotel", "Hotel", "Hotel (1)", "Hotel"],
  resort: ["Resort (30)", "resort", "Resort", "Hotel Resort (3)", "Hotel"],
  lodge: ["Lodge (22)", "lodge", "Lodge", "Lodge (15)", "Hotel"],
  hostel: ["Hostel (19)", "hostel", "Hostel", "Hostel / Backpacker (12)", "Hostel"],
  inn: ["Inn (21)", "bnb", "Hotel", "Inn (4)", "Hotel"],
  motel: ["Motel (27)", "hotel", "Hotel", "Motel (2)", "Hotel"],
  capsule_hotel: ["Capsule Hotel (5008)", "hostel", "Hostel", "Capsule Hotel (43)", "Hostel"],
  riad: ["Riad (5001)", "boutique_hotel", "Hotel", "Riad (25)", "Guesthouse"],
  ryokan: ["Ryokan (5002)", "ryokan", "Hotel", "Ryokan (20)", "Hotel"],
};

// The suggested name of a Channex type on one channel. Channels without their
// own list default to the Channex value ("Same as Channex").
export function suggestedChannelName(channexType: string, channelId: string): string {
  if (!channexType) return "";
  const main = MAIN_INDEX[channelId];
  if (main !== undefined) return SUGGESTIONS[channexType]?.[main] ?? channexType;
  if (channelId === "google") return billingFor(channexType) === "property" ? "Hotel" : "Vacation rental";
  return channexType;
}

// The name shown for one channel: the saved one if any, else the suggestion.
export function channelName(channexType: string, saved: Record<string, string>, channelId: string): string {
  return saved[channelId] ?? suggestedChannelName(channexType, channelId);
}

// Keep only the names that differ from the suggestion, so a later change of
// Channex type re-suggests every name the team never edited.
export function editedChannelNames(channexType: string, names: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const channel of CHANNELS) {
    const value = names[channel.id]?.trim();
    if (value && value !== suggestedChannelName(channexType, channel.id)) out[channel.id] = value.slice(0, 80);
  }
  return out;
}

// Autocomplete lists for the main channels' own type names.
export const CHANNEL_TYPE_OPTIONS: Record<string, readonly string[]> = {
  booking: [
    "Apartment (3)", "Bed and Breakfast (4)", "Camping (6)", "Chalet (7)", "Boat (12)", "Farm stay (15)", "Tented (33)",
    "Villa (35)", "Guest House (40)", "ApartHotel (5000)", "Riad (5001)", "Ryokan (5002)", "Homestay (5004)",
    "Holiday Home (5006)", "Country house (5007)", "Holiday Park (5009)", "Hotel (20)", "Hostel (19)", "Resort (30)",
    "Inn (21)", "Lodge (22)", "Motel (27)", "Love Hotel (5003)", "Japanese-style Business Hotel (5005)",
    "Capsule Hotel (5008)", "Cruise Ship (5010)", "Student Accommodation (5011)",
  ],
  airbnb: [
    "apartment", "condominium", "serviced_apartment", "loft", "house", "villa", "chalet", "townhouse", "cottage",
    "bungalow", "cabin", "tiny_house", "dome_house", "earthhouse", "farm_stay", "houseboat", "hut", "lighthouse",
    "guesthouse", "guest_suite", "bnb", "lodge", "hotel", "boutique_hotel", "aparthotel", "hostel", "resort", "boat",
    "rv", "campsite", "tent", "yurt", "treehouse", "castle", "cave", "barn", "island", "windmill", "tipi", "igloo",
    "plane", "train", "Not supported",
  ],
  agoda: [
    "Apartment", "Villa", "Chalet", "Country House", "Boat", "Serviced apartment", "Guest House", "Hotel", "Resort",
    "Lodge", "Hostel", "Holiday Park", "Not supported",
  ],
  expedia: [
    "Condo (7)", "Cabin (9)", "Chalet (10)", "Cottage (11)", "Villa (14)", "Apartment (16)", "Private Vacation Home (17)",
    "House Boat (18)", "Apart-hotel (22)", "Condominium Resort (23)", "Caravan Park (24)", "Residence (33)",
    "Mobile home (44)", "Hotel (1)", "Motel (2)", "Hotel Resort (3)", "Inn (4)", "Bed & Breakfast (5)",
    "Guest House (6)", "All-Inclusive (8)", "Hostel / Backpacker (12)", "Ranch (13)", "Lodge (15)", "Ryokan (20)",
    "Tree House (21)", "Riad (25)", "Hostel (Budget Hotel) (26)", "Country House (29)", "Pension (30)",
    "Pousada Portugal (31)", "Pousada Brazil (32)", "TownHouse (34)", "Castle (36)", "Safari / Tentalow (37)",
    "Palace (39)", "Agritourism (40)", "Cruise (41)", "Holiday Park (42)", "Capsule Hotel (43)", "Not supported",
  ],
  hostelworld: ["Apartment", "Guesthouse", "Hostel", "Hotel", "Campsite", "Not supported"],
  google: ["Vacation rental", "Hotel", "Not supported"],
};
