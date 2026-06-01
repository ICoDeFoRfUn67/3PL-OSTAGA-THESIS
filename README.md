# Employee Management System - Full Stack Web App

Complete Vite React + Django Employee Management System. Convert your React Native mobile app to a responsive web application.

## 📋 Project Overview

This is a full-stack employee management system with:
- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS
- **Backend**: Existing Django REST API (unchanged)
- **Features**: Admin/HR/Employee dashboards, attendance tracking, payroll management, real-time activity logs

## 📁 Directory Structure

```
employee-management-web/
├── frontend/                    # Vite React Application
│   ├── src/
│   │   ├── api/                # API service layer
│   │   ├── components/         # Reusable UI components
│   │   ├── context/            # Zustand stores (auth, UI)
│   │   ├── constants/          # API endpoints, colors
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Role-based dashboards
│   │   ├── styles/             # Global styles
│   │   ├── utils/              # Helper functions
│   │   ├── App.tsx             # Main app component
│   │   └── main.tsx            # Entry point
│   ├── public/                 # Static assets
│   ├── vite.config.ts          # Vite configuration
│   ├── tailwind.config.js      # Tailwind configuration
│   ├── tsconfig.json           # TypeScript configuration
│   ├── package.json            # Dependencies
│   └── README.md               # Frontend documentation
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (https://nodejs.org)
- Python 3.8+ with Django backend running
- npm or yarn package manager

### Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend

Make sure your Django backend is running at `http://localhost:8000/api`

The frontend is configured to proxy API requests to the backend.

## 🔑 Key Features

### Authentication
- ✅ Login/Logout functionality
- ✅ Token-based authentication
- ✅ Role-based access control (Admin/HR/Employee)
- ✅ Session persistence with localStorage

### Admin Dashboard
- ✅ Employee management (CRUD)
- ✅ Bulk employee actions
- ✅ Charts: Employment type distribution, Status pie chart
- ✅ Hub management with locations
- ✅ Activity logs and security alerts
- ✅ Edit request approval/rejection

### HR Dashboard
- ✅ Employee list view
- ✅ Attendance management
- ✅ Payroll overview
- ✅ Edit request handling

### Employee Dashboard
- ✅ Personal profile view
- ✅ Attendance history
- ✅ Clock in/out functionality
- ✅ Payroll information

### Additional Features
- ✅ Dark/Light theme toggle
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Real-time data with React Query
- ✅ Comprehensive error handling
- ✅ CSV export functionality
- ✅ Search and filtering
- ✅ Image uploads (profile, attendance)
- ✅ Activity logging
- ✅ Security alerts

## 🛠️ Technology Stack

### Frontend
- **Vite**: Next-gen frontend tooling
- **React 18**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS
- **React Router**: Client-side routing
- **React Query**: Server state management
- **Zustand**: Client state management
- **React Hook Form**: Form management
- **Zod**: Schema validation
- **Recharts**: Charts & graphs
- **Lucide React**: Icons
- **Axios**: HTTP client
- **React Hot Toast**: Notifications

### Backend (Existing)
- Django REST Framework
- PostgreSQL/MySQL (configurable)
- JWT/Token authentication
- Custom serializers for each model

## 📊 Core Models & Fields

### Employee
- `id`, `firstname`, `lastname`, `middle_initial`, `full_name`
- `position`, `employment_type`, `status`, `role`
- `hub`, `employee_id`, `jtp_code`
- `profile_image_url`, `can_login`, `can_edit_info`

### Attendance
- `employee_name`, `jtp_code`, `hub_name`, `date`
- `clock_in_time`, `clock_out_time`
- `clock_in_image`, `clock_out_image`
- `status`

### Payroll
- `fullname`, `jtp_code`, `hub`
- `net_pay`, `basic_salary`, `allowances`
- `overtime_pay`, `sss_deduction`, `philhealth_deduction`, `pagibig_deduction`

### Hub
- `name`, `location`, `latitude`, `longitude`, `employee_count`

## 🔌 API Endpoints

All endpoints follow the same structure as the existing backend:

```
Auth:
  POST   /api/login/
  GET    /api/current-user/
  POST   /api/logout/

Employees:
  GET    /api/employees/
  POST   /api/employees/
  GET    /api/employees/{id}/
  PATCH  /api/employees/{id}/
  DELETE /api/employees/{id}/

Hubs:
  GET    /api/hubs/
  GET    /api/hubs/{id}/

Attendance:
  GET    /api/attendance/
  POST   /api/attendance/clock_in/
  POST   /api/attendance/clock_out/

Payroll:
  GET    /api/payroll/

Edit Requests:
  GET    /api/edit-requests/
  POST   /api/edit-requests/{id}/approve/
  POST   /api/edit-requests/{id}/reject/

Activity Logs:
  GET    /api/activity-logs/

Security Alerts:
  GET    /api/security-alerts/
```

## 🎨 Design System

Colors defined in `frontend/src/constants/colors.ts`:

```
Primary:   #C41E3A (Red)
Success:   #10B981 (Green)
Warning:   #F59E0B (Amber)
Error:     #EF4444 (Red)
Dark BG:   #1F2937
Dark Card: #1E1E1E
Light BG:  #FFFFFF
Light Card: #F3F4F6
```

## 🔄 State Management

### Zustand Stores
- **AuthStore** (`authStore.ts`): User, token, theme
- **UIStore** (`uiStore.ts`): Sidebar, selections

### React Query
- Automatic caching & synchronization
- Background refetching
- Stale-time configuration per endpoint

## 📱 Responsive Design

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

All layouts are mobile-first and use Tailwind's responsive utilities.

## 🔐 Authentication Flow

1. User enters credentials on login page
2. Frontend sends request to `/api/login/`
3. Backend validates and returns token + user data
4. Frontend stores token in localStorage
5. Token automatically added to all API requests
6. Expired tokens trigger redirect to login
7. User data persists across page refreshes

## 🚀 Build & Deployment

### Build for Production

```bash
cd frontend
npm run build
```

This creates optimized files in `frontend/dist/`

### Deployment Options
- Netlify (Vite template)
- Vercel (Vite template)
- Traditional web server (nginx, Apache)
- Docker container

## 📝 Environment Configuration

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000/api
```

## 🧪 Development Workflow

1. Start Django backend
2. Run `npm run dev` in frontend directory
3. Access app at http://localhost:5173
4. Make changes - hot reload applies automatically
5. Check browser console for errors
6. Use browser DevTools for debugging

## 📚 Documentation

- [Frontend README](./frontend/README.md) - Frontend-specific details
- API Endpoints - See Django backend documentation
- Component API - JSDoc comments in component files

## ✅ Project Checklist

- ✅ Vite + React 18 setup with TypeScript
- ✅ Tailwind CSS configuration
- ✅ API service layer with axios
- ✅ Authentication & authorization
- ✅ Role-based dashboards (Admin/HR/Employee)
- ✅ Data visualization (Charts)
- ✅ Dark/Light theme
- ✅ Responsive design
- ✅ Form handling with validation
- ✅ Image uploads
- ✅ Activity logging
- ✅ Security alerts
- ⏳ Advanced features (edit in future):
  - ⏳ Map integration (Leaflet)
  - ⏳ Real-time notifications (WebSockets)
  - ⏳ Advanced CSV export
  - ⏳ PDF reports generation

## 🚨 Common Issues

**CORS Error?**
- Make sure Django backend has CORS enabled
- Check `ALLOWED_HOSTS` in Django settings
- Frontend proxy is configured in `vite.config.ts`

**Login Not Working?**
- Verify backend is running
- Check credentials are correct
- Check browser DevTools Network tab for errors
- Look for error response from server

**Styling Not Applying?**
- Ensure Tailwind classes are in `content` array
- Check dark mode class on parent element
- Clear browser cache and rebuild

## 📞 Support

For issues with:
- **Frontend**: Check `frontend/README.md` or review component code
- **Backend**: Review Django REST Framework documentation
- **Styling**: Check Tailwind CSS documentation
- **API**: Test with Postman/Thunder Client first

## 📄 License

Proprietary - For internal use only

---

**Last Updated**: May 2026  
**Version**: 1.0.0  
**Status**: Ready for development
