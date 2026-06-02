const pool = require('../db');

const selectAllTemplates = async () => {
  const [rows] = await pool.query('SELECT * FROM concern_templates ORDER BY category ASC, created_at DESC');
  return rows;
};

const insertTemplate = async (category, priority, quickTitle, templateBody) => {
  const [result] = await pool.query(
    'INSERT INTO concern_templates (category, priority, quick_title, template_body) VALUES (?, ?, ?, ?)',
    [category, priority, quickTitle, templateBody]
  );
  return result.insertId;
};

const selectTemplateById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM concern_templates WHERE id = ?', [id]);
  return rows[0];
};

const updateTemplateFields = async (id, fields, values) => {
  await pool.query(`UPDATE concern_templates SET ${fields.join(', ')} WHERE id = ?`, values);
};

const deleteTemplate = async (id) => {
  await pool.query('DELETE FROM concern_templates WHERE id = ?', [id]);
};

module.exports = {
  selectAllTemplates,
  insertTemplate,
  selectTemplateById,
  updateTemplateFields,
  deleteTemplate
};
