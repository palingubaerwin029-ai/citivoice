const natural = require('natural');
const geminiService = require('./geminiService');

const categoryClassifier = new natural.BayesClassifier();
const priorityClassifier = new natural.BayesClassifier();

// ─── Train Category Classifier ────────────────────────────────────────────────
// Road & Infrastructure (English, Tagalog, Hiligaynon, Visual Tags)
categoryClassifier.addDocument('pothole on the road is huge', 'Road & Infrastructure');
categoryClassifier.addDocument('damaged sidewalk pavement', 'Road & Infrastructure');
categoryClassifier.addDocument('butas ang kalsada baha', 'Road & Infrastructure'); // Tagalog
categoryClassifier.addDocument('guba ang karsada buslot', 'Road & Infrastructure'); // Hiligaynon
categoryClassifier.addDocument('guba nga dalan damo buslot', 'Road & Infrastructure'); // Hiligaynon
categoryClassifier.addDocument('damo mga bato sa dalan nd kaagi truck', 'Road & Infrastructure'); // Hiligaynon - rocks on road
categoryClassifier.addDocument('bato harang sa kalsada sakyanan', 'Road & Infrastructure'); // Tagalog/Hiligaynon - road blockage
categoryClassifier.addDocument('guba nga taytay lubak nga dalan sa bukid', 'Road & Infrastructure'); // Kabankalan farm-to-market roads
categoryClassifier.addDocument('street sign traffic light parking meter crater trench stone wall pole', 'Road & Infrastructure'); // Visual

// Electricity (English, Tagalog, Hiligaynon, Visual Tags)
categoryClassifier.addDocument('broken street light', 'Electricity');
categoryClassifier.addDocument('sira ang ilaw sa poste', 'Electricity'); // Tagalog
categoryClassifier.addDocument('guba ang suga sa dalan streetlight', 'Electricity'); // Hiligaynon
categoryClassifier.addDocument('pole spotlight street lamp electric wire', 'Electricity'); // Visual

// Water & Drainage (English, Tagalog, Hiligaynon, Visual Tags)
categoryClassifier.addDocument('water pipe burst flooding', 'Water & Drainage');
categoryClassifier.addDocument('clogged drainage', 'Water & Drainage');
categoryClassifier.addDocument('baradong kanal', 'Water & Drainage'); // Tagalog
categoryClassifier.addDocument('baha butas kalsada', 'Water & Drainage'); // Tagalog
categoryClassifier.addDocument('gabaha ang dalan budlay magtabok dalom ang tubig', 'Water & Drainage'); // Hiligaynon
categoryClassifier.addDocument('naglapaw ang suba baha sa balay ilog hilabangan', 'Water & Drainage'); // Kabankalan flooding
categoryClassifier.addDocument('puddle lake river water bucket manhole cover drain', 'Water & Drainage'); // Visual

// Waste & Sanitation (English, Tagalog, Hiligaynon, Visual Tags)
categoryClassifier.addDocument('garbage not collected', 'Waste & Sanitation');
categoryClassifier.addDocument('smells terrible trash bin', 'Waste & Sanitation');
categoryClassifier.addDocument('sewage leak', 'Waste & Sanitation');
categoryClassifier.addDocument('mabaho ang basura hindi kinuha', 'Waste & Sanitation'); // Tagalog
categoryClassifier.addDocument('patay na hayop sa kalsada', 'Waste & Sanitation'); // Tagalog
categoryClassifier.addDocument('baho ang basura wala nakolekta', 'Waste & Sanitation'); // Hiligaynon
categoryClassifier.addDocument('patay nga sapat damo sagbot', 'Waste & Sanitation'); // Hiligaynon
categoryClassifier.addDocument('garbage truck ashcan trash can garbage can wastebin plastic bag fly', 'Waste & Sanitation'); // Visual

// Public Safety (English, Tagalog, Hiligaynon, Visual Tags)
categoryClassifier.addDocument('someone is breaking in', 'Public Safety');
categoryClassifier.addDocument('assault robbery theft', 'Public Safety');
categoryClassifier.addDocument('stray dogs biting', 'Public Safety');
categoryClassifier.addDocument('may magnanakaw nag aaway', 'Public Safety'); // Tagalog
categoryClassifier.addDocument('asong ulol nangangagat', 'Public Safety'); // Tagalog
categoryClassifier.addDocument('may kawatan naga away', 'Public Safety'); // Hiligaynon
categoryClassifier.addDocument('buang nga ido nagapangagat', 'Public Safety'); // Hiligaynon
categoryClassifier.addDocument('police cruiser fire engine ambulance patrol car weapon dog', 'Public Safety'); // Visual

// Other / Agriculture (English, Tagalog, Hiligaynon, Visual Noise)
categoryClassifier.addDocument('loud music party next door', 'Other');
categoryClassifier.addDocument('dogs barking all night', 'Other');
categoryClassifier.addDocument('maingay na videoke kapitbahay', 'Other'); // Tagalog
categoryClassifier.addDocument('tahol ng aso magdamag', 'Other'); // Tagalog
categoryClassifier.addDocument('gahod nga videoke kag pamalay', 'Other'); // Hiligaynon
categoryClassifier.addDocument('paghot sang ido bilog nga gab-i', 'Other'); // Hiligaynon
categoryClassifier.addDocument('patay ang humay uga ang talamnan el nino', 'Other'); // Kabankalan Agriculture
categoryClassifier.addDocument('na damage ang tubo sang bagyo', 'Other'); // Kabankalan Agriculture (Sugarcane)
// IMPORTANT: Visual noise (when users take random photos of computers, screens, faces, rooms)
categoryClassifier.addDocument('laptop computer monitor screen keyboard television cellphone phone table chair person face room wall paper pen', 'Other');

categoryClassifier.train();

// ─── Train Priority Classifier ────────────────────────────────────────────────
// High (English, Tagalog, Hiligaynon)
priorityClassifier.addDocument('water pipe burst flooding massive sinkhole fire', 'High');
priorityClassifier.addDocument('someone is breaking in robbery assault', 'High');
priorityClassifier.addDocument('baha magnanakaw patay sunog', 'High'); // Tagalog
priorityClassifier.addDocument('kawatan baha sunog patay', 'High'); // Hiligaynon

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

// ─── Feature 2: Sentiment & Urgency Detection ───────────────────────────────

// Urgency keywords (English, Tagalog, Hiligaynon)
const URGENCY_KEYWORDS = {
  critical: {
    weight: 30,
    words: [
      // English
      'emergency', 'urgent', 'danger', 'critical', 'life-threatening', 'death', 'dying', 'dead',
      'collapse', 'collapsed', 'fire', 'flood', 'trapped', 'drowning', 'explosion', 'injury', 'injured',
      'help us', 'please help', 'need immediate', 'save us', 'children sick', 'kids are sick',
      // Tagalog
      'emerhensya', 'tulong', 'namatay', 'patay', 'sunog', 'baha', 'nasugatan',
      'naaksidente', 'nanganganib', 'delikado', 'tulungan nyo kami', 'saklolo',
      // Hiligaynon / Kabankalan local
      'bulig', 'napatay', 'kalayo', 'grabe', 'peligro', 'naguba', 'nasamad',
      'buligan kami', 'makahahadlok', 'dali', 'apura', 'naglapaw ang tubig', 'anod',
    ],
  },
  frustrated: {
    weight: 20,
    words: [
      // English
      'again', 'still', 'nothing happened', 'no action', 'ignored', 'useless', 'incompetent',
      'reported before', 'reported already', 'reported multiple', 'how many times', 'tired of',
      'fed up', 'sick of', 'waiting for months', 'months already', 'nobody cares',
      // Tagalog
      'wala pa rin', 'paulit ulit', 'hindi pa', 'napabayaan', 'walang aksyon',
      'ilang beses na', 'nagsawa na', 'hindi na kayo', 'kapabayaan',
      // Hiligaynon
      'wala pa gihapon', 'balik balik', 'wala aksyon', 'pabaya', 'kapila na',
      'indi na kami', 'natak-an na', 'wala kamo',
    ],
  },
  emotional: {
    weight: 15,
    words: [
      // English
      'please', 'begging', 'scared', 'afraid', 'worried', 'desperate', 'suffering',
      'children', 'kids', 'elderly', 'senior', 'baby', 'pregnant', 'disabled', 'sick',
      // Tagalog
      'pakiusap', 'takot', 'natatakot', 'nag-aalala', 'kawawa', 'nahihirapan',
      'mga bata', 'matanda', 'buntis', 'may sakit',
      // Hiligaynon
      'palihog', 'mahadlok', 'nagakabalaka', 'kaluoy', 'nagalisud',
      'mga bata', 'tigulang', 'nagamasakit',
    ],
  },
};

/**
 * Analyze sentiment and urgency from concern text.
 * @param {string} text - Combined title + description
 * @returns {Object} { sentiment, urgencyScore }
 */
const analyzeSentiment = (text) => {
  if (!text || text.trim().length === 0) {
    return { sentiment: 'neutral', urgencyScore: 50 };
  }

  const lower = text.toLowerCase();
  let totalScore = 50; // Base score
  let criticalHits = 0;
  let frustratedHits = 0;
  let emotionalHits = 0;

  // Check critical urgency keywords
  URGENCY_KEYWORDS.critical.words.forEach(keyword => {
    if (lower.includes(keyword)) {
      totalScore += URGENCY_KEYWORDS.critical.weight;
      criticalHits++;
    }
  });

  // Check frustration keywords
  URGENCY_KEYWORDS.frustrated.words.forEach(keyword => {
    if (lower.includes(keyword)) {
      totalScore += URGENCY_KEYWORDS.frustrated.weight;
      frustratedHits++;
    }
  });

  // Check emotional keywords
  URGENCY_KEYWORDS.emotional.words.forEach(keyword => {
    if (lower.includes(keyword)) {
      totalScore += URGENCY_KEYWORDS.emotional.weight;
      emotionalHits++;
    }
  });

  // Exclamation marks and ALL CAPS add urgency
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount >= 3) totalScore += 10;

  const capsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).length;
  if (capsWords >= 2) totalScore += 10;

  // Cap at 100
  totalScore = Math.min(totalScore, 100);

  // Determine sentiment label
  let sentiment = 'neutral';
  if (criticalHits >= 2) sentiment = 'urgent';
  else if (criticalHits >= 1) sentiment = 'concerned';
  else if (frustratedHits >= 2) sentiment = 'frustrated';
  else if (frustratedHits >= 1 || emotionalHits >= 2) sentiment = 'concerned';
  else if (emotionalHits >= 1) sentiment = 'concerned';

  // Override: very high score always = urgent
  if (totalScore >= 85) sentiment = 'urgent';

  return { sentiment, urgencyScore: totalScore };
};

// ─── Feature 4: Smart Department Routing ─────────────────────────────────────

const DEPARTMENT_MAP = {
  'Road & Infrastructure': {
    High: { department: 'City Engineering Office', team: 'Emergency Response Unit' },
    Medium: { department: 'City Engineering Office', team: 'Maintenance Division' },
    Low: { department: 'City Engineering Office', team: 'General Queue' },
  },
  'Electricity': {
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
  'Other': {
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
const analyzeFullConcern = async (text, imageTags = []) => {
  const tagsString = imageTags.join(' ');
  const fullContext = `${text} ${tagsString}`.trim();

  if (!fullContext) {
    return { category: 'Other', priority: 'Low', sentiment: 'neutral', urgencyScore: 50 };
  }

  // 1. Try Gemini first for max accuracy
  if (geminiService.isAvailable()) {
    const prompt = `
    You are an expert city dispatcher for Kabankalan City.
    Analyze this citizen report: "${fullContext}"
    
    Output a strictly valid JSON object with these keys:
    - "category": Must be exactly one of: "Road & Infrastructure", "Electricity", "Water & Drainage", "Waste & Sanitation", "Public Safety", "Other". Note: "dalan" means road, "bato" means stone, "taytay" means bridge, "humay" or "tubo" means agriculture (Other).
    - "priority": Must be exactly one of: "Low", "Medium", "High". Use High for flooding, critical danger, or severe infrastructure collapse.
    - "sentiment": Must be exactly one of: "neutral", "concerned", "frustrated", "urgent".
    - "urgencyScore": A number from 0 to 100 based on the danger level. 85+ is High priority.
    
    Return ONLY JSON. No markdown.
    `;

    const result = await geminiService.generateJSON(prompt);
    if (result && result.category && result.priority) {
      console.log('[AI] Successfully classified via Gemini LLM.');
      return result;
    }
  }

  // 2. Fallback to local NLP
  console.log('[AI] Falling back to local keyword NLP classification.');
  const baseClassification = analyzeConcern(text, imageTags);
  const sentimentClassification = analyzeSentiment(text);

  return {
    ...baseClassification,
    ...sentimentClassification,
  };
};

module.exports = {
  analyzeConcern,
  analyzeSentiment,
  analyzeFullConcern,
  routeToDepartment,
};
