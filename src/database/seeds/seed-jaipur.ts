import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import sharp from 'sharp';
import * as schema from '../schema';
import { seedWellness } from './seed-wellness';

const {
  bloodBankDirectoryEntries,
  careDirectoryEntries,
  careProviderAffiliations,
  doctorDepartments,
  doctorHospitalAffiliations,
  doctors,
  hospitals,
  medicalDepartments,
  medicalDiseases,
} = schema;

function initialsFor(name: string): string {
  const words = name.replace(/^Dr\.?\s+/i, '').split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || 'AR';
}

async function renderCardImage(
  kind: 'hospital' | 'doctor' | 'blood_bank',
  name: string,
  tag: string,
): Promise<Buffer> {
  const bg = kind === 'blood_bank' ? '#FCE4E2' : kind === 'doctor' ? '#D0F7FB' : '#DCF3EC';
  const fg = kind === 'blood_bank' ? '#9B2226' : kind === 'doctor' ? '#006973' : '#087D65';
  const badge = kind === 'blood_bank' ? 'BLOOD BANK' : kind === 'doctor' ? 'SPECIALIST' : 'HOSPITAL';
  const initials = initialsFor(name);
  const safeTag = tag.replace(/[<>&'"]/g, '').slice(0, 26);
  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="${bg}"/>
    <circle cx="340" cy="60" r="90" fill="${fg}" fill-opacity="0.10"/>
    <circle cx="60" cy="350" r="100" fill="${fg}" fill-opacity="0.08"/>
    <rect x="130" y="96" width="140" height="140" rx="36" fill="#FFFFFF"/>
    <text x="200" y="182" font-family="Arial, sans-serif" font-size="54" font-weight="bold" fill="${fg}" text-anchor="middle">${initials}</text>
    <rect x="115" y="262" width="170" height="32" rx="16" fill="${fg}"/>
    <text x="200" y="283" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${badge}</text>
    <text x="200" y="332" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0A1F1B" text-anchor="middle">${safeTag}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}

function seedUuid(key: string): string {
  const bytes = createHash('sha256').update(`arogio:jaipur:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x80;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return bytes.toString('hex').replace(/^(........)(....)(....)(....)/, '$1-$2-$3-$4-');
}

export const jaipurDepartments = [
  {
    record_key: 'dept-general-medicine',
    name_en: 'General Medicine',
    name_hi: 'सामान्य चिकित्सा',
    description_en: 'Primary care for fever, infections, diabetes, hypertension, and routine adult health.',
    description_hi: 'बुखार, संक्रमण, मधुमेह, उच्च रक्तचाप और सामान्य वयस्क स्वास्थ्य के लिए प्राथमिक देखभाल।',
    icon: 'stethoscope',
    sort_order: 1,
  },
  {
    record_key: 'dept-cardiology',
    name_en: 'Cardiology',
    name_hi: 'हृदय रोग विज्ञान',
    description_en: 'Heart, blood pressure, chest pain, ECG, angiography, and cardiac care.',
    description_hi: 'हृदय, रक्तचाप, सीने में दर्द, ईसीजी, एंजियोग्राफी और हृदय देखभाल।',
    icon: 'heart',
    sort_order: 2,
  },
  {
    record_key: 'dept-orthopedics',
    name_en: 'Orthopedics',
    name_hi: 'हड्डी एवं जोड़ रोग',
    description_en: 'Bone fractures, joint pain, arthritis, spine care, and sports injuries.',
    description_hi: 'हड्डी फ्रैक्चर, जोड़ों का दर्द, गठिया, रीढ़ की देखभाल और खेल चोटें।',
    icon: 'activity',
    sort_order: 3,
  },
  {
    record_key: 'dept-pediatrics',
    name_en: 'Pediatrics',
    name_hi: 'बाल रोग विज्ञान',
    description_en: 'Newborn care, childhood vaccinations, growth monitoring, and child illnesses.',
    description_hi: 'नवजात शिशु देखभाल, टीकाकरण, विकास निगरानी और बच्चों की बीमारियां।',
    icon: 'baby',
    sort_order: 4,
  },
  {
    record_key: 'dept-gynecology',
    name_en: 'Gynecology & Obstetrics',
    name_hi: 'स्त्री एवं प्रसूति रोग',
    description_en: 'Maternity care, pregnancy check-ups, menstrual health, and women’s wellness.',
    description_hi: 'मातृत्व देखभाल, गर्भावस्था जांच, मासिक धर्म स्वास्थ्य और महिला कल्याण।',
    icon: 'heart-handshake',
    sort_order: 5,
  },
  {
    record_key: 'dept-neurology',
    name_en: 'Neurology',
    name_hi: 'मस्तिष्क एवं तंत्रिका विज्ञान',
    description_en: 'Migraine, stroke, epilepsy, nerve pain, and memory disorders.',
    description_hi: 'माइग्रेन, स्ट्रोक, मिर्गी, नसों का दर्द और स्मृति संबंधी विकार।',
    icon: 'brain',
    sort_order: 6,
  },
  {
    record_key: 'dept-dermatology',
    name_en: 'Dermatology',
    name_hi: 'त्वचा रोग विज्ञान',
    description_en: 'Skin allergies, rashes, acne, fungal infections, hair, and nail care.',
    description_hi: 'त्वचा की एलर्जी, चकत्ते, मुंहासे, फंगल संक्रमण, बाल और नाखून की देखभाल।',
    icon: 'sparkles',
    sort_order: 7,
  },
  {
    record_key: 'dept-ophthalmology',
    name_en: 'Ophthalmology',
    name_hi: 'नेत्र रोग विज्ञान',
    description_en: 'Eye check-ups, cataract care, vision testing, and retinal screening.',
    description_hi: 'आंखों की जांच, मोतियाबिंद देखभाल, दृष्टि परीक्षण और रेटिना जांच।',
    icon: 'eye',
    sort_order: 8,
  },
  {
    record_key: 'dept-ent',
    name_en: 'ENT (Ear, Nose & Throat)',
    name_hi: 'कान, नाक एवं गला रोग',
    description_en: 'Sinusitis, ear infections, hearing loss, tonsillitis, and throat care.',
    description_hi: 'साइनस, कान का संक्रमण, सुनने की समस्या, टॉन्सिल और गले की देखभाल।',
    icon: 'ear',
    sort_order: 9,
  },
  {
    record_key: 'dept-pulmonology',
    name_en: 'Pulmonology',
    name_hi: 'श्वसन एवं फेफड़े रोग',
    description_en: 'Asthma, COPD, chronic cough, tuberculosis, and sleep-apnea care.',
    description_hi: 'दमा, सीओपीडी, पुरानी खांसी, टीबी और श्वास संबंधी विकारों की देखभाल।',
    icon: 'wind',
    sort_order: 10,
  },
  {
    record_key: 'dept-gastroenterology',
    name_en: 'Gastroenterology',
    name_hi: 'पाचन एवं लिवर रोग',
    description_en: 'Acidity, ulcers, liver care, jaundice, gallbladder, and digestive health.',
    description_hi: 'एसिडिटी, अल्सर, लिवर देखभाल, पीलिया और पाचन तंत्र का स्वास्थ्य।',
    icon: 'pill',
    sort_order: 11,
  },
  {
    record_key: 'dept-oncology',
    name_en: 'Oncology',
    name_hi: 'कैंसर रोग विज्ञान',
    description_en: 'Cancer screening, chemotherapy, radiation therapy, and surgical oncology.',
    description_hi: 'कैंसर जांच, कीमोथेरेपी, रेडिएशन थेरेपी और सर्जिकल ऑन्कोलॉजी।',
    icon: 'shield',
    sort_order: 12,
  },
] as const;

export const jaipurDiseases = [
  {
    record_key: 'disease-hypertension',
    department_key: 'dept-cardiology',
    name_en: 'Hypertension (High Blood Pressure)',
    name_hi: 'उच्च रक्तचाप (हाई बीपी)',
    description_en: 'Persistent elevated blood pressure in the arteries that increases heart and stroke risk.',
    description_hi: 'धमनियों में लगातार बढ़ा हुआ रक्तचाप जो हृदय रोग और स्ट्रोक का जोखिम बढ़ाता है।',
    symptoms_en: 'Often silent; may cause headache, dizziness, or shortness of breath when severe.',
    symptoms_hi: 'अक्सर लक्षणहीन; गंभीर स्थिति में सिरदर्द, चक्कर आना या सांस फूलना हो सकता है।',
    precautions_en: 'Limit salt, walk daily, take prescribed medicines regularly, and monitor BP.',
    precautions_hi: 'नमक कम करें, रोजाना टहलें, नियमित दवा लें और बीपी की जांच कराएं।',
    icon: 'heart',
  },
  {
    record_key: 'disease-type2-diabetes',
    department_key: 'dept-general-medicine',
    name_en: 'Type 2 Diabetes',
    name_hi: 'टाइप 2 मधुमेह (डायबिटीज)',
    description_en: 'Chronic condition affecting how the body regulates blood sugar (glucose).',
    description_hi: 'एक दीर्घकालिक स्थिति जो शरीर में रक्त शर्करा (ग्लूकोज) के स्तर को प्रभावित करती है।',
    symptoms_en: 'Increased thirst, frequent urination, fatigue, and slow-healing wounds.',
    symptoms_hi: 'अधिक प्यास लगना, बार-बार पेशाब आना, थकान और घाव देर से भरना।',
    precautions_en: 'Balanced low-sugar meals, regular exercise, foot care, and HbA1c monitoring.',
    precautions_hi: 'संतुलित कम-शर्करा आहार, नियमित व्यायाम, पैरों की देखभाल और शुगर जांच।',
    icon: 'droplet',
  },
  {
    record_key: 'disease-dengue',
    department_key: 'dept-general-medicine',
    name_en: 'Dengue Fever',
    name_hi: 'डेंगू बुखार',
    description_en: 'Mosquito-borne viral fever common during and after monsoon in Rajasthan.',
    description_hi: 'मच्छर जनित वायरल बुखार जो राजस्थान में मानसून के दौरान और बाद में आम है।',
    symptoms_en: 'High fever, severe headache, pain behind eyes, joint/muscle aches, and rash.',
    symptoms_hi: 'तेज बुखार, गंभीर सिरदर्द, आंखों के पीछे दर्द, जोड़ों में दर्द और चकत्ते।',
    precautions_en: 'Prevent standing water, use mosquito nets, stay hydrated, and avoid self-medicating with NSAIDs.',
    precautions_hi: 'पानी जमा न होने दें, मच्छरदानी का उपयोग करें, तरल पदार्थ पिएं और डॉक्टर से मिलें।',
    icon: 'thermometer',
  },
  {
    record_key: 'disease-asthma',
    department_key: 'dept-pulmonology',
    name_en: 'Bronchial Asthma',
    name_hi: 'दमा (अस्थमा)',
    description_en: 'Chronic airway inflammation causing wheezing, chest tightness, and breathlessness.',
    description_hi: 'श्वसन मार्ग की सूजन जिससे घरघराहट, सीने में जकड़न और सांस लेने में कठिनाई होती है।',
    symptoms_en: 'Shortness of breath, wheezing, and persistent night or early-morning cough.',
    symptoms_hi: 'सांस फूलना, सीटी जैसी आवाज आना और रात या सुबह के समय लगातार खांसी।',
    precautions_en: 'Avoid dust and smoke triggers, carry prescribed rescue inhaler, and practice gentle breathing.',
    precautions_hi: 'धूल और धुएं से बचें, निर्धारित इनहेलर साथ रखें और सहज श्वास अभ्यास करें।',
    icon: 'wind',
  },
  {
    record_key: 'disease-osteoarthritis',
    department_key: 'dept-orthopedics',
    name_en: 'Osteoarthritis (Knee & Joint Pain)',
    name_hi: 'जोड़ों का दर्द (ऑस्टियोआर्थराइटिस)',
    description_en: 'Wear-and-tear arthritis affecting knees, hips, and hands.',
    description_hi: 'घुटनों, कूल्हों और हाथों के जोड़ों में घिसाव के कारण होने वाला दर्द और जकड़न।',
    symptoms_en: 'Joint stiffness after rest, aching during movement, and mild swelling.',
    symptoms_hi: 'आराम के बाद जोड़ों में जकड़न, चलने पर दर्द और हल्की सूजन।',
    precautions_en: 'Maintain healthy weight, do low-impact chair/mat exercises, and avoid deep squatting if painful.',
    precautions_hi: 'संतुलित वजन रखें, हल्का व्यायाम करें और दर्द होने पर गहरे बैठने से बचें।',
    icon: 'activity',
  },
  {
    record_key: 'disease-migraine',
    department_key: 'dept-neurology',
    name_en: 'Migraine',
    name_hi: 'माइग्रेन (अधकपारी)',
    description_en: 'Recurrent throbbing headache often accompanied by light or sound sensitivity.',
    description_hi: 'बार-बार होने वाला तेज सिरदर्द जो अक्सर रोशनी या आवाज के प्रति संवेदनशीलता के साथ होता है।',
    symptoms_en: 'One-sided pulsing headache, nausea, and sensitivity to bright light or noise.',
    symptoms_hi: 'एक तरफ धड़कता हुआ सिरदर्द, जी मिचलाना और तेज रोशनी या शोर से परेशानी।',
    precautions_en: 'Keep regular sleep/meal times, stay hydrated in Jaipur heat, and avoid known triggers.',
    precautions_hi: 'नियमित नींद और भोजन का समय रखें, पर्याप्त पानी पिएं और ट्रिगर्स से बचें।',
    icon: 'brain',
  },
  {
    record_key: 'disease-cataract',
    department_key: 'dept-ophthalmology',
    name_en: 'Cataract',
    name_hi: 'मोतियाबिंद',
    description_en: 'Clouding of the natural lens of the eye leading to blurred or dim vision.',
    description_hi: 'आंख के प्राकृतिक लेंस में धुंधलापन जिससे दृष्टि कमजोर या धुंधली हो जाती है।',
    symptoms_en: 'Cloudy vision, glare from headlights at night, and faded colors.',
    symptoms_hi: 'धुंधला दिखना, रात में रोशनी से चकाचौंध और रंगों का फीका दिखना।',
    precautions_en: 'Wear UV sunglasses outdoors, manage blood sugar, and get annual eye exams.',
    precautions_hi: 'धूप में यूवी चश्मा पहनें, शुगर नियंत्रित रखें और नियमित नेत्र जांच कराएं।',
    icon: 'eye',
  },
  {
    record_key: 'disease-gerd',
    department_key: 'dept-gastroenterology',
    name_en: 'Acid Reflux (GERD)',
    name_hi: 'एसिडिटी एवं गैस (जीईआरडी)',
    description_en: 'Stomach acid flowing back into the food pipe causing heartburn.',
    description_hi: 'पेट का एसिड भोजन नली में वापस आने से सीने में जलन और खट्टी डकार।',
    symptoms_en: 'Burning chest discomfort after meals, sour taste, and bloating.',
    symptoms_hi: 'भोजन के बाद सीने में जलन, खट्टा स्वाद और पेट फूलना।',
    precautions_en: 'Eat smaller meals, avoid lying down immediately after dinner, and limit spicy/fried foods.',
    precautions_hi: 'कम मात्रा में भोजन करें, खाने के तुरंत बाद न लेटें और तला-भुना कम खाएं।',
    icon: 'pill',
  },
] as const;

export const jaipurHospitals = [
  {
    record_key: 'hosp-sms-jaipur',
    name_en: 'Sawai Man Singh (SMS) Hospital',
    name_hi: 'सवाई मान सिंह (एसएमएस) अस्पताल',
    hospital_type: 'Government Tertiary Teaching Hospital',
    address_line1: 'Jawaharlal Nehru Marg, Ashok Nagar',
    address_line2: 'Near Narayan Singh Circle',
    landmark: 'Narayan Singh Circle',
    address_hi: 'जवाहरलाल नेहरू मार्ग, अशोक नगर, नारायण सिंह सर्किल के पास, जयपुर',
    pincode: '302004',
    phone_1: '01412562299',
    phone_2: '01412566378',
    website: 'https://medicaleducation.rajasthan.gov.in/smsjaipur',
    latitude: 26.9062,
    longitude: 75.8159,
    accepts_ayushman: true,
    accepts_janaadhaar: true,
    accepts_cghs: true,
    accepts_esic: true,
    rgahs_approved: true,
    is_cashless: true,
    nabh_accredited: true,
    is_24_7: true,
    cashless_schemes: ['Ayushman Bharat', 'RGHS', 'Chiranjeevi / Jan Aadhaar'],
    specialties: ['General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Pediatrics', 'Emergency'],
    summary_en: 'Rajasthan’s largest government tertiary referral hospital with 24/7 trauma, emergency, super-specialty OPDs, and blood bank.',
    summary_hi: 'राजस्थान का सबसे बड़ा सरकारी रेफरल अस्पताल, जहां 24/7 ट्रॉमा, आपातकालीन सेवाएं और सभी प्रमुख विशेषज्ञ विभाग उपलब्ध हैं।',
  },
  {
    record_key: 'hosp-fortis-jaipur',
    name_en: 'Fortis Escorts Hospital, Jaipur',
    name_hi: 'फोर्टिस एस्कॉर्ट्स अस्पताल, जयपुर',
    hospital_type: 'Multi-Specialty Private Hospital',
    address_line1: 'Jawaharlal Nehru Marg, Sector 5, Malviya Nagar',
    address_line2: 'Mata Colony',
    landmark: 'JLN Marg, Malviya Nagar',
    address_hi: 'जवाहरलाल नेहरू मार्ग, सेक्टर 5, मालवीय नगर, जयपुर',
    pincode: '302017',
    phone_1: '01412547000',
    phone_2: '01412547009',
    website: 'https://www.fortishealthcare.com/hospitals/jaipur',
    latitude: 26.8466,
    longitude: 75.8037,
    accepts_ayushman: false,
    accepts_janaadhaar: false,
    accepts_cghs: true,
    accepts_esic: false,
    rgahs_approved: true,
    is_cashless: true,
    nabh_accredited: true,
    is_24_7: true,
    cashless_schemes: ['RGHS', 'CGHS', 'Major TPA Insurance'],
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Gastroenterology', 'Emergency'],
    summary_en: 'NABH-accredited multi-specialty tertiary care hospital on JLN Marg with 24/7 cardiac & trauma emergency.',
    summary_hi: 'जेएलएन मार्ग पर एनएबीएच मान्यता प्राप्त मल्टी-स्पेशलिटी अस्पताल, 24/7 हृदय और आपातकालीन देखभाल के साथ।',
  },
  {
    record_key: 'hosp-ehcc-jaipur',
    name_en: 'Eternal Hospital (EHCC)',
    name_hi: 'इटरनल अस्पताल (ईएचसीसी), जयपुर',
    hospital_type: 'Multi-Specialty Private Hospital',
    address_line1: '3A, Jagatpura Road',
    address_line2: 'Near Jawahar Circle',
    landmark: 'Jawahar Circle',
    address_hi: '3ए, जगतपुरा रोड, जवाहर सर्किल के पास, जयपुर',
    pincode: '302017',
    phone_1: '01415174000',
    phone_2: '01414954000',
    website: 'https://www.eternalhospital.com',
    latitude: 26.8414,
    longitude: 75.8007,
    accepts_ayushman: false,
    accepts_janaadhaar: false,
    accepts_cghs: true,
    accepts_esic: false,
    rgahs_approved: true,
    is_cashless: true,
    nabh_accredited: true,
    is_24_7: true,
    cashless_schemes: ['RGHS', 'CGHS', 'Major TPA Insurance'],
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pulmonology', 'Gastroenterology', 'Emergency'],
    summary_en: 'Tertiary care hospital near Jawahar Circle specializing in cardiac sciences, neurology, orthopedics, and critical care.',
    summary_hi: 'जवाहर सर्किल के पास स्थित मल्टी-स्पेशलिटी अस्पताल, हृदय, न्यूरोलॉजी और क्रिटिकल केयर सेवाओं के लिए प्रसिद्ध।',
  },
  {
    record_key: 'hosp-sdmh-jaipur',
    name_en: 'Santokba Durlabhji Memorial Hospital (SDMH)',
    name_hi: 'संतोकबा दुर्लभजी मेमोरियल अस्पताल (एसडीएमएच)',
    hospital_type: 'Trust Multi-Specialty Hospital',
    address_line1: 'Bhawani Singh Marg',
    address_line2: 'Near Rambagh Circle',
    landmark: 'Rambagh Circle',
    address_hi: 'भवानी सिंह मार्ग, रामबाग सर्किल के पास, जयपुर',
    pincode: '302015',
    phone_1: '01413524444',
    phone_2: '01412566251',
    website: 'https://sdmh.in',
    latitude: 26.8982,
    longitude: 75.8087,
    accepts_ayushman: true,
    accepts_janaadhaar: true,
    accepts_cghs: true,
    accepts_esic: true,
    rgahs_approved: true,
    is_cashless: true,
    nabh_accredited: true,
    is_24_7: true,
    cashless_schemes: ['Ayushman Bharat', 'RGHS', 'CGHS', 'ESIC'],
    specialties: ['General Medicine', 'Cardiology', 'Pediatrics', 'Gynecology & Obstetrics', 'Ophthalmology', 'ENT', 'Oncology'],
    summary_en: 'Trusted charitable multi-specialty hospital near Rambagh Circle with 24/7 emergency and blood bank.',
    summary_hi: 'रामबाग सर्किल के पास विश्वसनीय ट्रस्ट मल्टी-स्पेशलिटी अस्पताल, 24/7 आपातकालीन और ब्लड बैंक सुविधाओं के साथ।',
  },
  {
    record_key: 'hosp-narayana-jaipur',
    name_en: 'Narayana Multispeciality Hospital, Jaipur',
    name_hi: 'नारायणा मल्टीस्पेशलिटी अस्पताल, जयपुर',
    hospital_type: 'Multi-Specialty Private Hospital',
    address_line1: 'Sector 28, Kumbha Marg, Pratap Nagar',
    address_line2: 'Sanganer',
    landmark: 'Kumbha Marg, Pratap Nagar',
    address_hi: 'सेक्टर 28, कुंभा मार्ग, प्रताप नगर, सांगानेर, जयपुर',
    pincode: '302033',
    phone_1: '08067506880',
    phone_2: '08069266140',
    website: 'https://www.narayanahealth.org/hospitals/jaipur',
    latitude: 26.8035,
    longitude: 75.8168,
    accepts_ayushman: true,
    accepts_janaadhaar: true,
    accepts_cghs: true,
    accepts_esic: true,
    rgahs_approved: true,
    is_cashless: true,
    nabh_accredited: true,
    is_24_7: true,
    cashless_schemes: ['Ayushman Bharat', 'RGHS', 'CGHS', 'ESIC'],
    specialties: ['Cardiology', 'Orthopedics', 'Neurology', 'Oncology', 'Gynecology & Obstetrics', 'Pediatrics'],
    summary_en: 'NABH-accredited multi-specialty hospital in Pratap Nagar offering 24/7 emergency, cardiac, and surgical care.',
    summary_hi: 'प्रताप नगर में एनएबीएच मान्यता प्राप्त मल्टी-स्पेशलिटी अस्पताल, 24/7 आपातकालीन और हृदय देखभाल के साथ।',
  },
  {
    record_key: 'hosp-manipal-jaipur',
    name_en: 'Manipal Hospital, Jaipur',
    name_hi: 'मणिपाल अस्पताल, जयपुर',
    hospital_type: 'Multi-Specialty Private Hospital',
    address_line1: 'Sector 5, Main Sikar Road',
    address_line2: 'Vidyadhar Nagar',
    landmark: 'Sikar Road, Vidyadhar Nagar',
    address_hi: 'सेक्टर 5, मुख्य सीकर रोड, विद्याधर नगर, जयपुर',
    pincode: '302039',
    phone_1: '09116656540',
    phone_2: null,
    website: 'https://www.manipalhospitals.com',
    latitude: 26.9685,
    longitude: 75.7745,
    accepts_ayushman: false,
    accepts_janaadhaar: false,
    accepts_cghs: true,
    accepts_esic: false,
    rgahs_approved: true,
    is_cashless: true,
    nabh_accredited: true,
    is_24_7: true,
    cashless_schemes: ['RGHS', 'CGHS', 'Major TPA Insurance'],
    specialties: ['General Medicine', 'Cardiology', 'Orthopedics', 'Neurology', 'Dermatology', 'Pulmonology'],
    summary_en: 'Multi-specialty hospital serving North Jaipur (Vidyadhar Nagar / Sikar Road) with 24/7 emergency and ICU care.',
    summary_hi: 'विद्याधर नगर और सीकर रोड क्षेत्र में 24/7 आपातकालीन और आईसीयू सुविधाओं वाला मल्टी-स्पेशलिटी अस्पताल।',
  },
  {
    record_key: 'hosp-mgmch-sitapura',
    name_en: 'Mahatma Gandhi Hospital, Sitapura',
    name_hi: 'महात्मा गांधी अस्पताल, सीतापुरा',
    hospital_type: 'Medical College Teaching Hospital',
    address_line1: 'RIICO Institutional Area, Sitapura',
    address_line2: 'Tonk Road',
    landmark: 'Sitapura Industrial Area',
    address_hi: 'रीको इंस्टीट्यूशनल एरिया, सीतापुरा, टोंक रोड, जयपुर',
    pincode: '302022',
    phone_1: '01412771002',
    phone_2: '01412770798',
    website: 'https://www.mgmch.org',
    latitude: 26.7689,
    longitude: 75.8535,
    accepts_ayushman: true,
    accepts_janaadhaar: true,
    accepts_cghs: true,
    accepts_esic: true,
    rgahs_approved: true,
    is_cashless: true,
    nabh_accredited: true,
    is_24_7: true,
    cashless_schemes: ['Ayushman Bharat', 'RGHS', 'Chiranjeevi / Jan Aadhaar', 'ESIC'],
    specialties: ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology & Obstetrics', 'Oncology'],
    summary_en: 'Large medical college teaching hospital in Sitapura providing 24/7 emergency, super-specialty, and transplant care.',
    summary_hi: 'सीतापुरा में स्थित मेडिकल कॉलेज एवं सुपर-स्पेशलिटी अस्पताल, 24/7 आपातकालीन सेवाओं के साथ।',
  },
  {
    record_key: 'hosp-ck-birla-jaipur',
    name_en: 'CK Birla Hospital (Rukmani Birla Hospital)',
    name_hi: 'सीके बिड़ला अस्पताल (रुक्मणि बिड़ला), जयपुर',
    hospital_type: 'Multi-Specialty Private Hospital',
    address_line1: 'Gopalpura Bypass Road, Shanti Nagar',
    address_line2: 'Near Triveni Flyover, Gopal Pura Mode',
    landmark: 'Triveni Flyover',
    address_hi: 'गोपालपुरा बाईपास रोड, त्रिवेणी फ्लाईओवर के पास, जयपुर',
    pincode: '302018',
    phone_1: '07412890005',
    phone_2: '07340054470',
    website: 'https://ckbirlahospitals.com',
    latitude: 26.8669,
    longitude: 75.7867,
    accepts_ayushman: false,
    accepts_janaadhaar: false,
    accepts_cghs: true,
    accepts_esic: false,
    rgahs_approved: true,
    is_cashless: true,
    nabh_accredited: true,
    is_24_7: true,
    cashless_schemes: ['RGHS', 'CGHS', 'Major TPA Insurance'],
    specialties: ['Cardiology', 'Orthopedics', 'Gynecology & Obstetrics', 'Pediatrics', 'Neurology', 'ENT'],
    summary_en: 'NABH-accredited multi-specialty hospital on Gopalpura Bypass with 24/7 emergency and critical care.',
    summary_hi: 'गोपालपुरा बाईपास पर स्थित एनएबीएच मान्यता प्राप्त मल्टी-स्पेशलिटी अस्पताल, 24/7 आपातकालीन सेवाओं सहित।',
  },
] as const;

const allBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const jaipurBloodBanks = [
  {
    record_key: 'bb-sms-jaipur',
    name_en: 'SMS Hospital Blood Bank',
    name_hi: 'एसएमएस अस्पताल ब्लड बैंक',
    pincode: '302004',
    landmark: 'Narayan Singh Circle',
    address_en: 'Jawaharlal Nehru Marg, Ashok Nagar, Near Narayan Singh Circle, Jaipur',
    address_hi: 'जवाहरलाल नेहरू मार्ग, अशोक नगर, नारायण सिंह सर्किल के पास, जयपुर',
    phone: '01412562299',
    emergency_phone: '01412566378',
    website: 'https://medicaleducation.rajasthan.gov.in/smsjaipur',
    is_24_7: true,
    is_government: true,
    component_facility: true,
    apheresis_facility: true,
    available_blood_groups: allBloodGroups,
    latitude: 26.9062,
    longitude: 75.8159,
  },
  {
    record_key: 'bb-sdmh-jaipur',
    name_en: 'Santokba Durlabhji Memorial Hospital Blood Bank',
    name_hi: 'संतोकबा दुर्लभजी मेमोरियल अस्पताल ब्लड बैंक',
    pincode: '302015',
    landmark: 'Rambagh Circle',
    address_en: 'Bhawani Singh Marg, Near Rambagh Circle, Jaipur',
    address_hi: 'भवानी सिंह मार्ग, रामबाग सर्किल के पास, जयपुर',
    phone: '01413524444',
    emergency_phone: '01412566251',
    website: 'https://sdmh.in',
    is_24_7: true,
    is_government: false,
    component_facility: true,
    apheresis_facility: true,
    available_blood_groups: allBloodGroups,
    latitude: 26.8982,
    longitude: 75.8087,
  },
  {
    record_key: 'bb-swasthya-kalyan-milap',
    name_en: 'Swasthya Kalyan Blood Bank (Milap Nagar)',
    name_hi: 'स्वास्थ्य कल्याण ब्लड बैंक (मिलाप नगर)',
    pincode: '302018',
    landmark: 'Near Jaipuria Hospital / Durgapura',
    address_en: '125, Milap Nagar, Tonk Road, Jaipur',
    address_hi: '125, मिलाप नगर, टोंक रोड, जयपुर',
    phone: '01412721771',
    emergency_phone: '01412545293',
    website: 'https://www.swasthyakalyan.com',
    is_24_7: true,
    is_government: false,
    component_facility: true,
    apheresis_facility: true,
    available_blood_groups: allBloodGroups,
    latitude: 26.8495,
    longitude: 75.7963,
  },
  {
    record_key: 'bb-agrasen-swasthya-kalyan',
    name_en: 'Agrasen Swasthya Kalyan Blood Bank',
    name_hi: 'अग्रसेन स्वास्थ्य कल्याण ब्लड बैंक',
    pincode: '302023',
    landmark: 'Sector 7, Vidyadhar Nagar',
    address_en: 'Maharaja Agrasen Hospital, Sector 7, Vidyadhar Nagar, Jaipur',
    address_hi: 'महाराजा अग्रसेन अस्पताल, सेक्टर 7, विद्याधर नगर, जयपुर',
    phone: '01412335569',
    emergency_phone: null,
    website: 'https://www.swasthyakalyan.com',
    is_24_7: true,
    is_government: false,
    component_facility: true,
    apheresis_facility: false,
    available_blood_groups: allBloodGroups,
    latitude: 26.9605,
    longitude: 75.7782,
  },
  {
    record_key: 'bb-apex-swasthya-kalyan',
    name_en: 'Apex Swasthya Kalyan Blood Bank',
    name_hi: 'एपेक्स स्वास्थ्य कल्याण ब्लड बैंक',
    pincode: '302017',
    landmark: 'Malviya Nagar Industrial Area',
    address_en: 'Apex Hospital, SP-4 & 6, Malviya Nagar Industrial Area, Jaipur',
    address_hi: 'एपेक्स अस्पताल, एसपी-4 और 6, मालवीय नगर इंडस्ट्रियल एरिया, जयपुर',
    phone: '01412751870',
    emergency_phone: '01414101111',
    website: 'https://www.swasthyakalyan.com',
    is_24_7: true,
    is_government: false,
    component_facility: true,
    apheresis_facility: true,
    available_blood_groups: allBloodGroups,
    latitude: 26.8543,
    longitude: 75.8224,
  },
  {
    record_key: 'bb-bmchrc-jaipur',
    name_en: 'Bhagwan Mahaveer Cancer Hospital Blood Bank',
    name_hi: 'भगवान महावीर कैंसर अस्पताल ब्लड बैंक',
    pincode: '302017',
    landmark: 'Near Saras Sankul, Bajaj Nagar',
    address_en: 'Jawahar Lal Nehru Marg, Bajaj Nagar, Jaipur',
    address_hi: 'जवाहर लाल नेहरू मार्ग, बजाज नगर, जयपुर',
    phone: '01412700107',
    emergency_phone: '09414273735',
    website: 'https://www.bmchrc.org',
    is_24_7: true,
    is_government: false,
    component_facility: true,
    apheresis_facility: true,
    available_blood_groups: allBloodGroups,
    latitude: 26.8726,
    longitude: 75.8124,
  },
] as const;

export const jaipurDoctors = [
  {
    record_key: 'doc-amit-singhal-fortis',
    hospital_key: 'hosp-fortis-jaipur',
    department_key: 'dept-cardiology',
    name_en: 'Dr. Amit Kumar Singhal',
    name_hi: 'डॉ. अमित कुमार सिंघल',
    qualifications: ['MBBS', 'MD (Medicine)', 'DM (Cardiology)'],
    languages: ['English', 'Hindi'],
    summary_en: 'Director, Interventional Cardiology at Fortis Escorts Hospital, Jaipur.',
    summary_hi: 'फोर्टिस एस्कॉर्ट्स अस्पताल, जयपुर में इंटरवेंशनल कार्डियोलॉजी के निदेशक।',
    website: 'https://www.fortishealthcare.com/hospitals/jaipur',
  },
  {
    record_key: 'doc-anoop-jhurani-fortis',
    hospital_key: 'hosp-fortis-jaipur',
    department_key: 'dept-orthopedics',
    name_en: 'Dr. Anoop Jhurani',
    name_hi: 'डॉ. अनूप झुरानी',
    qualifications: ['MBBS', 'MS (Orthopedics)'],
    languages: ['English', 'Hindi'],
    summary_en: 'Senior Director & HOD, Orthopaedics and Joint Replacement at Fortis Escorts Hospital, Jaipur.',
    summary_hi: 'फोर्टिस एस्कॉर्ट्स अस्पताल, जयपुर में ऑर्थोपेडिक्स एवं जॉइंट रिप्लेसमेंट के विभागाध्यक्ष।',
    website: 'https://www.fortishealthcare.com/hospitals/jaipur',
  },
  {
    record_key: 'doc-neetu-ramrakhiani-fortis',
    hospital_key: 'hosp-fortis-jaipur',
    department_key: 'dept-neurology',
    name_en: 'Dr. Neetu Ramrakhiani',
    name_hi: 'डॉ. नीतू रामरखियानी',
    qualifications: ['MBBS', 'MD (Medicine)', 'DM (Neurology)'],
    languages: ['English', 'Hindi'],
    summary_en: 'Director, Neurology at Fortis Escorts Hospital, Jaipur.',
    summary_hi: 'फोर्टिस एस्कॉर्ट्स अस्पताल, जयपुर में न्यूरोलॉजी की निदेशक।',
    website: 'https://www.fortishealthcare.com/hospitals/jaipur',
  },
  {
    record_key: 'doc-sanjeev-sharma-ehcc',
    hospital_key: 'hosp-ehcc-jaipur',
    department_key: 'dept-cardiology',
    name_en: 'Dr. Sanjeev Sharma',
    name_hi: 'डॉ. संजीव शर्मा',
    qualifications: ['MBBS', 'MD', 'DM (Cardiology)'],
    languages: ['English', 'Hindi'],
    summary_en: 'Chairman & Senior Interventional Cardiologist at Eternal Hospital (EHCC), Jaipur.',
    summary_hi: 'इटरनल अस्पताल (ईएचसीसी), जयपुर में चेयरमैन एवं वरिष्ठ इंटरवेंशनल कार्डियोलॉजिस्ट।',
    website: 'https://www.eternalhospital.com',
  },
  {
    record_key: 'doc-surendra-khosya-ehcc',
    hospital_key: 'hosp-ehcc-jaipur',
    department_key: 'dept-neurology',
    name_en: 'Dr. Surendra Khosya',
    name_hi: 'डॉ. सुरेंद्र खोस्या',
    qualifications: ['MBBS', 'MD', 'DM (Neurology)'],
    languages: ['English', 'Hindi'],
    summary_en: 'Consultant Neurology (Epilepsy & Stroke Specialist) at Eternal Hospital (EHCC), Jaipur.',
    summary_hi: 'इटरनल अस्पताल (ईएचसीसी), जयपुर में न्यूरोलॉजी (मिर्गी एवं स्ट्रोक) विशेषज्ञ।',
    website: 'https://www.eternalhospital.com',
  },
  {
    record_key: 'doc-rajeev-bhargava-ehcc',
    hospital_key: 'hosp-ehcc-jaipur',
    department_key: 'dept-orthopedics',
    name_en: 'Dr. Rajeev Bhargava',
    name_hi: 'डॉ. राजीव भार्गव',
    qualifications: ['MBBS', 'MS (Orthopedics)'],
    languages: ['English', 'Hindi'],
    summary_en: 'Chairman & HOD, Orthopaedics at Eternal Hospital (EHCC), Jaipur.',
    summary_hi: 'इटरनल अस्पताल (ईएचसीसी), जयपुर में ऑर्थोपेडिक्स विभाग के चेयरमैन एवं विभागाध्यक्ष।',
    website: 'https://www.eternalhospital.com',
  },
  {
    record_key: 'doc-devendra-shrimal-narayana',
    hospital_key: 'hosp-narayana-jaipur',
    department_key: 'dept-cardiology',
    name_en: 'Dr. Devendra Kumar Shrimal',
    name_hi: 'डॉ. देवेंद्र कुमार श्रीमाल',
    qualifications: ['MBBS', 'MD', 'DM (Cardiology)'],
    languages: ['English', 'Hindi'],
    summary_en: 'Director, Adult Cardiology at Narayana Multispeciality Hospital, Jaipur.',
    summary_hi: 'नारायणा मल्टीस्पेशलिटी अस्पताल, जयपुर में एडल्ट कार्डियोलॉजी के निदेशक।',
    website: 'https://www.narayanahealth.org/hospitals/jaipur',
  },
  {
    record_key: 'doc-usha-agarwal-narayana',
    hospital_key: 'hosp-narayana-jaipur',
    department_key: 'dept-gynecology',
    name_en: 'Dr. Usha Agarwal',
    name_hi: 'डॉ. उषा अग्रवाल',
    qualifications: ['MBBS', 'MS (Obstetrics & Gynaecology)'],
    languages: ['English', 'Hindi'],
    summary_en: 'Senior Consultant, Obstetrics & Gynaecology at Narayana Multispeciality Hospital, Jaipur.',
    summary_hi: 'नारायणा मल्टीस्पेशलिटी अस्पताल, जयपुर में प्रसूति एवं स्त्री रोग की वरिष्ठ विशेषज्ञ।',
    website: 'https://www.narayanahealth.org/hospitals/jaipur',
  },
  {
    record_key: 'doc-prashant-mahawar-narayana',
    hospital_key: 'hosp-narayana-jaipur',
    department_key: 'dept-pediatrics',
    name_en: 'Dr. Prashant Mahawar',
    name_hi: 'डॉ. प्रशांत महावर',
    qualifications: ['MBBS', 'MD (Pediatrics)', 'FNB (Paediatric Cardiology)'],
    languages: ['English', 'Hindi'],
    summary_en: 'Senior Consultant, Paediatric Cardiology & Pediatrics at Narayana Multispeciality Hospital, Jaipur.',
    summary_hi: 'नारायणा मल्टीस्पेशलिटी अस्पताल, जयपुर में बाल हृदय रोग एवं शिशु रोग विशेषज्ञ।',
    website: 'https://www.narayanahealth.org/hospitals/jaipur',
  },
] as const;

export async function seedJaipur<
  TQuery extends PgQueryResultHKT,
  TSchema extends Record<string, unknown>,
>(db: PgDatabase<TQuery, TSchema>, options: { reset?: boolean } = {}) {
  const now = new Date();
  const hospitalImages = new Map<string, { data: Buffer; rev: string; url: string }>();
  for (const hosp of jaipurHospitals) {
    const id = seedUuid(hosp.record_key);
    const rev = seedUuid(`img:${hosp.record_key}`);
    const data = await renderCardImage('hospital', hosp.name_en, hosp.pincode);
    hospitalImages.set(hosp.record_key, { data, rev, url: `/api/v1/public/hospitals/${id}/image?v=${rev}` });
  }
  const doctorImages = new Map<string, { data: Buffer; rev: string; url: string }>();
  for (const doc of jaipurDoctors) {
    const id = seedUuid(doc.record_key);
    const rev = seedUuid(`img:${doc.record_key}`);
    const deptName = jaipurDepartments.find((d) => d.record_key === doc.department_key)?.name_en ?? 'Specialist';
    const data = await renderCardImage('doctor', doc.name_en, deptName);
    doctorImages.set(doc.record_key, { data, rev, url: `/api/v1/public/doctors/${id}/image?v=${rev}` });
  }
  const bankImages = new Map<string, { data: Buffer; rev: string; url: string }>();
  for (const bb of jaipurBloodBanks) {
    const id = seedUuid(bb.record_key);
    const rev = seedUuid(`img:${bb.record_key}`);
    const data = await renderCardImage('blood_bank', bb.name_en, bb.pincode);
    bankImages.set(bb.record_key, { data, rev, url: `/api/v1/public/blood-banks/${id}/image?v=${rev}` });
  }

  const summary = await db.transaction(async (tx) => {
    if (options.reset) {
      await tx.delete(careProviderAffiliations);
      await tx.delete(doctorHospitalAffiliations);
      await tx.delete(doctorDepartments);
      await tx.delete(doctors);
      await tx.delete(medicalDiseases);
      await tx.delete(medicalDepartments);
      await tx.delete(hospitals);
      await tx.delete(careDirectoryEntries);
      await tx.delete(bloodBankDirectoryEntries);
    }

    const deptIds = new Map<string, string>();
    for (const dept of jaipurDepartments) {
      const id = seedUuid(dept.record_key);
      deptIds.set(dept.record_key, id);
      await tx
        .insert(medicalDepartments)
        .values({
          id,
          record_key: dept.record_key,
          name_en: dept.name_en,
          name_hi: dept.name_hi,
          description_en: dept.description_en,
          description_hi: dept.description_hi,
          icon: dept.icon,
          sort_order: dept.sort_order,
          is_active: true,
          updated_at: now,
        })
        .onConflictDoUpdate({
          target: medicalDepartments.record_key,
          set: {
            name_en: dept.name_en,
            name_hi: dept.name_hi,
            description_en: dept.description_en,
            description_hi: dept.description_hi,
            icon: dept.icon,
            sort_order: dept.sort_order,
            is_active: true,
            updated_at: now,
          },
        });
    }

    for (const disease of jaipurDiseases) {
      const id = seedUuid(disease.record_key);
      const department_id = deptIds.get(disease.department_key)!;
      await tx
        .insert(medicalDiseases)
        .values({
          id,
          record_key: disease.record_key,
          name_en: disease.name_en,
          name_hi: disease.name_hi,
          description_en: disease.description_en,
          description_hi: disease.description_hi,
          symptoms_en: disease.symptoms_en,
          symptoms_hi: disease.symptoms_hi,
          precautions_en: disease.precautions_en,
          precautions_hi: disease.precautions_hi,
          icon: disease.icon,
          department_id,
          is_active: true,
          updated_at: now,
        })
        .onConflictDoUpdate({
          target: medicalDiseases.record_key,
          set: {
            name_en: disease.name_en,
            name_hi: disease.name_hi,
            description_en: disease.description_en,
            description_hi: disease.description_hi,
            symptoms_en: disease.symptoms_en,
            symptoms_hi: disease.symptoms_hi,
            precautions_en: disease.precautions_en,
            precautions_hi: disease.precautions_hi,
            icon: disease.icon,
            department_id,
            is_active: true,
            updated_at: now,
          },
        });
    }

    for (const hosp of jaipurHospitals) {
      const id = seedUuid(hosp.record_key);
      const img = hospitalImages.get(hosp.record_key)!;
      const fullAddress = `${hosp.address_line1}, ${hosp.address_line2}, Jaipur, Rajasthan ${hosp.pincode}`;
      await tx
        .insert(careDirectoryEntries)
        .values({
          id,
          recordKey: hosp.record_key,
          kind: 'hospital',
          name: hosp.name_en,
          nameHi: hosp.name_hi,
          city: 'Jaipur',
          address: fullAddress,
          addressHi: hosp.address_hi,
          phone: hosp.phone_1,
          imageUrl: img.url,
          imageAlt: `${hosp.name_en}, Jaipur`,
          details: {
            specialties: [...hosp.specialties],
            qualifications: hosp.nabh_accredited ? 'NABH Accredited' : '',
            registration: '',
            languages: ['English', 'Hindi'],
            providerType: hosp.hospital_type,
            summary: hosp.summary_en,
            precautions: 'Confirm doctor availability and emergency status directly by phone.',
            latitude: hosp.latitude,
            longitude: hosp.longitude,
          },
          published: true,
          reviewedAt: now,
          reviewEvidence: hosp.website,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: careDirectoryEntries.recordKey,
          set: {
            name: hosp.name_en,
            nameHi: hosp.name_hi,
            address: fullAddress,
            addressHi: hosp.address_hi,
            phone: hosp.phone_1,
            imageUrl: img.url,
            imageAlt: `${hosp.name_en}, Jaipur`,
            published: true,
            reviewedAt: now,
            reviewEvidence: hosp.website,
            updatedAt: now,
          },
        });

      await tx
        .insert(hospitals)
        .values({
          id,
          record_key: hosp.record_key,
          listed: true,
          name_en: hosp.name_en,
          name_hi: hosp.name_hi,
          hospital_type: hosp.hospital_type,
          address_line1: hosp.address_line1,
          address_line2: hosp.address_line2,
          landmark: hosp.landmark,
          address_hi: hosp.address_hi,
          city: 'Jaipur',
          state: 'Rajasthan',
          pincode: hosp.pincode,
          country_code_1: '+91',
          phone_1: hosp.phone_1,
          country_code_2: hosp.phone_2 ? '+91' : '',
          phone_2: hosp.phone_2,
          website: hosp.website,
          latitude: hosp.latitude,
          longitude: hosp.longitude,
          accepts_ayushman: hosp.accepts_ayushman,
          accepts_janaadhaar: hosp.accepts_janaadhaar,
          accepts_cghs: hosp.accepts_cghs,
          accepts_esic: hosp.accepts_esic,
          rgahs_approved: hosp.rgahs_approved,
          is_cashless: hosp.is_cashless,
          nabh_accredited: hosp.nabh_accredited,
          is_24_7: hosp.is_24_7,
          cashless_schemes: [...hosp.cashless_schemes],
          specialties: [...hosp.specialties],
          summary_en: hosp.summary_en,
          summary_hi: hosp.summary_hi,
          image_data: img.data,
          image_alt: `${hosp.name_en}, Jaipur`,
          image_revision: img.rev,
          updated_at: now,
        })
        .onConflictDoUpdate({
          target: hospitals.record_key,
          set: {
            listed: true,
            name_en: hosp.name_en,
            name_hi: hosp.name_hi,
            hospital_type: hosp.hospital_type,
            address_line1: hosp.address_line1,
            address_line2: hosp.address_line2,
            landmark: hosp.landmark,
            address_hi: hosp.address_hi,
            pincode: hosp.pincode,
            phone_1: hosp.phone_1,
            phone_2: hosp.phone_2,
            website: hosp.website,
            latitude: hosp.latitude,
            longitude: hosp.longitude,
            specialties: [...hosp.specialties],
            summary_en: hosp.summary_en,
            summary_hi: hosp.summary_hi,
            image_data: img.data,
            image_alt: `${hosp.name_en}, Jaipur`,
            image_revision: img.rev,
            updated_at: now,
          },
        });
    }

    for (const doc of jaipurDoctors) {
      const id = seedUuid(doc.record_key);
      const hosp = jaipurHospitals.find((h) => h.record_key === doc.hospital_key)!;
      const hospitalId = seedUuid(hosp.record_key);
      const departmentId = deptIds.get(doc.department_key)!;
      const dept = jaipurDepartments.find((d) => d.record_key === doc.department_key)!;
      const img = doctorImages.get(doc.record_key)!;
      const fullAddress = `${hosp.name_en}, ${hosp.address_line1}, Jaipur, Rajasthan ${hosp.pincode}`;

      await tx
        .insert(careDirectoryEntries)
        .values({
          id,
          recordKey: doc.record_key,
          kind: 'doctor',
          name: doc.name_en,
          nameHi: doc.name_hi,
          city: 'Jaipur',
          address: fullAddress,
          addressHi: `${hosp.name_hi}, ${hosp.address_hi}`,
          phone: hosp.phone_1,
          imageUrl: img.url,
          imageAlt: `${doc.name_en}, ${dept.name_en}`,
          details: {
            specialties: [dept.name_en],
            qualifications: doc.qualifications.join(', '),
            registration: '',
            languages: [...doc.languages],
            providerType: dept.name_en,
            summary: doc.summary_en,
            precautions: 'Verify OPD consultation hours with the affiliated hospital.',
            latitude: hosp.latitude,
            longitude: hosp.longitude,
          },
          published: true,
          reviewedAt: now,
          reviewEvidence: doc.website,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: careDirectoryEntries.recordKey,
          set: {
            name: doc.name_en,
            nameHi: doc.name_hi,
            address: fullAddress,
            phone: hosp.phone_1,
            imageUrl: img.url,
            imageAlt: `${doc.name_en}, ${dept.name_en}`,
            published: true,
            reviewedAt: now,
            reviewEvidence: doc.website,
            updatedAt: now,
          },
        });

      await tx
        .insert(doctors)
        .values({
          id,
          record_key: doc.record_key,
          name_en: doc.name_en,
          name_hi: doc.name_hi,
          address_line1: hosp.name_en,
          address_line2: hosp.address_line1,
          landmark: hosp.landmark,
          address_hi: `${hosp.name_hi}, ${hosp.address_hi}`,
          city: 'Jaipur',
          state: 'Rajasthan',
          pincode: hosp.pincode,
          country_code_1: '+91',
          phone_1: hosp.phone_1,
          website: doc.website,
          latitude: hosp.latitude,
          longitude: hosp.longitude,
          qualifications: [...doc.qualifications],
          languages: [...doc.languages],
          summary_en: doc.summary_en,
          summary_hi: doc.summary_hi,
          image_data: img.data,
          image_alt: `${doc.name_en}, ${dept.name_en}`,
          image_revision: img.rev,
          updated_at: now,
        })
        .onConflictDoUpdate({
          target: doctors.record_key,
          set: {
            name_en: doc.name_en,
            name_hi: doc.name_hi,
            phone_1: hosp.phone_1,
            website: doc.website,
            qualifications: [...doc.qualifications],
            summary_en: doc.summary_en,
            summary_hi: doc.summary_hi,
            image_data: img.data,
            image_alt: `${doc.name_en}, ${dept.name_en}`,
            image_revision: img.rev,
            updated_at: now,
          },
        });

      await tx
        .insert(doctorDepartments)
        .values({ doctor_id: id, department_id: departmentId })
        .onConflictDoNothing();
      await tx
        .insert(doctorHospitalAffiliations)
        .values({ doctor_id: id, hospital_id: hospitalId })
        .onConflictDoNothing();
      await tx
        .insert(careProviderAffiliations)
        .values({ doctorId: id, hospitalId })
        .onConflictDoNothing();
    }

    for (const bb of jaipurBloodBanks) {
      const id = seedUuid(bb.record_key);
      const img = bankImages.get(bb.record_key)!;
      await tx
        .insert(bloodBankDirectoryEntries)
        .values({
          id,
          record_key: bb.record_key,
          name_en: bb.name_en,
          name_hi: bb.name_hi,
          city: 'Jaipur',
          state: 'Rajasthan',
          pincode: bb.pincode,
          landmark: bb.landmark,
          address_en: bb.address_en,
          address_hi: bb.address_hi,
          country_code: '+91',
          phone: bb.phone,
          emergency_country_code: '+91',
          emergency_phone: bb.emergency_phone,
          website: bb.website,
          image_url: img.url,
          image_data: img.data,
          image_revision: img.rev,
          is_verified: true,
          verified_at: now,
          is_24_7: bb.is_24_7,
          is_government: bb.is_government,
          component_facility: bb.component_facility,
          apheresis_facility: bb.apheresis_facility,
          available_blood_groups: [...bb.available_blood_groups],
          latitude: bb.latitude,
          longitude: bb.longitude,
          is_active: true,
          updated_at: now,
        })
        .onConflictDoUpdate({
          target: bloodBankDirectoryEntries.record_key,
          set: {
            name_en: bb.name_en,
            name_hi: bb.name_hi,
            pincode: bb.pincode,
            landmark: bb.landmark,
            address_en: bb.address_en,
            address_hi: bb.address_hi,
            phone: bb.phone,
            emergency_phone: bb.emergency_phone,
            website: bb.website,
            image_url: img.url,
            image_data: img.data,
            image_revision: img.rev,
            is_verified: true,
            verified_at: now,
            is_active: true,
            updated_at: now,
          },
        });
    }

    return {
      departments: jaipurDepartments.length,
      diseases: jaipurDiseases.length,
      hospitals: jaipurHospitals.length,
      doctors: jaipurDoctors.length,
      bloodBanks: jaipurBloodBanks.length,
    };
  });

  const wellness = await seedWellness(db, { includeSessions: true, publish: true });
  return { ...summary, wellness };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const reset = args.has('--reset');
  const mode = args.has('--local') ? '--local' : args.has('--apply') ? '--apply' : null;
  if (!mode) {
    console.log(
      `Validated Jaipur catalog: ${jaipurDepartments.length} departments, ${jaipurDiseases.length} diseases, ${jaipurHospitals.length} hospitals, ${jaipurBloodBanks.length} blood banks. Use --local or --apply (with optional --reset).`,
    );
    return;
  }
  const result = mode === '--local' ? await runLocal(reset) : await runPostgres(reset);
  console.log('Jaipur seed complete:', JSON.stringify(result));
}

async function runPostgres(reset: boolean) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required with --apply.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    return await seedJaipur(drizzle({ client: pool, schema }), { reset });
  } finally {
    await pool.end();
  }
}

async function runLocal(reset: boolean) {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle: drizzleLocal } = await import('drizzle-orm/pglite');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { migrateLocal } = require('../../../scripts/database/migrate-local.cjs') as {
    migrateLocal: (db: InstanceType<typeof PGlite>, folder: string) => Promise<void>;
  };
  const database = new PGlite(resolve('.local/database'));
  try {
    await migrateLocal(database, resolve('database/migrations'));
    return await seedJaipur(drizzleLocal(database, { schema }), { reset });
  } finally {
    await database.close();
  }
}

if (require.main === module)
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Jaipur seed failed.');
    process.exitCode = 1;
  });
