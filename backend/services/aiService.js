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

// Label used when a report is not a typical concern for this platform.
const NOT_TYPICAL_CATEGORY = 'Not a Typical Concern';
const CONTENT_FLAGS = ['none', 'off_topic', 'inappropriate'];

// ─── Priority rubric & safety rules ───────────────────────────────────────────────

const PRIORITY_RANK = { Low: 0, Medium: 1, High: 2 };
const maxPriority = (a, b) => (PRIORITY_RANK[b] > PRIORITY_RANK[a] ? b : a);
const raisePriority = (p, steps = 1) =>
  VALID_PRIORITIES[Math.min(2, (PRIORITY_RANK[p] ?? 1) + steps)];

/**
 * Deterministic priority from factors the AI observed (not a free-form guess).
 * score = severity(1-5)*12 + hazard 30 + blocks road/service 15 + scope (community 15 / street 8) + worsens quickly 10
 * High >= 70, Medium >= 40, otherwise Low.
 * @returns {{ score:number, level:string, reasons:string[] } | null}
 */
const scoreFromFactors = (f) => {
  if (!f || typeof f !== 'object') return null;
  const severity = Math.min(5, Math.max(1, Math.round(Number(f.severity)) || 0));
  if (!Number(f.severity)) return null;

  const reasons = [`severity ${severity}/5`];
  let score = severity * 12;
  if (f.hazardToLife === true) { score += 30; reasons.push('hazard to life/safety'); }
  if (f.blocksRoadOrService === true) { score += 15; reasons.push('blocks road or essential service'); }
  if (f.scope === 'community') { score += 15; reasons.push('affects a wide area'); }
  else if (f.scope === 'street') { score += 8; reasons.push('affects a street/neighborhood'); }
  if (f.worsensQuickly === true) { score += 10; reasons.push('likely to worsen quickly'); }

  score = Math.min(100, score);
  const level = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  return { score, level, reasons };
};

// Keyword safety net (English / Tagalog / Hiligaynon). Rules are predictable and never lower a priority.
const HIGH_KEYWORDS = [
  'live wire', 'exposed wire', 'dangling wire', 'sparking', 'electrocut', 'nakuryente', 'sunog', 'fire',
  'sinkhole', 'collapsed', 'collapse', 'landslide', 'gumuho', 'drowning', 'nalunod', 'gas leak',
  'impassable', 'malalim nga baha', 'malalim na baha', 'deep flood', 'natumba nga poste', 'fallen post',
  'fallen pole', 'exposed manhole', 'open manhole', 'bukas nga manhole',
];
const MEDIUM_KEYWORDS = [
  'brownout', 'power outage', 'no power', 'walay kuryente', 'wala kuryente', 'flood', 'baha', 'naglapaw',
  'clogged', 'barado', 'dead animal', 'patay nga sapat', 'burst pipe', 'pothole', 'buslot', 'lubak',
  'no water', 'walay tubig', 'sewage', 'fallen tree',
];

const buildKeywordRegex = (words) =>
  new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i');
const HIGH_RE = buildKeywordRegex(HIGH_KEYWORDS);
const MEDIUM_RE = buildKeywordRegex(MEDIUM_KEYWORDS);

/**
 * @returns {{ floor: 'High'|'Medium'|null, match: string|null }}
 */
const keywordFloor = (text) => {
  const t = String(text || '');
  const high = t.match(HIGH_RE);
  if (high) return { floor: 'High', match: high[1].toLowerCase() };
  const med = t.match(MEDIUM_RE);
  if (med) return { floor: 'Medium', match: med[1].toLowerCase() };
  return { floor: null, match: null };
};

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

    CONTENT VALIDATION (MANDATORY & THOROUGH):
    Check the photo AND the text to decide if this is a genuine municipal concern that fits one of the 4 categories below.
    - "imageMatchesConcern": boolean (true ONLY if the photo clearly or reasonably depicts the reported municipal problem or public infrastructure; false if the photo shows something else such as a selfie, person, animal/pet, food, bedroom/indoor personal item, fabric, document, meme, screenshot, or unrelated object).
    - "contentFlag": "none" -> a real concern that clearly fits a category (photo and text agree).
    - "contentFlag": "off_topic" -> NOT a typical concern for this platform: selfies, people/pets/food/memes, screenshots, indoor/personal photos,
      random or blank images, product ads, spam/gibberish text, jokes/tests, personal disputes, or a photo that clearly does not match the text.
    - "contentFlag": "inappropriate" -> explicit/sexual/nude, graphic violence/gore, hate speech, harassment, threats, or abusive/profane content.
    - "alignmentReason": Short 1-sentence explanation of what the photo actually shows and why it does or does not align with the reported concern.
    
    Do not force an unrelated report into a category. If the photo does not depict the reported issue, set imageMatchesConcern: false and contentFlag: "off_topic".
    
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
    - "imageMatchesConcern": Boolean (true if photo matches reported issue, false otherwise).
    - "contentFlag": One of "none", "off_topic", "inappropriate".
    - "validityReason": Short 1-sentence explanation of what the photo/text actually shows and why it is or is not a valid concern.
    - "alignmentReason": Short 1-sentence explanation of whether the photo aligns with the concern.
    - "validityConfidence": Number 0-100, how confident you are in the contentFlag decision.
    - "category": Must be one of: "Road & Infrastructure", "Electricity", "Drainage", "Waste & Sanitation" (best guess even if flagged).
    - "priorityFactors": Object describing what is OBSERVABLE (be honest, do not exaggerate):
        {
          "severity": integer 1-5 (1 cosmetic/minor nuisance, 2 minor inconvenience, 3 moderate daily disruption, 4 serious damage or disruption, 5 critical/dangerous),
          "hazardToLife": boolean (true ONLY for exposed live wire, deep/fast flood, sinkhole, structural collapse, fire risk, open manhole on a walkway, biohazard),
          "blocksRoadOrService": boolean (road impassable, power/water cut for an area, canal fully blocked),
          "scope": "single" (one household/spot) | "street" (a street or neighborhood) | "community" (many barangays/main road),
          "worsensQuickly": boolean (will get much worse within days if not fixed, e.g. growing sinkhole, rising flood, leaking main pipe)
        }
    - "priority": Must be one of: "Low", "Medium", "High" (your overall impression; the system recomputes it from priorityFactors).
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

        const contentFlag = CONTENT_FLAGS.includes(result.contentFlag) ? result.contentFlag : 'none';
        const validityConfidence =
          typeof result.validityConfidence === 'number' ? result.validityConfidence : 50;

        // Visual alignment: must be explicitly true when photo is analyzed
        const imageMatchesConcern =
          imagePath
            ? result.imageMatchesConcern === true && contentFlag === 'none'
            : true;

        const alignmentReason =
          result.alignmentReason ||
          result.validityReason ||
          (imageMatchesConcern
            ? 'The attached photo matches the reported concern.'
            : 'The attached photo does not align with the reported concern.');

        // Priority: rubric from observed factors (fallback to AI's impression), raised by keyword safety floor.
        const rubric = scoreFromFactors(result.priorityFactors);
        const aiPriority = VALID_PRIORITIES.includes(result.priority) ? result.priority : 'Medium';
        let priority = rubric ? rubric.level : aiPriority;
        const priorityReasons = rubric ? [...rubric.reasons] : ['AI overall impression'];
        const kw = keywordFloor(text);
        if (kw.floor && PRIORITY_RANK[kw.floor] > PRIORITY_RANK[priority]) {
          priority = kw.floor;
          priorityReasons.push(`safety keyword "${kw.match}"`);
        }

        let urgencyScore = rubric
          ? rubric.score
          : typeof result.urgencyScore === 'number' ? result.urgencyScore : 50;
        if (priority === 'High') urgencyScore = Math.max(urgencyScore, 70);
        else if (priority === 'Medium') urgencyScore = Math.min(Math.max(urgencyScore, 40), 69);
        else urgencyScore = Math.min(urgencyScore, 39);

        const isSafetyHazard =
          Boolean(result.isSafetyHazard) || result.priorityFactors?.hazardToLife === true || kw.floor === 'High';

        console.log(`[AI Engine] Priority ${priority} (score ${urgencyScore}): ${priorityReasons.join(', ')}`);

        return {
          category: result.category,
          priority,
          urgencyScore,
          priorityReasons,
          isSafetyHazard,
          aiSummary: result.aiSummary || `Citizen concern reported under ${result.category}.`,
          recommendedDepartment: result.recommendedDepartment || mappedDept,
          suggestedActionSteps: Array.isArray(result.suggestedActionSteps) && result.suggestedActionSteps.length > 0
            ? result.suggestedActionSteps
            : ['Inspect site condition', 'Deploy repair team', 'Update concern status'],
          contentFlag,
          validityReason: result.validityReason || '',
          alignmentReason,
          validityConfidence,
          imageMatchesConcern,
        };
      }
    } catch (err) {
      console.error('[AI Engine] Groq AI classification error:', err.message);
    }
  }

  // 2. Fallback to local Naive Bayes NLP
  console.log('[AI Engine] Falling back to local Naive Bayes classification.');
  const baseClassification = analyzeConcern(text, imageTags);
  const fb = keywordFloor(text);
  const fallbackReasons = ['local model estimate'];
  if (fb.floor && PRIORITY_RANK[fb.floor] > PRIORITY_RANK[baseClassification.priority]) {
    baseClassification.priority = fb.floor;
    fallbackReasons.push(`safety keyword "${fb.match}"`);
  }
  const mappedDept = routeToDepartment(baseClassification.category, baseClassification.priority).department;

  return {
    ...baseClassification,
    urgencyScore: baseClassification.priority === 'High' ? 80 : baseClassification.priority === 'Medium' ? 50 : 30,
    priorityReasons: fallbackReasons,
    isSafetyHazard: baseClassification.priority === 'High',
    aiSummary: `Citizen concern categorized under ${baseClassification.category} (${baseClassification.priority} Priority).`,
    recommendedDepartment: mappedDept,
    suggestedActionSteps: ['Conduct site inspection', 'Coordinate with department head', 'Resolve report'],
    // Local fallback cannot judge photos; leave unflagged for admin review.
    contentFlag: 'none',
    validityReason: '',
    alignmentReason: '',
    validityConfidence: 0,
    imageMatchesConcern: true,
  };
};

/**
 * Fast dedicated verification for checking whether an attached photo aligns with a concern.
 *
 * @param {string} title
 * @param {string} description
 * @param {string} category
 * @param {string} imagePath - Absolute local path to uploaded image
 * @returns {Promise<{ isValid: boolean, imageMatchesConcern: boolean, contentFlag: string, reason: string }>}
 */
const verifyImageAlignment = async (title, description, category, imagePath) => {
  if (!imagePath || !groqService.isAvailable() || !groqService.generateJSONWithImage) {
    return {
      isValid: true,
      imageMatchesConcern: true,
      contentFlag: 'none',
      reason: 'Image accepted',
    };
  }

  const prompt = `
  You are an official verification officer for the CitiVoice Kabankalan City government portal.
  The citizen submitted a report with:
  Title: "${title || ''}"
  Description: "${description || ''}"
  Category: "${category || ''}"

  TASK:
  Examine the attached photo.
  Determine whether the photo ALIGNS with the reported municipal problem (roads, bridges, drainage, flooding, streetlights, power lines, waste/garbage, or public utilities).

  REJECTION CRITERIA (imageMatchesConcern MUST be false if any apply):
  - The photo shows people, faces, or selfies.
  - The photo shows food, drinks, dining, snacks, or cooking.
  - The photo shows household pets, dogs, cats, or domestic animals (unless reported as dead animal carcass on public road).
  - The photo shows indoor bedrooms, personal belongings, fabric/textiles, clothes, shoes, electronics, or unrelated home items.
  - The photo is a screenshot of chat, social media, meme, text document, or wallpaper.
  - The photo clearly does not match what the user is reporting (e.g., reported "flood on street" but photo shows dry bedroom; reported "pothole" but photo is fabric/furniture).
  - The photo contains explicit, offensive, or inappropriate content.

  Output strictly valid JSON with these keys:
  - "imageMatchesConcern": boolean (true ONLY if the photo depicts the reported problem or related public infrastructure; false if mismatched or off-topic).
  - "contentFlag": "none" (matches genuine concern), "off_topic" (does not match or not a municipal issue), or "inappropriate".
  - "reason": Clear 1-sentence explanation of what the photo actually shows and why it matches or fails to match the reported concern.
  `;

  try {
    const result = await groqService.generateJSONWithImage(prompt, imagePath);
    if (result) {
      const matches = result.imageMatchesConcern === true && result.contentFlag === 'none';
      return {
        isValid: matches,
        imageMatchesConcern: matches,
        contentFlag: result.contentFlag || (matches ? 'none' : 'off_topic'),
        reason: result.reason || (matches ? 'Photo aligns with the reported issue.' : 'The attached photo does not match the reported concern.'),
      };
    }
  } catch (e) {
    console.error('[AI] Image alignment verification failed:', e.message);
  }

  return {
    isValid: true,
    imageMatchesConcern: true,
    contentFlag: 'none',
    reason: 'Photo accepted',
  };
};

module.exports = {
  VALID_CATEGORIES,
  NOT_TYPICAL_CATEGORY,
  VALID_PRIORITIES,
  DEPARTMENT_MAP,
  analyzeConcern,
  analyzeFullConcern,
  verifyImageAlignment,
  routeToDepartment,
  scoreFromFactors,
  keywordFloor,
  maxPriority,
  raisePriority,
};
