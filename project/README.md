# CropConnect - Agricultural Marketplace Backend

CropConnect is a comprehensive backend system for an agricultural marketplace that connects farmers directly with buyers (both consumers and businesses) to streamline the supply chain, reduce food waste, and provide fresh produce at competitive prices.

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time Communication**: Socket.io for chat feature

## Features

### Core Features

- **User Authentication**
  - Secure registration and login for farmers and buyers using JWT
  - Password reset and update functionality

- **Product Management**
  - Create, read, update, delete product listings
  - Image upload for products
  - Categorization and filtering

- **Order Management**
  - Create and manage orders
  - Order status tracking
  - Order history

- **User Profile Management**
  - User details and preferences
  - Location-based information

- **Review & Rating System**
  - Product and seller reviews
  - Rating system with average calculations

### Unique Features

- **Geo-Location Based Product Discovery**
  - Find products and farmers based on location
  - Distance calculations

- **Farmers' Market Event Promotion**
  - Create and manage event listings
  - RSVP functionality

- **Real-Time Chat System**
  - Direct communication between buyers and farmers
  - Message notifications
  - Chat history

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/forgotPassword` - Request password reset
- `PATCH /api/v1/auth/resetPassword/:token` - Reset password
- `PATCH /api/v1/auth/updateMyPassword` - Update password

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/updateMe` - Update user profile
- `DELETE /api/v1/users/deleteMe` - Delete user account

### Products
- `GET /api/v1/products` - Get all products
- `POST /api/v1/products` - Create new product
- `GET /api/v1/products/:id` - Get product by ID
- `PATCH /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product
- `GET /api/v1/products/category/:category` - Get products by category
- `GET /api/v1/products/search` - Search products
- `GET /api/v1/products/nearby` - Get nearby products
- `GET /api/v1/products/seasonal` - Get seasonal products
- `GET /api/v1/products/featured` - Get featured products
- `GET /api/v1/products/farmer/:farmerId` - Get products by farmer

### Orders
- `GET /api/v1/orders` - Get all orders for user
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders/:id` - Get order by ID
- `PATCH /api/v1/orders/:id/status` - Update order status
- `PATCH /api/v1/orders/:id/cancel` - Cancel order
- `GET /api/v1/orders/history` - Get order history
- `GET /api/v1/orders/stats` - Get sales statistics

### Reviews
- `GET /api/v1/reviews` - Get all reviews
- `POST /api/v1/reviews` - Create new review
- `GET /api/v1/reviews/:id` - Get review by ID
- `PATCH /api/v1/reviews/:id` - Update review
- `DELETE /api/v1/reviews/:id` - Delete review
- `PATCH /api/v1/reviews/:id/helpful` - Mark review as helpful
- `GET /api/v1/products/:productId/reviews` - Get reviews for a product

### Events
- `GET /api/v1/events` - Get all events
- `POST /api/v1/events` - Create new event
- `GET /api/v1/events/:id` - Get event by ID
- `PATCH /api/v1/events/:id` - Update event
- `DELETE /api/v1/events/:id` - Delete event
- `GET /api/v1/events/upcoming` - Get upcoming events
- `GET /api/v1/events/nearby` - Get nearby events
- `POST /api/v1/events/:id/attend` - RSVP to an event
- `GET /api/v1/events/:id/attendees` - Get event attendees

### Chats
- `GET /api/v1/chats` - Get all chats for user
- `GET /api/v1/chats/:id` - Get chat by ID
- `POST /api/v1/chats` - Create new chat
- `POST /api/v1/chats/:id/messages` - Send a message
- `PATCH /api/v1/chats/:id/read` - Mark chat as read

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/cropconnect.git
cd cropconnect
```

2. Install dependencies
```
npm install
```

3. Create a .env file with the following variables
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/cropconnect
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=30d
JWT_COOKIE_EXPIRES_IN=30
```

4. Start the server
```
npm run dev
```

The server will start on port 5000 (or the port specified in your .env file).

## Testing

Run tests using Jest:
```
npm test
```

## License
This project is licensed under the MIT License.