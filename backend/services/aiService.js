/**
 * aiService.js — CitiVoice AI Dispatcher & Categorization Engine
 *
 * Categorizes citizen reports in Kabankalan City into 4 primary categories:
 *  1. Road & Infrastructure  -> City Engineer's Office (CEO)
 *  2. Electricity            -> Negros Occidental Electric Cooperative (NOCECO)
 *  3. Drainage               -> City Engineer's Office (CEO)
 *  4. Waste & Sanitation     -> City Environment and Natural Resources Office (CENRO)
 *
 * Uses Groq Vision AI (Llama 3.2 Vision / LLM) as the primary intelligent classifier,
 * with a trained Naive Bayes classifier (natural) as a local NLP fallback.
 */

const natural = require('natural');
const groqService = require('./groqService');

const VALID_CATEGORIES = [
  'Road & Infrastructure',
  'Electricity',
  'Drainage',
  'Waste & Sanitation',
];

const VALID_PRIORITIES = ['Low', 'Medium', 'High'];

// ─── 1. Department Mapping ──────────────────────────────────────────────────

const DEPARTMENT_MAP = {
  'Road & Infrastructure': {
    High: { department: "City Engineer's Office (CEO)", team: 'Emergency Response Unit' },
    Medium: { department: "City Engineer's Office (CEO)", team: 'Maintenance Division' },
    Low: { department: "City Engineer's Office (CEO)", team: 'General Queue' },
  },
  Electricity: {
    High: { department: 'Negros Occidental Electric Cooperative (NOCECO)', team: 'Emergency Crew' },
    Medium: { department: 'Negros Occidental Electric Cooperative (NOCECO)', team: 'Repair Division' },
    Low: { department: 'Negros Occidental Electric Cooperative (NOCECO)', team: 'General Queue' },
  },
  Drainage: {
    High: { department: "City Engineer's Office (CEO)", team: 'Emergency Response' },
    Medium: { department: "City Engineer's Office (CEO)", team: 'Drainage Maintenance' },
    Low: { department: "City Engineer's Office (CEO)", team: 'General Queue' },
  },
  'Waste & Sanitation': {
    High: { department: 'City Environment and Natural Resources Office (CENRO)', team: 'Urgent Response' },
    Medium: { department: 'City Environment and Natural Resources Office (CENRO)', team: 'Collection Team' },
    Low: { department: 'City Environment and Natural Resources Office (CENRO)', team: 'General Queue' },
  },
};

/**
 * Route a concern to the appropriate department and team based on category and priority.
 * @param {string} category
 * @param {string} priority
 * @returns {{ department: string, team: string }}
 */
const routeToDepartment = (category, priority) => {
  const categoryRoutes = DEPARTMENT_MAP[category] || DEPARTMENT_MAP['Road & Infrastructure'];
  return categoryRoutes[priority] || categoryRoutes['Medium'];
};

// ─── 2. Local Naive Bayes Fallback Classifiers ───────────────────────────────

const categoryClassifier = new natural.BayesClassifier();
const priorityClassifier = new natural.BayesClassifier();

// Train Category Classifier (English, Tagalog, Hiligaynon / Ilonggo, Visual Tags)

// Road & Infrastructure
categoryClassifier.addDocument('pothole on the road is huge broken sira guba', 'Road & Infrastructure');
categoryClassifier.addDocument('damaged sidewalk pavement broken', 'Road & Infrastructure');
categoryClassifier.addDocument('butas ang kalsada baha sira kalsada', 'Road & Infrastructure');
categoryClassifier.addDocument('guba ang karsada buslot sira broken', 'Road & Infrastructure');
categoryClassifier.addDocument('guba nga dalan damo buslot lubak', 'Road & Infrastructure');
categoryClassifier.addDocument('damo mga bato sa dalan nd kaagi truck harang', 'Road & Infrastructure');
categoryClassifier.addDocument('bato harang sa kalsada sakyanan trapik', 'Road & Infrastructure');
categoryClassifier.addDocument('guba nga taytay lubak nga dalan sa bukid tulay', 'Road & Infrastructure');
categoryClassifier.addDocument('street sign traffic light parking meter crater trench stone wall pole', 'Road & Infrastructure');
categoryClassifier.addDocument('karsada dalan alagyan taytay tulay guba buslot lubak', 'Road & Infrastructure');

// Electricity
categoryClassifier.addDocument('broken street light', 'Electricity');
categoryClassifier.addDocument('sira ang ilaw sa poste', 'Electricity');
categoryClassifier.addDocument('guba ang suga sa dalan streetlight', 'Electricity');
categoryClassifier.addDocument('brownout wala kuryente patay suga', 'Electricity');
categoryClassifier.addDocument('naglapaw kuryente poste wiring', 'Electricity');
categoryClassifier.addDocument('pole spotlight street lamp electric wire', 'Electricity');

// Drainage
categoryClassifier.addDocument('water pipe burst flooding', 'Drainage');
categoryClassifier.addDocument('clogged drainage', 'Drainage');
categoryClassifier.addDocument('baradong kanal', 'Drainage');
categoryClassifier.addDocument('baha butas kalsada', 'Drainage');
categoryClassifier.addDocument('gabaha ang dalan budlay magtabok dalom ang tubig', 'Drainage');
categoryClassifier.addDocument('naglapaw ang suba baha sa balay ilog hilabangan', 'Drainage');
categoryClassifier.addDocument('barado ang kanal damo tubig', 'Drainage');
categoryClassifier.addDocument('guba ang tubo sang tubig wala tubig', 'Drainage');
categoryClassifier.addDocument('puddle lake river water bucket manhole cover drain', 'Drainage');

// Waste & Sanitation
categoryClassifier.addDocument('garbage not collected', 'Waste & Sanitation');
categoryClassifier.addDocument('smells terrible trash bin', 'Waste & Sanitation');
categoryClassifier.addDocument('sewage leak', 'Waste & Sanitation');
categoryClassifier.addDocument('mabaho ang basura hindi kinuha', 'Waste & Sanitation');
categoryClassifier.addDocument('patay na hayop sa kalsada', 'Waste & Sanitation');
categoryClassifier.addDocument('baho ang basura wala nakolekta', 'Waste & Sanitation');
categoryClassifier.addDocument('patay nga sapat damo sagbot', 'Waste & Sanitation');
categoryClassifier.addDocument('damo basura sa kilid dalan', 'Waste & Sanitation');
categoryClassifier.addDocument('garbage truck ashcan trash can garbage can wastebin plastic bag fly', 'Waste & Sanitation');

categoryClassifier.train();

// Train Priority Classifier
priorityClassifier.addDocument('water pipe burst severe flooding sinkhole', 'High');
priorityClassifier.addDocument('impassable road live wire fallen post', 'High');
priorityClassifier.addDocument('malalim na baha harang sa kalsada', 'High');
priorityClassifier.addDocument('naglapaw tubig nd maagyan dalan', 'High');
priorityClassifier.addDocument('fallen tree blocking road emergency sunog fire', 'High');

priorityClassifier.addDocument('garbage not collected pothole damaged sidewalk', 'Medium');
priorityClassifier.addDocument('broken street light dead animal', 'Medium');
priorityClassifier.addDocument('basura sira ilaw butas kalsada', 'Medium');
priorityClassifier.addDocument('basura guba suga guba dalan guba karsada buslot', 'Medium');

priorityClassifier.addDocument('suggestion feedback query minor issue', 'Low');
priorityClassifier.addDocument('vandalism graffiti noise', 'Low');

priorityClassifier.train();

/**
 * Local Naive Bayes classifier fallback.
 * @param {string} text
 * @param {string[]} imageTags
 * @returns {{ category: string, priority: string }}
 */
const analyzeConcern = (text, imageTags = []) => {
  const tagsString = Array.isArray(imageTags) ? imageTags.join(' ') : '';
  const fullContext = `${text} ${tagsString}`.trim();

  if (!fullContext) {
    return { category: 'Road & Infrastructure', priority: 'Low' };
  }

  const predictedCategory = categoryClassifier.classify(fullContext);
  const predictedPriority = priorityClassifier.classify(fullContext);

  const category = VALID_CATEGORIES.includes(predictedCategory)
    ? predictedCategory
    : 'Road & Infrastructure';

  const priority = VALID_PRIORITIES.includes(predictedPriority)
    ? predictedPriority
    : 'Medium';

  return { category, priority };
};

// ─── 3. Full Intelligent AI Analysis (Groq AI + Local Fallback) ────────────

/**
 * Supercharged Full Concern Analysis using Groq Vision AI / LLM with fallback to local NLP.
 *
 * @param {string} text - Report title and description
 * @param {string[]} imageTags - Tags extracted from image
 * @param {string|null} imagePath - Absolute path to attached photo
 * @returns {Promise<{ category: string, priority: string, urgencyScore?: number }>}
 */
const analyzeFullConcern = async (text, imageTags = [], imagePath = null) => {
  const tagsString = Array.isArray(imageTags) ? imageTags.join(' ') : '';
  const fullContext = `${text} ${tagsString}`.trim();

  if (!fullContext && !imagePath) {
    return { category: 'Road & Infrastructure', priority: 'Low', urgencyScore: 50 };
  }

  // 1. Try Groq AI / Vision first
  if (groqService.isAvailable()) {
    const prompt = `
    You are an expert city dispatcher for Kabankalan City and a native Hiligaynon speaker.
    Carefully analyze this citizen report to categorize it accurately:
    
    REPORT DETAILS:
    ${fullContext}
    
    CRITICAL INSTRUCTIONS FOR IMAGES: If an image is provided alongside this request, you MUST prioritize the visual evidence over the text. If the text says "small crack" but the image shows a massive sinkhole, classify based on the sinkhole (High priority). If the text is empty or vague like "fix this", use the image to determine the category.

    CRITICAL LANGUAGE INSTRUCTION: The report is likely written in Hiligaynon (Ilonggo), Tagalog, English, or a mix of these. You MUST understand ANY Hiligaynon term flawlessly using your internal knowledge of the language. For specific local context: "dalan" means road, "bato" means stone, "taytay" means bridge, "baha" or "naglapaw" means flood, "kuryente" means electricity, "basura" means waste.
    
    Categorization Rules (MUST BE EXACTLY ONE OF THESE 4 CATEGORIES):
    - "Road & Infrastructure": Potholes, broken roads, damaged bridges, obstructions, landslides, drainage blockages along roads, broken culverts, fallen trees.
    - "Electricity": Power outages, broken streetlights, dangling/live wires, fallen electric posts, meter connections, NOCECO electric billing issues.
    - "Drainage": Flooding, broken water pipes, clogged canals, water contamination, public drainage maintenance.
    - "Waste & Sanitation": Uncollected garbage, dead animals, sewage leaks, illegal dumping, anti-littering, waste segregation, landfill issues.

    Output a strictly valid JSON object with these keys:
    - "category": Must be exactly one of: "Road & Infrastructure", "Electricity", "Drainage", "Waste & Sanitation".
    - "priority": Must be exactly one of: "Low", "Medium", "High". Use High for severe infrastructure damage, health hazards, or widespread disruption.
    - "urgencyScore": A number from 0 to 100 representing the absolute urgency within a NON-EMERGENCY municipal context. Evaluation Matrix:
        * 90-100: Severe Infrastructure / Health Hazard (e.g., massive sinkholes, exposed live wires in public, week-long citywide water/power loss).
        * 75-89: High Impact / Widespread Disruption (e.g., completely impassable local road, severe localized flooding, hazardous illegal dumping).
        * 50-74: Moderate / Localized Nuisance (e.g., deep potholes, broken streetlights, uncollected garbage).
        * 20-49: Low / Minor Nuisance (e.g., minor sidewalk cracks, scattered trash).
        * AI MODIFIER: Factor in the user's text sentiment. If the user expresses extreme frustration (e.g., reported multiple times, fed up) or emphasizes severity in ALL CAPS, ADD +10 to +15 to the base score. Cap at 100.
    
    Return ONLY JSON. No markdown.
    `;

    try {
      let result = null;
      if (imagePath && groqService.generateJSONWithImage) {
        console.log('[AI] Classifying report with Groq Vision AI (image + text)...');
        result = await groqService.generateJSONWithImage(prompt, imagePath);
      } else {
        console.log('[AI] Classifying report with Groq AI (text-only)...');
        result = await groqService.generateJSON(prompt);
      }

      if (result && VALID_CATEGORIES.includes(result.category)) {
        console.log('[AI] Successfully classified via Groq AI:', result.category, result.priority);
        return {
          category: result.category,
          priority: VALID_PRIORITIES.includes(result.priority) ? result.priority : 'Medium',
          urgencyScore: typeof result.urgencyScore === 'number' ? result.urgencyScore : 50,
        };
      }
    } catch (err) {
      console.error('[AI] Groq AI classification error:', err.message);
    }
  }

  // 2. Fallback to local Naive Bayes NLP
  console.log('[AI] Falling back to local Naive Bayes classification.');
  const baseClassification = analyzeConcern(text, imageTags);

  return {
    ...baseClassification,
    urgencyScore: baseClassification.priority === 'High' ? 80 : baseClassification.priority === 'Medium' ? 50 : 30,
  };
};

module.exports = {
  VALID_CATEGORIES,
  VALID_PRIORITIES,
  DEPARTMENT_MAP,
  analyzeConcern,
  analyzeFullConcern,
  routeToDepartment,
};
