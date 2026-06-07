const natural = require('natural');

const categoryClassifier = new natural.BayesClassifier();
const priorityClassifier = new natural.BayesClassifier();

// ─── Train Category Classifier ────────────────────────────────────────────────
// Road & Infrastructure (English, Tagalog, Hiligaynon, Visual Tags)
categoryClassifier.addDocument('pothole on the road is huge', 'Road & Infrastructure');
categoryClassifier.addDocument('damaged sidewalk pavement', 'Road & Infrastructure');
categoryClassifier.addDocument('butas ang kalsada baha', 'Road & Infrastructure'); // Tagalog
categoryClassifier.addDocument('guba ang karsada buslot', 'Road & Infrastructure'); // Hiligaynon
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

// Other (English, Tagalog, Hiligaynon)
categoryClassifier.addDocument('loud music party next door', 'Other');
categoryClassifier.addDocument('dogs barking all night', 'Other');
categoryClassifier.addDocument('maingay na videoke kapitbahay', 'Other'); // Tagalog
categoryClassifier.addDocument('tahol ng aso magdamag', 'Other'); // Tagalog
categoryClassifier.addDocument('gahod nga videoke kag pamalay', 'Other'); // Hiligaynon
categoryClassifier.addDocument('paghot sang ido bilog nga gab-i', 'Other'); // Hiligaynon

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

module.exports = {
  analyzeConcern
};
