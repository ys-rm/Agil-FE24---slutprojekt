"use client";

import { useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase/config";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import countriesStatesData from "../../src/countriesStates.json";
import { m } from "framer-motion";
import { User, MapPin, Heart, ShoppingBag, Camera, Trash2 } from "lucide-react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import logger from "../utils/logger";
import useWishlist from "../utils/useWishlist";

/**
 * Order status constants with associated colors for UI display
 */
const ORDER_STATUS = {
  PLACED: { label: "Placed", color: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "Approved", color: "bg-blue-100 text-blue-800" },
  PACKED: { label: "Packed", color: "bg-indigo-100 text-indigo-800" },
  SHIPPED: { label: "Shipped", color: "bg-purple-100 text-purple-800" },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-800" },
  DECLINED: { label: "Declined", color: "bg-red-100 text-red-800" },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-800" },
};

function MyAccount() {
  // Get the current section from URL parameters
  const { section } = useParams();
  const currentSection = section || "profile";

  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    email: "",
    name: "",
    phone: "",
    address: {
      houseNo: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      country: "India",
      pin: "",
    },
    profilePic: "",
  });
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const dispatch = useDispatch();
  const {
    wishlistItems: hookWishlistItems,
    loading: wishlistHookLoading,
    removeFromWishlist: removeWishlistItem,
  } = useWishlist();

  useEffect(() => {
    /**
     * Fetch user profile data from Firestore
     */
    const fetchProfile = async () => {
      if (user) {
        try {
          setLoading(true);
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfile({
              email: userData.email || "",
              name: userData.name || "",
              phone: userData.phone || "",
              address: {
                houseNo: userData.address?.houseNo || "",
                line1: userData.address?.line1 || "",
                line2: userData.address?.line2 || "",
                city: userData.address?.city || "",
                state: userData.address?.state || "",
                country: userData.address?.country || "India",
                pin: userData.address?.pin || "",
              },
              profilePic: userData.profilePic || "",
            });

            logger.firebase.read(`users/${user.uid}`, {
              name: userData.name,
              email: userData.email,
            });
          } else {
            toast.warn("No profile data found. Please update your profile.");
            logger.warn("No user profile data found", null, "Profile");
          }
        } catch (error) {
          toast.error("Error loading profile: " + error.message);
          logger.firebase.error(`users/${user.uid}`, "getDoc", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfile();
  }, [user]);

  /**
   * Fetch user orders from Firestore
   * Memoized with useCallback to prevent repeated calls and console spam
   */
  const fetchOrders = useCallback(async () => {
    if (!user) return;

    // Check if we've already fetched orders to prevent repeated calls
    if (orders.length > 0 && !ordersLoading) return;

    logger.user.action("View Orders", { userId: user.uid });

    try {
      setOrdersLoading(true);

      // Get all orders for this user
      const ordersQuery = query(
        collection(db, "orders"),
        where("userId", "==", user.uid),
        orderBy("orderDate", "desc")
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = [];

      ordersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId === user.uid) {
          // Ensure totalAmount is calculated if missing
          if (!data.totalAmount && !data.total) {
            const subtotal = data.subtotal || 0;
            const tax = data.tax || 0;
            const shipping = 0;
            const discount = data.discount || 0;
            const importDuty = data.importDuty || 0;

            data.totalAmount =
              subtotal + tax + shipping + importDuty - discount;

            console.log(`Calculated missing total for order ${data.orderId}:`, {
              subtotal,
              tax,
              shipping,
              discount,
              importDuty,
              calculatedTotal: data.totalAmount,
            });
          }

          ordersData.push({
            id: doc.id,
            ...data,
          });
        }
      });

      setOrders(ordersData);
      logger.firebase.read("orders", { count: ordersData.length });
    } catch (error) {
      logger.firebase.error("orders", "getDocs", error);
      toast.error("Error loading orders: " + error.message);
    } finally {
      setOrdersLoading(false);
    }
  }, [user, orders.length, ordersLoading]);

  /**
   * Fetch user wishlist items from Firebase
   * This is now handled by the useWishlist hook
   * Memoized with useCallback to prevent repeated calls
   */
  const fetchWishlist = useCallback(async () => {
    if (!user) return;

    // Only log once per section activation
    logger.user.action("View Wishlist", { userId: user.uid });
  }, [user]);

  // Load data based on the current section
  useEffect(() => {
    if (currentSection === "orders") {
      fetchOrders();
    } else if (currentSection === "wishlist") {
      fetchWishlist();
    }
  }, [currentSection, fetchOrders, fetchWishlist]);

  /**
   * Handle input field changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addrField = name.split(".")[1];
      setProfile((prev) => ({
        ...prev,
        address: { ...prev.address, [addrField]: value },
      }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  /**
   * Handle form submission to update profile
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user) {
      try {
        setSaveLoading(true);
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          name: profile.name,
          phone: profile.phone,
          address: profile.address,
          profilePic: profile.profilePic,
        });
        toast.success("Profile updated successfully!");
      } catch (error) {
        toast.error("Error updating profile: " + error.message);
        console.error("Error updating profile:", error);
      } finally {
        setSaveLoading(false);
      }
    }
  };

  /**
   * Format price as currency
   *
   * @param {number} price - Price to format
   * @returns {string} Formatted price
   *
   * IMPORTANT: There's inconsistency in the database schema where some order records
   * use 'totalAmount' field while others might use 'total' field for the order total.
   * The email service uses 'totalAmount', so we prioritize that field but fall back to 'total'
   * if needed to ensure consistent display across all app sections.
   * This prevents "$0.00" or "NaN" issues in the UI and PDF generation.
   */
  const formatPrice = (price) => {
    if (price === undefined || price === null) return "$0.00";

    const num = typeof price === "string" ? Number.parseFloat(price) : price;

    if (isNaN(num)) return "$0.00";

    const parts = num.toFixed(2).split(".");
    const integer = parts[0];
    const decimalPart = parts[1];

    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return `$${
      decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger
    }`;
  };

  /**
   * Format date in a more readable format
   *
   * @param {string|number|Date} date - The date to format
   * @returns {string} Formatted date
   */
  const formatOrderDate = (date) => {
    if (!date) return "N/A";

    const orderDate = new Date(date);

    if (isNaN(orderDate.getTime())) return "Invalid date";

    const now = new Date();
    if (orderDate > new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      return new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    return orderDate.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            My Account
          </h1>
          <p className="text-gray-600 mb-8">
            Manage your profile, orders, and more
          </p>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-t-2xl shadow-md overflow-hidden border border-gray-200">
            <div className="flex flex-wrap">
              <Link
                to="/my-account/profile"
                className={`flex items-center py-4 px-6 focus:outline-none transition-colors ${
                  currentSection === "profile"
                    ? "text-blue-600 border-b-2 border-blue-600 font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <User size={18} className="mr-2" />
                <span>Profile</span>
              </Link>

              <Link
                to="/my-account/orders"
                className={`flex items-center py-4 px-6 focus:outline-none transition-colors ${
                  currentSection === "orders"
                    ? "text-blue-600 border-b-2 border-blue-600 font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <ShoppingBag size={18} className="mr-2" />
                <span>Orders</span>
              </Link>

              <Link
                to="/my-account/wishlist"
                className={`flex items-center py-4 px-6 focus:outline-none transition-colors ${
                  currentSection === "wishlist"
                    ? "text-blue-600 border-b-2 border-blue-600 font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Heart size={18} className="mr-2" />
                <span>Wishlist</span>
              </Link>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-b-2xl shadow-md p-6 md:p-8 border-t-0 border border-gray-200">
            {/* Render content based on URL section */}
            {currentSection === "profile" && (
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Profile content */}
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="relative">
                    <img
                      src={
                        profile.profilePic ||
                        "https://via.placeholder.com/150?text=Profile"
                      }
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border shadow-md"
                    />
                    <div className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow-md">
                      <Camera size={16} className="text-gray-500" />
                    </div>
                  </div>

                  <div className="flex-grow">
                    <h2 className="text-2xl font-semibold text-gray-800">
                      {profile.name || "Welcome"}
                    </h2>
                    <p className="text-gray-600">{profile.email}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <User size={18} className="mr-2" />
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={profile.name}
                          onChange={handleChange}
                          required
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={profile.email}
                          className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                          disabled
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          name="phone"
                          value={profile.phone}
                          onChange={handleChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Profile Picture URL
                        </label>
                        <input
                          type="text"
                          name="profilePic"
                          value={profile.profilePic}
                          onChange={handleChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <MapPin size={18} className="mr-2" />
                      Address Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          House/Apartment Number
                        </label>
                        <input
                          type="text"
                          name="address.houseNo"
                          value={profile.address.houseNo}
                          onChange={handleChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address Line 1
                        </label>
                        <input
                          type="text"
                          name="address.line1"
                          value={profile.address.line1}
                          onChange={handleChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          name="address.line2"
                          value={profile.address.line2}
                          onChange={handleChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          name="address.city"
                          value={profile.address.city}
                          onChange={handleChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          PIN Code
                        </label>
                        <input
                          type="text"
                          name="address.pin"
                          value={profile.address.pin}
                          onChange={handleChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country
                        </label>
                        <select
                          name="address.country"
                          value={profile.address.country}
                          onChange={handleChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Object.keys(countriesStatesData.countries).map(
                            (country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <select
                          name="address.state"
                          value={profile.address.state}
                          onChange={handleChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select State</option>
                          {profile.address.country &&
                            countriesStatesData.countries[
                              profile.address.country
                            ]?.map((state) => (
                              <option key={state} value={state}>
                                {state}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
                      disabled={saveLoading}
                    >
                      {saveLoading ? (
                        <span className="flex items-center justify-center">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          Saving...
                        </span>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </form>
              </m.div>
            )}

            {currentSection === "orders" && (
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800">
                    My Orders
                  </h2>
                </div>

                {ordersLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <h3 className="text-xl font-medium text-gray-700 mb-2">
                      No orders yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                      You haven't placed any orders yet.
                    </p>
                    <button
                      onClick={() => navigate("/products")}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {orders.map((order) => {
                      console.log(`Order ${order.id} total data:`, {
                        totalAmount: order.totalAmount,
                        total: order.total,
                        usedValue: order.totalAmount || order.total || 0,
                      });

                      return (
                        <div
                          key={order.id}
                          className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
                        >
                          <div className="bg-gray-50 p-4 border-b border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-4">
                                  <p className="text-sm font-medium text-gray-900">
                                    Order ID: #{order.id}
                                  </p>
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      ORDER_STATUS[order.status?.toUpperCase()]
                                        ?.color || "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {order.status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                  Order placed on{" "}
                                  {formatOrderDate(order.orderDate)}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span>
                                    Payment: {order.payment?.method || "N/A"}
                                  </span>
                                  <span>Items: {order.items?.length || 0}</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-sm text-gray-500">
                                  Total Amount
                                </p>
                                <p className="text-lg font-bold text-gray-900">
                                  {formatPrice(
                                    order.totalAmount || order.total || 0
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="p-4">
                            <div className="space-y-4">
                              {order.items?.slice(0, 3).map((item, idx) => (
                                <div
                                  key={`${order.id}-${idx}`}
                                  className="flex items-start gap-4"
                                >
                                  <div className="flex-shrink-0">
                                    <img
                                      src={
                                        item.image ||
                                        "/placeholder.svg?height=80&width=80&text=Product" ||
                                        "/placeholder.svg"
                                      }
                                      alt={item.name}
                                      className="w-16 h-16 object-contain border border-gray-200 rounded-md"
                                    />
                                  </div>
                                  <div className="flex-grow">
                                    <h4 className="text-gray-800 font-medium">
                                      {item.name}
                                    </h4>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                      <span>Qty: {item.quantity}</span>
                                      <span>
                                        Price: {formatPrice(item.price)}
                                      </span>
                                      <span>
                                        Total:{" "}
                                        {formatPrice(
                                          item.price * item.quantity
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {order.items?.length > 3 && (
                                <p className="text-sm text-gray-500">
                                  + {order.items.length - 3} more items
                                </p>
                              )}
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Order Summary */}
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-3">
                                    Order Summary
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Subtotal:
                                      </span>
                                      <span>
                                        {formatPrice(order.subtotal || 0)}
                                      </span>
                                    </div>
                                    {order.tax > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">
                                          Tax:
                                        </span>
                                        <span>{formatPrice(order.tax)}</span>
                                      </div>
                                    )}
                                    {order.discount > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span>Discount:</span>
                                        <span>
                                          -{formatPrice(order.discount)}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-medium text-gray-900 pt-2 border-t">
                                      <span>Total:</span>
                                      <span>
                                        {formatPrice(
                                          order.totalAmount || order.total || 0
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Shipping & Payment Info */}
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-3">
                                    Delivery & Payment
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-gray-600">
                                        Shipping Address:
                                      </span>
                                      <p className="text-gray-900">
                                        {order.shippingAddress?.name ||
                                          order.userName}
                                      </p>
                                      <p className="text-gray-600">
                                        {order.shippingAddress?.street &&
                                          `${order.shippingAddress.street}, `}
                                        {order.shippingAddress?.city &&
                                          `${order.shippingAddress.city}, `}
                                        {order.shippingAddress?.state &&
                                          `${order.shippingAddress.state}, `}
                                        {order.shippingAddress?.country ||
                                          "India"}
                                        {order.shippingAddress?.zip &&
                                          ` - ${order.shippingAddress.zip}`}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">
                                        Payment Method:
                                      </span>
                                      <span className="ml-2 text-gray-900">
                                        {order.payment?.method || "N/A"}
                                      </span>
                                    </div>
                                    {order.userPhone && (
                                      <div>
                                        <span className="text-gray-600">
                                          Contact:
                                        </span>
                                        <span className="ml-2 text-gray-900">
                                          {order.userPhone}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {order.statusHistory &&
                                order.statusHistory.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    <h4 className="font-medium text-gray-900 mb-3">
                                      Order Status History
                                    </h4>
                                    <div className="space-y-2">
                                      {order.statusHistory.map(
                                        (status, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-center gap-3 text-sm"
                                          >
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <span className="text-gray-900 font-medium">
                                              {status.status}
                                            </span>
                                            <span className="text-gray-500">
                                              {formatOrderDate(
                                                status.timestamp
                                              )}
                                            </span>
                                            {status.note && (
                                              <span className="text-gray-600">
                                                - {status.note}
                                              </span>
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </m.div>
            )}

            {currentSection === "wishlist" && (
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800">
                    Your Wishlist
                  </h2>

                  <Link
                    to="/wishlist"
                    className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium flex items-center"
                  >
                    View Full Wishlist
                  </Link>
                </div>

                {wishlistHookLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    {hookWishlistItems.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-8 text-center">
                        <Heart
                          size={48}
                          className="mx-auto text-gray-300 mb-4"
                        />
                        <h3 className="text-xl font-medium text-gray-700 mb-2">
                          Your wishlist is empty
                        </h3>
                        <p className="text-gray-500 mb-6">
                          You haven't added any products to your wishlist yet.
                        </p>
                        <Link
                          to="/products"
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                        >
                          Explore Products
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {hookWishlistItems.slice(0, 6).map((item) => (
                          <div
                            key={item.id}
                            className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                          >
                            <Link to={`/product/${item.id}`} className="block">
                              <div className="h-36 overflow-hidden">
                                <img
                                  src={
                                    item.image ||
                                    "/placeholder.svg?height=144&width=144&text=Product"
                                  }
                                  alt={item.name}
                                  className="w-full h-full object-cover transition-transform hover:scale-105"
                                />
                              </div>
                            </Link>

                            <div className="p-4">
                              <Link
                                to={`/product/${item.id}`}
                                className="block mb-2"
                              >
                                <h3 className="font-medium text-gray-800 line-clamp-1">
                                  {item.name}
                                </h3>
                              </Link>

                              <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-gray-900">
                                  {formatPrice(item.price)}
                                </span>
                                {item.originalPrice &&
                                  item.originalPrice > item.price && (
                                    <span className="text-sm text-gray-500 line-through">
                                      {formatPrice(item.originalPrice)}
                                    </span>
                                  )}
                              </div>

                              <div className="flex space-x-2">
                                <Link
                                  to={`/product/${item.id}`}
                                  className="flex-grow py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm"
                                >
                                  View Details
                                </Link>

                                <button
                                  onClick={() => removeWishlistItem(item.id)}
                                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                  aria-label="Remove from wishlist"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {hookWishlistItems.length > 6 && (
                      <div className="mt-6 text-center">
                        <Link
                          to="/wishlist"
                          className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium inline-flex items-center"
                        >
                          View all {hookWishlistItems.length} items in your
                          wishlist
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </m.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyAccount;
