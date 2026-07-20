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
categoryClassifier.addDocument('karsada dalan alagyan taytay tulay guba buslot lubak asphalt road', 'Road & Infrastructure');

// Electricity
categoryClassifier.addDocument('broken street light', 'Electricity');
categoryClassifier.addDocument('sira ang ilaw sa poste', 'Electricity');
categoryClassifier.addDocument('guba ang suga sa dalan streetlight', 'Electricity');
categoryClassifier.addDocument('brownout wala kuryente patay suga', 'Electricity');
categoryClassifier.addDocument('naglapaw kuryente poste wiring live wire noceco', 'Electricity');
categoryClassifier.addDocument('pole spotlight street lamp electric wire transformer', 'Electricity');

// Drainage
categoryClassifier.addDocument('water pipe burst flooding', 'Drainage');
categoryClassifier.addDocument('clogged drainage', 'Drainage');
categoryClassifier.addDocument('baradong kanal', 'Drainage');
categoryClassifier.addDocument('baha butas kalsada', 'Drainage');
categoryClassifier.addDocument('gabaha ang dalan budlay magtabok dalom ang tubig', 'Drainage');
categoryClassifier.addDocument('naglapaw ang suba baha sa balay ilog hilabangan', 'Drainage');
categoryClassifier.addDocument('barado ang kanal damo tubig overflow culvert', 'Drainage');
categoryClassifier.addDocument('guba ang tubo sang tubig wala tubig', 'Drainage');
categoryClassifier.addDocument('puddle lake river water bucket manhole cover drain', 'Drainage');

// Waste & Sanitation
categoryClassifier.addDocument('garbage not collected', 'Waste & Sanitation');
categoryClassifier.addDocument('smells terrible trash bin', 'Waste & Sanitation');
categoryClassifier.addDocument('sewage leak', 'Waste & Sanitation');
categoryClassifier.addDocument('mabaho ang basura hindi kinuha', 'Waste & Sanitation');
categoryClassifier.addDocument('patay na hayop sa kalsada', 'Waste & Sanitation');
categoryClassifier.addDocument('baho ang basura wala nakolekta cenro', 'Waste & Sanitation');
categoryClassifier.addDocument('patay nga sapat damo sagbot landfill', 'Waste & Sanitation');
categoryClassifier.addDocument('damo basura sa kilid dalan', 'Waste & Sanitation');
categoryClassifier.addDocument('garbage truck ashcan trash can garbage can wastebin plastic bag fly', 'Waste & Sanitation');

categoryClassifier.train();

// Train Priority Classifier
priorityClassifier.addDocument('water pipe burst severe flooding sinkhole', 'High');
priorityClassifier.addDocument('impassable road live wire fallen post', 'High');
priorityClassifier.addDocument('malalim na baha harang sa kalsada', 'High');
priorityClassifier.addDocument('naglapaw tubig nd maagyan dalan', 'High');
priorityClassifier.addDocument('fallen tree blocking road emergency sunog fire live wire hazard', 'High');

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
 * @returns {Promise<{ category: string, priority: string, urgencyScore: number, isSafetyHazard: boolean, aiSummary: string, recommendedDepartment: string, suggestedActionSteps: string[] }>}
 */
const analyzeFullConcern = async (text, imageTags = [], imagePath = null) => {
  const tagsString = Array.isArray(imageTags) ? imageTags.join(' ') : '';
  const fullContext = `${text} ${tagsString}`.trim();

  if (!fullContext && !imagePath) {
    return {
      category: 'Road & Infrastructure',
      priority: 'Low',
      urgencyScore: 50,
      isSafetyHazard: false,
      aiSummary: 'Citizen report submitted with minimal details.',
      recommendedDepartment: "City Engineer's Office (CEO)",
      suggestedActionSteps: ['Inspect reported location', 'Verify concern validity'],
    };
  }

  // 1. Try Groq AI / Vision first
  if (groqService.isAvailable()) {
    const prompt = `
    You are an expert municipal dispatcher and senior urban engineer for Kabankalan City, Philippines.
    You are fluent in Hiligaynon (Ilonggo), Tagalog, and English.
    
    REPORT DETAILS:
    ${fullContext}
    
    INSTRUCTIONS FOR VISUAL ANALYSIS:
    If an image is attached, prioritize physical evidence shown in the photo over user text.
    
    LANGUAGE UNDERSTANDING:
    Understand Hiligaynon terms:
    - "dalan" / "karsada" = road
    - "buslot" / "lubak" = pothole / crater
    - "taytay" = bridge
    - "baha" / "naglapaw" = flood / overflow
    - "tubig" = water
    - "suga" = streetlight / lamp
    - "kuryente" = electricity / power
    - "basura" = waste / garbage
    - "sagbot" = trash / weeds
    
    CATEGORIES (MUST BE EXACTLY ONE OF THESE 4):
    - "Road & Infrastructure": Potholes, broken pavement, damaged bridges, fallen trees, landslides, road obstructions.
    - "Electricity": Power outages, dangling live wires, broken streetlights, transformer issues, NOCECO billing.
    - "Drainage": Flooding, broken water pipes, clogged canals, culvert blockage, drainage overflow.
    - "Waste & Sanitation": Uncollected garbage, sewage leaks, dead animals, illegal dumping, CENRO landfill issues.

    DEPARTMENTS (MUST BE EXACTLY ONE OF THESE 3):
    - "City Engineer's Office (CEO)" (for Road & Infrastructure and Drainage)
    - "City Environment and Natural Resources Office (CENRO)" (for Waste & Sanitation)
    - "Negros Occidental Electric Cooperative (NOCECO)" (for Electricity)

    Output a strictly valid JSON object with these keys:
    - "category": Must be one of: "Road & Infrastructure", "Electricity", "Drainage", "Waste & Sanitation".
    - "priority": Must be one of: "Low", "Medium", "High".
    - "urgencyScore": Number 0-100 indicating operational urgency.
    - "isSafetyHazard": Boolean (true if exposed live wire, severe flood, impassable road, structural collapse, or biohazard).
    - "aiSummary": A concise 1-sentence executive summary formatted for the Mayor and Department Heads.
    - "recommendedDepartment": Must be one of the 3 official departments listed above.
    - "suggestedActionSteps": Array of 2 to 3 tactical response steps for field crews.
    
    Return ONLY JSON. No markdown wrappers.
    `;

    try {
      let result = null;
      if (imagePath && groqService.generateJSONWithImage) {
        console.log('[AI Engine] Analyzing report with Groq Vision AI (image + text)...');
        result = await groqService.generateJSONWithImage(prompt, imagePath);
      } else {
        console.log('[AI Engine] Analyzing report with Groq LLM (text)...');
        result = await groqService.generateJSON(prompt);
      }

      if (result && VALID_CATEGORIES.includes(result.category)) {
        console.log('[AI Engine] Successfully analyzed via Groq AI:', result.category, result.priority);
        const mappedDept = routeToDepartment(result.category, result.priority || 'Medium').department;

        return {
          category: result.category,
          priority: VALID_PRIORITIES.includes(result.priority) ? result.priority : 'Medium',
          urgencyScore: typeof result.urgencyScore === 'number' ? result.urgencyScore : 50,
          isSafetyHazard: Boolean(result.isSafetyHazard),
          aiSummary: result.aiSummary || `Citizen concern reported under ${result.category}.`,
          recommendedDepartment: result.recommendedDepartment || mappedDept,
          suggestedActionSteps: Array.isArray(result.suggestedActionSteps) && result.suggestedActionSteps.length > 0
            ? result.suggestedActionSteps
            : ['Inspect site condition', 'Deploy repair team', 'Update concern status'],
        };
      }
    } catch (err) {
      console.error('[AI Engine] Groq AI classification error:', err.message);
    }
  }

  // 2. Fallback to local Naive Bayes NLP
  console.log('[AI Engine] Falling back to local Naive Bayes classification.');
  const baseClassification = analyzeConcern(text, imageTags);
  const mappedDept = routeToDepartment(baseClassification.category, baseClassification.priority).department;

  return {
    ...baseClassification,
    urgencyScore: baseClassification.priority === 'High' ? 80 : baseClassification.priority === 'Medium' ? 50 : 30,
    isSafetyHazard: baseClassification.priority === 'High',
    aiSummary: `Citizen concern categorized under ${baseClassification.category} (${baseClassification.priority} Priority).`,
    recommendedDepartment: mappedDept,
    suggestedActionSteps: ['Conduct site inspection', 'Coordinate with department head', 'Resolve report'],
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
