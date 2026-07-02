const departmentModel = require('../models/department.model');
const { selectAdminsByDepartment } = require('../models/user.model');

const listDepartments = async (req, res) => {
  try {
    const departments = await departmentModel.selectAllDepartments();
    const enriched = await Promise.all(
      departments.map(async (dept) => {
        const admins = await selectAdminsByDepartment(dept.name);
        return {
          ...dept,
          admins: admins.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            active_assignments: a.active_assignments,
          })),
        };
      })
    );
    res.json(enriched);
  } catch (err) {
    console.error('listDepartments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createDepartment = async (req, res) => {
  const { name, category, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }
  try {
    const existingName = await departmentModel.selectDepartmentByName(name.trim());
    if (existingName) {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    if (category) {
      const existingCat = await departmentModel.selectDepartmentByCategory(category);
      if (existingCat) {
        return res.status(400).json({ error: `Category is already handled by department: ${existingCat.name}` });
      }
    }
    const id = await departmentModel.insertDepartment({
      name: name.trim(),
      category: category || null,
      description: description || null,
    });
    res.status(201).json({ id, name: name.trim(), category: category || null, description: description || null });
  } catch (err) {
    console.error('createDepartment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const editDepartment = async (req, res) => {
  const { name, category, description } = req.body;
  const { id } = req.params;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }
  try {
    const dept = await departmentModel.selectDepartmentById(id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }
    const existingName = await departmentModel.selectDepartmentByName(name.trim());
    if (existingName && existingName.id !== parseInt(id)) {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    if (category) {
      const existingCat = await departmentModel.selectDepartmentByCategory(category);
      if (existingCat && existingCat.id !== parseInt(id)) {
        return res.status(400).json({ error: `Category is already handled by department: ${existingCat.name}` });
      }
    }
    await departmentModel.updateDepartment(id, {
      name: name.trim(),
      category: category || null,
      description: description || null,
    });
    res.json({ id: parseInt(id), name: name.trim(), category: category || null, description: description || null });
  } catch (err) {
    console.error('editDepartment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const removeDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const dept = await departmentModel.selectDepartmentById(id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }
    await departmentModel.deleteDepartment(id);
    res.json({ success: true });
  } catch (err) {
    console.error('removeDepartment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  listDepartments,
  createDepartment,
  editDepartment,
  removeDepartment,
};
