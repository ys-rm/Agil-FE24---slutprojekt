import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { db } from "../firebase/config";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";
import { removeFromCart, updateQuantity } from "../redux/cartSlice";
import { Link } from "react-router-dom";
import { m } from "framer-motion";
import { ShoppingBag, Trash2, Plus, Minus, ChevronRight } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/config";
import { toast } from "react-toastify";

// Country codes mapping for phone number parsing
const COUNTRY_CODES = {
  India: "+91",
  "United States": "+1",
  Canada: "+1",
  "United Kingdom": "+44",
  France: "+33",
  Germany: "+49",
  Italy: "+39",
  Japan: "+81",
  Thailand: "+66",
  Vietnam: "+84",
  Indonesia: "+62",
  Philippines: "+63",
  Spain: "+34",
  "Sri Lanka": "+94",
  Nepal: "+977",
  Bhutan: "+975",
};

/**
 * Cart component that displays cart items and popular products recommendation
 */
function Cart() {
  const cartItems = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user] = useAuthState(auth);
  const [isCompletingOrder, setIsCompletingOrder] = useState(false);

  // Additional states for comprehensive order data
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("+91");
  const [address, setAddress] = useState({
    houseNo: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    country: "India",
    pin: "",
  });

  useEffect(() => {
    /**
     * Fetches all products from Firestore to match with cart items
     * and also gets products that should be shown on home page (popular products)
     */
    const fetchProducts = async () => {
      try {
        const productsCol = collection(db, "products");
        const productSnapshot = await getDocs(productsCol);
        const productList = productSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            price: data.price !== undefined ? parseFloat(data.price) : 0,
            mrp: data.mrp !== undefined ? parseFloat(data.mrp) : null,
            stock: data.stock !== undefined ? parseInt(data.stock, 10) : 0,
          };
        });

        setProducts(productList);
        const homeProducts = productList.filter(
          (product) => product.showOnHome
        );
        setPopularProducts(homeProducts);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching products:", error);
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch user data including name, phone, and address
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();

            if (userData.name) {
              setCustomerName(userData.name);
            }

            if (userData.phone) {
              let phone = userData.phone;
              let countryCode = "";

              for (const country in COUNTRY_CODES) {
                const code = COUNTRY_CODES[country];
                if (phone.startsWith(code)) {
                  countryCode = code;
                  phone = phone.substring(code.length);
                  break;
                }
              }

              if (countryCode) {
                setSelectedCountryCode(countryCode);
              }
              setPhoneNumber(phone);
            }

            if (userData.address) {
              setAddress(userData.address);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  /**
   * Removes an item from the cart
   * @param {string} productId - The ID of the product to remove
   */
  const handleRemove = (productId) => {
    dispatch(removeFromCart(productId));
  };

  /**
   * Updates the quantity of an item in the cart
   * @param {string} productId - The ID of the product to update
   * @param {number} quantity - The new quantity
   */
  const handleQuantityChange = (productId, quantity) => {
    if (quantity < 1) return;
    dispatch(updateQuantity({ productId, quantity }));
  };

  // Get full phone number with country code
  const getFullPhoneNumber = () => {
    if (!phoneNumber) return "";
    return `${selectedCountryCode}${phoneNumber}`;
  };

  /**
   * Completes the order by saving it to Firestore with comprehensive data
   */
  const completeOrder = async () => {
    if (!user) {
      toast.error("Please sign in to complete your order.");
      return;
    }

    setIsCompletingOrder(true);
    try {
      const cartDetails = cartItems
        .map((item) => {
          const product = products.find((p) => p.id === item.productId);
          return product ? { ...item, product } : null;
        })
        .filter(Boolean);

      const subtotal = cartDetails.reduce(
        (acc, item) => acc + item.product.price * item.quantity,
        0
      );
      const tax = subtotal * 0.18; // 18% GST
      const discountAmount = 0; // No coupons in this flow
      const total = subtotal + tax;

      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        userName: customerName || user.displayName || "",
        userPhone: getFullPhoneNumber() || "",
        orderDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        items: cartDetails.map((item) => ({
          productId: item.productId,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          image: item.product.image,
        })),
        payment: {
          method: "COD",
          details: {},
        },
        subtotal,
        tax,
        discount: discountAmount,
        totalAmount: total,
        status: "Placed",
        statusHistory: [
          {
            status: "Placed",
            timestamp: new Date().toISOString(),
            note: "Order placed successfully",
          },
        ],
        shippingAddress: {
          name: customerName,
          street: `${address.houseNo || ""}, ${address.line1 || ""}${
            address.line2 ? ", " + address.line2 : ""
          }`,
          city: address.city || "",
          state: address.state || "",
          zip: address.pin || "",
          country: address.country || "",
        },
      };

      await addDoc(collection(db, "orders"), orderData);
      toast.success("Order completed successfully!");
      cartDetails.forEach((item) => dispatch(removeFromCart(item.productId)));
    } catch (error) {
      console.error("Error completing order:", error);
      toast.error("Failed to complete order. Please try again.");
    } finally {
      setIsCompletingOrder(false);
    }
  };

  // Match cart items with product details
  const cartDetails = cartItems
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product ? { ...item, product } : null;
    })
    .filter(Boolean);

  /**
   * Format price with Indian currency format
   * @param {number} price - The price to format
   * @returns {string} Formatted price string
   */
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="bg-gray-50 min-h-screen"
    >
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Your Shopping Cart
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Review and manage the items in your cart before proceeding to
            complete your order
          </p>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-lg mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
              <ShoppingBag className="text-gray-500" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8">
              Looks like you haven't added any items to your cart yet.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Cart Items ({cartDetails.length})
                  </h2>
                </div>

                <div className="divide-y divide-gray-100">
                  {cartDetails.map((item) => (
                    <div
                      key={item.productId}
                      className="p-6 flex flex-col md:flex-row items-center"
                    >
                      <div className="w-24 h-24 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="md:ml-6 flex-grow mt-4 md:mt-0 text-center md:text-left">
                        <h3 className="text-lg font-medium text-gray-900">
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.product.type}
                        </p>
                        <p className="text-blue-600 font-semibold mt-2">
                          {formatPrice(item.product.price)}
                        </p>
                      </div>

                      <div className="flex items-center mt-4 md:mt-0">
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                          <button
                            onClick={() =>
                              handleQuantityChange(
                                item.productId,
                                Math.max(1, item.quantity - 1)
                              )
                            }
                            className="p-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                item.productId,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-12 p-1 text-center border-x border-gray-300 focus:outline-none"
                            min="1"
                          />
                          <button
                            onClick={() =>
                              handleQuantityChange(
                                item.productId,
                                item.quantity + 1
                              )
                            }
                            className="p-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemove(item.productId)}
                          className="ml-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                <button
                  onClick={completeOrder}
                  disabled={isCompletingOrder}
                  className="bg-blue-600 text-white text-center py-3 px-6 rounded-lg shadow hover:bg-blue-700 transition duration-200 font-medium disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center">
                    {isCompletingOrder ? (
                      <span className="flex items-center">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        Completing...
                      </span>
                    ) : (
                      <>
                        <span>Complete Order</span>
                        <ChevronRight size={18} className="ml-2" />
                      </>
                    )}
                  </div>
                </button>

                <Link
                  to="/products"
                  className="border border-gray-300 bg-white text-gray-700 text-center py-3 px-6 rounded-lg hover:bg-gray-50 transition duration-200"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            You might also like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {popularProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </m.div>
  );
}

export default Cart;
