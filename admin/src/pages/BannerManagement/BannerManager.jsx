"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";

/**
 * Banner Manager Component
 *
 * This component allows administrators to manage banner images displayed on the homepage
 * Features:
 * - Add up to 5 banner images with URLs
 * - Delete existing banners
 * - Preview banners before saving
 *
 * @returns {JSX.Element} The Banner Manager component
 */
const BannerManager = () => {
  // State for banner data
  const [banners, setBanners] = useState([]);
  const [newBanner, setNewBanner] = useState({ imageUrl: "", active: true });
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [slideshowEnabled, setSlideshowEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch banners on component mount
  useEffect(() => {
    const fetchBanners = async () => {
      setLoading(true);
      try {
        const bannersCollection = collection(db, "banners");
        const bannersSnapshot = await getDocs(bannersCollection);
        const bannersData = bannersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort banners by order property
        bannersData.sort((a, b) => a.order - b.order);
        setBanners(bannersData);

        // Get slideshow setting
        const settingsCollection = collection(db, "settings");
        const settingsSnapshot = await getDocs(settingsCollection);
        const settingsData = settingsSnapshot.docs.find(
          (doc) => doc.id === "bannerSettings"
        );
        if (settingsData) {
          setSlideshowEnabled(settingsData.data().slideshowEnabled ?? true);
        }
      } catch (error) {
        console.error("Error fetching banners:", error);
        toast.error("Failed to load banner data");
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  /**
   * Handles adding a new banner to the collection
   */
  const handleAddBanner = async () => {
    if (!newBanner.imageUrl.trim()) {
      toast.error("Banner URL cannot be empty");
      return;
    }

    if (banners.length >= 5) {
      toast.error("Maximum of 5 banners allowed");
      return;
    }

    try {
      // Create banner with unique ID
      const bannerRef = doc(collection(db, "banners"));
      await setDoc(bannerRef, {
        ...newBanner,
        order: banners.length,
        createdAt: new Date(),
      });

      toast.success("Banner added successfully");

      // Update local state
      setBanners([
        ...banners,
        {
          id: bannerRef.id,
          ...newBanner,
          order: banners.length,
          createdAt: new Date(),
        },
      ]);

      // Reset form
      setNewBanner({ imageUrl: "", active: true });
      setIsAddingNew(false);
    } catch (error) {
      console.error("Error adding banner:", error);
      toast.error("Failed to add banner");
    }
  };

  /**
   * Handles updating an existing banner
   */
  const handleUpdateBanner = async () => {
    if (!newBanner.imageUrl.trim()) {
      toast.error("Banner URL cannot be empty");
      return;
    }

    try {
      // Update banner in Firestore
      const bannerRef = doc(db, "banners", currentEditId);
      await setDoc(bannerRef, newBanner, { merge: true });

      // Update local state
      setBanners(
        banners.map((banner) =>
          banner.id === currentEditId ? { ...banner, ...newBanner } : banner
        )
      );

      toast.success("Banner updated successfully");

      // Reset form
      setNewBanner({ imageUrl: "", active: true });
      setIsEditing(false);
      setCurrentEditId(null);
    } catch (error) {
      console.error("Error updating banner:", error);
      toast.error("Failed to update banner");
    }
  };

  /**
   * Handles deleting a banner
   * @param {string} id - ID of the banner to delete
   */
  const handleDeleteBanner = async (id) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) {
      return;
    }

    try {
      // Delete banner from Firestore
      await deleteDoc(doc(db, "banners", id));

      // Update local state
      const updatedBanners = banners.filter((banner) => banner.id !== id);

      // Re-order remaining banners
      const reorderedBanners = updatedBanners.map((banner, index) => ({
        ...banner,
        order: index,
      }));

      // Update order in Firestore
      for (const banner of reorderedBanners) {
        await setDoc(
          doc(db, "banners", banner.id),
          { order: banner.order },
          { merge: true }
        );
      }

      setBanners(reorderedBanners);
      toast.success("Banner deleted successfully");
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast.error("Failed to delete banner");
    }
  };

  /**
   * Initiates editing of a banner
   * @param {Object} banner - Banner object to edit
   */
  const startEdit = (banner) => {
    setNewBanner({
      imageUrl: banner.imageUrl,
      active: banner.active,
    });
    setIsEditing(true);
    setCurrentEditId(banner.id);
    setIsAddingNew(false);
  };

  /**
   * Cancels the current edit or add operation
   */
  const cancelEdit = () => {
    setNewBanner({ imageUrl: "", active: true });
    setIsEditing(false);
    setCurrentEditId(null);
    setIsAddingNew(false);
  };

  /**
   * Updates the slideshow setting
   */
  const updateSlideshowSetting = async () => {
    try {
      const newSetting = !slideshowEnabled;
      await setDoc(
        doc(db, "settings", "bannerSettings"),
        {
          slideshowEnabled: newSetting,
        },
        { merge: true }
      );
      setSlideshowEnabled(newSetting);
      toast.success(`Slideshow ${newSetting ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error updating slideshow setting:", error);
      toast.error("Failed to update slideshow setting");
    }
  };

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
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Banner Management
            </h1>
            <p className="text-gray-400">
              Manage homepage banner images and slideshow
            </p>

            <div className="flex items-center gap-6 text-sm mt-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-gray-400">Total Banners:</span>
                <span className="font-semibold text-white">
                  {banners.length}/5
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-gray-400">Active:</span>
                <span className="font-semibold text-white">
                  {banners.filter((b) => b.active).length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className="text-gray-400">Slideshow:</span>
                <span className="font-semibold text-white">
                  {slideshowEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-white font-medium">Slideshow:</label>
              <button
                onClick={updateSlideshowSetting}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  slideshowEnabled ? "bg-blue-600" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    slideshowEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <button
              onClick={() => {
                if (banners.length >= 5) {
                  toast.error("Maximum of 5 banners allowed");
                  return;
                }
                setIsAddingNew(true);
                setIsEditing(false);
              }}
              disabled={isAddingNew || isEditing || banners.length >= 5}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
              Add Banner
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Banner Form */}
      {(isAddingNew || isEditing) && (
        <div className="mb-8 card">
          <h2 className="text-xl font-semibold text-white mb-6">
            {isEditing ? "Edit Banner" : "Add New Banner"}
          </h2>

          <div className="space-y-6">
            <div className="form-group">
              <label className="form-label">Banner Image URL *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBanner.imageUrl}
                  onChange={(e) =>
                    setNewBanner({ ...newBanner, imageUrl: e.target.value })
                  }
                  placeholder="https://example.com/banner-image.jpg"
                  className="form-input flex-1"
                />
                {newBanner.imageUrl && (
                  <a
                    href={newBanner.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary px-3 py-2 text-sm"
                    title="Open image in new tab"
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
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newBanner.active}
                  onChange={(e) =>
                    setNewBanner({ ...newBanner, active: e.target.checked })
                  }
                  className="mr-3 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-white font-medium">Active</span>
              </label>
            </div>

            {newBanner.imageUrl && (
              <div className="form-group">
                <label className="form-label">Preview</label>
                <div className="border border-gray-600 rounded-lg overflow-hidden bg-gray-800">
                  <img
                    src={newBanner.imageUrl || "/placeholder.svg"}
                    alt="Banner preview"
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/banner-image-error.jpg";
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-700">
              <button onClick={cancelEdit} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={isEditing ? handleUpdateBanner : handleAddBanner}
                className="btn-primary"
              >
                {isEditing ? "Update Banner" : "Add Banner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banners List */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            Current Banners ({banners.length}/5)
          </h2>
        </div>

        {banners.length === 0 ? (
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
              No Banners Found
            </h3>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto">
              No banners have been added yet. Add your first banner to display
              it on the homepage.
            </p>
            <button
              onClick={() => setIsAddingNew(true)}
              className="btn-primary"
            >
              Add First Banner
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 flex items-center justify-center bg-gray-700 rounded-lg overflow-hidden">
                    {banner.imageUrl ? (
                      <img
                        src={banner.imageUrl || "/placeholder.svg"}
                        alt={`Banner ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/banner-error.jpg";
                        }}
                      />
                    ) : (
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
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate max-w-md">
                      {banner.imageUrl}
                    </h4>
                    <div className="mt-1 flex items-center gap-4">
                      <span
                        className={`status-badge ${
                          banner.active
                            ? "status-delivered"
                            : "status-cancelled"
                        }`}
                      >
                        {banner.active ? "Active" : "Inactive"}
                      </span>
                      <span className="text-xs text-gray-400">
                        Order: {banner.order + 1}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(banner)}
                    disabled={isEditing || isAddingNew}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Edit banner"
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
                    onClick={() => handleDeleteBanner(banner.id)}
                    disabled={isEditing || isAddingNew}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete banner"
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-blue-300 font-semibold mb-2">
              Banner Guidelines
            </h3>
            <ul className="text-blue-200 text-sm space-y-1 list-disc list-inside">
              <li>
                For best appearance, use images with 1200 × 300 pixels
                resolution (4:1 ratio)
              </li>
              <li>
                Banners will automatically create a slideshow when more than one
                is active
              </li>
              <li>Maximum of 5 banners can be added to the slideshow</li>
              <li>
                Images must be accessible via a direct URL (HTTPS recommended)
              </li>
              <li>
                Set banners as inactive rather than deleting them if you plan to
                use them again
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerManager;
