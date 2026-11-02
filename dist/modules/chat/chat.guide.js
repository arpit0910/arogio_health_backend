"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appHelp = appHelp;
function appHelp(question, hindi) {
    const q = question.toLowerCase();
    const appQuestion = /arogio|आरोगियो|आरोग्य|जीवा|jee\s*va/.test(q) ||
        /(?:how|where).*(?:log|track|record|reminder|settings|profile)|reminders work|(?:ऐप|एप).*(?:कैसे|कहाँ)/u.test(q);
    if (!appQuestion)
        return null;
    if (/blood pressure|blood glucose|oxygen saturation|telemedicine|appointment/.test(q))
        return hindi
            ? 'Arogio में अभी ब्लड प्रेशर, ब्लड ग्लूकोज़ या ऑक्सीजन सैचुरेशन दर्ज करने, अपॉइंटमेंट बुक करने या टेलीमेडिसिन की सुविधा नहीं है। मैं इनके बारे में सामान्य जानकारी समझा सकती हूँ। ऐप में पानी, गतिविधि, दवा के समय और माहवारी के रिकॉर्ड उपलब्ध हैं।'
            : 'Arogio does not currently log blood pressure, blood glucose or oxygen saturation, book appointments, or offer telemedicine. I can explain these health topics in general. The app supports water, activity, existing medicine schedules and cycle records.';
    if (/saved health|record access|nvidia|privacy|सहेजे.*रिकॉर्ड|गोपनीयता/.test(q))
        return hindi
            ? 'जीवा में सहेजे स्वास्थ्य रिकॉर्ड का उपयोग डिफ़ॉल्ट रूप से बंद है। ऊपर रिकॉर्ड वाले विकल्प को खोलकर Use saved health records चालू कर सकते हैं। इससे प्रोफ़ाइल, गतिविधि, पानी, दवा और माहवारी के सारांश NVIDIA को भेजे जाते हैं; फ़ोन पर ही मौजूद रीडिंग शामिल नहीं होतीं। अनुमति बदलने पर नई बातचीत शुरू होती है। केवल सामान्य सवाल पूछने के लिए रिकॉर्ड चालू करना आवश्यक नहीं है।'
            : 'Saved health records are off by default in Jeeva. Open the record-access row above the conversation to enable Use saved health records. That sends saved profile, activity, water, medicine and cycle summaries to NVIDIA; device-only readings are excluded. Changing access starts a new chat. You can ask general questions with records off.';
    if (/delete.*account|deactivate|खाता.*हटा/.test(q))
        return hindi
            ? 'Profile में Delete account खोलें। शर्तें पढ़कर पुष्टि करें। इससे खाता निष्क्रिय होता है और आप साइन आउट हो जाते हैं। मूल जानकारी और सहेजे रिकॉर्ड तुरंत स्थायी रूप से मिटते नहीं हैं। 30 दिनों के भीतर साइन इन करने पर खाता बहाल किया जा सकता है। मैं यह कार्रवाई आपके लिए नहीं कर सकती।'
            : 'Open Profile → Delete account, read the conditions, then use its confirmation controls if you want to continue. This deactivates the account and signs you out; basic details and saved records are retained rather than immediately erased. Signing in within 30 days restores the account. I cannot perform this action for you.';
    if (/blood bank|ब्लड बैंक/.test(q))
        return hindi
            ? 'Explore में Blood banks खोलें। शहर या पिनकोड से खोजें, या स्थान की वैकल्पिक अनुमति देकर Find near me चुनें। सूची में उपलब्ध संपर्क और दिशा-निर्देश देख सकते हैं। यह लाइव ब्लड स्टॉक या आपातकालीन डिस्पैच सेवा नहीं है।'
            : 'Open Explore → Blood banks. Search by city or pincode, or choose Find near me with optional location access. Listings provide available contact details and directions. They do not show live blood stock and are not an emergency dispatch service.';
    if (/article|लेख/.test(q))
        return hindi
            ? 'Explore → Health articles खोलें। शीर्षक या श्रेणी से खोजें और कोई प्रकाशित लेख खोलकर पढ़ें। उपलब्ध होने पर भाषा बदलने का विकल्प चुन सकते हैं। नए लेख प्रकाशित होने पर सूची में दिखते हैं।'
            : 'Open Explore → Health articles. Search by title or category and open a published article to read it. Use the language control where available. New articles appear when published.';
    if (/water|hydration|पानी/.test(q))
        return hindi
            ? 'Water खोलें। अगर प्लान नहीं बना है, तो अपना लक्ष्य, जागने-सोने का समय और सामान्य सर्विंग दर्ज करके Save water plan चुनें।\n\nप्लान बनने के बाद Log a drink के नीचे दिए बटन से पानी दर्ज करें। अलग मात्रा के लिए Other amounts खोलें। सहेजे गए रिकॉर्ड दैनिक कुल और हिस्ट्री में दिखते हैं। अपना लक्ष्य डॉक्टर की सलाह के अनुसार चुनें।'
            : 'Open Water. If you do not have a plan, enter your own target, waking hours and preferred serving, then choose Save water plan.\n\nOnce your plan is saved, use the button under Log a drink. Open Other amounts for a different amount. Saved drinks update your daily total and history. Your target is a saved preference, not a medical recommendation.';
    if (/medicine|medication|दवा|दवाई|reminder/.test(q))
        return hindi
            ? 'Medicines खोलें और Add a medicine चुनें। नाम और डॉक्टर द्वारा दी गई मात्रा व समय दर्ज करें, फिर Save medicine चुनें। मैं दवा या खुराक चुन नहीं सकती।\n\nरिमाइंडर वैकल्पिक हैं। नोटिफिकेशन बंद हों तो दवा के समय फिर भी सहेजे जा सकते हैं। Settings में Notifications से अनुमति और आवाज़ की सेटिंग देखें।'
            : 'Open Medicines and choose Add a medicine. Record the name and the amount and times already supplied by your clinician, then choose Save medicine. I cannot choose or validate a medicine or dose.\n\nReminders are optional. Dose times can still be saved with notifications off. Open Settings → Notifications to review device access and sound settings.';
    if (/cycle|period|माहवारी|पीरियड/.test(q))
        return hindi
            ? 'Cycle journal में अपनी प्राथमिकताएँ सहेजें। Log a period से तारीखें दर्ज करें और दैनिक चेक-इन में लक्षण, फ़्लो और चाहें तो मूड या नोट्स जोड़ें।\n\nअनुमान निश्चित नहीं हैं और गर्भनिरोध या निदान के लिए नहीं हैं।'
            : 'Open Cycle journal and save your tracking preferences. Use Log a period for dates, and the daily check-in for flow, symptoms and optional mood or notes.\n\nEstimates are uncertain and are not a fertility, contraception or diagnosis guide.';
    if (/connect|health app|sync|जोड़|सिंक/.test(q))
        return hindi
            ? 'Settings → Health app connections खोलें और उपलब्ध समर्थित ऐप चुनें। आप कौन-सी रीडिंग साझा करेंगे, यह Health Connect की अनुमति में चुन सकते हैं। कोई ऐप जोड़ना आवश्यक नहीं है; Activity में अपने कुल आँकड़े दर्ज कर सकते हैं।'
            : 'Open Settings → Health app connections and choose an available compatible app. Health Connect lets you choose which readings to share. A connection is optional: you can enter totals directly in Activity. Only supported installed apps appear; missing readings do not mean zero.';
    if (/activity|steps|target|गतिविधि|कदम|लक्ष्य/.test(q))
        return hindi
            ? 'Activity खोलें। Log activity से दिन के कुल आँकड़े दर्ज करें और Edit targets से अपने लक्ष्य बदलें। फ़ोन के कदम और जुड़े ऐप की रीडिंग अलग स्रोत हैं; इन्हें जोड़कर कुल नहीं बनाया जाता। ब्लड प्रेशर दर्ज करने का फ़ीचर अभी उपलब्ध नहीं है।'
            : 'Open Activity. Choose Log activity to enter daily totals, or Edit targets to change your saved goals. Phone steps and connected-app readings are separate sources and are not added together. Blood pressure logging is not currently available.';
    if (/profile|city|name|photo|प्रोफ़ाइल|शहर|नाम|फ़ोटो/.test(q))
        return hindi
            ? 'Profile खोलें और Edit profile चुनें। यहाँ नाम, तस्वीर, शहर और शारीरिक माप बदल सकते हैं। बदलाव के बाद सहेजने का बटन चुनें। शहर जोड़ने पर उपलब्ध होने पर Home पर स्थानीय मौसम दिखता है।'
            : 'Open Profile and choose Edit profile to update your name, photo, city or body measurements. Save your changes when finished. Adding a city allows Home to show local weather when the weather service is available.';
    if (/settings|theme|dark|light|language|सेटिंग|भाषा|थीम/.test(q))
        return hindi
            ? 'Profile → Settings खोलें। Language में भाषा, Appearance में System, Light या Dark और Notifications में रिमाइंडर की प्राथमिकताएँ बदलें। वैकल्पिक अनुमति के बिना भी मैन्युअल ट्रैकिंग उपलब्ध है।'
            : 'Open Profile → Settings. Language changes the interface language; Appearance offers System, Light or Dark; Notifications manages reminder preferences and device settings. Optional permissions are not required for manual tracking.';
    return hindi
        ? 'मैं स्वास्थ्य की सामान्य जानकारी और Arogio इस्तेमाल करने में मदद कर सकती हूँ। Water, Medicines, Cycle, Activity, Profile या Settings में से किस स्क्रीन के बारे में जानना चाहते हैं? मैं दवा या खुराक की सलाह नहीं दे सकती और आपातकालीन सेवा नहीं हूँ।'
        : 'I can explain health topics and help you use Arogio. Which screen are you using: Water, Medicines, Cycle, Activity, Profile or Settings? I cannot prescribe medicine, recommend doses, or provide emergency services.';
}
//# sourceMappingURL=chat.guide.js.map