const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Product = require('../../models/Product');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

// Sample product data
const sampleProduct = {
  name: 'Organic Apples',
  description: 'Fresh organic apples from local farm',
  price: 2.99,
  category: 'fruits',
  unit: 'kg',
  quantityAvailable: 100,
  farmer: new mongoose.Types.ObjectId()
};

// Sample user data
const sampleFarmer = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Farmer Joe',
  email: 'farmer@example.com',
  role: 'farmer'
};

// Helper function to generate a JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

describe('Product API', () => {
  beforeEach(async () => {
    // Clear products collection before each test
    await Product.deleteMany({});
    
    // Mock User.findById for auth middleware
    User.findById = jest.fn().mockResolvedValue(sampleFarmer);
  });

  describe('GET /api/v1/products', () => {
    it('should fetch all products', async () => {
      // Create sample products in the database
      await Product.create(sampleProduct);
      
      const res = await request(app).get('/api/v1/products');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(Array.isArray(res.body.data.data)).toBeTruthy();
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('should fetch a product by ID', async () => {
      // Create a product in the database
      const product = await Product.create(sampleProduct);
      
      const res = await request(app).get(`/api/v1/products/${product._id}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.data.name).toEqual(sampleProduct.name);
    });

    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const res = await request(app).get(`/api/v1/products/${nonExistentId}`);
      
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('POST /api/v1/products', () => {
    it('should create a new product when authenticated as farmer', async () => {
      // Generate token for farmer
      const token = generateToken(sampleFarmer);
      
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleProduct);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.product.name).toEqual(sampleProduct.name);
    });
  });
});