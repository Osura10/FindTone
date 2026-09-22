import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing/Landing';
import Login from './pages/Login/Login';
import RegisterSelection from './pages/Register/RegisterSelection';
import BuyerRegistration from './pages/Register/BuyerRegistration';
import SellerRegistration from './pages/Register/SellerRegistration';
import ShopRegistration from './pages/Register/ShopRegistration';
import AdminRegistration from './pages/Register/AdminRegistration';
import DashboardLayout from './components/DashboardLayout';
import AllItems from './pages/Seller/AllItems';
import CreatePost from './pages/Seller/CreatePost';
import Profile from './pages/Seller/Profile';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterSelection />} />
        <Route path="/register/buyer" element={<BuyerRegistration />} />
        <Route path="/register/seller" element={<SellerRegistration />} />
        <Route path="/register/shop" element={<ShopRegistration />} />
        <Route path="/register/admin" element={<AdminRegistration />} />
        
        {/* Universal Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="items" element={<AllItems />} />
          <Route path="create" element={<CreatePost />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
