const express = require('express');
const router = express.Router();
const Product = require('../models/ProductInfo');
const authMiddleware = require('../middleware/authMiddleware');
const roleCheck = require('../middleware/roleCheck');

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Add a new product (Admin only)
router.post('/', authMiddleware, roleCheck(['admin']), async (req, res) => {
  const { name, description, price, image } = req.body;
  try {
    const newProduct = new Product({ name, description, price, image });
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a product by ID (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    console.log('Received DELETE request for Product ID:', req.params.id);
    const productId = req.params.id; // Extract product ID from URL
    console.log('Deleting product with ID:', productId); // Debugging log

    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully', deletedProduct });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;