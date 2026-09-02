import express from 'express';
import mongoose from 'mongoose';
import { Parameter } from '../models/Parameter.js';

const router = express.Router();

const INITIAL_MASTER_PARAMETERS = [
  {
    name: 'Length',
    displayType: 'dropdown',
    selectionMode: 'single',
    required: true,
    values: [
      { label: '22"', value: '22"', colorCode: null, isActive: true, order: 0 },
      { label: '24"', value: '24"', colorCode: null, isActive: true, order: 1 },
      { label: '26"', value: '26"', colorCode: null, isActive: true, order: 2 },
      { label: '30"', value: '30"', colorCode: null, isActive: true, order: 3 },
      { label: '36"', value: '36"', colorCode: null, isActive: true, order: 4 },
      { label: '40"', value: '40"', colorCode: null, isActive: true, order: 5 }
    ]
  },
  {
    name: 'Size',
    displayType: 'buttons',
    selectionMode: 'single',
    required: true,
    values: [
      { label: 'Small', value: 'Small', colorCode: null, isActive: true, order: 0 },
      { label: 'Medium', value: 'Medium', colorCode: null, isActive: true, order: 1 },
      { label: 'Large', value: 'Large', colorCode: null, isActive: true, order: 2 }
    ]
  },
  {
    name: 'Stone Color',
    displayType: 'color',
    selectionMode: 'single',
    required: true,
    values: [
      { label: 'Red', value: 'Red', colorCode: '#dc2626', isActive: true, order: 0 },
      { label: 'Green', value: 'Green', colorCode: '#16a34a', isActive: true, order: 1 },
      { label: 'White', value: 'White', colorCode: '#f8fafc', isActive: true, order: 2 },
      { label: 'Pink', value: 'Pink', colorCode: '#db2777', isActive: true, order: 3 }
    ]
  },
  {
    name: 'Bangle Size',
    displayType: 'buttons',
    selectionMode: 'single',
    required: true,
    values: [
      { label: '2.4', value: '2.4', colorCode: null, isActive: true, order: 0 },
      { label: '2.6', value: '2.6', colorCode: null, isActive: true, order: 1 },
      { label: '2.8', value: '2.8', colorCode: null, isActive: true, order: 2 },
      { label: '2.10', value: '2.10', colorCode: null, isActive: true, order: 3 }
    ]
  },
  {
    name: 'Ring Size',
    displayType: 'buttons',
    selectionMode: 'single',
    required: true,
    values: [
      { label: 'Adjustable', value: 'Adjustable', colorCode: null, isActive: true, order: 0 },
      { label: 'Size 12', value: 'Size 12', colorCode: null, isActive: true, order: 1 },
      { label: 'Size 14', value: 'Size 14', colorCode: null, isActive: true, order: 2 },
      { label: 'Size 16', value: 'Size 16', colorCode: null, isActive: true, order: 3 },
      { label: 'Size 18', value: 'Size 18', colorCode: null, isActive: true, order: 4 }
    ]
  },
  {
    name: 'Fitting Type',
    displayType: 'buttons',
    selectionMode: 'single',
    required: true,
    values: [
      { label: 'Pierced (Push Back)', value: 'Pierced', colorCode: null, isActive: true, order: 0 },
      { label: 'Clip-on (Non-Pierced)', value: 'Clip-on', colorCode: null, isActive: true, order: 1 }
    ]
  },
  {
    name: 'Back Thread / Chain',
    displayType: 'buttons',
    selectionMode: 'single',
    required: false,
    values: [
      { label: 'Traditional Gold Dori', value: 'Gold Dori', colorCode: null, isActive: true, order: 0 },
      { label: 'Red Silk Thread', value: 'Red Silk', colorCode: null, isActive: true, order: 1 },
      { label: 'Green Silk Thread', value: 'Green Silk', colorCode: null, isActive: true, order: 2 },
      { label: 'Gold Plated Chain', value: 'Gold Chain', colorCode: null, isActive: true, order: 3 }
    ]
  }
];

// Helper to seed defaults if library is empty
export async function ensureDefaultParameters() {
  try {
    const count = await Parameter.countDocuments();
    if (count === 0) {
      console.log('Seeding Master Parameter Library defaults…');
      for (const item of INITIAL_MASTER_PARAMETERS) {
        await Parameter.create(item);
      }
      console.log('Master Parameter Library seeded successfully.');
    }
  } catch (err) {
    console.error('Error seeding parameter library:', err.message);
  }
}

// Public: Get all active parameters
router.get('/', async (req, res) => {
  try {
    const parameters = await Parameter.find({ isActive: true }).sort({ order: 1, name: 1 });
    res.json(parameters);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch parameters' });
  }
});

// Admin: Get all parameters (active and inactive)
router.get('/admin/all', async (req, res) => {
  try {
    let parameters = await Parameter.find().sort({ order: 1, name: 1 });
    if (parameters.length === 0) {
      await ensureDefaultParameters();
      parameters = await Parameter.find().sort({ order: 1, name: 1 });
    }
    res.json(parameters);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch parameters' });
  }
});

// Admin: Create parameter
router.post('/admin', async (req, res) => {
  try {
    const { name, displayType, selectionMode, required, values, isActive, order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Parameter name is required.' });
    }

    const existing = await Parameter.findOne({
      name: new RegExp(`^${name.trim()}$`, 'i')
    });
    if (existing) {
      return res.status(400).json({ error: `Parameter with name "${name}" already exists.` });
    }

    const cleanValues = Array.isArray(values)
      ? values
          .filter((v) => v && (v.label || v.value))
          .map((v, idx) => ({
            label: String(v.label || v.value || '').trim(),
            value: String(v.value || v.label || '').trim(),
            colorCode: v.colorCode ? String(v.colorCode).trim() : null,
            isActive: v.isActive !== undefined ? Boolean(v.isActive) : true,
            order: v.order !== undefined ? Number(v.order) : idx
          }))
      : [];

    const parameter = await Parameter.create({
      name: name.trim(),
      displayType: ['buttons', 'dropdown', 'color'].includes(displayType) ? displayType : 'buttons',
      selectionMode: ['single', 'multiple'].includes(selectionMode) ? selectionMode : 'single',
      required: required !== undefined ? Boolean(required) : true,
      values: cleanValues,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      order: Number(order || 0)
    });

    res.status(201).json(parameter);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create parameter' });
  }
});

// Admin: Update parameter
router.patch('/admin/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Parameter not found' });
  }

  try {
    const updateData = { ...req.body };
    if (updateData.name) {
      updateData.name = updateData.name.trim();
      const duplicate = await Parameter.findOne({
        _id: { $ne: id },
        name: new RegExp(`^${updateData.name}$`, 'i')
      });
      if (duplicate) {
        return res.status(400).json({ error: `Parameter with name "${updateData.name}" already exists.` });
      }
    }

    if (Array.isArray(updateData.values)) {
      updateData.values = updateData.values
        .filter((v) => v && (v.label || v.value))
        .map((v, idx) => ({
          _id: v._id || v.id || new mongoose.Types.ObjectId(),
          label: String(v.label || v.value || '').trim(),
          value: String(v.value || v.label || '').trim(),
          colorCode: v.colorCode ? String(v.colorCode).trim() : null,
          isActive: v.isActive !== undefined ? Boolean(v.isActive) : true,
          order: v.order !== undefined ? Number(v.order) : idx
        }));
    }

    const updated = await Parameter.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Parameter not found' });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update parameter' });
  }
});

// Admin: Deactivate parameter (Safe soft delete)
router.delete('/admin/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Parameter not found' });
  }

  try {
    const updated = await Parameter.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Parameter not found' });
    }
    res.json({ message: 'Parameter deactivated successfully', parameter: updated });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to deactivate parameter' });
  }
});

// Admin: Seed default library
router.post('/admin/seed', async (req, res) => {
  try {
    for (const item of INITIAL_MASTER_PARAMETERS) {
      const existing = await Parameter.findOne({ name: item.name });
      if (!existing) {
        await Parameter.create(item);
      }
    }
    const all = await Parameter.find().sort({ order: 1, name: 1 });
    res.json({ message: 'Parameter library seeded successfully', parameters: all });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to seed parameter library' });
  }
});

export default router;
