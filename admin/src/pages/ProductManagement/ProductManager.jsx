"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  limit,
  orderBy,
  startAfter,
} from "firebase/firestore";
import { db } from "../../firebase";
import { Link } from "react-router-dom";

/**
 * ProductManager Component
 * Manages the display and management of products with pagination
 * Implements API rate limiting by loading products in chunks
 */
const ProductManager = () => {
  // State variables
  const [products, setProducts] = useState([]); // Store loaded products
  const [searchTerm, setSearchTerm] = useState(""); // Search filter text
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [lastVisible, setLastVisible] = useState(null); // Last document for pagination
  const [isMoreDataAvailable, setIsMoreDataAvailable] = useState(true); // Check if more data is available
  const [productsPerPage] = useState(5); // Number of products to load per page
  const [isDeleting, setIsDeleting] = useState(false); // Delete operation state
  const [categories, setCategories] = useState({});

  /**
   * Fetch categories to display names instead of IDs
   */
  const fetchCategories = useCallback(async () => {
    try {
      const categoriesRef = collection(db, "categories");
      const snapshot = await getDocs(categoriesRef);

      const categoryMap = {};
      snapshot.docs.forEach((doc) => {
        categoryMap[doc.id] = doc.data().name;
      });

      setCategories(categoryMap);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  /**
   * Fetch the initial set of products
   * Uses a Firestore query with ordering and pagination
   */
  const fetchInitialProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Create query with limit and ordering
      const productsRef = collection(db, "products");
      const q = query(productsRef, orderBy("name"), limit(productsPerPage));
      const snapshot = await getDocs(q);

      // Handle empty result
      if (snapshot.empty) {
        setProducts([]);
        setIsMoreDataAvailable(false);
        setIsLoading(false);
        return;
      }

      // Process results
      const productList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productList);

      // Set the last document for pagination
      const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastVisibleDoc);
      setIsMoreDataAvailable(snapshot.docs.length === productsPerPage);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  }, [productsPerPage]);

  /**
   * Initial fetch of products when component mounts
   */
  useEffect(() => {
    fetchCategories();
    fetchInitialProducts();
  }, [fetchCategories, fetchInitialProducts]);

  /**
   * Load more products - fetches the next set of products
   */
  const fetchMoreProducts = async () => {
    if (!lastVisible || !isMoreDataAvailable) return;

    setIsLoading(true);
    try {
      const productsRef = collection(db, "products");
      const q = query(
        productsRef,
        orderBy("name"),
        startAfter(lastVisible),
        limit(productsPerPage)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setIsMoreDataAvailable(false);
        setIsLoading(false);
        return;
      }

      const moreProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts((prevProducts) => [...prevProducts, ...moreProducts]);

      const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastVisibleDoc);
      setIsMoreDataAvailable(snapshot.docs.length === productsPerPage);
    } catch (error) {
      console.error("Error fetching more products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle product deletion
   * @param {string} id - Product ID to delete
   */
  const handleDeleteProduct = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );
    if (confirmDelete) {
      setIsDeleting(true);
      try {
        await deleteDoc(doc(db, "products", id));

        // Update the products list after deletion
        setProducts(products.filter((product) => product.id !== id));

        // If we deleted all products on the current page, try to load more
        if (products.length <= 1) {
          fetchInitialProducts();
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  /**
   * Format price to Indian currency format
   * @param {number} price - The price to format
   * @returns {string} - Formatted price string
   */
  const formatPrice = (price) => {
    return `$${Number(price).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    })}`;
  };

  /**
   * Filter products based on search term
   */
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (categories[product.category] &&
        categories[product.category]
          .toLowerCase()
          .includes(searchTerm.toLowerCase()))
  );

  /**
   * Reset search and fetch initial products
   */
  const handleClearSearch = () => {
    setSearchTerm("");
    fetchInitialProducts();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-white">Manage Products</h1>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          to="/products/add"
          className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition duration-200"
        >
          Add New Product
        </Link>
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="inline-block px-4 py-2 bg-gray-600 text-gray-200 rounded hover:bg-gray-700 transition duration-200"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Search by product name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-600 bg-gray-700 text-white p-2 w-full rounded pl-10 focus:border-blue-500 focus:outline-none"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 absolute top-3 left-3 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Products Table */}
      {isLoading && products.length === 0 ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredProducts.length > 0 ? (
        <>
          <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            <table className="min-w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold">
                    Thumbnail
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold hidden md:table-cell">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold">
                    Price ($)
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      {product.image && (
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded border border-gray-600"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/diverse-products-still-life.png";
                          }}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-gray-300 hidden md:table-cell">
                      {product.category ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                          {categories[product.category] || "Unknown Category"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {product.sellingPrice ? (
                        <div>
                          <div className="font-semibold">
                            {formatPrice(product.sellingPrice)}
                          </div>
                          {product.mrp &&
                            product.mrp > product.sellingPrice && (
                              <div className="text-sm text-gray-400 line-through">
                                {formatPrice(product.mrp)}
                              </div>
                            )}
                        </div>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/products/edit/${product.id}`}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition duration-200"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition duration-200"
                          disabled={isDeleting}
                        >
                          {isDeleting ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More Button */}
          {!searchTerm && isMoreDataAvailable && (
            <div className="flex justify-center mt-4">
              <button
                onClick={fetchMoreProducts}
                disabled={isLoading}
                className={`px-6 py-2 rounded transition duration-200 ${
                  isLoading
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  "Load More Products"
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-800 p-8 rounded-lg text-center text-gray-400 border border-gray-700">
          <div className="mb-4">
            <svg
              className="w-12 h-12 mx-auto text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <p className="text-lg mb-2">No products found</p>
          {searchTerm ? (
            <p>Try clearing your search or adding a new product.</p>
          ) : (
            <p>Get started by adding your first product.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductManager;
