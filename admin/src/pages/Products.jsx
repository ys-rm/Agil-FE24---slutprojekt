"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

const productTypes = [
  "Notebooks and Journals",
  "Pens and Pencils",
  "Paper and Notepads",
  "Planners and Calendars",
  "Office Supplies",
  "Art Supplies",
  "Desk Accessories",
  "Cards and Envelopes",
  "Writing Accessories",
  "Gift Wrap and Packaging",
];

const brands = [
  "Camel",
  "Faber-Castell",
  "Staedtler",
  "Doms",
  "Camlin",
  "Luxor",
  "Monami",
  "Schneider",
  "Pentel",
  "Pilot",
  "Kokuyo",
  "Nataraj",
  "OHPen",
  "Bic",
  "Zebra",
  "Stabilo",
];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: 0,
    brand: "",
    stock: 0,
    type: "",
    image: "",
    image2: "",
    image3: "",
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const productsCol = collection(db, "products");
      const productSnapshot = await getDocs(productsCol);
      const productList = productSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("Fetched products:", productList);
      setProducts(productList);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "products"), newProduct);
      setNewProduct({
        name: "",
        description: "",
        price: 0,
        brand: "",
        stock: 0,
        type: "",
        image: "",
        image2: "",
        image3: "",
      });
      setShowAddForm(false);
      fetchProducts();
      toast.success("Product added successfully!");
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Failed to add product");
    }
  };

  const handleUpdateProduct = async (id) => {
    try {
      const productRef = doc(db, "products", id);
      await updateDoc(productRef, editingProduct);
      setEditingProduct(null);
      fetchProducts();
      toast.success("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, "products", id));
        fetchProducts();
        toast.success("Product deleted successfully!");
      } catch (error) {
        console.error("Error deleting product:", error);
        toast.error("Failed to delete product");
      }
    }
  };

  const filteredProducts = searchTerm
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-spin animation-delay-150"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Updated header with modern styling */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Product Management
            </h1>
            <p className="text-gray-400">Manage your product catalog</p>

            <div className="flex items-center gap-6 text-sm mt-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-gray-400">Total Products:</span>
                <span className="font-semibold text-white">
                  {products.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-gray-400">In Stock:</span>
                <span className="font-semibold text-white">
                  {products.filter((p) => p.stock > 0).length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span className="text-gray-400">Out of Stock:</span>
                <span className="font-semibold text-white">
                  {products.filter((p) => p.stock === 0).length}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            {showAddForm ? "Cancel" : "Add Product"}
          </button>
        </div>
      </div>

      {/* Updated search bar */}
      <div className="mb-6 card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Search Products</h3>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, brand, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
          <svg
            className="absolute left-3 top-3.5 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Updated form with modern styling */}
      {(showAddForm || editingProduct) && (
        <div className="mb-8 card">
          <h2 className="text-xl font-semibold text-white mb-6">
            {editingProduct ? "Edit Product" : "Add New Product"}
          </h2>
          <form
            onSubmit={
              editingProduct
                ? (e) => {
                    e.preventDefault();
                    handleUpdateProduct(editingProduct.id);
                  }
                : handleAddProduct
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  className="form-input"
                  placeholder="Enter product name"
                  value={editingProduct ? editingProduct.name : newProduct.name}
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({
                          ...editingProduct,
                          name: e.target.value,
                        })
                      : setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  placeholder="Product description"
                  value={
                    editingProduct
                      ? editingProduct.description
                      : newProduct.description
                  }
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({
                          ...editingProduct,
                          description: e.target.value,
                        })
                      : setNewProduct({
                          ...newProduct,
                          description: e.target.value,
                        })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={
                    editingProduct ? editingProduct.price : newProduct.price
                  }
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({
                          ...editingProduct,
                          price: Number(e.target.value),
                        })
                      : setNewProduct({
                          ...newProduct,
                          price: Number(e.target.value),
                        })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brand *</label>
                <select
                  className="form-input"
                  value={
                    editingProduct ? editingProduct.brand : newProduct.brand
                  }
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({
                          ...editingProduct,
                          brand: e.target.value,
                        })
                      : setNewProduct({ ...newProduct, brand: e.target.value })
                  }
                  required
                >
                  <option value="">Select Brand</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Stock Quantity *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0"
                  value={
                    editingProduct ? editingProduct.stock : newProduct.stock
                  }
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({
                          ...editingProduct,
                          stock: Number(e.target.value),
                        })
                      : setNewProduct({
                          ...newProduct,
                          stock: Number(e.target.value),
                        })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product Type *</label>
                <select
                  className="form-input"
                  value={editingProduct ? editingProduct.type : newProduct.type}
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({
                          ...editingProduct,
                          type: e.target.value,
                        })
                      : setNewProduct({ ...newProduct, type: e.target.value })
                  }
                  required
                >
                  <option value="">Select Type</option>
                  {productTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Primary Image URL</label>
                <input
                  className="form-input"
                  placeholder="https://example.com/image.jpg"
                  value={
                    editingProduct ? editingProduct.image : newProduct.image
                  }
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({
                          ...editingProduct,
                          image: e.target.value,
                        })
                      : setNewProduct({ ...newProduct, image: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Secondary Image URL</label>
                <input
                  className="form-input"
                  placeholder="https://example.com/image2.jpg"
                  value={
                    editingProduct ? editingProduct.image2 : newProduct.image2
                  }
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({
                          ...editingProduct,
                          image2: e.target.value,
                        })
                      : setNewProduct({ ...newProduct, image2: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tertiary Image URL</label>
                <input
                  className="form-input"
                  placeholder="https://example.com/image3.jpg"
                  value={
                    editingProduct ? editingProduct.image3 : newProduct.image3
                  }
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({
                          ...editingProduct,
                          image3: e.target.value,
                        })
                      : setNewProduct({ ...newProduct, image3: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setShowAddForm(false);
                  setNewProduct({
                    name: "",
                    description: "",
                    price: 0,
                    brand: "",
                    stock: 0,
                    type: "",
                    image: "",
                    image2: "",
                    image3: "",
                  });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingProduct ? "Update Product" : "Add Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Updated products table */}
      <div className="card overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              No Products Found
            </h3>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto">
              {products.length === 0
                ? "No products have been added yet. Add your first product to get started."
                : "No products match your search criteria."}
            </p>
            {searchTerm ? (
              <button onClick={() => setSearchTerm("")} className="btn-primary">
                Clear search
              </button>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary"
              >
                Add First Product
              </button>
            )}
          </div>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Description</th>
                <th>Price</th>
                <th>Brand</th>
                <th>Stock</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="flex items-center justify-center">
                      {product.image ? (
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-600"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="font-medium text-white">{product.name}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-300 max-w-xs truncate">
                      {product.description || "No description"}
                    </div>
                  </td>
                  <td>
                    <div className="font-semibold text-white">
                      ${product.price}
                    </div>
                  </td>
                  <td>
                    <div className="text-white">{product.brand}</div>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        product.stock > 10
                          ? "status-delivered"
                          : product.stock > 0
                          ? "status-pending"
                          : "status-cancelled"
                      }`}
                    >
                      {product.stock > 0
                        ? `${product.stock} in stock`
                        : "Out of stock"}
                    </span>
                  </td>
                  <td>
                    <div className="text-sm text-gray-300">{product.type}</div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Edit product"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete product"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Results Summary */}
      {filteredProducts.length > 0 && (
        <div className="mt-6 px-6 py-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-400">
              Showing{" "}
              <span className="font-semibold text-white">
                {filteredProducts.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-white">
                {products.length}
              </span>{" "}
              products
            </div>
            {searchTerm && (
              <div className="text-gray-500">
                Search results for "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
