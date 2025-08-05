# CalorieScience Backend API

A complete backend API for the CalorieScience CRM platform, enabling nutritionists to manage clients and generate AI-powered nutritional recommendations.

## 🚀 Features

- **Nutritionist Authentication**: Complete signup/signin with JWT tokens
- **Client Management**: Create, manage, and convert prospective clients to active
- **AI-Powered EER Calculations**: OpenAI integration for personalized nutrition requirements
- **Dashboard Analytics**: Real-time statistics and insights
- **Secure Database**: Row-level security with Supabase
- **TypeScript**: Full type safety and modern development experience

## 🛠️ Tech Stack

- **Runtime**: Node.js with Vercel serverless functions
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4 for nutritional calculations
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Joi schema validation
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js 18+ 
- Supabase account and project
- OpenAI API key with credits
- Vercel account (for deployment)

## ⚙️ Environment Variables

Create a `.env.local` file in the backend directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Application Configuration
APP_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Database
1. Create a new Supabase project
2. Run the SQL schema from `database/schema.sql` in Supabase SQL Editor
3. Add your Supabase credentials to `.env.local`

### 3. Configure OpenAI
1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com)
2. Add the API key to `.env.local`

### 4. Run Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`

## 📖 API Documentation

### Authentication Endpoints

#### Register Nutritionist
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "nutritionist@example.com",
  "password": "securePassword123",
  "full_name": "Dr. Jane Smith",
  "phone": "+1234567890",
  "qualification": "MSc Clinical Nutrition",
  "experience_years": 5,
  "specialization": ["Weight Management", "Diabetes Care"]
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "nutritionist@example.com",
  "password": "securePassword123"
}
```

### Client Management

#### Get All Clients
```http
GET /api/clients?page=1&limit=20&status=active&search=john
Authorization: Bearer <token>
```

#### Create New Client
```http
POST /api/clients
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "date_of_birth": "1990-01-15",
  "gender": "male",
  "height_cm": 175,
  "weight_kg": 75,
  "activity_level": "moderately_active",
  "health_goals": ["Weight Loss", "Muscle Gain"],
  "medical_conditions": ["Diabetes Type 2"],
  "source": "Website"
}
```

#### Convert Client to Active
```http
PATCH /api/clients/convert-active
Authorization: Bearer <token>
Content-Type: application/json

{
  "client_id": "uuid-of-client"
}
```

### EER Calculations

#### Generate EER Calculation
```http
POST /api/clients/eer-calculation
Authorization: Bearer <token>
Content-Type: application/json

{
  "client_id": "uuid-of-client",
  "age": 30,
  "gender": "male",
  "weight_kg": 75,
  "height_cm": 175,
  "activity_level": "moderately_active",
  "health_goals": ["Weight Loss"],
  "medical_conditions": ["Diabetes Type 2"]
}
```

#### Get EER Calculation
```http
GET /api/clients/eer-calculation?client_id=uuid-of-client
Authorization: Bearer <token>
```

#### Update EER Calculation (Nutritionist Edit)
```http
PUT /api/clients/eer-calculation
Authorization: Bearer <token>
Content-Type: application/json

{
  "client_id": "uuid-of-client",
  "protein_grams": 120,
  "carbs_grams": 200,
  "fat_grams": 60,
  "nutritionist_notes": "Increased protein for muscle building goals"
}
```

### Dashboard

#### Get Dashboard Statistics
```http
GET /api/dashboard/stats
Authorization: Bearer <token>
```

Response:
```json
{
  "stats": {
    "total_clients": 25,
    "prospective": 5,
    "active": 18,
    "inactive": 2,
    "new_this_month": 3
  },
  "recent_clients": [...],
  "clients_needing_eer": [...],
  "upcoming_interactions": [...]
}
```

## 🏗️ Database Schema

### Core Tables

1. **users** - Nutritionist accounts
2. **clients** - Client management with status tracking
3. **client_nutrition_requirements** - AI-generated EER calculations
4. **client_interactions** - Consultation and follow-up tracking
5. **client_documents** - File storage for blood reports, etc.

### Key Features

- **Row Level Security**: Nutritionists can only access their own data
- **Audit Trails**: Complete timestamp tracking
- **Flexible Schema**: JSONB fields for extensible data
- **Optimized Indexes**: Fast queries for common operations

## 🚀 Deployment

### Deploy to Vercel

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

3. **Set Environment Variables**
In Vercel dashboard, add all environment variables from your `.env.local`

4. **Custom Domain** (Optional)
Configure your custom domain in Vercel dashboard

### Environment-Specific Configurations

#### Production
- Use strong JWT secrets
- Enable HTTPS only
- Configure proper CORS origins
- Set up monitoring and logging

#### Staging
- Use separate Supabase project
- Lower rate limits for testing
- Enable verbose logging

## 🔧 Development

### Project Structure
```
backend/
├── api/                 # Vercel serverless functions
│   ├── auth/           # Authentication endpoints
│   ├── clients/        # Client management
│   └── dashboard/      # Analytics endpoints
├── lib/                # Shared utilities
│   ├── config.ts       # Environment configuration
│   ├── supabase.ts     # Database client
│   ├── openai.ts       # AI service integration
│   ├── auth.ts         # Authentication utilities
│   └── validation.ts   # Input validation schemas
├── database/           # Database schema and migrations
└── types/              # TypeScript type definitions
```

### Code Quality
- TypeScript for type safety
- Joi for runtime validation
- Row-level security for data protection
- Comprehensive error handling
- Structured logging

## 🔐 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Row Level Security**: Database-level access control
- **Input Validation**: Comprehensive request validation
- **CORS Configuration**: Proper cross-origin handling
- **Rate Limiting**: API abuse prevention

## 📊 Monitoring & Analytics

### Built-in Analytics
- Client conversion tracking
- EER calculation metrics
- User activity monitoring
- Performance tracking

### Recommended Tools
- **Vercel Analytics**: Request monitoring
- **Supabase Dashboard**: Database metrics
- **OpenAI Usage Dashboard**: AI cost tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

Private - CalorieScience Project

## 🆘 Support

For setup assistance or bug reports:
1. Check the troubleshooting section below
2. Review the API documentation
3. Create an issue with detailed information

## 🔧 Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify Supabase URL and keys
- Check network connectivity
- Ensure RLS policies are correctly configured

**OpenAI API Errors**
- Verify API key validity
- Check OpenAI credit balance
- Monitor rate limits

**Vercel Deployment Issues**
- Ensure all environment variables are set
- Check function timeout limits
- Verify TypeScript compilation

**CORS Errors**
- Check allowed origins configuration
- Verify request headers
- Test with Postman/curl first

### Performance Optimization

- Use database indexes for large datasets
- Implement caching for frequently accessed data
- Monitor OpenAI token usage
- Optimize SQL queries

### Security Best Practices

- Regularly rotate JWT secrets
- Monitor for suspicious activity
- Keep dependencies updated
- Use HTTPS in production
- Implement proper logging 