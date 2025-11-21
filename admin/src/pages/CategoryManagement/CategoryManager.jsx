"use client"

import { useEffect, useState, useCallback } from "react"
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, query, orderBy } from "firebase/firestore"
import { db } from "../../firebase"
import { toast } from "react-toastify"

/**
 * CategoryManager Component
 * Manages the display and management of product categories
 * Allows CRUD operations for categories
 */
const CategoryManager = () => {
  // State variables
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
    isActive: true,
  })

  /**
   * Fetch all categories from Firestore
   */
  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    try {
      const categoriesRef = collection(db, "categories")
      const q = query(categoriesRef, orderBy("name"))
      const snapshot = await getDocs(q)

      const categoryList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setCategories(categoryList)
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Failed to fetch categories")
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Initial fetch of categories when component mounts
   */
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  /**
   * Generate slug from category name
   */
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
  }

  /**
   * Handle form input changes
   */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === "checkbox" ? checked : value

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
      // Auto-generate slug when name changes
      ...(name === "name" && { slug: generateSlug(value) }),
    }))
  }

  /**
   * Reset form data
   */
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      slug: "",
      isActive: true,
    })
    setEditingCategory(null)
    setShowAddForm(false)
  }

  /**
   * Handle adding a new category
   */
  const handleAddCategory = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("Category name is required!")
      return
    }

    // Check if slug already exists
    const existingCategory = categories.find((cat) => cat.slug === formData.slug)
    if (existingCategory) {
      toast.error("A category with this name already exists!")
      return
    }

    try {
      const categoryData = {
        ...formData,
        name: formData.name.trim(),
        slug: formData.slug || generateSlug(formData.name),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await addDoc(collection(db, "categories"), categoryData)
      toast.success("Category added successfully!")
      resetForm()
      fetchCategories()
    } catch (error) {
      console.error("Error adding category:", error)
      toast.error("Failed to add category")
    }
  }

  /**
   * Handle editing a category
   */
  const handleEditCategory = (category) => {
    setFormData({
      name: category.name,
      description: category.description || "",
      slug: category.slug,
      isActive: category.isActive !== false,
    })
    setEditingCategory(category)
    setShowAddForm(true)
  }

  /**
   * Handle updating a category
   */
  const handleUpdateCategory = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("Category name is required!")
      return
    }

    // Check if slug already exists (excluding current category)
    const existingCategory = categories.find((cat) => cat.slug === formData.slug && cat.id !== editingCategory.id)
    if (existingCategory) {
      toast.error("A category with this name already exists!")
      return
    }

    try {
      const categoryData = {
        ...formData,
        name: formData.name.trim(),
        slug: formData.slug || generateSlug(formData.name),
        updatedAt: new Date(),
      }

      await updateDoc(doc(db, "categories", editingCategory.id), categoryData)
      toast.success("Category updated successfully!")
      resetForm()
      fetchCategories()
    } catch (error) {
      console.error("Error updating category:", error)
      toast.error("Failed to update category")
    }
  }

  /**
   * Handle category deletion
   */
  const handleDeleteCategory = async (id, categoryName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`,
    )

    if (confirmDelete) {
      setIsDeleting(true)
      try {
        await deleteDoc(doc(db, "categories", id))
        toast.success("Category deleted successfully!")
        setCategories(categories.filter((category) => category.id !== id))
      } catch (error) {
        console.error("Error deleting category:", error)
        toast.error("Failed to delete category")
      } finally {
        setIsDeleting(false)
      }
    }
  }

  /**
   * Filter categories based on search term
   */
  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Manage Categories</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition duration-200"
        >
          {showAddForm ? "Cancel" : "Add New Category"}
        </button>
      </div>

      {/* Add/Edit Category Form */}
      {showAddForm && (
        <div className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            {editingCategory ? "Edit Category" : "Add New Category"}
          </h2>
          <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Category Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Enter category name"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">URL Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="auto-generated-from-name"
                />
                <p className="text-xs text-gray-400 mt-1">Auto-generated from name, but can be customized</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-bold mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Enter category description (optional)"
                rows="3"
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center text-gray-300">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                Active Category
              </label>
              <p className="text-xs text-gray-400 mt-1">Inactive categories won't be shown in product forms</p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
              >
                {editingCategory ? "Update Category" : "Add Category"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search bar */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 pl-10 border border-gray-600 rounded bg-gray-700 text-white focus:border-blue-500 focus:outline-none"
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

      {/* Categories Table */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredCategories.length > 0 ? (
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <table className="min-w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300 font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-gray-300 font-semibold hidden md:table-cell">Description</th>
                <th className="px-4 py-3 text-left text-gray-300 font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredCategories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-white">
                    <div>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-gray-400">/{category.slug}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{category.description || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        category.isActive !== false
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {category.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.name)}
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
      ) : (
        <div className="bg-gray-800 p-8 rounded-lg text-center text-gray-400 border border-gray-700">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-lg mb-2">No categories found</p>
          {searchTerm ? (
            <p>Try clearing your search or adding a new category.</p>
          ) : (
            <p>Get started by adding your first product category.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default CategoryManager
