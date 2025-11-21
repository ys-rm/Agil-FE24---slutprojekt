"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "../firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import ProductCard from "../components/ProductCard";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { m } from "framer-motion";
import { useDispatch } from "react-redux";
import { addToCart } from "../redux/cartSlice";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/config";

/**
 * Products component displays a complete product catalog with category sections
 * Features:
 * - Fetches products from Firestore database
 * - Organizes products by categories loaded from Firebase
 * - Provides advanced search and filtering functionality
 * - Implements "load more" pagination per category
 * - Uses animations for enhanced user experience
 * - Includes performance optimizations for authenticated users
 */
function Products() {
  // State management
  const [products, setProducts] = useState([]); // All products from database
  const [categories, setCategories] = useState([]); // Categories loaded from Firebase
  const [loading, setLoading] = useState(true); // Loading state for initial data fetch
  const [visibleCounts, setVisibleCounts] = useState({}); // Track number of visible products per category
  const [searchTerm, setSearchTerm] = useState(""); // User search input
  const [showFilters, setShowFilters] = useState(false); // Control filter panel visibility

  const [filters, setFilters] = useState({
    priceRange: { min: "", max: "" },
    selectedCategory: "", // Changed from categories array to single selectedCategory
    origin: "",
    importStatus: "",
    warranty: false,
    guarantee: false,
    inStock: false,
  });

  const [availableCategories, setAvailableCategories] = useState([]); // Available categories from Firebase
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const dispatch = useDispatch(); // Redux dispatch for cart actions
  const [user] = useAuthState(auth); // Get authenticated user

  /**
   * Fetch categories from Firestore
   */
  const fetchCategories = useCallback(async () => {
    try {
      const categoriesRef = collection(db, "categories");
      const q = query(categoriesRef, orderBy("name"));
      const snapshot = await getDocs(q);

      const categoryList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter only active categories
      const activeCategories = categoryList.filter(
        (cat) => cat.isActive !== false
      );
      setCategories(activeCategories);
      setAvailableCategories(activeCategories);
      console.log(
        `Successfully fetched ${activeCategories.length} active categories`
      );
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Fallback to empty array if categories can't be loaded
      setCategories([]);
      setAvailableCategories([]);
    }
  }, []);

  /**
   * Fetch all products from Firestore on component mount
   * Uses caching to minimize database reads and improve performance
   */
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Check for cached product data
        const cachedProducts = sessionStorage.getItem("products_cache");
        const lastFetchTime = sessionStorage.getItem("products_fetch_time");
        const now = Date.now();

        // Clear cache if user authentication state changes
        // This ensures we're not using potentially stale data
        const authStateKey = user ? `auth_${user.uid}` : "no_auth";
        const lastAuthState = sessionStorage.getItem("last_auth_state");

        // Determine if we need to bypass cache due to auth state change
        const authStateChanged = lastAuthState !== authStateKey;

        // Update the authentication state tracker
        sessionStorage.setItem("last_auth_state", authStateKey);

        // Use cache if available, less than 5 minutes old, and auth state hasn't changed
        if (
          cachedProducts &&
          lastFetchTime &&
          now - Number.parseInt(lastFetchTime) < 5 * 60 * 1000 &&
          !authStateChanged
        ) {
          setProducts(JSON.parse(cachedProducts));
          setLoading(false);
          return;
        }

        // Fetch from database if cache is missing, outdated, or auth state changed
        console.log("Fetching fresh products data...", {
          authStateKey,
          isAuthenticated: !!user,
        });
        const querySnapshot = await getDocs(collection(db, "products"));

        // Check if querySnapshot exists and has docs
        if (querySnapshot && querySnapshot.docs) {
          const productsArray = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Update state and cache the results
          setProducts(productsArray);
          sessionStorage.setItem(
            "products_cache",
            JSON.stringify(productsArray)
          );
          sessionStorage.setItem("products_fetch_time", now.toString());
          console.log(`Successfully fetched ${productsArray.length} products`);
        } else {
          // Handle case where querySnapshot is invalid
          console.error("Query snapshot is invalid", querySnapshot);
          throw new Error("Failed to get valid product data");
        }
      } catch (error) {
        console.error("Error fetching products:", error);

        // Fallback to cached data if available when fetch fails
        const cachedProducts = sessionStorage.getItem("products_cache");
        if (cachedProducts) {
          console.log("Using cached products as fallback after fetch error");
          setProducts(JSON.parse(cachedProducts));
        } else {
          // If no cache available, set empty array to avoid infinite loading
          console.log(
            "No cache available for fallback, showing empty products list"
          );
          setProducts([]);
        }
      } finally {
        // Always set loading to false, regardless of success/failure
        setLoading(false);
      }
    };

    const fetchData = async () => {
      await Promise.all([fetchProducts(), fetchCategories()]);
    };

    fetchData();

    // Cleanup function to avoid memory leaks
    return () => {
      // Any cleanup code if needed
    };
  }, [user, fetchCategories]); // Add fetchCategories dependency

  /**
   * Handle filter changes
   * @param {string} filterType - Type of filter being changed
   * @param {any} value - New value for the filter
   */
  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  /**
   * Reset all filters to their default state
   */
  const resetFilters = () => {
    setFilters({
      priceRange: { min: "", max: "" },
      selectedCategory: "", // Reset to empty string instead of empty array
      origin: "",
      importStatus: "",
      warranty: false,
      guarantee: false,
      inStock: false,
    });
  };

  /**
   * Generate categorized products for display
   * Applies search filter and all other filters if they exist
   * Ensures price values are properly converted to numbers
   * Memoized to prevent recalculation on every render
   */
  const categorizedProducts = useMemo(() => {
    console.log("[v0] Total products fetched:", products.length);
    console.log(
      "[v0] Available categories:",
      categories.map((cat) => ({ id: cat.id, name: cat.name }))
    );
    console.log("[v0] Current filters:", filters);

    // Process product data to ensure consistent data types
    const processedProducts = products.map((product) => ({
      ...product,
      price:
        typeof product.price === "string"
          ? Number.parseFloat(product.price)
          : product.price,
      originalPrice: product.originalPrice
        ? typeof product.originalPrice === "string"
          ? Number.parseFloat(product.originalPrice)
          : product.originalPrice
        : null,
      stock:
        typeof product.stock === "string"
          ? Number.parseInt(product.stock, 10)
          : product.stock,
    }));

    console.log(
      "[v0] Processed products:",
      processedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        showOnHome: p.showOnHome,
      }))
    );

    const categoriesToShow = filters.selectedCategory
      ? categories.filter((cat) => cat.id === filters.selectedCategory)
      : categories;

    console.log(
      "[v0] Categories to show:",
      categoriesToShow.map((cat) => ({ id: cat.id, name: cat.name }))
    );

    const result = categoriesToShow.map((categoryObj) => {
      const categoryProducts = processedProducts.filter((product) => {
        console.log(
          "[v0] Checking product:",
          product.name,
          "for category:",
          categoryObj.name
        );
        console.log(
          "[v0] Product category:",
          product.category,
          "Category ID:",
          categoryObj.id
        );

        if (product.category !== categoryObj.id) {
          console.log("[v0] Product filtered out - category mismatch");
          return false;
        }

        // Apply price range filter
        if (
          filters.priceRange.min &&
          product.price < Number.parseFloat(filters.priceRange.min)
        ) {
          console.log("[v0] Product filtered out - price too low");
          return false;
        }
        if (
          filters.priceRange.max &&
          product.price > Number.parseFloat(filters.priceRange.max)
        ) {
          console.log("[v0] Product filtered out - price too high");
          return false;
        }

        // Apply origin filter
        if (filters.origin && product.origin !== filters.origin) {
          console.log("[v0] Product filtered out - origin mismatch");
          return false;
        }

        // Apply import status filter
        if (filters.importStatus) {
          const isImported = product.importDetails?.isImported;
          if (filters.importStatus === "imported" && !isImported) {
            console.log("[v0] Product filtered out - not imported");
            return false;
          }
          if (filters.importStatus === "local" && isImported) {
            console.log("[v0] Product filtered out - not local");
            return false;
          }
        }

        // Apply warranty filter
        if (filters.warranty && !product.warranty?.available) {
          console.log("[v0] Product filtered out - no warranty");
          return false;
        }

        // Apply guarantee filter
        if (filters.guarantee && !product.guarantee?.available) {
          console.log("[v0] Product filtered out - no guarantee");
          return false;
        }

        // Apply stock filter
        if (filters.inStock && product.stock <= 0) {
          console.log("[v0] Product filtered out - out of stock");
          return false;
        }

        // If searchTerm is empty, include the product
        if (searchTerm === "") {
          console.log("[v0] Product included - no search term");
          return true;
        }

        // Prepare searchTerm for case-insensitive comparison
        const term = searchTerm.toLowerCase();

        // Check various product fields for a match
        if (product.name?.toLowerCase().includes(term)) {
          console.log("[v0] Product included - name match");
          return true;
        }
        if (product.description?.toLowerCase().includes(term)) {
          console.log("[v0] Product included - description match");
          return true;
        }
        if (product.slug?.toLowerCase().includes(term)) {
          console.log("[v0] Product included - slug match");
          return true;
        }
        if (product.origin?.toLowerCase().includes(term)) {
          console.log("[v0] Product included - origin match");
          return true;
        }
        if (product.additionalInfo?.toLowerCase().includes(term)) {
          console.log("[v0] Product included - additional info match");
          return true;
        }
        if (product.tags?.some((tag) => tag.toLowerCase().includes(term))) {
          console.log("[v0] Product included - tag match");
          return true;
        }
        if (categoryObj.name?.toLowerCase().includes(term)) {
          console.log("[v0] Product included - category name match");
          return true;
        }

        if (product.warranty?.available) {
          if (product.warranty.details?.toLowerCase().includes(term)) {
            console.log("[v0] Product included - warranty details match");
            return true;
          }
          if (product.warranty.period?.toLowerCase().includes(term)) {
            console.log("[v0] Product included - warranty period match");
            return true;
          }
        }

        if (product.guarantee?.available) {
          if (product.guarantee.details?.toLowerCase().includes(term)) {
            console.log("[v0] Product included - guarantee details match");
            return true;
          }
          if (product.guarantee.period?.toLowerCase().includes(term)) {
            console.log("[v0] Product included - guarantee period match");
            return true;
          }
        }

        if (product.importDetails?.isImported) {
          if (product.importDetails.country?.toLowerCase().includes(term)) {
            console.log("[v0] Product included - import country match");
            return true;
          }
          if (
            product.importDetails.deliveryNote?.toLowerCase().includes(term)
          ) {
            console.log("[v0] Product included - delivery note match");
            return true;
          }
        }

        console.log("[v0] Product filtered out - no search match");
        return false;
      });

      console.log(
        "[v0] Category:",
        categoryObj.name,
        "has",
        categoryProducts.length,
        "products"
      );

      return {
        category: categoryObj.name,
        categoryId: categoryObj.id,
        items: categoryProducts,
      };
    });

    console.log("[v0] Final categorized products:", result);
    return result;
  }, [products, searchTerm, categories, filters]); // Updated dependencies

  /**
   * Handles loading more products for a specific category
   * @param {string} category - The category to load more products for
   */
  const handleLoadMore = useCallback((category) => {
    setVisibleCounts((prevCounts) => ({
      ...prevCounts,
      [category]: (prevCounts[category] || 4) + 4, // Load 4 more items each time
    }));
  }, []);

  /**
   * Handles adding a product to the cart
   * Dispatches Redux action with product ID and quantity
   * @param {Object} product - The product to add to cart
   */
  const handleAddToCart = useCallback(
    (product) => {
      dispatch(
        addToCart({
          productId: product.id,
          quantity: 1,
        })
      );
    },
    [dispatch]
  );

  // Show loading spinner while fetching products
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  const selectedCategoryName = filters.selectedCategory
    ? availableCategories.find((cat) => cat.id === filters.selectedCategory)
        ?.name
    : null;

  return (
    <m.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="container mx-auto px-4 py-8 bg-gray-50"
    >
      {/* Page Title */}
      <h1 className="text-4xl font-bold mb-8 text-gray-900 text-center">
        Our Premium Collection
      </h1>

      {selectedCategoryName && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedCategoryName}</h2>
              <p className="text-blue-100 mt-1">
                Browse our {selectedCategoryName.toLowerCase()} collection
              </p>
            </div>
            <button
              onClick={() => handleFilterChange("selectedCategory", "")}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <X size={16} />
              Show All Categories
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="mb-8 space-y-4">
        {/* Search Bar with Category Dropdown and Filter Toggle */}
        <div className="flex gap-4">
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-4 pr-12 text-gray-900 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center gap-2 px-4 py-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors min-w-[200px] justify-between"
            >
              <span className="text-gray-700">
                {selectedCategoryName || "All Categories"}
              </span>
              <ChevronDown
                size={20}
                className={`text-gray-400 transition-transform ${
                  showCategoryDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {showCategoryDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    handleFilterChange("selectedCategory", "");
                    setShowCategoryDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    !filters.selectedCategory
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700"
                  }`}
                >
                  All Categories
                </button>
                {availableCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      handleFilterChange("selectedCategory", category.id);
                      setShowCategoryDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      filters.selectedCategory === category.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-colors ${
              showFilters
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white border border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Filter size={20} />
            <span>Filters</span>
            {/* Show active filters count */}
            {Object.entries(filters).some(([key, value]) => {
              if (key === "selectedCategory") return false; // Don't count category in active filters
              if (typeof value === "object") {
                return Object.values(value).some(
                  (v) => v !== "" && v !== false
                );
              }
              return value !== "" && value !== false && value.length > 0;
            }) && (
              <span className="ml-1 bg-white text-blue-600 px-2 py-0.5 rounded-full text-sm">
                {Object.entries(filters).reduce((count, [key, value]) => {
                  if (key === "selectedCategory") return count; // Don't count category
                  if (typeof value === "object") {
                    return (
                      count +
                      Object.values(value).filter(
                        (v) => v !== "" && v !== false
                      ).length
                    );
                  }
                  return (
                    count +
                    (value !== "" && value !== false && value.length > 0
                      ? 1
                      : 0)
                  );
                }, 0)}
              </span>
            )}
          </button>
        </div>

        {/* Active Filters Display */}
        {Object.entries(filters).some(([key, value]) => {
          if (key === "selectedCategory") return false; // Don't show category in active filters
          if (typeof value === "object") {
            return Object.values(value).some((v) => v !== "" && v !== false);
          }
          return value !== "" && value !== false && value.length > 0;
        }) && (
          <div className="flex flex-wrap gap-2 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            {Object.entries(filters).map(([key, value]) => {
              if (key === "selectedCategory") return null; // Don't show category filter here
              if (key === "priceRange" && (value.min || value.max)) {
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full"
                  >
                    <span>
                      Price: {value.min ? `$${value.min}` : "Min"} -{" "}
                      {value.max ? `$${value.max}` : "Max"}
                    </span>
                    <button
                      onClick={() =>
                        handleFilterChange("priceRange", { min: "", max: "" })
                      }
                      className="text-blue-700 hover:text-blue-900"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              }
              if (typeof value === "string" && value) {
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full"
                  >
                    <span>
                      {key === "origin" ? "Origin" : "Import"}: {value}
                    </span>
                    <button
                      onClick={() => handleFilterChange(key, "")}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              }
              if (typeof value === "boolean" && value) {
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full"
                  >
                    <span>
                      {key === "warranty"
                        ? "With Warranty"
                        : key === "guarantee"
                        ? "With Guarantee"
                        : "In Stock"}
                    </span>
                    <button
                      onClick={() => handleFilterChange(key, false)}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              }
              return null;
            })}
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-lg shadow-lg border border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Price Range */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <div className="flex gap-2">
                  <div className="flex-grow">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.priceRange.min}
                      onChange={(e) =>
                        handleFilterChange("priceRange", {
                          ...filters.priceRange,
                          min: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-grow">
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.priceRange.max}
                      onChange={(e) =>
                        handleFilterChange("priceRange", {
                          ...filters.priceRange,
                          max: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Origin */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Origin
                </label>
                <input
                  type="text"
                  placeholder="Country of origin"
                  value={filters.origin}
                  onChange={(e) => handleFilterChange("origin", e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Import Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import Status
                </label>
                <select
                  value={filters.importStatus}
                  onChange={(e) =>
                    handleFilterChange("importStatus", e.target.value)
                  }
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Products</option>
                  <option value="imported">Imported Products</option>
                  <option value="local">Local Products</option>
                </select>
              </div>

              {/* Additional Filters */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Additional Filters
                </h3>
                <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={filters.warranty}
                    onChange={(e) =>
                      handleFilterChange("warranty", e.target.checked)
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">With Warranty</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={filters.guarantee}
                    onChange={(e) =>
                      handleFilterChange("guarantee", e.target.checked)
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">With Guarantee</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={filters.inStock}
                    onChange={(e) =>
                      handleFilterChange("inStock", e.target.checked)
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">In Stock Only</span>
                </label>
              </div>
            </div>
          </m.div>
        )}
      </div>

      {/* Product Categories */}
      {categorizedProducts.map(({ category, categoryId, items }, index) => {
        // Get visible items based on current count or default to 4
        const visibleItems = items.slice(0, visibleCounts[category] || 4);

        // Skip empty categories
        if (items.length === 0) return null;

        return (
          <div
            key={categoryId} // Use categoryId as key instead of category name
            className="mb-8 bg-white shadow-lg rounded-lg overflow-hidden transition-shadow duration-300 hover:shadow-2xl"
          >
            {/* Category Banner */}
            <div className="relative bg-blue-500 h-16 overflow-hidden">
              <h2 className="absolute bottom-4 left-4 text-2xl font-bold text-white capitalize">
                {category}
              </h2>
            </div>

            {/* Products Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleItems.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>

              {/* Show More button - only display when there are more than 4 items and not all items are shown */}
              {items.length > 4 &&
                !(visibleCounts[category] >= items.length) && (
                  <div className="flex justify-center mt-8">
                    <m.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center gap-2 font-medium shadow-md"
                      onClick={() => handleLoadMore(category)}
                    >
                      <span>Show More {category}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </m.button>
                  </div>
                )}
            </div>
          </div>
        );
      })}

      {/* No Results Message */}
      {products.length === 0 && (
        <div className="text-center text-gray-600 mt-8">
          <p className="text-xl">No products found matching your search.</p>
        </div>
      )}
    </m.div>
  );
}

export default Products;
