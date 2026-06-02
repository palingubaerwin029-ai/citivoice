const { invalidate } = require('../middleware/cache');
const {
  selectAllTemplates,
  insertTemplate,
  selectTemplateById,
  updateTemplateFields,
  deleteTemplate
} = require('../models/template.model');

const listTemplates = async (req, res) => {
  try {
    const rows = await selectAllTemplates();
    res.json(rows);
  } catch (err) {
    console.error('Templates list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createTemplate = async (req, res) => {
  const { category, priority, quick_title, template_body } = req.body;
  try {
    const insertId = await insertTemplate(category, priority || 'Medium', quick_title, template_body);
    invalidate('templates');
    const newTemplate = await selectTemplateById(insertId);
    res.status(201).json(newTemplate);
  } catch (err) {
    console.error('Template create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const editTemplate = async (req, res) => {
  const { category, priority, quick_title, template_body } = req.body;
  try {
    const existing = await selectTemplateById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    const fields = [];
    const values = [];
    if (category)      { fields.push('category = ?');      values.push(category); }
    if (priority)      { fields.push('priority = ?');      values.push(priority); }
    if (quick_title)   { fields.push('quick_title = ?');   values.push(quick_title); }
    if (template_body) { fields.push('template_body = ?'); values.push(template_body); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.params.id);

    await updateTemplateFields(req.params.id, fields, values);
    invalidate('templates');
    const updatedTemplate = await selectTemplateById(req.params.id);
    res.json(updatedTemplate);
  } catch (err) {
    console.error('Template update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const removeTemplate = async (req, res) => {
  try {
    const existing = await selectTemplateById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Template not found' });
    await deleteTemplate(req.params.id);
    invalidate('templates');
    res.json({ success: true });
  } catch (err) {
    console.error('Template delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  listTemplates,
  createTemplate,
  editTemplate,
  removeTemplate
};
