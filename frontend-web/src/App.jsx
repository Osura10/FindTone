import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing/Landing';
import Login from './pages/Login/Login';
import RegisterSelection from './pages/Register/RegisterSelection';
import BuyerRegistration from './pages/Register/BuyerRegistration';
import ShopRegistration from './pages/Register/ShopRegistration';
import DashboardLayout from './components/DashboardLayout';
import AllItems from './pages/Seller/AllItems';
import CreatePost from './pages/Seller/CreatePost';
import Profile from './pages/Seller/Profile';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminAdmins from './pages/Admin/AdminAdmins';
import AdminShops from './pages/Admin/AdminShops';
import AdminBuyers from './pages/Admin/AdminBuyers';
import AdminFlaggedListings from './pages/Admin/AdminFlaggedListings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterSelection />} />
        <Route path="/register/buyer" element={<BuyerRegistration />} />
        <Route path="/register/shop" element={<ShopRegistration />} />
        
        {/* Universal Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="items" replace />} />
          <Route path="items" element={<AllItems />} />
          <Route path="create" element={<CreatePost />} />
          <Route path="profile" element={<Profile />} />

          {/* Admin Routes */}
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/admins" element={<AdminAdmins />} />
          <Route path="admin/shops" element={<AdminShops />} />
          <Route path="admin/buyers" element={<AdminBuyers />} />
          <Route path="admin/listings" element={<AdminFlaggedListings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
