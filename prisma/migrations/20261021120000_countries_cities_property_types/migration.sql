-- Adds Settings › Countries & cities and Settings › Property types (design
-- iteration 1, version 55): the countries and cities brokers pick from, and the
-- property types the team picks from, each linked to one Channex type.
-- Also adds the two matching role modules and grants them to Super Admin.
--
-- Additive only: new tables and rows, nothing existing is changed or removed.
-- The starting rows are the ones in the design; the team edits them on the page.

-- CreateEnum
CREATE TYPE "PropertyTypeGroup" AS ENUM ('APARTMENTS', 'HOTELS');

-- CreateEnum
CREATE TYPE "RentMode" AS ENUM ('WHOLE', 'ROOMS', 'BOTH');

-- CreateEnum
CREATE TYPE "PropertyTypeStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "iso2" TEXT NOT NULL,
    "dialCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyType" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "group" "PropertyTypeGroup" NOT NULL DEFAULT 'APARTMENTS',
    "channexType" TEXT NOT NULL,
    "rentMode" "RentMode" NOT NULL DEFAULT 'WHOLE',
    "status" "PropertyTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "channelNames" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_nameAr_key" ON "Country"("nameAr");

-- CreateIndex
CREATE UNIQUE INDEX "Country_nameEn_key" ON "Country"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Country_iso2_key" ON "Country"("iso2");

-- CreateIndex
CREATE UNIQUE INDEX "City_countryId_nameAr_key" ON "City"("countryId", "nameAr");

-- CreateIndex
CREATE UNIQUE INDEX "City_countryId_nameEn_key" ON "City"("countryId", "nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyType_nameAr_key" ON "PropertyType"("nameAr");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyType_nameEn_key" ON "PropertyType"("nameEn");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Starting countries. Only Egypt is visible to brokers.
INSERT INTO "Country" ("id", "nameAr", "nameEn", "iso2", "dialCode", "currency", "timezone", "visible", "updatedAt") VALUES
  ('country_eg', 'مصر', 'Egypt', 'EG', '+20', 'EGP', 'Africa/Cairo', true, CURRENT_TIMESTAMP),
  ('country_sa', 'السعودية', 'Saudi Arabia', 'SA', '+966', 'SAR', 'Asia/Riyadh', false, CURRENT_TIMESTAMP),
  ('country_ae', 'الإمارات', 'United Arab Emirates', 'AE', '+971', 'AED', 'Asia/Dubai', false, CURRENT_TIMESTAMP),
  ('country_ma', 'المغرب', 'Morocco', 'MA', '+212', 'MAD', 'Africa/Casablanca', false, CURRENT_TIMESTAMP);

-- Starting cities.
INSERT INTO "City" ("id", "countryId", "nameAr", "nameEn", "visible", "updatedAt") VALUES
  ('city_eg_cairo', 'country_eg', 'القاهرة', 'Cairo', true, CURRENT_TIMESTAMP),
  ('city_eg_new_cairo', 'country_eg', 'القاهرة الجديدة', 'New Cairo', true, CURRENT_TIMESTAMP),
  ('city_eg_giza', 'country_eg', 'الجيزة', 'Giza', true, CURRENT_TIMESTAMP),
  ('city_eg_sheikh_zayed', 'country_eg', 'الشيخ زايد', 'Sheikh Zayed', true, CURRENT_TIMESTAMP),
  ('city_eg_north_coast', 'country_eg', 'الساحل الشمالي', 'North Coast', true, CURRENT_TIMESTAMP),
  ('city_eg_alexandria', 'country_eg', 'الإسكندرية', 'Alexandria', true, CURRENT_TIMESTAMP),
  ('city_eg_ain_sokhna', 'country_eg', 'العين السخنة', 'Ain Sokhna', true, CURRENT_TIMESTAMP),
  ('city_eg_hurghada', 'country_eg', 'الغردقة', 'Hurghada', true, CURRENT_TIMESTAMP),
  ('city_eg_el_gouna', 'country_eg', 'الجونة', 'El Gouna', true, CURRENT_TIMESTAMP),
  ('city_eg_sharm_el_sheikh', 'country_eg', 'شرم الشيخ', 'Sharm El Sheikh', true, CURRENT_TIMESTAMP),
  ('city_eg_dahab', 'country_eg', 'دهب', 'Dahab', true, CURRENT_TIMESTAMP),
  ('city_eg_marsa_alam', 'country_eg', 'مرسى علم', 'Marsa Alam', false, CURRENT_TIMESTAMP),
  ('city_eg_luxor', 'country_eg', 'الأقصر', 'Luxor', false, CURRENT_TIMESTAMP),
  ('city_eg_aswan', 'country_eg', 'أسوان', 'Aswan', false, CURRENT_TIMESTAMP),
  ('city_sa_riyadh', 'country_sa', 'الرياض', 'Riyadh', false, CURRENT_TIMESTAMP),
  ('city_sa_jeddah', 'country_sa', 'جدة', 'Jeddah', false, CURRENT_TIMESTAMP),
  ('city_sa_al_khobar', 'country_sa', 'الخبر', 'Al Khobar', false, CURRENT_TIMESTAMP),
  ('city_sa_alula', 'country_sa', 'العلا', 'AlUla', false, CURRENT_TIMESTAMP),
  ('city_ae_dubai', 'country_ae', 'دبي', 'Dubai', false, CURRENT_TIMESTAMP),
  ('city_ae_abu_dhabi', 'country_ae', 'أبوظبي', 'Abu Dhabi', false, CURRENT_TIMESTAMP);

-- Starting property types. channelNames holds only the names that differ from
-- the suggestion for the Channex type (see lib/channex-catalog.ts).
INSERT INTO "PropertyType" ("id", "nameAr", "nameEn", "group", "channexType", "rentMode", "status", "channelNames", "sortOrder", "updatedAt") VALUES
  ('ptype_apartment', 'شقة', 'Apartment', 'APARTMENTS', 'apartment', 'WHOLE', 'ACTIVE', '{}', 10, CURRENT_TIMESTAMP),
  ('ptype_studio', 'ستوديو', 'Studio', 'APARTMENTS', 'apartment', 'WHOLE', 'ACTIVE', '{}', 20, CURRENT_TIMESTAMP),
  ('ptype_duplex', 'دوبلكس', 'Duplex', 'APARTMENTS', 'apartment', 'WHOLE', 'ACTIVE', '{}', 30, CURRENT_TIMESTAMP),
  ('ptype_penthouse', 'بنتهاوس', 'Penthouse', 'APARTMENTS', 'apartment', 'WHOLE', 'ACTIVE', '{}', 40, CURRENT_TIMESTAMP),
  ('ptype_roof', 'روف', 'Roof', 'APARTMENTS', 'apartment', 'WHOLE', 'ACTIVE', '{}', 50, CURRENT_TIMESTAMP),
  ('ptype_room_in_apartment', 'غرفة في شقة', 'Room in apartment', 'APARTMENTS', 'homestay', 'ROOMS', 'ACTIVE', '{"airbnb": "apartment", "expedia": "Not supported"}', 60, CURRENT_TIMESTAMP),
  ('ptype_chalet', 'شاليه', 'Chalet', 'APARTMENTS', 'chalet', 'WHOLE', 'ACTIVE', '{}', 70, CURRENT_TIMESTAMP),
  ('ptype_villa', 'فيلا', 'Villa', 'APARTMENTS', 'villa', 'WHOLE', 'ACTIVE', '{}', 80, CURRENT_TIMESTAMP),
  ('ptype_twin_house', 'توين هاوس', 'Twin house', 'APARTMENTS', 'holiday_home', 'WHOLE', 'ACTIVE', '{"airbnb": "townhouse"}', 90, CURRENT_TIMESTAMP),
  ('ptype_townhouse', 'تاون هاوس', 'Townhouse', 'APARTMENTS', 'holiday_home', 'WHOLE', 'ACTIVE', '{"airbnb": "townhouse", "expedia": "TownHouse (34)"}', 100, CURRENT_TIMESTAMP),
  ('ptype_serviced_apartments', 'شقق فندقية', 'Serviced apartments', 'HOTELS', 'apart_hotel', 'ROOMS', 'ACTIVE', '{}', 110, CURRENT_TIMESTAMP),
  ('ptype_guest_house', 'بيت ضيافة', 'Guest house', 'HOTELS', 'guest_house', 'ROOMS', 'ACTIVE', '{}', 120, CURRENT_TIMESTAMP),
  ('ptype_hotel', 'فندق', 'Hotel', 'HOTELS', 'hotel', 'ROOMS', 'ACTIVE', '{}', 130, CURRENT_TIMESTAMP),
  ('ptype_resort', 'منتجع', 'Resort', 'HOTELS', 'resort', 'ROOMS', 'ACTIVE', '{}', 140, CURRENT_TIMESTAMP),
  ('ptype_eco_lodge', 'نُزل بيئي', 'Eco-lodge', 'HOTELS', 'lodge', 'ROOMS', 'ACTIVE', '{}', 150, CURRENT_TIMESTAMP),
  ('ptype_hostel', 'هوستل', 'Hostel', 'HOTELS', 'hostel', 'ROOMS', 'ACTIVE', '{}', 160, CURRENT_TIMESTAMP),
  ('ptype_loft', 'لوفت', 'Loft', 'APARTMENTS', 'apartment', 'WHOLE', 'HIDDEN', '{"airbnb": "loft"}', 170, CURRENT_TIMESTAMP),
  ('ptype_condominium', 'شقة في كومباوند', 'Condominium', 'APARTMENTS', 'apartment', 'WHOLE', 'HIDDEN', '{"booking": "Holiday Home (5006)", "airbnb": "condominium", "expedia": "Condo (7)"}', 180, CURRENT_TIMESTAMP),
  ('ptype_homestay', 'إقامة مع المضيف', 'Homestay', 'APARTMENTS', 'homestay', 'ROOMS', 'HIDDEN', '{}', 190, CURRENT_TIMESTAMP),
  ('ptype_house', 'منزل', 'House', 'APARTMENTS', 'holiday_home', 'WHOLE', 'HIDDEN', '{}', 200, CURRENT_TIMESTAMP),
  ('ptype_cottage', 'كوخ ريفي', 'Cottage', 'APARTMENTS', 'holiday_home', 'WHOLE', 'HIDDEN', '{"airbnb": "cottage", "expedia": "Cottage (11)"}', 210, CURRENT_TIMESTAMP),
  ('ptype_bungalow', 'بنجلو', 'Bungalow', 'APARTMENTS', 'holiday_home', 'WHOLE', 'HIDDEN', '{"airbnb": "bungalow"}', 220, CURRENT_TIMESTAMP),
  ('ptype_cabin', 'كابينة', 'Cabin', 'APARTMENTS', 'holiday_home', 'WHOLE', 'HIDDEN', '{"airbnb": "cabin", "expedia": "Cabin (9)"}', 230, CURRENT_TIMESTAMP),
  ('ptype_tiny_house', 'بيت صغير', 'Tiny house', 'APARTMENTS', 'holiday_home', 'WHOLE', 'HIDDEN', '{"airbnb": "tiny_house"}', 240, CURRENT_TIMESTAMP),
  ('ptype_country_house', 'بيت ريفي', 'Country house', 'APARTMENTS', 'country_house', 'WHOLE', 'HIDDEN', '{}', 250, CURRENT_TIMESTAMP),
  ('ptype_bed_breakfast', 'مبيت وإفطار', 'Bed & Breakfast', 'HOTELS', 'guest_house', 'ROOMS', 'HIDDEN', '{"booking": "Bed and Breakfast (4)", "airbnb": "bnb", "expedia": "Bed & Breakfast (5)"}', 260, CURRENT_TIMESTAMP),
  ('ptype_boutique_hotel', 'فندق بوتيك', 'Boutique hotel', 'HOTELS', 'hotel', 'ROOMS', 'HIDDEN', '{"airbnb": "boutique_hotel"}', 270, CURRENT_TIMESTAMP),
  ('ptype_inn', 'نُزل', 'Inn', 'HOTELS', 'inn', 'ROOMS', 'HIDDEN', '{}', 280, CURRENT_TIMESTAMP),
  ('ptype_motel', 'موتيل', 'Motel', 'HOTELS', 'motel', 'ROOMS', 'HIDDEN', '{}', 290, CURRENT_TIMESTAMP),
  ('ptype_capsule_hotel', 'فندق كبسولات', 'Capsule hotel', 'HOTELS', 'capsule_hotel', 'ROOMS', 'HIDDEN', '{}', 300, CURRENT_TIMESTAMP),
  ('ptype_student_housing', 'سكن طلاب', 'Student housing', 'HOTELS', 'hostel', 'ROOMS', 'HIDDEN', '{"booking": "Student Accommodation (5011)"}', 310, CURRENT_TIMESTAMP),
  ('ptype_riad', 'رياض', 'Riad', 'HOTELS', 'riad', 'ROOMS', 'HIDDEN', '{}', 320, CURRENT_TIMESTAMP),
  ('ptype_ryokan', 'ريوكان', 'Ryokan', 'HOTELS', 'ryokan', 'ROOMS', 'HIDDEN', '{}', 330, CURRENT_TIMESTAMP),
  ('ptype_holiday_park', 'قرية سياحية', 'Holiday park', 'HOTELS', 'resort', 'ROOMS', 'HIDDEN', '{"booking": "Holiday Park (5009)", "agoda": "Holiday Park", "expedia": "Holiday Park (42)"}', 340, CURRENT_TIMESTAMP);

-- The two new modules. Must match MODULES in lib/modules.ts (a test checks this).
INSERT INTO "Module" ("id", "key", "name", "description", "sortOrder") VALUES
  ('module_property_types', 'property_types', 'Property types', 'Add types and link them to Channex and channels', 30),
  ('module_countries_cities', 'countries_cities', 'Countries and cities', 'The countries and cities brokers pick from', 40);

-- Super Admin gets every module.
INSERT INTO "RoleModule" ("roleId", "moduleId")
SELECT 'role_super_admin', "id" FROM "Module"
ON CONFLICT DO NOTHING;

