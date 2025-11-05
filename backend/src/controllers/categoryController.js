const mongoose = require('mongoose');
const Category = require('../models/Category');

const ensureObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid identifier');
  }
  return new mongoose.Types.ObjectId(id);
};

const mapCategories = (categories) =>
  categories.map((cat) => ({
    id: cat._id ? cat._id.toString() : undefined,
    name: cat.name,
    type: cat.type,
    color: cat.color,
  }));

exports.listCategories = async (req, res) => {
  try {
    const userId = ensureObjectId(req.user.id);

    const categories = await Category.find({ user: userId })
      .sort({ type: 1, name: 1 })
      .lean();

    const income = [];
    const expense = [];

    mapCategories(categories).forEach((cat) => {
      if (cat.type === 'income') {
        income.push(cat);
      } else if (cat.type === 'expense') {
        expense.push(cat);
      }
    });

    return res.json({
      income,
      expense,
      all: [...income, ...expense],
    });
  } catch (error) {
    console.error('Failed to list categories', error);
    return res.status(500).json({ message: 'Failed to load categories' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const userId = ensureObjectId(req.user.id);
    const { name, type, color } = req.body;

    if (!name || !['income', 'expense'].includes(type)) {
      return res.status(422).json({ message: 'Name and valid type are required' });
    }

    const category = await Category.create({
      user: userId,
      name: name.trim(),
      type,
      color: color || '#6366f1',
      isDefault: false,
    });

    return res.status(201).json({
      message: 'Category created successfully',
      category: mapCategories([category])[0],
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Category already exists' });
    }
    console.error('Failed to create category', error);
    return res.status(500).json({ message: 'Failed to create category' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = ensureObjectId(req.user.id);
    ensureObjectId(id);

    const update = {};
    ['name', 'color'].forEach((field) => {
      if (typeof req.body[field] !== 'undefined') {
        update[field] = field === 'name' ? req.body[field].trim() : req.body[field];
      }
    });

    const category = await Category.findOneAndUpdate(
      { _id: id, user: userId },
      update,
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.json({
      message: 'Category updated successfully',
      category: mapCategories([category])[0],
    });
  } catch (error) {
    console.error('Failed to update category', error);
    return res.status(500).json({ message: 'Failed to update category' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = ensureObjectId(req.user.id);
    ensureObjectId(id);

    const category = await Category.findOneAndDelete({ _id: id, user: userId });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Failed to delete category', error);
    return res.status(500).json({ message: 'Failed to delete category' });
  }
};
