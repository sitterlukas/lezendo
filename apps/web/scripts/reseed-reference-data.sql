-- Re-seed the reference data that the migrations originally inserted but that
-- was wiped from the database: grading_systems, countries, grade_equivalencies.
--
-- This does NOT touch the schema or the migration ledger, and it does NOT
-- restore user-generated content (users, crags, routes, ascents, …) — only the
-- lookup/reference tables. It is idempotent (ON CONFLICT DO NOTHING), so it is
-- safe to run more than once.
--
-- grading_systems is inserted with EXPLICIT ids so that uiaa=3 / font=4 — the
-- ids the users.preferred_*_grading_system_id column defaults were baked against
-- (fixes the Google sign-up "violates foreign key constraint" / AccessDenied).
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/reseed-reference-data.sql

BEGIN;

-- ── grading_systems (explicit ids: french=1 yds=2 uiaa=3 font=4 v-scale=5 british=6)
INSERT INTO grading_systems (id, name, slug) VALUES
  (1, 'French',          'french'),
  (2, 'YDS',             'yds'),
  (3, 'UIAA',            'uiaa'),
  (4, 'Fontainebleau',   'font'),
  (5, 'V-scale (Hueco)', 'v-scale'),
  (6, 'British',         'british')
ON CONFLICT DO NOTHING;
-- Move the serial past the explicit ids so future inserts don't collide.
SELECT setval(pg_get_serial_sequence('grading_systems', 'id'),
              (SELECT MAX(id) FROM grading_systems));

-- ── countries (order/id irrelevant; crags.country is free text, not an FK)
INSERT INTO countries (name) VALUES
  ('Afghanistan'),('Albania'),('Algeria'),('Andorra'),('Angola'),
  ('Antigua and Barbuda'),('Argentina'),('Armenia'),('Australia'),('Austria'),
  ('Azerbaijan'),('Bahamas'),('Bahrain'),('Bangladesh'),('Barbados'),
  ('Belarus'),('Belgium'),('Belize'),('Benin'),('Bhutan'),
  ('Bolivia'),('Bosnia and Herzegovina'),('Botswana'),('Brazil'),('Brunei'),
  ('Bulgaria'),('Burkina Faso'),('Burundi'),('Cabo Verde'),('Cambodia'),
  ('Cameroon'),('Canada'),('Central African Republic'),('Chad'),('Chile'),
  ('China'),('Colombia'),('Comoros'),('Congo (Democratic Republic)'),('Congo (Republic)'),
  ('Costa Rica'),('Croatia'),('Cuba'),('Cyprus'),('Czech Republic'),
  ('Denmark'),('Djibouti'),('Dominica'),('Dominican Republic'),('Ecuador'),
  ('Egypt'),('El Salvador'),('Equatorial Guinea'),('Eritrea'),('Estonia'),
  ('Eswatini'),('Ethiopia'),('Fiji'),('Finland'),('France'),
  ('Gabon'),('Gambia'),('Georgia'),('Germany'),('Ghana'),
  ('Greece'),('Grenada'),('Guatemala'),('Guinea'),('Guinea-Bissau'),
  ('Guyana'),('Haiti'),('Honduras'),('Hungary'),('Iceland'),
  ('India'),('Indonesia'),('Iran'),('Iraq'),('Ireland'),
  ('Israel'),('Italy'),('Jamaica'),('Japan'),('Jordan'),
  ('Kazakhstan'),('Kenya'),('Kiribati'),('Kosovo'),('Kuwait'),
  ('Kyrgyzstan'),('Laos'),('Latvia'),('Lebanon'),('Lesotho'),
  ('Liberia'),('Libya'),('Liechtenstein'),('Lithuania'),('Luxembourg'),
  ('Madagascar'),('Malawi'),('Malaysia'),('Maldives'),('Mali'),
  ('Malta'),('Marshall Islands'),('Mauritania'),('Mauritius'),('Mexico'),
  ('Micronesia'),('Moldova'),('Monaco'),('Mongolia'),('Montenegro'),
  ('Morocco'),('Mozambique'),('Myanmar'),('Namibia'),('Nauru'),
  ('Nepal'),('Netherlands'),('New Zealand'),('Nicaragua'),('Niger'),
  ('Nigeria'),('North Korea'),('North Macedonia'),('Norway'),('Oman'),
  ('Pakistan'),('Palau'),('Palestine'),('Panama'),('Papua New Guinea'),
  ('Paraguay'),('Peru'),('Philippines'),('Poland'),('Portugal'),
  ('Qatar'),('Romania'),('Russia'),('Rwanda'),('Saint Kitts and Nevis'),
  ('Saint Lucia'),('Saint Vincent and the Grenadines'),('Samoa'),('San Marino'),
  ('Sao Tome and Principe'),('Saudi Arabia'),('Senegal'),('Serbia'),('Seychelles'),
  ('Sierra Leone'),('Singapore'),('Slovakia'),('Slovenia'),('Solomon Islands'),
  ('Somalia'),('South Africa'),('South Korea'),('South Sudan'),('Spain'),
  ('Sri Lanka'),('Sudan'),('Suriname'),('Sweden'),('Switzerland'),
  ('Syria'),('Taiwan'),('Tajikistan'),('Tanzania'),('Thailand'),
  ('Timor-Leste'),('Togo'),('Tonga'),('Trinidad and Tobago'),('Tunisia'),
  ('Turkey'),('Turkmenistan'),('Tuvalu'),('Uganda'),('Ukraine'),
  ('United Arab Emirates'),('United Kingdom'),('United States'),('Uruguay'),('Uzbekistan'),
  ('Vanuatu'),('Vatican City'),('Venezuela'),('Vietnam'),('Yemen'),
  ('Zambia'),('Zimbabwe')
ON CONFLICT (name) DO NOTHING;

-- ── grade_equivalencies (grading_system_id: french=1 yds=2 uiaa=3 font=4 v-scale=5 british=6)
INSERT INTO grade_equivalencies (equivalency_id, grading_system_id, grade, discipline) VALUES
  -- French (rope)
  (10,1,'3','rope'),(15,1,'4','rope'),(20,1,'4+','rope'),(25,1,'5','rope'),(30,1,'5+','rope'),
  (38,1,'6a','rope'),(43,1,'6a+','rope'),(48,1,'6b','rope'),(53,1,'6b+','rope'),(58,1,'6c','rope'),
  (63,1,'6c+','rope'),(68,1,'7a','rope'),(73,1,'7a+','rope'),(78,1,'7b','rope'),(83,1,'7b+','rope'),
  (88,1,'7c','rope'),(93,1,'7c+','rope'),(98,1,'8a','rope'),(103,1,'8a+','rope'),(108,1,'8b','rope'),
  (113,1,'8b+','rope'),(118,1,'8c','rope'),(123,1,'8c+','rope'),(128,1,'9a','rope'),(133,1,'9a+','rope'),
  (138,1,'9b','rope'),(143,1,'9b+','rope'),(148,1,'9c','rope'),
  -- YDS (rope)
  (10,2,'5.3','rope'),(15,2,'5.4','rope'),(20,2,'5.5','rope'),(25,2,'5.6','rope'),(30,2,'5.7','rope'),
  (34,2,'5.8','rope'),(38,2,'5.9','rope'),(43,2,'5.10a','rope'),(48,2,'5.10b','rope'),(53,2,'5.10c','rope'),
  (58,2,'5.10d','rope'),(63,2,'5.11a','rope'),(68,2,'5.11b','rope'),(73,2,'5.11c','rope'),(78,2,'5.11d','rope'),
  (83,2,'5.12a','rope'),(88,2,'5.12b','rope'),(93,2,'5.12c','rope'),(98,2,'5.12d','rope'),(103,2,'5.13a','rope'),
  (108,2,'5.13b','rope'),(113,2,'5.13c','rope'),(118,2,'5.13d','rope'),(123,2,'5.14a','rope'),(128,2,'5.14b','rope'),
  (133,2,'5.14c','rope'),(138,2,'5.14d','rope'),(143,2,'5.15a','rope'),(148,2,'5.15b','rope'),(153,2,'5.15c','rope'),
  (158,2,'5.15d','rope'),
  -- UIAA (rope)
  (10,3,'III','rope'),(15,3,'IV','rope'),(20,3,'IV+','rope'),(25,3,'V-','rope'),(30,3,'V','rope'),
  (34,3,'V+','rope'),(38,3,'VI-','rope'),(43,3,'VI','rope'),(48,3,'VI+','rope'),(53,3,'VII-','rope'),
  (63,3,'VII','rope'),(73,3,'VII+','rope'),(78,3,'VIII-','rope'),(88,3,'VIII','rope'),(98,3,'VIII+','rope'),
  (103,3,'IX-','rope'),(108,3,'IX','rope'),(113,3,'IX+','rope'),(118,3,'X-','rope'),(123,3,'X','rope'),
  (128,3,'X+','rope'),(133,3,'XI-','rope'),(138,3,'XI','rope'),(143,3,'XI+','rope'),(148,3,'XII','rope'),
  -- British trad (rope)
  (5,6,'Mod','rope'),(12,6,'D','rope'),(18,6,'VD','rope'),(24,6,'HVD','rope'),(28,6,'S','rope'),
  (33,6,'HS','rope'),(38,6,'VS','rope'),(43,6,'HVS','rope'),(53,6,'E1','rope'),(63,6,'E2','rope'),
  (70,6,'E3','rope'),(78,6,'E4','rope'),(88,6,'E5','rope'),(93,6,'E6','rope'),(103,6,'E7','rope'),
  (108,6,'E8','rope'),(113,6,'E9','rope'),(118,6,'E10','rope'),
  -- Fontainebleau (boulder)
  (5,4,'3','boulder'),(15,4,'4','boulder'),(25,4,'4+','boulder'),(35,4,'5','boulder'),(40,4,'5+','boulder'),
  (50,4,'6A','boulder'),(58,4,'6A+','boulder'),(65,4,'6B','boulder'),(73,4,'6B+','boulder'),(80,4,'6C','boulder'),
  (88,4,'6C+','boulder'),(95,4,'7A','boulder'),(103,4,'7A+','boulder'),(110,4,'7B','boulder'),(118,4,'7B+','boulder'),
  (125,4,'7C','boulder'),(133,4,'7C+','boulder'),(140,4,'8A','boulder'),(148,4,'8A+','boulder'),(155,4,'8B','boulder'),
  (163,4,'8B+','boulder'),(170,4,'8C','boulder'),(178,4,'8C+','boulder'),
  -- V-scale / Hueco (boulder)
  (5,5,'VB','boulder'),(20,5,'V0','boulder'),(30,5,'V0+','boulder'),(40,5,'V1','boulder'),(50,5,'V2','boulder'),
  (58,5,'V3','boulder'),(73,5,'V4','boulder'),(84,5,'V5','boulder'),(95,5,'V6','boulder'),(103,5,'V7','boulder'),
  (110,5,'V8','boulder'),(118,5,'V9','boulder'),(125,5,'V10','boulder'),(133,5,'V11','boulder'),(140,5,'V12','boulder'),
  (148,5,'V13','boulder'),(155,5,'V14','boulder'),(163,5,'V15','boulder'),(170,5,'V16','boulder'),(178,5,'V17','boulder')
ON CONFLICT (grading_system_id, grade) DO NOTHING;

COMMIT;
