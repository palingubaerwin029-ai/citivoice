const natural = require('natural');
const geminiService = require('./geminiService');

const categoryClassifier = new natural.BayesClassifier();
const priorityClassifier = new natural.BayesClassifier();

// ─── Train Category Classifier ────────────────────────────────────────────────
// Road & Infrastructure (English, Tagalog, Hiligaynon, Visual Tags)
categoryClassifier.addDocument(
  'pothole on the road is huge broken sira guba',
  'Road & Infrastructure',
);
categoryClassifier.addDocument('damaged sidewalk pavement broken', 'Road & Infrastructure');
categoryClassifier.addDocument('butas ang kalsada baha sira kalsada', 'Road & Infrastructure'); // Tagalog
categoryClassifier.addDocument('guba ang karsada buslot sira broken', 'Road & Infrastructure'); // Hiligaynon
categoryClassifier.addDocument('guba nga dalan damo buslot lubak', 'Road & Infrastructure'); // Hiligaynon
categoryClassifier.addDocument(
  'damo mga bato sa dalan nd kaagi truck harang',
  'Road & Infrastructure',
); // Hiligaynon - rocks on road
categoryClassifier.addDocument('bato harang sa kalsada sakyanan trapik', 'Road & Infrastructure'); // Tagalog/Hiligaynon - road blockage
categoryClassifier.addDocument(
  'guba nga taytay lubak nga dalan sa bukid tulay',
  'Road & Infrastructure',
); // Kabankalan farm-to-market roads
categoryClassifier.addDocument(
  'street sign traffic light parking meter crater trench stone wall pole',
  'Road & Infrastructure',
); // Visual
categoryClassifier.addDocument(
  'karsada dalan alagyan taytay tulay guba buslot lubak',
  'Road & Infrastructure',
); // Hiligaynon keywords

// Electricity (English, Tagalog, Hiligaynon, Visual Tags)
categoryClassifier.addDocument('broken street light', 'Electricity');
categoryClassifier.addDocument('sira ang ilaw sa poste', 'Electricity'); // Tagalog
categoryClassifier.addDocument('guba ang suga sa dalan streetlight', 'Electricity'); // Hiligaynon
categoryClassifier.addDocument('brownout wala kuryente patay suga', 'Electricity'); // Hiligaynon
categoryClassifier.addDocument('naglapaw kuryente poste wiring', 'Electricity'); // Hiligaynon
categoryClassifier.addDocument('pole spotlight street lamp electric wire', 'Electricity'); // Visual

// Water & Drainage (English, Tagalog, Hiligaynon, Visual Tags)
categoryClassifier.addDocument('water pipe burst flooding', 'Water & Drainage');
categoryClassifier.addDocument('clogged drainage', 'Water & Drainage');
categoryClassifier.addDocument('baradong kanal', 'Water & Drainage'); // Tagalog
categoryClassifier.addDocument('baha butas kalsada', 'Water & Drainage'); // Tagalog
categoryClassifier.addDocument(
  'gabaha ang dalan budlay magtabok dalom ang tubig',
  'Water & Drainage',
); // Hiligaynon
categoryClassifier.addDocument(
  'naglapaw ang suba baha sa balay ilog hilabangan',
  'Water & Drainage',
); // Kabankalan flooding
categoryClassifier.addDocument('barado ang kanal damo tubig', 'Water & Drainage'); // Hiligaynon
categoryClassifier.addDocument('guba ang tubo sang tubig wala tubig', 'Water & Drainage'); // Hiligaynon
categoryClassifier.addDocument(
  'puddle lake river water bucket manhole cover drain',
  'Water & Drainage',
); // Visual

// Waste & Sanitation (English, Tagalog, Hiligaynon, Visual Tags)
categoryClassifier.addDocument('garbage not collected', 'Waste & Sanitation');
categoryClassifier.addDocument('smells terrible trash bin', 'Waste & Sanitation');
categoryClassifier.addDocument('sewage leak', 'Waste & Sanitation');
categoryClassifier.addDocument('mabaho ang basura hindi kinuha', 'Waste & Sanitation'); // Tagalog
categoryClassifier.addDocument('patay na hayop sa kalsada', 'Waste & Sanitation'); // Tagalog
categoryClassifier.addDocument('baho ang basura wala nakolekta', 'Waste & Sanitation'); // Hiligaynon
categoryClassifier.addDocument('patay nga sapat damo sagbot', 'Waste & Sanitation'); // Hiligaynon
categoryClassifier.addDocument('damo basura sa kilid dalan', 'Waste & Sanitation'); // Hiligaynon
categoryClassifier.addDocument(
  'garbage truck ashcan trash can garbage can wastebin plastic bag fly',
  'Waste & Sanitation',
); // Visual

// Public Safety (English, Tagalog, Hiligaynon, Visual Tags)
categoryClassifier.addDocument('aggressive stray dogs biting', 'Public Safety');
categoryClassifier.addDocument('vandalism property damage', 'Public Safety');
categoryClassifier.addDocument('asong ulol nangangagat', 'Public Safety'); // Tagalog
categoryClassifier.addDocument('buang nga ido nagapangagat', 'Public Safety'); // Hiligaynon
categoryClassifier.addDocument('guba nga pader graffiti', 'Public Safety'); // Hiligaynon
categoryClassifier.addDocument('fallen tree collapsed branches blocking', 'Public Safety'); // Fallen Trees
categoryClassifier.addDocument('sunog fire burning building', 'Public Safety'); // Fire
categoryClassifier.addDocument(
  'dog fence wall gate sign fire flame tree',
  'Public Safety',
); // Visual

// Other / Agriculture (English, Tagalog, Hiligaynon, Visual Noise)
categoryClassifier.addDocument('loud music party next door', 'Other');
categoryClassifier.addDocument('dogs barking all night', 'Other');
categoryClassifier.addDocument('maingay na videoke kapitbahay', 'Other'); // Tagalog
categoryClassifier.addDocument('tahol ng aso magdamag', 'Other'); // Tagalog
categoryClassifier.addDocument('gahod nga videoke kag pamalay', 'Other'); // Hiligaynon
categoryClassifier.addDocument('paghot sang ido bilog nga gab-i', 'Other'); // Hiligaynon
categoryClassifier.addDocument('patay ang humay uga ang talamnan el nino', 'Other'); // Kabankalan Agriculture
categoryClassifier.addDocument('na damage ang tubo sang bagyo sira broken', 'Other'); // Kabankalan Agriculture (Sugarcane)
categoryClassifier.addDocument('wala lang testing lang sira broken guba test', 'Other'); // Generic fallback
// IMPORTANT: Visual noise (when users take random photos of computers, screens, faces, rooms)
categoryClassifier.addDocument(
  'laptop computer monitor screen keyboard television cellphone phone table chair person face room wall paper pen',
  'Other',
);

categoryClassifier.train();

// ─── Train Priority Classifier ────────────────────────────────────────────────
// High (English, Tagalog, Hiligaynon)
priorityClassifier.addDocument('water pipe burst severe flooding sinkhole', 'High');
priorityClassifier.addDocument('impassable road live wire fallen post', 'High');
priorityClassifier.addDocument('malalim na baha harang sa kalsada', 'High'); // Tagalog
priorityClassifier.addDocument('naglapaw tubig nd maagyan dalan', 'High'); // Hiligaynon
priorityClassifier.addDocument('fallen tree blocking road emergency sunog fire', 'High'); // Emergencies

// Medium (English, Tagalog, Hiligaynon)
priorityClassifier.addDocument('garbage not collected pothole damaged sidewalk', 'Medium');
priorityClassifier.addDocument('broken street light dead animal', 'Medium');
priorityClassifier.addDocument('basura sira ilaw butas kalsada', 'Medium'); // Tagalog
priorityClassifier.addDocument('basura guba suga guba dalan guba karsada buslot', 'Medium'); // Hiligaynon

// Low (English, Tagalog, Hiligaynon)
priorityClassifier.addDocument('loud music party next door suggestion', 'Low');
priorityClassifier.addDocument('vandalism graffiti noise', 'Low');
priorityClassifier.addDocument('maingay videoke', 'Low'); // Tagalog
priorityClassifier.addDocument('gahod videoke dulom', 'Low'); // Hiligaynon

priorityClassifier.train();

/**
 * Analyzes the given text and predicts category and priority.
 * @param {string} text - The combined title and description of the concern.
 * @param {string[]} imageTags - Array of tags extracted from the image.
 * @returns {Object} { category, priority }
 */
const analyzeConcern = (text, imageTags = []) => {
  // Combine user text with AI-extracted image tags to form the complete context
  const tagsString = imageTags.join(' ');
  const fullContext = `${text} ${tagsString}`.trim();

  if (!fullContext) {
    return { category: 'Other', priority: 'Low' };
  }

  const category = categoryClassifier.classify(fullContext);
  const priority = priorityClassifier.classify(fullContext);

  return { category, priority };
};

// Sentiment analysis removed

// ─── Feature 4: Smart Department Routing ─────────────────────────────────────

const DEPARTMENT_MAP = {
  'Road & Infrastructure': {
    High: { department: 'City Engineering Office', team: 'Emergency Response Unit' },
    Medium: { department: 'City Engineering Office', team: 'Maintenance Division' },
    Low: { department: 'City Engineering Office', team: 'General Queue' },
  },
  Electricity: {
    High: { department: 'NOCECO / Electric Utility', team: 'Emergency Crew' },
    Medium: { department: 'NOCECO / Electric Utility', team: 'Repair Division' },
    Low: { department: 'NOCECO / Electric Utility', team: 'General Queue' },
  },
  'Water & Drainage': {
    High: { department: 'City Water District', team: 'Emergency Response' },
    Medium: { department: 'City Water District', team: 'Maintenance' },
    Low: { department: 'City Water District', team: 'General Queue' },
  },
  'Waste & Sanitation': {
    High: { department: 'City Sanitation Division', team: 'Hazmat / Urgent Crew' },
    Medium: { department: 'City Sanitation Division', team: 'Collection Team' },
    Low: { department: 'City Sanitation Division', team: 'General Queue' },
  },
  'Public Safety': {
    High: { department: 'PNP / Barangay Tanod', team: 'Immediate Dispatch' },
    Medium: { department: 'PNP / Barangay Tanod', team: 'Patrol Unit' },
    Low: { department: 'Barangay Hall', team: 'Community Affairs' },
  },
  Other: {
    High: { department: 'City Admin Office', team: 'Urgent Cases' },
    Medium: { department: 'City Admin Office', team: 'General Affairs' },
    Low: { department: 'Barangay Hall', team: 'Community Affairs' },
  },
};

/**
 * Route a concern to the appropriate department based on category and priority.
 * @param {string} category
 * @param {string} priority
 * @returns {Object} { department, team }
 */
const routeToDepartment = (category, priority) => {
  const categoryRoutes = DEPARTMENT_MAP[category] || DEPARTMENT_MAP['Other'];
  return categoryRoutes[priority] || categoryRoutes['Medium'];
};

/**
 * Supercharged Full Concern Analysis using Gemini (with fallback to natural)
 */
const analyzeFullConcern = async (text, imageTags = [], imagePath = null) => {
  const tagsString = imageTags.join(' ');
  const fullContext = `${text} ${tagsString}`.trim();

  if (!fullContext && !imagePath) {
    return { category: 'Other', priority: 'Low', urgencyScore: 50 };
  }

  // 1. Try Gemini first for max accuracy
  if (geminiService.isAvailable()) {
    const prompt = `
    You are an expert city dispatcher for Kabankalan City and a native Hiligaynon speaker.
    Carefully analyze this citizen report to categorize it accurately:
    
    REPORT DETAILS:
    ${fullContext}
    
    CRITICAL INSTRUCTIONS FOR IMAGES: If an image is provided alongside this request, you MUST prioritize the visual evidence over the text. If the text says "small crack" but the image shows a massive sinkhole, classify based on the sinkhole (High priority). If the text is empty or vague like "fix this", use the image to determine the category.

    CRITICAL LANGUAGE INSTRUCTION: The report is likely written in Hiligaynon (Ilonggo), Tagalog, English, or a mix of these. You MUST understand ANY Hiligaynon term flawlessly using your internal knowledge of the language. Translate the context in your head if necessary. For specific local context: "dalan" means road, "bato" means stone, "taytay" means bridge, "humay" or "tubo" means agriculture (Other), "gahod" means noise, "baha" or "naglapaw" means flood, "aso" or "ido" means dog.
    
    Categorization Rules:
    - "Road & Infrastructure": Potholes, broken roads, damaged bridges, obstructions, landslides.
    - "Electricity": Power outages, broken streetlights, dangling/live wires, fallen electric posts.
    - "Water & Drainage": Flooding, broken water pipes, clogged canals, water contamination.
    - "Waste & Sanitation": Uncollected garbage, dead animals, sewage leaks, illegal dumping.
    - "Public Safety": Crime, accidents, aggressive stray dogs, fires, fallen trees blocking pathways.
    - "Other": Noise complaints, agriculture issues, or anything else.

    Output a strictly valid JSON object with these keys:
    - "category": Must be exactly one of: "Road & Infrastructure", "Electricity", "Water & Drainage", "Waste & Sanitation", "Public Safety", "Other".
    - "priority": Must be exactly one of: "Low", "Medium", "High". Use High for severe infrastructure damage, health hazards, or widespread disruption.
    - "urgencyScore": A number from 0 to 100 representing the absolute urgency within a NON-EMERGENCY municipal context. Use this Advanced Evaluation Matrix:
        * 90-100: Severe Infrastructure / Health Hazard (e.g., massive sinkholes, exposed live wires in public, week-long citywide water/power loss).
        * 75-89: High Impact / Widespread Disruption (e.g., completely impassable local road, severe localized flooding, hazardous illegal dumping).
        * 50-74: Moderate / Localized Nuisance (e.g., deep potholes, broken streetlights, aggressive stray dogs, uncollected garbage).
        * 20-49: Low / Minor Nuisance (e.g., mild noise complaints, graffiti, minor sidewalk cracks, scattered trash).
        * AI MODIFIER: Factor in the user's text sentiment. If the user expresses extreme frustration (e.g., reported multiple times, fed up) or emphasizes severity in ALL CAPS, ADD +10 to +15 to the base score. Cap at 100.
    
    Return ONLY JSON. No markdown.
    `;

    let result = null;
    if (imagePath && geminiService.generateJSONWithImage) {
      console.log('[AI] Classifying with Gemini Vision using image and text...');
      result = await geminiService.generateJSONWithImage(prompt, imagePath);
    } else {
      console.log('[AI] Classifying with Gemini text-only...');
      result = await geminiService.generateJSON(prompt);
    }

    if (result && result.category && result.priority) {
      console.log('[AI] Successfully classified via Gemini LLM.');
      return result;
    }
  }

  // 2. Fallback to local NLP
  console.log('[AI] Falling back to local keyword NLP classification.');
  const baseClassification = analyzeConcern(text, imageTags);

  return {
    ...baseClassification,
  };
};

module.exports = {
  analyzeConcern,
  analyzeFullConcern,
  routeToDepartment,
};
