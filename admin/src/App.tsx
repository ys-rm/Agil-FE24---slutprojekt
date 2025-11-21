import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Users from "./pages/Users";
import ProductManager from "./pages/ProductManagement/ProductManager";
import AddProduct from "./pages/ProductManagement/AddProduct";
import EditProduct from "./pages/ProductManagement/EditProduct";
import CategoryManager from "./pages/CategoryManagement/CategoryManager";
import BannerManager from "./pages/BannerManagement/BannerManager";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import AdminHome from "./pages/AdminHome";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer /> {/* Add ToastContainer for notifications */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminHome />
              </ProtectedRoute>
            }
          >
            {/* Dashboard is shown at the root route (inside AdminHome) */}
            <Route path="orders" element={<Orders />} />
            <Route path="users" element={<Users />} />
            <Route path="products" element={<ProductManager />} />
            <Route path="products/add" element={<AddProduct />} />
            <Route path="products/edit/:id" element={<EditProduct />} />
            <Route path="categories" element={<CategoryManager />} />
            <Route path="banners" element={<BannerManager />} />
          </Route>
          {/* Optionally, handle 404 Not Found */}
          <Route path="*" element={<div className="p-4">404 Not Found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
