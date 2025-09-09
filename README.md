# Estern Bazar Admin Suite

A comprehensive e-commerce admin dashboard built with **Next.js 14**, **TypeScript**, **Prisma**, and **SQLite** for managing the Estern Bazar online marketplace.

## 🚀 Features

### **Authentication & RBAC**
- NextAuth with credentials provider
- Role-based access control (SUPER_ADMIN, ADMIN, CUSTOMER)
- Single SUPER_ADMIN enforcement with DB constraints
- Session management with JWT

### **User Management**
- Complete CRUD operations for users and admins
- Enable/disable user accounts
- Password reset functionality
- Advanced search and filtering
- Audit logging for all actions

### **Product Management**
- Facebook-style product composer
- Image and video upload support
- Drag & drop media management
- Category and tag system
- Inventory tracking with stock alerts
- Bulk operations (publish/unpublish)
- SEO-friendly slug generation

### **Order Management**
- Complete order lifecycle workflow
- Status transitions: PENDING → CONFIRMED → PACKED → OUT_FOR_DELIVERY → DELIVERED
- One-click "Fast Forward" functionality
- Delivery agent assignment
- Order timeline and status history
- Advanced filtering and search

### **Delivery Management**
- Delivery agent profiles and management
- Vehicle type tracking
- Availability status (Available/Busy/Offline)
- Performance metrics and completion rates
- Assignment history

### **Analytics Dashboard**
- Real-time KPIs and metrics
- Time series charts (orders, revenue, customers)
- Top products analysis
- Order status breakdown
- Performance insights
- Data export functionality

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (development) / MySQL (production)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui + Lucide icons
- **Validation**: Zod
- **File Uploads**: Local storage (S3-ready architecture)

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Git

### Setup Steps

1. **Clone and Navigate**
   ```bash
   cd estern-bazar-2.0-main/admin-suite
   ```

2. **Install Dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Environment Configuration**
   Create `.env` file in the admin-suite directory:
   ```env
   # Database
   DATABASE_URL="file:./dev.db"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   
   # Super Admin Credentials
   SUPER_ADMIN_EMAIL="admin@esternbazar.com"
   SUPER_ADMIN_PASSWORD="Admin123!"
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to SQLite database
   npx prisma db push
   
   # Seed initial data (creates SUPER_ADMIN)
   node scripts/seed-sqlite.js
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   - Open http://localhost:3000
   - Login with SUPER_ADMIN credentials:
     - Email: `admin@esternbazar.com`
     - Password: `Admin123!`

## 🔐 Default Credentials

### Super Admin
- **Email**: `admin@esternbazar.com`
- **Password**: `Admin123!`
- **Access**: Full system access

### Sample Admin
- **Email**: `admin@example.com`
- **Password**: `Admin123!`
- **Access**: Standard admin features

## 📁 Project Structure

```
admin-suite/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── super-admin/       # Super Admin pages
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── products/          # Product-specific components
│   │   ├── orders/            # Order-specific components
│   │   └── analytics/         # Analytics components
│   ├── lib/                   # Utility libraries
│   │   ├── validators/        # Zod schemas
│   │   └── utils/             # Helper functions
│   └── middleware.ts          # Route protection
├── prisma/                    # Database schema and migrations
├── scripts/                   # Database seeding scripts
└── public/                    # Static assets
```

## 🎯 Key Features by Role

### Super Admin (`/super-admin/`)
- **Dashboard**: Comprehensive analytics and KPIs
- **Users**: Manage all users (admins and customers)
- **Admins**: Create/manage admin accounts
- **Products**: Full product management
- **Orders**: Complete order workflow
- **Analytics**: Advanced reporting and insights

### Admin (`/admin/`)
- **Dashboard**: Standard analytics dashboard
- **Products**: Product management and inventory
- **Orders**: Order processing and fulfillment
- **Customers**: Customer account management
- **Delivery Agents**: Manage delivery personnel

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout

### Users Management
- `GET /api/users` - List users with filtering
- `POST /api/users` - Create new user
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user
- `POST /api/users/[id]/reset-password` - Reset password

### Products Management
- `GET /api/products` - List products with pagination
- `POST /api/products` - Create product
- `GET /api/products/[id]` - Get product details
- `PATCH /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product
- `POST /api/products/[id]/media` - Add product media

### Orders Management
- `GET /api/orders` - List orders with filtering
- `POST /api/orders` - Create order
- `GET /api/orders/[id]` - Get order details
- `PATCH /api/orders/[id]` - Update order
- `POST /api/orders/[id]/fast-forward` - Advance order status
- `POST /api/orders/[id]/assign-delivery` - Assign delivery agent

### Analytics
- `GET /api/analytics/summary` - KPI summary
- `GET /api/analytics/series` - Time series data
- `GET /api/analytics/top-products` - Top performing products

## 🚀 Production Deployment

### MySQL Database Setup
1. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL="mysql://username:password@host:port/database"
   ```

2. Run migrations:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

### S3 File Uploads
Update upload configuration in:
- `src/app/api/uploads/sign/route.ts`
- `src/app/api/uploads/direct/route.ts`

### Environment Variables
Set production environment variables:
```env
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="production-secret-key"
DATABASE_URL="your-production-database-url"
```

## 🔒 Security Features

- **RBAC**: Role-based access control with middleware protection
- **Input Validation**: Zod schemas for all API inputs
- **Password Hashing**: bcrypt for secure password storage
- **Audit Logging**: Complete action tracking
- **CSRF Protection**: NextAuth CSRF tokens
- **SQL Injection Prevention**: Prisma ORM parameterized queries

## 🐛 Troubleshooting

### Common Issues

1. **Prisma Client Not Initialized**
   ```bash
   npx prisma generate
   rm -rf .next
   npm run dev
   ```

2. **Database Connection Issues**
   - Verify `DATABASE_URL` in `.env`
   - Ensure database is accessible
   - Check file permissions for SQLite

3. **Authentication Issues**
   - Verify `NEXTAUTH_SECRET` is set
   - Clear browser cookies
   - Check user exists in database

### Development Tips

- Use `npx prisma studio` to view database contents
- Check `dev.db` file is created in admin-suite directory
- Monitor console for API errors
- Use browser dev tools for debugging

## 📈 Performance

- **Pagination**: All lists use server-side pagination
- **Caching**: Static assets cached with Next.js
- **Database**: Optimized queries with Prisma
- **Images**: Lazy loading and optimization ready

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of the Estern Bazar e-commerce platform.

## 🆘 Support

For technical support or questions:
- Check the troubleshooting section above
- Review API documentation
- Check console logs for errors

---

**Built with ❤️ for Estern Bazar**