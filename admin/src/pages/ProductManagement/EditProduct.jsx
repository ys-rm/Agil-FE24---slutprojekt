"use client";

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate, useParams } from "react-router-dom";

/**
 * EditProduct Component
 * Allows administrators to modify existing product information
 * Enhanced with additional features for product management
 */
const EditProduct = () => {
  const [product, setProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const categoriesRef = collection(db, "categories");
        const activeQuery = query(
          categoriesRef,
          where("isActive", "!=", false)
        );
        const snapshot = await getDocs(activeQuery);

        const categoryList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCategories(categoryList);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  /**
   * Fetch product data when component mounts or ID changes
   */
  useEffect(() => {
    const fetchProduct = async () => {
      const productRef = doc(db, "products", id);
      const productDoc = await getDoc(productRef);
      if (productDoc.exists()) {
        // Initialize with all required fields or default values if they don't exist
        const productData = productDoc.data();
        setProduct({
          ...productData,
          mrp: productData.mrp || productData.price || 0,
          sellingPrice: productData.sellingPrice || productData.price || 0,
          tags: productData.tags || [],
          origin: productData.origin || "",
          warranty: productData.warranty || {
            available: false,
            period: "",
            details: "",
          },
          guarantee: productData.guarantee || {
            available: false,
            period: "",
            details: "",
          },
          additionalInfo: productData.additionalInfo || "",
          importDetails: productData.importDetails || {
            isImported: false,
            country: "",
            deliveryNote: "",
          },
          featured: productData.featured || false,
          category: productData.category || "",
        });
      }
    };
    fetchProduct();
  }, [id]);

  /**
   * Handle product update submission
   * Includes loading state and success/error feedback
   */
  const handleUpdateProduct = async () => {
    try {
      setIsSubmitting(true);
      setSubmissionStatus("submitting");

      const productRef = doc(db, "products", id);
      await updateDoc(productRef, product);

      setSubmissionStatus("success");

      // Reset status after a delay and navigate back
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmissionStatus(null);
        navigate("/products");
      }, 2000);
    } catch (error) {
      console.error("Error updating product:", error);
      setSubmissionStatus("error");
      setIsSubmitting(false);
    }
  };

  /**
   * Add a new tag to the product
   */
  const addTag = () => {
    if (tagInput.trim() && !product.tags.includes(tagInput.trim())) {
      setProduct({
        ...product,
        tags: [...product.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  /**
   * Remove a tag from the product
   */
  const removeTag = (tagToRemove) => {
    setProduct({
      ...product,
      tags: product.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  if (!product)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <div className=" shadow-md rounded p-6 mb-6">
        {/* Basic Information Section */}
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">
          Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Product Name
            </label>
            <input
              className="border p-2 mb-4 w-full rounded"
              placeholder="Name"
              value={product.name}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Category
            </label>
            <select
              className="border p-2 mb-4 w-full rounded"
              value={product.category}
              onChange={(e) =>
                setProduct({ ...product, category: e.target.value })
              }
              disabled={loadingCategories}
            >
              <option value="">
                {loadingCategories
                  ? "Loading categories..."
                  : "Select Category"}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && !loadingCategories && (
              <p className="text-xs text-gray-400 mt-1">
                No categories available. Create categories first in the
                Categories section.
              </p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Stock
            </label>
            <input
              type="number"
              className="border p-2 mb-4 w-full rounded"
              placeholder="Stock"
              value={product.stock}
              onChange={(e) =>
                setProduct({ ...product, stock: Number(e.target.value) })
              }
            />
          </div>
        </div>

        {/* Product ID Information */}
        <div className="mb-6 p-4 rounded-lg border-l-4 border-blue-500">
          <h2 className="text-xl font-semibold mb-2">Product URL/ID</h2>
          <div className="flex items-center">
            <span className="font-medium mr-2">website.com/product/</span>
            <span className="text-blue-600 font-bold">{id}</span>
          </div>
          <p className="text-gray-600 text-sm mt-2">
            <span className="text-red-500 font-medium">Note:</span> Product ID
            cannot be changed after creation. It is used as the URL for this
            product.
          </p>
        </div>

        {/* Pricing Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                MRP ($)
              </label>
              <input
                type="number"
                className="border p-2 mb-4 w-full rounded"
                placeholder="MRP Price"
                value={product.mrp}
                onChange={(e) =>
                  setProduct({ ...product, mrp: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Selling Price ($)
              </label>
              <input
                type="number"
                className="border p-2 mb-4 w-full rounded"
                placeholder="Selling Price"
                value={product.sellingPrice}
                onChange={(e) =>
                  setProduct({
                    ...product,
                    sellingPrice: Number(e.target.value),
                    price: Number(e.target.value),
                  })
                }
              />
              {product.mrp > product.sellingPrice && (
                <div className="text-green-600 text-sm">
                  {Math.round(
                    ((product.mrp - product.sellingPrice) / product.mrp) * 100
                  )}
                  % off
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Product Tags
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {product.tags.map((tag, index) => (
              <div
                key={index}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-blue-800 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex">
            <input
              className="border p-2 flex-grow rounded-l"
              placeholder="Add a tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTag()}
            />
            <button
              className="bg-blue-500 text-white p-2 rounded-r"
              onClick={addTag}
            >
              Add Tag
            </button>
          </div>
        </div>

        {/* Product Origin/Import Details */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Origin & Import Details
          </h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Country of Origin
            </label>
            <input
              className="border p-2 mb-4 w-full rounded"
              placeholder="e.g., India, Japan, Germany"
              value={product.origin}
              onChange={(e) =>
                setProduct({ ...product, origin: e.target.value })
              }
            />
          </div>

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={product.importDetails.isImported}
              onChange={(e) =>
                setProduct({
                  ...product,
                  importDetails: {
                    ...product.importDetails,
                    isImported: e.target.checked,
                  },
                })
              }
              className="mr-2"
            />
            <label className="text-gray-700">This is an imported product</label>
          </div>

          {product.importDetails.isImported && (
            <>
              <div className="pl-6 mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Imported From
                </label>
                <input
                  className="border p-2 mb-4 w-full rounded"
                  placeholder="e.g., Japan"
                  value={product.importDetails.country}
                  onChange={(e) =>
                    setProduct({
                      ...product,
                      importDetails: {
                        ...product.importDetails,
                        country: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="pl-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Delivery Note
                </label>
                <textarea
                  className="border p-2 mb-4 w-full rounded"
                  placeholder="e.g., May take 3-4 weeks for delivery"
                  value={product.importDetails.deliveryNote}
                  onChange={(e) =>
                    setProduct({
                      ...product,
                      importDetails: {
                        ...product.importDetails,
                        deliveryNote: e.target.value,
                      },
                    })
                  }
                  rows="2"
                />
              </div>
            </>
          )}
        </div>

        {/* Warranty & Guarantee Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Warranty & Guarantee
          </h2>

          {/* Warranty Section */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={product.warranty.available}
                onChange={(e) =>
                  setProduct({
                    ...product,
                    warranty: {
                      ...product.warranty,
                      available: e.target.checked,
                    },
                  })
                }
                className="mr-2"
              />
              <label className="text-gray-700">Product has warranty</label>
            </div>

            {product.warranty.available && (
              <div className="pl-6">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Warranty Period
                  </label>
                  <input
                    className="border p-2 mb-4 w-full rounded"
                    placeholder="e.g., 1 year, 6 months"
                    value={product.warranty.period}
                    onChange={(e) =>
                      setProduct({
                        ...product,
                        warranty: {
                          ...product.warranty,
                          period: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Warranty Details
                  </label>
                  <textarea
                    className="border p-2 mb-4 w-full rounded"
                    placeholder="Describe what the warranty covers..."
                    value={product.warranty.details}
                    onChange={(e) =>
                      setProduct({
                        ...product,
                        warranty: {
                          ...product.warranty,
                          details: e.target.value,
                        },
                      })
                    }
                    rows="3"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Guarantee Section */}
          <div>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={product.guarantee.available}
                onChange={(e) =>
                  setProduct({
                    ...product,
                    guarantee: {
                      ...product.guarantee,
                      available: e.target.checked,
                    },
                  })
                }
                className="mr-2"
              />
              <label className="text-gray-700">Product has guarantee</label>
            </div>

            {product.guarantee.available && (
              <div className="pl-6">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Guarantee Period
                  </label>
                  <input
                    className="border p-2 mb-4 w-full rounded"
                    placeholder="e.g., Lifetime, 3 years"
                    value={product.guarantee.period}
                    onChange={(e) =>
                      setProduct({
                        ...product,
                        guarantee: {
                          ...product.guarantee,
                          period: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Guarantee Details
                  </label>
                  <textarea
                    className="border p-2 mb-4 w-full rounded"
                    placeholder="Describe what the guarantee covers..."
                    value={product.guarantee.details}
                    onChange={(e) =>
                      setProduct({
                        ...product,
                        guarantee: {
                          ...product.guarantee,
                          details: e.target.value,
                        },
                      })
                    }
                    rows="3"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description & Additional Info */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Description & Additional Info
          </h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Product Description
            </label>
            <textarea
              className="border p-2 mb-4 w-full rounded"
              placeholder="Detailed description of the product..."
              value={product.description}
              onChange={(e) =>
                setProduct({ ...product, description: e.target.value })
              }
              rows="4"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Additional Information
            </label>
            <textarea
              className="border p-2 mb-4 w-full rounded"
              placeholder="Any additional information like usage instructions, materials, etc."
              value={product.additionalInfo}
              onChange={(e) =>
                setProduct({ ...product, additionalInfo: e.target.value })
              }
              rows="4"
            />
          </div>
        </div>

        {/* Product Images */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Product Images
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Primary Image URL
              </label>
              <input
                className="border p-2 mb-2 w-full rounded"
                placeholder="Primary Image URL"
                value={product.image}
                onChange={(e) =>
                  setProduct({ ...product, image: e.target.value })
                }
              />
              {product.image && (
                <img
                  src={product.image || "/placeholder.svg"}
                  alt="Primary"
                  className="w-full h-40 object-contain border rounded"
                />
              )}
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Secondary Image URL
              </label>
              <input
                className="border p-2 mb-2 w-full rounded"
                placeholder="Secondary Image URL"
                value={product.image2}
                onChange={(e) =>
                  setProduct({ ...product, image2: e.target.value })
                }
              />
              {product.image2 && (
                <img
                  src={product.image2 || "/placeholder.svg"}
                  alt="Secondary"
                  className="w-full h-40 object-contain border rounded"
                />
              )}
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Tertiary Image URL
              </label>
              <input
                className="border p-2 mb-2 w-full rounded"
                placeholder="Tertiary Image URL"
                value={product.image3}
                onChange={(e) =>
                  setProduct({ ...product, image3: e.target.value })
                }
              />
              {product.image3 && (
                <img
                  src={product.image3 || "/placeholder.svg"}
                  alt="Tertiary"
                  className="w-full h-40 object-contain border rounded"
                />
              )}
            </div>
          </div>
        </div>

        {/* Visibility Settings */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Visibility Settings
          </h2>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={product.showOnHome}
              onChange={(e) =>
                setProduct({ ...product, showOnHome: e.target.checked })
              }
              className="mr-2"
            />
            <label className="text-gray-700">Show on Home Page</label>
          </div>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={product.featured}
              onChange={(e) =>
                setProduct({ ...product, featured: e.target.checked })
              }
              className="mr-2"
            />
            <label className="text-gray-700">Featured Product</label>
          </div>
        </div>

        <button
          className={`w-full py-2 rounded text-white transition-all duration-300 ${
            isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : submissionStatus === "success"
              ? "bg-green-500"
              : submissionStatus === "error"
              ? "bg-red-500"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
          onClick={handleUpdateProduct}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Updating Product..."
            : submissionStatus === "success"
            ? "Product Updated!"
            : submissionStatus === "error"
            ? "Error! Try Again"
            : "Update Product"}
        </button>
      </div>
    </div>
  );
};

export default EditProduct;
