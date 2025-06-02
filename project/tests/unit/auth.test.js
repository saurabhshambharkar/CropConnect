const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../../models/User');
const authController = require('../../controllers/authController');
const AppError = require('../../utils/appError');

// Mock User model
jest.mock('../../models/User');

// Mock response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
};

describe('Auth Controller', () => {
  describe('signup', () => {
    it('should create a new user and return token', async () => {
      // Mock request
      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          passwordConfirm: 'password123',
          role: 'buyer'
        }
      };

      // Mock created user
      const mockUser = {
        _id: '123456789',
        name: 'Test User',
        email: 'test@example.com',
        role: 'buyer',
        password: undefined
      };

      // Mock User.create to return mockUser
      User.create.mockResolvedValue(mockUser);

      // Mock jwt.sign
      jwt.sign = jest.fn().mockReturnValue('test_token');

      const res = mockResponse();
      const next = jest.fn();

      // Call the function
      await authController.signup(req, res, next);

      // Assertions
      expect(User.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
        role: 'buyer'
      });
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        token: 'test_token',
        data: {
          user: mockUser
        }
      });
    });
  });

  describe('login', () => {
    it('should return error if email or password is missing', async () => {
      // Mock request with missing email
      const req = {
        body: {
          password: 'password123'
        }
      };

      const res = mockResponse();
      const next = jest.fn();

      // Call the function
      await authController.login(req, res, next);

      // Assertions
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(400);
      expect(next.mock.calls[0][0].message).toBe('Please provide email and password');
    });
  });
});