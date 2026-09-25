export type Language = 'en' | 'hi' | 'mr';

export interface TranslationDict {
  app_name: string;
  app_subtitle: string;
  brand_tagline: string;
  system_operational: string;
  provenance_info: string;
  greeting_morning: string;
  greeting_afternoon: string;
  greeting_evening: string;
  todays_operations: string;
  network_pulse: string;
  demand_and_capacity: string;
  needs_attention: string;
  operational_summary: string;

  // Nav
  nav_overview: string;
  nav_states: string;
  nav_districts: string;
  nav_phc: string;
  nav_medicines: string;
  nav_risks: string;
  nav_redistribution: string;
  nav_capacity: string;
  nav_workforce: string;
  nav_emergency: string;
  nav_federated: string;
  nav_models: string;
  nav_ml_studio: string;
  nav_transparency: string;
  nav_activity: string;
  nav_copilot: string;
  judge_tour: string;

  // Metrics
  critical_facilities: string;
  critical_facilities_desc: string;
  high_risk_medicines: string;
  high_risk_medicines_desc: string;
  bed_occupancy: string;
  bed_occupancy_desc: string;
  staff_attendance: string;
  staff_attendance_desc: string;
  patients_today: string;
  days_of_stock: string;
  closing_stock: string;
  predicted_demand: string;
  reorder_level: string;
  burn_rate: string;
  lead_time: string;
  confidence_interval: string;
  root_cause: string;

  // Actions
  review_transfer: string;
  approve_transfer: string;
  reject_transfer: string;
  transfer_approved: string;
  simulated_action_tag: string;
  donor_facility: string;
  recipient_facility: string;
  search_placeholder: string;
  reset_baseline: string;
  run_simulation: string;
  view_timeline: string;
  request_rebalance: string;

  // Severities & Provenance
  severity_critical: string;
  severity_high: string;
  severity_watch: string;
  severity_normal: string;
  provenance_real: string;
  provenance_sim: string;
  provenance_ml: string;

  // Roles
  role_national: string;
  role_state: string;
  role_district: string;
  role_phc: string;
  disclaimer: string;

  // Backward compatibility keys
  app_title: string;
  judge_mode: string;
  reset_demo: string;
  seed_monsoon: string;
  nav_national: string;
  nav_state: string;
  nav_district: string;
  nav_recommendations: string;
  nav_simulator: string;
  nav_beds: string;
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    app_name: "MEDICUS",
    app_subtitle: "Healthcare Operations Platform",
    brand_tagline: "Operational Command for Primary Health Centres",
    system_operational: "System operational",
    provenance_info: "Data updated 2 min ago • Provenance ⓘ",
    greeting_morning: "Good morning.",
    greeting_afternoon: "Good afternoon.",
    greeting_evening: "Good evening.",
    todays_operations: "Today's operations",
    network_pulse: "Network Pulse",
    demand_and_capacity: "Demand & capacity",
    needs_attention: "Needs your attention",
    operational_summary: "Grounded Operational Summary",

    nav_overview: "Overview",
    nav_states: "States",
    nav_districts: "Districts",
    nav_phc: "PHC Operations",
    nav_medicines: "Medicines",
    nav_risks: "Risk Matrix",
    nav_redistribution: "Redistribution",
    nav_capacity: "Beds & Capacity",
    nav_workforce: "Workforce",
    nav_emergency: "Emergency",
    nav_federated: "Federated AI",
    nav_models: "Model Performance",
    nav_ml_studio: "ML Studio & Ops",
    nav_transparency: "Data Provenance",
    nav_activity: "Audit Log",
    nav_copilot: "MEDICUS Assist",
    judge_tour: "Evaluation Tour",

    critical_facilities: "Critical facilities",
    critical_facilities_desc: "Facilities requiring lateral emergency stock redistribution",
    high_risk_medicines: "High-risk medicines",
    high_risk_medicines_desc: "Essential drug lines below the 7-day regional safety buffer",
    bed_occupancy: "Bed occupancy",
    bed_occupancy_desc: "In-patient beds ready for acute intake",
    staff_attendance: "Staff attendance",
    staff_attendance_desc: "Medical Officers on active clinical shift",
    patients_today: "Patients Today",
    days_of_stock: "Days of Stock",
    closing_stock: "Closing Stock",
    predicted_demand: "7-Day Demand Forecast",
    reorder_level: "Reorder Level",
    burn_rate: "Daily Burn Rate",
    lead_time: "Lead Time",
    confidence_interval: "95% Prediction Interval [L, U]",
    root_cause: "Root-Cause Explainability Factors",

    review_transfer: "Review transfer",
    approve_transfer: "Approve Transfer",
    reject_transfer: "Reject",
    transfer_approved: "Transfer Approved",
    simulated_action_tag: "SIMULATED OPERATIONAL ACTION",
    donor_facility: "Donor Facility",
    recipient_facility: "Recipient Facility",
    search_placeholder: "Search facility, district, or medicine (Ctrl+K)...",
    reset_baseline: "Reset Baseline",
    run_simulation: "Run Simulation",
    view_timeline: "View Facility Timeline",
    request_rebalance: "Request Rebalancing",

    severity_critical: "CRITICAL",
    severity_high: "HIGH",
    severity_watch: "WATCH",
    severity_normal: "NORMAL",
    provenance_real: "REAL GOV DATA",
    provenance_sim: "CALIBRATED SIMULATION",
    provenance_ml: "DERIVED ML",

    role_national: "National Director",
    role_state: "State Health Admin",
    role_district: "District Health Officer",
    role_phc: "PHC Medical Officer",
    disclaimer: "MEDICUS is an operational healthcare planning and resource optimization platform. It does not provide clinical diagnosis or direct medical treatment advice.",
    app_title: "MEDICUS",
    judge_mode: "Evaluation Tour",
    reset_demo: "Reset Baseline",
    seed_monsoon: "Simulate Monsoon",
    nav_national: "Overview",
    nav_state: "States",
    nav_district: "Districts",
    nav_recommendations: "Redistribution",
    nav_simulator: "Emergency",
    nav_beds: "Beds & Capacity"
  },

  hi: {
    app_name: "मेडिकस (MEDICUS)",
    app_subtitle: "स्वास्थ्य सेवा परिचालन मंच",
    brand_tagline: "प्राथमिक स्वास्थ्य केंद्र परिचालन कमान",
    system_operational: "प्रणाली सक्रिय एवं सामान्य",
    provenance_info: "डेटा २ मिनट पहले अद्यतित • स्रोत विवरण ⓘ",
    greeting_morning: "शुभ प्रभात।",
    greeting_afternoon: "शुभ अपराह्न।",
    greeting_evening: "शुभ संध्या।",
    todays_operations: "आज का परिचालन",
    network_pulse: "नेटवर्क स्थिति",
    demand_and_capacity: "मांग एवं क्षमता",
    needs_attention: "ध्यान देने योग्य विषय",
    operational_summary: "परिचालन सारांश",

    nav_overview: "सिंहावलोकन",
    nav_states: "राज्य",
    nav_districts: "जिले",
    nav_phc: "प्राथमिक स्वास्थ्य केंद्र",
    nav_medicines: "औषधि भंडार",
    nav_risks: "जोखिम मैट्रिक्स",
    nav_redistribution: "पुनर्वितरण",
    nav_capacity: "बिस्तर क्षमता",
    nav_workforce: "स्वास्थ्य कर्मी",
    nav_emergency: "आपातकालीन",
    nav_federated: "फ़ेडरेटेड एआई",
    nav_models: "मॉडल प्रदर्शन",
    nav_ml_studio: "एमएल स्टूडियो एवं मॉडल्स",
    nav_transparency: "डेटा स्रोत",
    nav_activity: "ऑडिट लॉग",
    nav_copilot: "मेडिकस असिस्ट",
    judge_tour: "मूल्यांकन टूर",

    critical_facilities: "गंभीर स्थिति वाले केंद्र",
    critical_facilities_desc: "तत्काल आपातकालीन दवा पुनर्वितरण की आवश्यकता वाले केंद्र",
    high_risk_medicines: "उच्च जोखिम वाली दवाएं",
    high_risk_medicines_desc: "७-दिवसीय क्षेत्रीय सुरक्षा बफर से नीचे आवश्यक दवाएं",
    bed_occupancy: "बिस्तर उपयोगिता",
    bed_occupancy_desc: "मरीजों के लिए उपलब्ध इन-पेशेंट बिस्तर",
    staff_attendance: "चिकित्सा कर्मी उपस्थिति",
    staff_attendance_desc: "सक्रिय ड्यूटी पर उपस्थित चिकित्सा अधिकारी",
    patients_today: "आज के मरीज",
    days_of_stock: "स्टॉक के शेष दिन",
    closing_stock: "वर्तमान शेष स्टॉक",
    predicted_demand: "७-दिवसीय अनुमानित मांग",
    reorder_level: "पुनः आदेश स्तर",
    burn_rate: "दैनिक खपत दर",
    lead_time: "आपूर्ति समय",
    confidence_interval: "९५% विश्वसनीयता अंतराल [न्यूनतम, अधिकतम]",
    root_cause: "मूल कारण विश्लेषण",

    review_transfer: "हस्तांतरण समीक्षा",
    approve_transfer: "हस्तांतरण स्वीकृत करें",
    reject_transfer: "अस्वीकार करें",
    transfer_approved: "हस्तांतरण स्वीकृत",
    simulated_action_tag: "सिम्युलेटेड परिचालन कार्यवाही",
    donor_facility: "दाता स्वास्थ्य केंद्र",
    recipient_facility: "प्राप्तकर्ता स्वास्थ्य केंद्र",
    search_placeholder: "केंद्र, जिला या दवा खोजें (Ctrl+K)...",
    reset_baseline: "सामान्य स्थिति पर रीसेट",
    run_simulation: "सिमुलेशन चलाएं",
    view_timeline: "केंद्र टाइमलाइन देखें",
    request_rebalance: "पुनर्संतुलन अनुरोध",

    severity_critical: "अतिगंभीर",
    severity_high: "उच्च जोखिम",
    severity_watch: "निगरानी",
    severity_normal: "सामान्य",
    provenance_real: "वास्तविक सरकारी डेटा",
    provenance_sim: "कैलिब्रेटेड सिमुलेशन",
    provenance_ml: "एआई मॉडल व्युत्पन्न",

    role_national: "राष्ट्रीय निदेशक",
    role_state: "राज्य स्वास्थ्य आयुक्त",
    role_district: "जिला मुख्य चिकित्सा अधिकारी",
    role_phc: "प्रभारी चिकित्सा अधिकारी (PHC)",
    disclaimer: "मेडिकस स्वास्थ्य सेवा संसाधन नियोजन एवं आपूर्ति श्रृंखला प्रबंधन का मंच है। यह प्रत्यक्ष चिकित्सीय निदान या उपचार सलाह नहीं देता है।",
    app_title: "मेडिकस (MEDICUS)",
    judge_mode: "मूल्यांकन टूर",
    reset_demo: "सामान्य स्थिति पर रीसेट",
    seed_monsoon: "मानसून सिमुलेशन",
    nav_national: "सिंहावलोकन",
    nav_state: "राज्य",
    nav_district: "जिले",
    nav_recommendations: "पुनर्वितरण",
    nav_simulator: "आपातकालीन",
    nav_beds: "बिस्तर क्षमता"
  },

  mr: {
    app_name: "मेडिकस (MEDICUS)",
    app_subtitle: "आरोग्य सेवा परिचालन मंच",
    brand_tagline: "प्राथमिक आरोग्य केंद्र परिचालन नियंत्रण",
    system_operational: "प्रणाली सुरळीत कार्यरत",
    provenance_info: "माहिती २ मिनिटांपूर्वी अद्ययावत • स्त्रोत तपशील ⓘ",
    greeting_morning: "शुभ प्रभात.",
    greeting_afternoon: "शुभ दुपार.",
    greeting_evening: "शुभ संध्याकाळ.",
    todays_operations: "आजचे परिचालन",
    network_pulse: "नेटवर्क स्थिती",
    demand_and_capacity: "मागणी व क्षमता",
    needs_attention: "तातडीचे लक्ष आवश्यक",
    operational_summary: "परिचालन आढावा",

    nav_overview: "आढावा",
    nav_states: "राज्ये",
    nav_districts: "जिल्हे",
    nav_phc: "प्रा. आ. केंद्र",
    nav_medicines: "औषध साठा",
    nav_risks: "जोखीम मॅट्रिक्स",
    nav_redistribution: "पुनर्वितरण",
    nav_capacity: "खाटा क्षमता",
    nav_workforce: "कर्मचारी",
    nav_emergency: "आपत्कालीन",
    nav_federated: "फेडरेटेड एआय",
    nav_models: "मॉडेल कार्यक्षमता",
    nav_ml_studio: "एमएल स्टुडिओ व मॉडेल ऑप्स",
    nav_transparency: "डेटा स्त्रोत",
    nav_activity: "ऑडिट नोंद",
    nav_copilot: "मेडिकस असिस्ट",
    judge_tour: "मूल्यांकन टूर",

    critical_facilities: "अतिगंभीर केंद्र",
    critical_facilities_desc: "तातडीने औषध पुरवठा आवश्यक असलेली केंद्रे",
    high_risk_medicines: "उच्च जोखमीची औषधे",
    high_risk_medicines_desc: "७ दिवसांपेक्षा कमी साठा शिल्लक असलेली अत्यावश्यक औषधे",
    bed_occupancy: "खाटांची टक्केवारी",
    bed_occupancy_desc: "रुग्णांसाठी उपलब्ध असलेल्या खाटा",
    staff_attendance: "कर्मचारी उपस्थिती",
    staff_attendance_desc: "सक्रिय सेवेवर असलेले वैद्यकीय अधिकारी",
    patients_today: "आजचे रुग्ण",
    days_of_stock: "साठ्याचे शिल्लक दिवस",
    closing_stock: "शिल्लक साठा",
    predicted_demand: "७ दिवसांची अंदाजित मागणी",
    reorder_level: "पुनर्मागणी पातळी",
    burn_rate: "दैनिक वापर दर",
    lead_time: "पुरवठा कालावधी",
    confidence_interval: "९५% संभाव्य मर्यादा [किमान, कमाल]",
    root_cause: "मूळ कारणांचे विश्लेषण",

    review_transfer: "हस्तांतरण तपासा",
    approve_transfer: "हस्तांतरण मंजूर करा",
    reject_transfer: "नाकारा",
    transfer_approved: "हस्तांतरण मंजूर",
    simulated_action_tag: "सिम्युलेटेड परिचालन कृती",
    donor_facility: "साठा देणारे केंद्र",
    recipient_facility: "साठा घेणारे केंद्र",
    search_placeholder: "केंद्र, जिल्हा किंवा औषध शोधा (Ctrl+K)...",
    reset_baseline: "मूळ स्थितीत आणा",
    run_simulation: "सिम्युलेशन सुरू करा",
    view_timeline: "केंद्राचा इतिहास पहा",
    request_rebalance: "पुनर्वितरण मागणी करा",

    severity_critical: "अतिगंभीर",
    severity_high: "उच्च धोका",
    severity_watch: "निरीक्षण",
    severity_normal: "सुरक्षित",
    provenance_real: "शासकीय प्रत्यक्ष डेटा",
    provenance_sim: "कॅलिब्रेटेड सिम्युलेशन",
    provenance_ml: "एआई आधारित अंदाज",

    role_national: "राष्ट्रीय संचालक",
    role_state: "राज्य आरोग्य संचालक",
    role_district: "जिल्हा शल्यचिकित्सक",
    role_phc: "वैद्यकीय अधिकारी (PHC)",
    disclaimer: "मेडिकस हे केवळ पुरवठा साखळी व आरोग्य संसाधन नियोजन मंच आहे. हे प्रत्यक्ष वैद्यकीय निदान किंवा उपचारांचा सल्ला देत नाही.",
    app_title: "मेडिकस (MEDICUS)",
    judge_mode: "मूल्यांकन टूर",
    reset_demo: "मूळ स्थितीत आणा",
    seed_monsoon: "पावसाळा परिस्थिती",
    nav_national: "आढावा",
    nav_state: "राज्ये",
    nav_district: "जिल्हे",
    nav_recommendations: "पुनर्वितरण",
    nav_simulator: "आपत्कालीन",
    nav_beds: "खाटा क्षमता"
  }
};

export const getTranslation = (lang: Language): TranslationDict => {
  return translations[lang] || translations.en;
};
