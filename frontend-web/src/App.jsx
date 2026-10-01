import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing/Landing';
import Login from './pages/Login/Login';
import RegisterSelection from './pages/Register/RegisterSelection';
import BuyerRegistration from './pages/Register/BuyerRegistration';
import ShopRegistration from './pages/Register/ShopRegistration';
import DashboardLayout from './components/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';
import AllItems from './pages/Seller/AllItems';
import CreatePost from './pages/Seller/CreatePost';
import Profile from './pages/Seller/Profile';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminAdmins from './pages/Admin/AdminAdmins';
import AdminShops from './pages/Admin/AdminShops';
import AdminBuyers from './pages/Admin/AdminBuyers';
import AdminFlaggedListings from './pages/Admin/AdminFlaggedListings';
import MyAlerts from './pages/Buyer/MyAlerts';
import Wishlist from './pages/Buyer/Wishlist';
import Notifications from './pages/Notifications';
import ListingDetails from './pages/Listing/ListingDetails';
import Checkout from './pages/Checkout/Checkout';
import MyOrders from './pages/Buyer/MyOrders';
import Sales from './pages/Seller/Sales';

// A data router (createBrowserRouter) is needed for useBlocker (unsaved-changes prompt).
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterSelection />} />
      <Route path="/register/buyer" element={<BuyerRegistration />} />
      <Route path="/register/shop" element={<ShopRegistration />} />

      {/* Universal Dashboard Routes */}
      <Route path="/dashboard" element={<ErrorBoundary><DashboardLayout /></ErrorBoundary>}>
        <Route index element={<Navigate to="items" replace />} />
        <Route path="items" element={<AllItems />} />
        <Route path="create" element={<CreatePost />} />
        <Route path="edit/:id" element={<CreatePost />} />
        <Route path="profile" element={<Profile />} />
        <Route path="alerts" element={<MyAlerts />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="listings/:id" element={<ListingDetails />} />
        <Route path="checkout/:listingId" element={<Checkout />} />
        <Route path="orders" element={<MyOrders />} />
        <Route path="sales" element={<Sales />} />

        {/* Admin Routes */}
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/admins" element={<AdminAdmins />} />
        <Route path="admin/shops" element={<AdminShops />} />
        <Route path="admin/buyers" element={<AdminBuyers />} />
        <Route path="admin/listings" element={<AdminFlaggedListings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </>
  )
);

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: 'var(--color-bg-surface)', color: '#fff', border: '1px solid var(--color-border-glass)' },
          success: { iconTheme: { primary: 'var(--color-success)', secondary: '#fff' } },
          error: { iconTheme: { primary: 'var(--color-danger)', secondary: '#fff' } }
        }}
      />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
