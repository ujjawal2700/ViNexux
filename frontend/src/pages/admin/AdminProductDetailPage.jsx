import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DEFAULT_QUICK_SPEC_KEYS } from "../../../../shared/productSpecifications";
import adminService from "../../services/adminService";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";
import FormField from "../../components/ui/FormField";
import FormError from "../../components/ui/FormError";
import Toast from "../../components/ui/Toast";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { SkeletonCard } from "../../components/ui/Skeleton";
import ErrorState from "../../components/ui/ErrorState";
import { getEffectiveFilterDefinitions } from "../../utils/categoryFilters";
import {
  ArrowLeft,
  Save,
  Plus,
  ImagePlus,
  Trash2,
  Tag,
  Layers,
  FolderTree,
  FileText,
  ChevronRight,
  UploadCloud,
  Check,
  Star,
  GripVertical,
  AlertCircle,
  Loader2,
  ChevronLeft,
} from "lucide-react";

const TABS = [
  {
    id: "general",
    label: "General Info",
    subtitle: "Title, brand, SKU & overview",
    icon: Tag,
  },
  {
    id: "variants",
    label: "Pricing & Media",
    subtitle: "Standard & dealer prices, gallery photos",
    icon: Layers,
  },
  {
    id: "groups",
    label: "Groups",
    subtitle: "Main & sub category hierarchy",
    icon: FolderTree,
  },
  {
    id: "specifications",
    label: "Specifications",
    subtitle: "Technical specifications & details",
    icon: FileText,
  },
];



const AdminProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isCreateMode = !id || id === "new";

  // Retain return page from location.state, query params (?returnPage=3), or sessionStorage
  const returnPage = useMemo(() => {
    const fromState = location.state?.returnPage;
    if (fromState && Number(fromState) > 0) return Number(fromState);
    const sp = new URLSearchParams(location.search);
    const fromQuery = sp.get("returnPage") || sp.get("page");
    if (fromQuery && Number(fromQuery) > 0) return Number(fromQuery);
    const fromStorage = sessionStorage.getItem("admin_products_page");
    if (fromStorage && Number(fromStorage) > 0) return Number(fromStorage);
    return null;
  }, [location.state, location.search]);

  const handleBackToProducts = useCallback(() => {
    const target = returnPage || Number(sessionStorage.getItem("admin_products_page")) || 1;
    if (target > 1) {
      navigate(`/admin/products?page=${target}`, { state: { returnPage: target } });
    } else {
      navigate("/admin/products");
    }
  }, [navigate, returnPage]);

  const [activeTab, setActiveTab] = useState("general");
  const [product, setProduct] = useState(null);
  const [categoriesList, setCategoriesList] = useState([]);
  const [brandsList, setBrandsList] = useState([]);
  const [loading, setLoading] = useState(!isCreateMode);
  const [loadError, setLoadError] = useState(null);

  // --- Form State (Only fields that exist in MongoDB Product model) ---
  // General Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [sku, setSku] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [model, setModel] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [isTrending, setIsTrending] = useState(false);
  const [variant, setVariant] = useState("");
  const [warranty, setWarranty] = useState("1 Year ON-SITE / Direct Replacement Warranty");
  const [productUrl, setProductUrl] = useState("");

  // Pricing
  const [standardPrice, setStandardPrice] = useState("");
  const [dealerPrice, setDealerPrice] = useState("");

  // Groups (Category Hierarchy)
  const [selectedHeaderId, setSelectedHeaderId] = useState("");
  const [selectedMainIds, setSelectedMainIds] = useState([]);
  const [selectedSubIds, setSelectedSubIds] = useState([]);

  // Status & Visibility
  const [status, setStatus] = useState("published"); // 'published' | 'draft'

  // Specifications
  const [specifications, setSpecifications] = useState([]);
  const [specKey, setSpecKey] = useState("");
  const [specVal, setSpecVal] = useState("");
  const [quickSpecKeys, setQuickSpecKeys] = useState(DEFAULT_QUICK_SPEC_KEYS);
  const [newQuickSpecKey, setNewQuickSpecKey] = useState("");
  const [quickSpecsLoading, setQuickSpecsLoading] = useState(true);
  const [quickSpecsSaving, setQuickSpecsSaving] = useState(false);
  const [quickSpecsError, setQuickSpecsError] = useState("");

  // Media / Images
  const [imagesList, setImagesList] = useState([]);
  const [stagedImages, setStagedImages] = useState([]);
  const stagedImagesRef = useRef([]);
  const [imageDeleteTarget, setImageDeleteTarget] = useState(null);
  const [imageDeleteLoading, setImageDeleteLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Submission & Feedback
  const [fieldErrors, setFieldErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    stagedImagesRef.current = stagedImages;
  }, [stagedImages]);

  useEffect(() => {
    return () => {
      stagedImagesRef.current.forEach(
        (img) => img.previewUrl && URL.revokeObjectURL(img.previewUrl),
      );
    };
  }, []);

  // --- Category Extraction ---
  const headerCategories = useMemo(() => {
    return categoriesList.filter((c) => !c.parentId);
  }, [categoriesList]);

  const mainCategories = useMemo(() => {
    if (!selectedHeaderId) return [];
    return categoriesList.filter((c) => {
      const pId = c.parentId?._id || c.parentId;
      return pId && String(pId) === String(selectedHeaderId);
    });
  }, [categoriesList, selectedHeaderId]);

  const subCategories = useMemo(() => {
    if (!selectedMainIds.length) return [];
    const mainIdSet = new Set(selectedMainIds.map(String));
    return categoriesList.filter((c) => {
      const pId = c.parentId?._id || c.parentId;
      return pId && mainIdSet.has(String(pId));
    });
  }, [categoriesList, selectedMainIds]);

  const selectedEffectiveCategoryId =
    selectedSubIds[0] || selectedMainIds[0] || selectedHeaderId;
  const categoryFilterDefinitions = useMemo(() => {
    const allSelectedIds = [selectedHeaderId, ...selectedMainIds, ...selectedSubIds].filter(Boolean);
    const seenKeys = new Set();
    const merged = [];
    allSelectedIds.forEach((catId) => {
      const defs = getEffectiveFilterDefinitions(categoriesList, catId);
      defs.forEach((d) => {
        const k = d.key.toLowerCase();
        if (!seenKeys.has(k)) {
          seenKeys.add(k);
          merged.push(d);
        }
      });
    });
    return merged;
  }, [categoriesList, selectedHeaderId, selectedMainIds, selectedSubIds]);
  const configuredFilterKeys = useMemo(
    () =>
      new Set(
        categoryFilterDefinitions.map((definition) =>
          definition.key.toLowerCase(),
        ),
      ),
    [categoryFilterDefinitions],
  );
  const manualSpecifications = useMemo(
    () =>
      specifications
        .map((spec, index) => ({ spec, index }))
        .filter(
          ({ spec }) => !configuredFilterKeys.has(spec.key.toLowerCase()),
        ),
    [specifications, configuredFilterKeys],
  );

  const getCategorySpecValues = (key) =>
    specifications
      .filter((spec) => spec.key.toLowerCase() === key.toLowerCase())
      .map((spec) => spec.value);

  const setCategorySpecValues = (definition, values) => {
    const cleanValues = values
      .map((value) => String(value).trim())
      .filter(Boolean);
    setSpecifications((previous) => [
      ...previous.filter(
        (spec) => spec.key.toLowerCase() !== definition.key.toLowerCase(),
      ),
      ...cleanValues.map((value) => ({ key: definition.key, value })),
    ]);
  };

  // Load all categories and brands
  const loadCategories = useCallback(async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        adminService.getCategories({
          limit: 500,
          sortBy: "sortOrder",
          sortOrder: "asc",
        }),
        adminService.getBrandsAdmin(),
      ]);
      setCategoriesList(catRes.data?.categories || []);
      setBrandsList(
        (brandRes.data?.brands || []).filter((brand) => brand.isActive),
      );
    } catch (err) {
      console.error("Failed to load categories or brands:", err);
    }
  }, []);

  // Load product if editing
  const loadProduct = useCallback(async () => {
    if (isCreateMode) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminService.getProductById(id);
      const prod = res.data;
      setProduct(prod);

      setName(prod.name || "");
      setSku(prod.sku || "");
      setDescription(prod.description || "");
      setModelNumber(prod.modelNumber || "");
      setModel(prod.model || "");
      setStockQuantity(prod.stockQuantity !== undefined ? String(prod.stockQuantity) : "0");
      setVariant(prod.variant || "");
      setWarranty(prod.warranty || "1 Year ON-SITE / Direct Replacement Warranty");
      setProductUrl(prod.productUrl || "");
      setSelectedBrandId(String(prod.brandId?._id || prod.brandId || ""));
      setStandardPrice(
        prod.standardPrice !== undefined ? String(prod.standardPrice) : "",
      );
      setDealerPrice(
        prod.dealerPrice !== undefined ? String(prod.dealerPrice) : "",
      );
      setIsTrending(Boolean(prod.isTrending));
      setStatus(prod.isActive ? "published" : "draft");
      setImagesList(prod.images || []);

      // Extract legitimate specifications only (ignoring legacy dummy fields)
      if (prod.specifications && Array.isArray(prod.specifications)) {
        const legitimateSpecs = prod.specifications.filter((sp) => {
          const keyLower = String(sp.key || "")
            .toLowerCase()
            .trim();
          return !/^(highlight|hsn|variant|stock|inventory|country of origin|warranty)/i.test(
            keyLower,
          );
        });
        setSpecifications(legitimateSpecs);
      }
    } catch (err) {
      console.error("Failed to load product:", err);
      setLoadError(
        err.response?.data?.message || "Failed to load product details",
      );
    } finally {
      setLoading(false);
    }
  }, [id, isCreateMode]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Sync category mapping once categoriesList and product are ready
  useEffect(() => {
    if (!product || categoriesList.length === 0) return;

    const rawIds = [];
    if (Array.isArray(product.categoryIds) && product.categoryIds.length > 0) {
      product.categoryIds.forEach((c) => {
        const cid = String(c?._id || c || "");
        if (cid && !rawIds.includes(cid)) rawIds.push(cid);
      });
    }
    const primaryId = String(product.categoryId?._id || product.categoryId || "");
    if (primaryId && !rawIds.includes(primaryId)) {
      rawIds.push(primaryId);
    }
    if (rawIds.length === 0) return;

    let foundHeaderId = "";
    const foundMainIds = new Set();
    const foundSubIds = new Set();

    rawIds.forEach((id) => {
      const cat = categoriesList.find((c) => String(c._id) === id);
      if (!cat) return;
      const pId = cat.parentId?._id || cat.parentId;
      if (!pId) {
        if (!foundHeaderId) foundHeaderId = String(cat._id);
      } else {
        const parentCat = categoriesList.find((c) => String(c._id) === String(pId));
        const grandParentId = parentCat?.parentId?._id || parentCat?.parentId;
        if (grandParentId) {
          foundSubIds.add(String(cat._id));
          foundMainIds.add(String(parentCat._id));
          if (!foundHeaderId) foundHeaderId = String(grandParentId);
        } else {
          foundMainIds.add(String(cat._id));
          if (!foundHeaderId) foundHeaderId = String(parentCat?._id || pId);
        }
      }
    });

    if (foundHeaderId) setSelectedHeaderId(foundHeaderId);
    setSelectedMainIds(Array.from(foundMainIds));
    setSelectedSubIds(Array.from(foundSubIds));
  }, [product, categoriesList]);

  // Category selection helpers
  const handleToggleMainCategory = (mainCatId) => {
    setSelectedMainIds((prev) => {
      const exists = prev.includes(mainCatId);
      if (exists) {
        const next = prev.filter((id) => id !== mainCatId);
        // Prune orphan sub-categories belonging to this main category
        const orphanSubIds = new Set(
          categoriesList
            .filter((c) => {
              const pId = c.parentId?._id || c.parentId;
              return pId && String(pId) === String(mainCatId);
            })
            .map((c) => String(c._id)),
        );
        setSelectedSubIds((prevSubs) =>
          prevSubs.filter((sid) => !orphanSubIds.has(String(sid))),
        );
        return next;
      } else {
        return [...prev, mainCatId];
      }
    });
  };

  const handleToggleSubCategory = (subCatId) => {
    setSelectedSubIds((prev) =>
      prev.includes(subCatId)
        ? prev.filter((id) => id !== subCatId)
        : [...prev, subCatId],
    );
  };

  const handleSelectAllMain = () => {
    setSelectedMainIds(mainCategories.map((m) => String(m._id)));
  };

  const handleClearAllMain = () => {
    setSelectedMainIds([]);
    setSelectedSubIds([]);
  };

  const handleSelectAllSub = () => {
    setSelectedSubIds(subCategories.map((s) => String(s._id)));
  };

  const handleClearAllSub = () => {
    setSelectedSubIds([]);
  };

  // Auto-generate SKU helper
  const handleAutoGenerateSku = () => {
    const selectedBrand = brandsList.find(
      (b) => String(b._id) === String(selectedBrandId),
    );
    const brandPrefix = (selectedBrand?.name || "VNX")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 3)
      .toUpperCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newSku = `${brandPrefix}-${randomSuffix}`;
    setSku(newSku);
  };

  // Add custom specification
  const handleAddSpec = () => {
    if (!specKey.trim() || !specVal.trim()) return;
    setSpecifications((prev) => [
      ...prev,
      { key: specKey.trim(), value: specVal.trim() },
    ]);
    setSpecKey("");
    setSpecVal("");
  };

  const handleRemoveSpec = (index) => {
    setSpecifications((prev) => prev.filter((_, i) => i !== index));
  };

  const loadQuickSpecs = useCallback(async () => {
    setQuickSpecsLoading(true);
    setQuickSpecsError("");
    try {
      const response = await adminService.getWebsiteSettingsAdmin();
      setQuickSpecKeys(response.data?.settings?.quickSpecKeys ?? DEFAULT_QUICK_SPEC_KEYS);
    } catch {
      setQuickSpecsError("Could not load Quick Add shortcuts. Please retry before editing them.");
    } finally {
      setQuickSpecsLoading(false);
    }
  }, []);

  useEffect(() => { loadQuickSpecs(); }, [loadQuickSpecs]);

  const saveQuickSpecs = async (keys) => {
    setQuickSpecsSaving(true);
    try {
      await adminService.updateWebsiteSettingsAdmin({ quickSpecKeys: keys });
      setQuickSpecKeys(keys);
      setNewQuickSpecKey("");
      setToast({ message: "Quick Add shortcuts saved for all admin devices.", type: "success" });
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Could not save Quick Add shortcuts.", type: "error" });
    } finally {
      setQuickSpecsSaving(false);
    }
  };

  const handleAddQuickSpec = () => {
    const key = newQuickSpecKey.trim();
    if (!key) return;
    if (quickSpecKeys.some((existing) => existing.toLowerCase() === key.toLowerCase())) {
      setToast({ message: "This Quick Add shortcut already exists.", type: "error" });
      return;
    }
    saveQuickSpecs([...quickSpecKeys, key]);
  };

  // Quick preset spec chip clicked
  const handleQuickSpecKey = (keyName) => {
    setSpecKey(keyName);
    document.getElementById("specKeyInput")?.focus();
  };

  // Staging / Adding Images
  const handleStageFile = (file) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
        file.type,
      )
    ) {
      setToast({
        message: "Only JPEG, PNG and WebP product images are allowed.",
        type: "error",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({
        message: "Product image size must be under 5MB.",
        type: "error",
      });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setStagedImages((prev) => [
      ...prev,
      { file, previewUrl, altText: name.trim() || "Product image" },
    ]);
  };

  const handleRemoveStagedImage = (index) => {
    setStagedImages((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Clear specific field error on user edit
  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Scroll smoothly to invalid element, focus it, and trigger shake animation
  const scrollToAndHighlightField = (fieldKey, tabId, errorMessage) => {
    if (errorMessage) {
      setFieldErrors((prev) => ({ ...prev, [fieldKey]: errorMessage }));
      setFormError(errorMessage);
    }
    if (tabId) {
      setActiveTab(tabId);
    }

    setTimeout(() => {
      const el =
        document.getElementById(`field-${fieldKey}`) ||
        document.querySelector(`[data-field="${fieldKey}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("error-shake-pulse");
        setTimeout(() => {
          el.classList.remove("error-shake-pulse");
        }, 1200);

        const focusable =
          el.querySelector("input, select, textarea, button") || el;
        if (focusable && typeof focusable.focus === "function") {
          focusable.focus();
        }
      }
    }, 120);
  };

  const hasTabError = (tabId) => {
    if (tabId === "general") {
      return Boolean(
        fieldErrors.name ||
        fieldErrors.brandId ||
        fieldErrors.sku ||
        fieldErrors.modelNumber ||
        fieldErrors.stockQuantity ||
        fieldErrors.productUrl
      );
    }
    if (tabId === "variants") {
      return Boolean(
        fieldErrors.standardPrice ||
        fieldErrors.dealerPrice ||
        fieldErrors.images
      );
    }
    if (tabId === "groups") {
      return Boolean(fieldErrors.headerCategory);
    }
    if (tabId === "specifications") {
      return Object.keys(fieldErrors).some((k) => k.startsWith("spec-"));
    }
    return false;
  };

  // Drag and drop reordering handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    if (isCreateMode) {
      setStagedImages((prev) => {
        const next = [...prev];
        const [moved] = next.splice(draggedIndex, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
    } else {
      setImagesList((prev) => {
        const next = [...prev];
        const [moved] = next.splice(draggedIndex, 1);
        next.splice(targetIndex, 0, moved);
        return next.map((item, idx) => ({ ...item, sortOrder: idx }));
      });
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSetPrimaryImage = (index) => {
    if (index === 0) return;
    if (isCreateMode) {
      setStagedImages((prev) => {
        const next = [...prev];
        const [moved] = next.splice(index, 1);
        next.unshift(moved);
        return next;
      });
    } else {
      setImagesList((prev) => {
        const next = [...prev];
        const [moved] = next.splice(index, 1);
        next.unshift(moved);
        return next.map((item, idx) => ({ ...item, sortOrder: idx }));
      });
    }
    setToast({ message: "Primary image updated!", type: "success" });
  };

  const handleMoveImage = (fromIndex, toIndex) => {
    if (toIndex < 0) return;
    if (isCreateMode) {
      setStagedImages((prev) => {
        if (toIndex >= prev.length) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    } else {
      setImagesList((prev) => {
        if (toIndex >= prev.length) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next.map((item, idx) => ({ ...item, sortOrder: idx }));
      });
    }
  };

  // Direct upload for edit mode
  const handleEditModeUpload = async (file) => {
    if (!file || !id) return;
    if (
      !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
        file.type,
      )
    ) {
      setToast({
        message: "Only JPEG, PNG and WebP product images are allowed.",
        type: "error",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({
        message: "Product image size must be under 5MB.",
        type: "error",
      });
      return;
    }
    clearFieldError("images");
    setImageUploading(true);
    try {
      const res = await adminService.uploadProductImage(
        id,
        file,
        name.trim() || "Product image",
      );
      const updatedImages = res.data?.images || [];
      if (updatedImages.length > 0) {
        const newest = updatedImages[updatedImages.length - 1];
        setImagesList((prev) => {
          const exists = prev.some((p) => p.publicId && p.publicId === newest.publicId);
          if (exists) return updatedImages;
          return [...prev, newest].map((img, idx) => ({ ...img, sortOrder: idx }));
        });
      } else {
        setImagesList(updatedImages);
      }
      setToast({ message: "Image uploaded successfully!", type: "success" });
    } catch (err) {
      console.error("Failed to upload image:", err);
      const errMsg =
        err.response?.data?.message || "Failed to upload image. Please try again.";
      setToast({
        message: errMsg,
        type: "error",
      });
      setFormError(errMsg);
    } finally {
      setImageUploading(false);
    }
  };

  // Delete uploaded Cloudinary image in edit mode
  const handleImageDeleteConfirm = async () => {
    if (!imageDeleteTarget || !id) return;
    setImageDeleteLoading(true);
    try {
      const res = await adminService.deleteProductImage(
        id,
        imageDeleteTarget.publicId,
      );
      setImagesList(res.data?.images || []);
      setToast({ message: "Image removed successfully", type: "success" });
      setImageDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete image:", err);
      setToast({
        message: err.response?.data?.message || "Failed to delete image",
        type: "error",
      });
    } finally {
      setImageDeleteLoading(false);
    }
  };

  const handleRemoveUrlImage = (index) => {
    setImagesList((prev) => prev.filter((_, i) => i !== index));
  };

  // --- SAVE & PUBLISH HANDLER ---
  const handleSaveAndPublish = async () => {
    setFormError("");
    setFieldErrors({});

    // 1. Validate General Info
    if (!name.trim()) {
      scrollToAndHighlightField("name", "general", "Product Title is required.");
      return;
    }
    if (name.trim().length < 2) {
      scrollToAndHighlightField("name", "general", "Product Title must be at least 2 characters.");
      return;
    }
    if (name.trim().length > 150) {
      scrollToAndHighlightField("name", "general", "Product Title cannot exceed 150 characters.");
      return;
    }

    if (!selectedBrandId) {
      scrollToAndHighlightField("brandId", "general", "Please select a Brand for this product.");
      return;
    }

    if (!sku.trim()) {
      scrollToAndHighlightField("sku", "general", "Product SKU code is required.");
      return;
    }
    if (sku.trim().length < 2) {
      scrollToAndHighlightField("sku", "general", "SKU must be at least 2 characters.");
      return;
    }
    if (sku.trim().length > 50) {
      scrollToAndHighlightField("sku", "general", "SKU cannot exceed 50 characters.");
      return;
    }

    if (!modelNumber.trim()) {
      scrollToAndHighlightField("modelNumber", "general", "Model Number is required.");
      return;
    }
    if (modelNumber.trim().length > 100) {
      scrollToAndHighlightField("modelNumber", "general", "Model Number cannot exceed 100 characters.");
      return;
    }

    if (
      stockQuantity === "" ||
      isNaN(Number(stockQuantity)) ||
      Number(stockQuantity) < 0
    ) {
      scrollToAndHighlightField(
        "stockQuantity",
        "general",
        "Stock Quantity is required and must be 0 or greater."
      );
      return;
    }

    if (productUrl.trim()) {
      let cleanUrl = productUrl.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cleanUrl)) {
          cleanUrl = `https://${cleanUrl}`;
          setProductUrl(cleanUrl);
        } else {
          scrollToAndHighlightField(
            "productUrl",
            "general",
            "Product URL must start with http:// or https://"
          );
          return;
        }
      }
    }

    // 2. Validate Pricing & Media
    const sPrice = Number(standardPrice);
    if (standardPrice === "" || isNaN(sPrice) || sPrice < 0) {
      scrollToAndHighlightField(
        "standardPrice",
        "variants",
        "Please enter a valid Standard Retail Price (₹ 0 or greater)."
      );
      return;
    }

    const dPrice = Number(dealerPrice);
    if (dealerPrice === "" || isNaN(dPrice) || dPrice < 0) {
      scrollToAndHighlightField(
        "dealerPrice",
        "variants",
        "Please enter a valid Wholesale Dealer Price (₹ 0 or greater)."
      );
      return;
    }

    const totalImagesCount = isCreateMode
      ? imagesList.length + stagedImages.length
      : imagesList.length;
    if (totalImagesCount === 0) {
      scrollToAndHighlightField(
        "images",
        "variants",
        "Please upload at least one product image."
      );
      return;
    }

    // 3. Validate Category Hierarchy
    if (isCreateMode && !selectedHeaderId) {
      scrollToAndHighlightField(
        "headerCategory",
        "groups",
        "Please select a Header Category in the Groups card."
      );
      return;
    }

    // 4. Validate Category Required Specifications
    const missingFilter = categoryFilterDefinitions.find(
      (definition) =>
        definition.isRequired &&
        getCategorySpecValues(definition.key).length === 0,
    );
    if (missingFilter) {
      scrollToAndHighlightField(
        `spec-${missingFilter.key}`,
        "specifications",
        `Please enter ${missingFilter.label || missingFilter.key} (Required for this category).`
      );
      return;
    }

    setFormSubmitting(true);
    try {
      // Assemble only legitimate specifications from state
      const allSpecs = specifications
        .map((s) => ({
          key: String(s.key || "").trim(),
          value: String(s.value || "").trim(),
        }))
        .filter((s) => s.key && s.value);

      const allCategoryIds = [
        selectedHeaderId,
        ...selectedMainIds,
        ...selectedSubIds,
      ].filter(Boolean);
      const primaryCategoryId =
        selectedSubIds[0] ||
        selectedMainIds[0] ||
        selectedHeaderId ||
        undefined;

      const payload = {
        name: name.trim(),
        modelNumber: modelNumber.trim(),
        model: model.trim() || "Standard Model",
        isTrending,
        stockQuantity: Number(stockQuantity) >= 0 ? Number(stockQuantity) : 0,
        variant: variant.trim(),
        warranty: warranty.trim(),
        productUrl: productUrl.trim(),
        sku: sku.trim().toUpperCase(),
        ...(primaryCategoryId ? { categoryId: primaryCategoryId } : {}),
        categoryIds: allCategoryIds,
        brandId: selectedBrandId || undefined,
        description: description.trim() || undefined,
        standardPrice: sPrice,
        dealerPrice: dPrice,
        isActive: isCreateMode ? false : status === "published",
        specifications: allSpecs,
        images: imagesList.map((img, i) => ({
          url: img.url,
          ...(img.publicId ? { publicId: img.publicId } : {}),
          altText: img.altText || name.trim(),
          sortOrder: i,
        })),
      };

      if (isCreateMode) {
        const res = await adminService.createProduct(payload);
        const newId = res.data?._id;

        // Upload any staged files in order
        if (newId && stagedImages.length > 0) {
          for (const staged of stagedImages) {
            await adminService.uploadProductImage(
              newId,
              staged.file,
              staged.altText || name,
            );
          }
        }

        if (!newId) throw new Error("Product was created without an ID.");
        await adminService.updateProduct(newId, {
          isActive: status === "published",
        });

        setToast({
          message: "Product created and published successfully!",
          type: "success",
        });
        setTimeout(() => {
          handleBackToProducts();
        }, 1200);
      } else {
        await adminService.updateProduct(id, payload);
        setToast({
          message: "Product updated and published successfully!",
          type: "success",
        });
        loadProduct();
      }
    } catch (err) {
      console.error("Failed to save product:", err);
      const data = err.response?.data;
      const errMsg =
        data?.message ||
        data?.errors?.[0]?.message ||
        data?.details?.[0]?.message ||
        "Failed to save product. Please verify all fields and try again.";
      setFormError(errMsg);
      setToast({ message: errMsg, type: "error" });

      // Automatically map server error to the exact field and scroll to it
      const details = data?.details || data?.error?.details || [];
      let mapped = false;

      for (const item of details) {
        const path = String(item.path || "").toLowerCase();
        if (path.includes("sku")) {
          scrollToAndHighlightField("sku", "general", item.message);
          mapped = true;
          break;
        }
        if (path.includes("modelnumber")) {
          scrollToAndHighlightField("modelNumber", "general", item.message);
          mapped = true;
          break;
        }
        if (path.includes("brandid") || path.includes("brand")) {
          scrollToAndHighlightField("brandId", "general", item.message);
          mapped = true;
          break;
        }
        if (path.includes("name")) {
          scrollToAndHighlightField("name", "general", item.message);
          mapped = true;
          break;
        }
        if (path.includes("stock")) {
          scrollToAndHighlightField("stockQuantity", "general", item.message);
          mapped = true;
          break;
        }
        if (path.includes("url")) {
          scrollToAndHighlightField("productUrl", "general", item.message);
          mapped = true;
          break;
        }
        if (path.includes("standardprice")) {
          scrollToAndHighlightField("standardPrice", "variants", item.message);
          mapped = true;
          break;
        }
        if (path.includes("dealerprice")) {
          scrollToAndHighlightField("dealerPrice", "variants", item.message);
          mapped = true;
          break;
        }
        if (path.includes("image")) {
          scrollToAndHighlightField("images", "variants", item.message);
          mapped = true;
          break;
        }
        if (path.includes("category")) {
          scrollToAndHighlightField("headerCategory", "groups", item.message);
          mapped = true;
          break;
        }
      }

      if (!mapped) {
        const msgLower = errMsg.toLowerCase();
        if (msgLower.includes("sku")) {
          scrollToAndHighlightField("sku", "general", errMsg);
        } else if (
          msgLower.includes("model number") ||
          msgLower.includes("modelnumber")
        ) {
          scrollToAndHighlightField("modelNumber", "general", errMsg);
        } else if (msgLower.includes("brand")) {
          scrollToAndHighlightField("brandId", "general", errMsg);
        } else if (
          msgLower.includes("title") ||
          msgLower.includes("product name")
        ) {
          scrollToAndHighlightField("name", "general", errMsg);
        } else if (msgLower.includes("price")) {
          scrollToAndHighlightField("standardPrice", "variants", errMsg);
        } else if (msgLower.includes("image")) {
          scrollToAndHighlightField("images", "variants", errMsg);
        } else if (msgLower.includes("category")) {
          scrollToAndHighlightField("headerCategory", "groups", errMsg);
        } else if (
          msgLower.includes("specification") ||
          msgLower.includes("required for this category")
        ) {
          setActiveTab("specifications");
        }
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Loading skeleton state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 animate-pulse rounded-xl w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <SkeletonCard className="h-64" />
          </div>
          <div className="lg:col-span-9 space-y-4">
            <SkeletonCard className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  // Load error state
  if (loadError) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={handleBackToProducts}
          leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Products
        </Button>
        <ErrorState
          title="Failed to Load Product"
          description={loadError}
          onRetry={loadProduct}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Bar with Navigation & Actions */}
      <div className="bg-white border border-[#f0e6e8] rounded-2xl p-4 md:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackToProducts}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#800020] transition-colors bg-gray-50 hover:bg-[#fdf2f4] px-3 py-2 rounded-xl border border-gray-200 cursor-pointer">
            <ArrowLeft className="w-4 h-4 text-[#800020]" />
            <span>Back to Products</span>
          </button>
          <div className="h-5 w-px bg-gray-200 hidden sm:block" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex flex-wrap items-center gap-2">
              <span>{isCreateMode ? "Add New Product" : "Edit Product"}</span>
              {sku && (
                <span className="text-xs font-bold text-[#800020] bg-[#fdf2f4] px-2 py-0.5 rounded-md">
                  ({sku})
                </span>
              )}
              {!isCreateMode && name.trim() && (
                <span className="max-w-[min(56vw,42rem)] truncate text-xs font-semibold text-gray-700 sm:text-sm" title={name.trim()}>
                  — {name.trim()}
                </span>
              )}
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">
              Configure product information card-by-card, then Save & Publish
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleBackToProducts}
            disabled={formSubmitting}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold px-4 text-xs h-10">
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSaveAndPublish}
            isLoading={formSubmitting}
            leftIcon={<Save className="w-4 h-4" />}
            className="bg-[#800020] hover:bg-[#68001a] text-white font-bold px-6 text-xs h-10 shadow-sm">
            Save & Publish
          </Button>
        </div>
      </div>

      {formError && <FormError message={formError} />}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Navigation Tabs & Status Card (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Vertical Navigation Tabs */}
          <div className="bg-white border border-[#f0e6e8] rounded-2xl p-2.5 shadow-xs space-y-1.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const hasError = hasTabError(tab.id);
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all text-xs font-bold ${
                    isActive
                      ? "bg-[#fdf2f4] text-[#800020] border border-[#f5d6dc] shadow-xs"
                      : hasError
                      ? "bg-rose-50 text-rose-800 border border-rose-300"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
                  }`}>
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isActive
                        ? "bg-[#800020] text-white"
                        : hasError
                        ? "bg-rose-600 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs">{tab.label}</span>
                      {hasError && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white animate-pulse">
                          Error
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 font-normal truncate">
                      {tab.subtitle}
                    </div>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-[#800020] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Status & Visibility Card */}
          <div className="bg-white border border-[#f0e6e8] rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-[#800020] block mb-2">
                Status
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: 'published', label: 'PUBLISHED' },
                  { value: 'draft', label: 'DRAFT / INACTIVE' },
                ]}
              />
              <p className="text-[10px] text-gray-500 mt-1.5">
                {status === "published"
                  ? "Active in catalog and visible for order inquiries"
                  : "Hidden from public storefront"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Active Card Content (9 cols) */}
        <div className="lg:col-span-9">
          {/* TAB 1: GENERAL INFO */}
          {activeTab === "general" && (
            <div className="bg-white border border-[#f0e6e8] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#800020]" />
                  General Information
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Basic title, brand identity, and catalog identifiers
                </p>
              </div>

              {/* Product Title */}
              <div id="field-name" data-field="name" className="rounded-xl transition-all">
                <FormField
                  label="PRODUCT TITLE"
                  required
                  error={fieldErrors.name}
                  helperText="Full official name of the product">
                  <Input
                    value={name}
                    error={Boolean(fieldErrors.name)}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError("name");
                    }}
                    placeholder="e.g. ASUS ROG Strix G16 Gaming Laptop, Dahua 4K IP Bullet Camera..."
                    required
                    className="text-sm font-medium"
                  />
                </FormField>
              </div>

              {/* Description */}
              <FormField
                label="KEY FEATURES"
                helperText="Provide key features, tech overview, capabilities and highlights">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe key features, item specifications, overview and highlights here..."
                  rows={4}
                  className="text-sm"
                />
              </FormField>

              {/* Brand & SKU Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="field-brandId" data-field="brandId" className="rounded-xl transition-all">
                  <FormField
                    label="BRAND"
                    required
                    error={fieldErrors.brandId}
                    helperText="Managed in Admin → Brand Management">
                    <Select
                      value={selectedBrandId}
                      error={Boolean(fieldErrors.brandId)}
                      onChange={(e) => {
                        setSelectedBrandId(e.target.value);
                        clearFieldError("brandId");
                      }}
                      placeholder="Select a brand"
                      options={brandsList.map((brand) => ({
                        value: brand._id,
                        label: brand.name,
                      }))}
                      required
                    />
                  </FormField>
                </div>

                <div id="field-sku" data-field="sku" className="rounded-xl transition-all">
                  <FormField
                    label="PRODUCT CODE (SKU)"
                    required
                    error={fieldErrors.sku}
                    helperText="Unique inventory code">
                    <div className="flex gap-2">
                      <Input
                        value={sku}
                        error={Boolean(fieldErrors.sku)}
                        onChange={(e) => {
                          setSku(e.target.value.toUpperCase());
                          clearFieldError("sku");
                        }}
                        placeholder="e.g. ROG-G16-RXG20"
                        required
                        className="font-mono uppercase font-bold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAutoGenerateSku}
                        className="text-[11px] font-bold shrink-0 border-gray-300"
                        title="Auto-generate SKU">
                        Auto-Code
                      </Button>
                    </div>
                  </FormField>
                </div>
              </div>

              {/* Hardware Spec Attributes Grid (Only DB fields) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                <div id="field-modelNumber" data-field="modelNumber" className="rounded-xl transition-all">
                  <FormField
                    label="MODEL NUMBER"
                    required
                    error={fieldErrors.modelNumber}
                    helperText="Unique model identifier">
                    <Input
                      value={modelNumber}
                      error={Boolean(fieldErrors.modelNumber)}
                      onChange={(e) => {
                        setModelNumber(e.target.value);
                        clearFieldError("modelNumber");
                      }}
                      placeholder="e.g. VNX-G614JU-N3193WS"
                      required
                    />
                  </FormField>
                </div>

                <FormField label="MODEL (OPTIONAL)" helperText="Specific model line">
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. ROG Strix G16"
                  />
                </FormField>

                <div id="field-stockQuantity" data-field="stockQuantity" className="rounded-xl transition-all">
                  <FormField
                    label="STOCK QUANTITY"
                    required
                    error={fieldErrors.stockQuantity}
                    helperText="Current available units (Required)">
                    <Input
                      type="number"
                      min="0"
                      value={stockQuantity}
                      error={Boolean(fieldErrors.stockQuantity)}
                      onChange={(e) => {
                        setStockQuantity(e.target.value);
                        clearFieldError("stockQuantity");
                      }}
                      placeholder="e.g. 25"
                      required
                    />
                  </FormField>
                </div>

                <FormField label="VARIANT (OPTIONAL)" helperText="e.g. 16GB RAM | 512GB SSD">
                  <Input
                    value={variant}
                    onChange={(e) => setVariant(e.target.value)}
                    placeholder="e.g. 16GB / 512GB NVMe SSD"
                  />
                </FormField>

                <FormField label="WARRANTY (OPTIONAL)" helperText="Warranty terms & conditions">
                  <Input
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    placeholder="e.g. 1 Year ON-SITE / Direct Replacement Warranty"
                  />
                </FormField>

                <div id="field-productUrl" data-field="productUrl" className="rounded-xl transition-all">
                  <FormField
                    label="PRODUCT URL (OPTIONAL)"
                    error={fieldErrors.productUrl}
                    helperText="Brand official page">
                    <Input
                      type="url"
                      value={productUrl}
                      error={Boolean(fieldErrors.productUrl)}
                      onChange={(e) => {
                        setProductUrl(e.target.value);
                        clearFieldError("productUrl");
                      }}
                      placeholder="https://brand.com/products/model"
                    />
                  </FormField>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm">
                <input type="checkbox" checked={isTrending} onChange={e => setIsTrending(e.target.checked)} className="h-4 w-4 accent-primary" />
                <span><span className="font-semibold">Trending product</span><span className="mt-0.5 block text-xs text-muted-foreground">Show this product in the storefront Trending filter.</span></span>
              </label>

              {/* Bottom Nav Bar */}
              <div className="flex justify-end pt-4 border-t border-[#f0e6e8]">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActiveTab("variants")}
                  className="bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold px-6">
                  Next: Pricing & Media →
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: PRICING & MEDIA */}
          {activeTab === "variants" && (
            <div className="bg-white border border-[#f0e6e8] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#800020]" />
                  Product Pricing & Media
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set standard retail and wholesale dealer pricing, and manage
                  product gallery photos.
                </p>
              </div>

              {/* Clean 2-Column Pricing Grid matching DB Schema */}
              <div className="bg-[#fdfbfb] p-5 rounded-xl border border-[#f0e6e8] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div id="field-standardPrice" data-field="standardPrice" className="rounded-xl transition-all">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-700 block mb-1.5">
                      Standard Retail Price (₹) *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={standardPrice}
                      error={Boolean(fieldErrors.standardPrice)}
                      onChange={(e) => {
                        setStandardPrice(e.target.value);
                        clearFieldError("standardPrice");
                      }}
                      placeholder="e.g. 50000"
                      required
                      className="text-sm font-bold"
                    />
                    {fieldErrors.standardPrice ? (
                      <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {fieldErrors.standardPrice}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400 mt-1">
                        Default public retail price
                      </p>
                    )}
                  </div>

                  <div id="field-dealerPrice" data-field="dealerPrice" className="rounded-xl transition-all">
                    <label className="text-xs font-black uppercase tracking-wider text-emerald-700 block mb-1.5">
                      Wholesale Dealer Price (₹) *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={dealerPrice}
                      error={Boolean(fieldErrors.dealerPrice)}
                      onChange={(e) => {
                        setDealerPrice(e.target.value);
                        clearFieldError("dealerPrice");
                      }}
                      placeholder="e.g. 42000"
                      required
                      className="text-sm font-extrabold text-emerald-700 bg-emerald-50/40 border-emerald-200"
                    />
                    {fieldErrors.dealerPrice ? (
                      <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {fieldErrors.dealerPrice}
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-600 mt-1">
                        Special price for verified B2B dealers
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Media Images Upload Section */}
              <div id="field-images" data-field="images" className="space-y-4 pt-2 rounded-xl transition-all p-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                      <span>Product Gallery Images ({isCreateMode ? stagedImages.length : imagesList.length})</span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Front Image = Primary
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Drag and drop to rearrange photo display order. The 1st front image is automatically designated as the Primary image.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="variant-file-input"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (!files.length) return;
                        clearFieldError("images");
                        if (isCreateMode) {
                          files.forEach(handleStageFile);
                        } else {
                          for (const file of files) {
                            await handleEditModeUpload(file);
                          }
                        }
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById("variant-file-input")?.click()
                      }
                      isLoading={imageUploading}
                      leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                      className="text-xs border-gray-300 font-bold">
                      Browse Files
                    </Button>
                  </div>
                </div>

                {fieldErrors.images && (
                  <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-bold animate-pulse">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{fieldErrors.images}</span>
                  </div>
                )}

                {/* Draggable & Sortable Visual Image Gallery */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  {(isCreateMode ? stagedImages : imagesList).map((img, idx) => {
                    const src = img.previewUrl || img.url;
                    const isStaged = Boolean(img.file);
                    const isDraggingThis = draggedIndex === idx;
                    const isDragOverThis = dragOverIndex === idx;
                    const isPrimary = idx === 0;

                    return (
                      <div
                        key={img.publicId || img.previewUrl || idx}
                        draggable={!imageUploading}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`group relative rounded-xl overflow-hidden aspect-square flex items-center justify-center shadow-xs transition-all select-none cursor-grab active:cursor-grabbing ${
                          isDraggingThis
                            ? "opacity-40 scale-95 border-2 border-dashed border-[#800020] bg-[#fdf2f4]"
                            : isDragOverThis
                            ? "border-2 border-[#800020] bg-[#fdf2f4]/60 scale-105 shadow-md ring-2 ring-[#800020]/30"
                            : isPrimary
                            ? "border-2 border-amber-400 bg-amber-50/20 shadow-xs"
                            : "border border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`}>
                        <img
                          src={src}
                          alt={img.altText || `Product Image ${idx + 1}`}
                          className="w-full h-full object-cover pointer-events-none"
                        />

                        {/* Primary Badge or Position Number */}
                        {isPrimary ? (
                          <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md bg-[#800020] text-white text-[9px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                            Primary
                          </span>
                        ) : (
                          <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold backdrop-blur-xs">
                            #{idx + 1}
                          </span>
                        )}

                        {/* Drag Handle Indicator */}
                        <div
                          className="absolute top-2 right-8 z-10 p-1 bg-black/50 hover:bg-black/75 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                          title="Drag to rearrange order">
                          <GripVertical className="w-3 h-3" />
                        </div>

                        {/* Remove Image Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isStaged) {
                              const stagedIndex = stagedImages.findIndex(
                                (s) => s.previewUrl === img.previewUrl,
                              );
                              handleRemoveStagedImage(stagedIndex >= 0 ? stagedIndex : idx);
                            } else if (img.publicId) {
                              setImageDeleteTarget(img);
                            } else {
                              handleRemoveUrlImage(idx);
                            }
                          }}
                          className="absolute top-2 right-2 z-10 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                          title="Remove Image">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Hover Actions: Quick Set Primary & Shift Arrows */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-1.5 pt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetPrimaryImage(idx);
                              }}
                              className="text-[9px] font-bold bg-white text-[#800020] hover:bg-amber-100 px-1.5 py-0.5 rounded shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Make this the Primary Storefront Image">
                              <Star className="w-2.5 h-2.5 fill-[#800020]" />
                              Primary
                            </button>
                          )}
                          <div className="flex items-center gap-1 ml-auto">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveImage(idx, idx - 1);
                                }}
                                className="p-0.5 bg-white/80 hover:bg-white text-gray-800 rounded transition-colors cursor-pointer"
                                title="Move Left">
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            )}
                            {idx < (isCreateMode ? stagedImages.length : imagesList.length) - 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveImage(idx, idx + 1);
                                }}
                                className="p-0.5 bg-white/80 hover:bg-white text-gray-800 rounded transition-colors cursor-pointer"
                                title="Move Right">
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Uploading Placeholder Tile */}
                  {imageUploading && (
                    <div className="rounded-xl border-2 border-[#800020] border-dashed bg-[#fdf2f4]/60 aspect-square flex flex-col items-center justify-center p-3 text-center gap-2 animate-pulse">
                      <Loader2 className="w-6 h-6 text-[#800020] animate-spin" />
                      <span className="text-[10px] font-bold text-[#800020]">Uploading...</span>
                    </div>
                  )}

                  {/* Empty Slot Placeholder Tiles (up to 7) */}
                  {Array.from({
                    length: Math.max(
                      0,
                      7 - ((isCreateMode ? stagedImages.length : imagesList.length) + (imageUploading ? 1 : 0)),
                    ),
                  }).map((_, slotIdx) => (
                    <button
                      key={slotIdx}
                      type="button"
                      onClick={() =>
                        document.getElementById("variant-file-input")?.click()
                      }
                      className="rounded-xl border-2 border-dashed border-gray-300 hover:border-[#800020] hover:bg-[#fdf2f4]/30 transition-all aspect-square flex flex-col items-center justify-center p-3 text-center gap-1.5 group cursor-pointer">
                      <ImagePlus className="w-6 h-6 text-gray-400 group-hover:text-[#800020] transition-colors" />
                      <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#800020]">
                        Add Image
                      </span>
                    </button>
                  ))}

                  {/* Additional slot when at least 7 images are uploaded */}
                  {(isCreateMode ? stagedImages.length : imagesList.length) >= 7 && (
                    <button
                      type="button"
                      onClick={() =>
                        document.getElementById("variant-file-input")?.click()
                      }
                      className="rounded-xl border-2 border-dashed border-gray-300 hover:border-[#800020] hover:bg-[#fdf2f4]/30 transition-all aspect-square flex flex-col items-center justify-center p-3 text-center gap-1.5 group cursor-pointer"
                      title="Add another photo">
                      <ImagePlus className="w-6 h-6 text-gray-400 group-hover:text-[#800020] transition-colors" />
                      <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#800020]">
                        Add More
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Nav Bar */}
              <div className="flex justify-between pt-4 border-t border-[#f0e6e8]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("general")}
                  className="text-xs font-semibold">
                  ← Back: General Info
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActiveTab("groups")}
                  className="bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold px-6">
                  Next: Groups →
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: GROUPS (Category Hierarchy) */}
          {activeTab === "groups" && (
            <div className="bg-white border border-[#f0e6e8] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-[#800020]" />
                  Category Hierarchy & Groups
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isCreateMode
                    ? "Select a Header Category. Main and Sub Categories are optional."
                    : "Category assignment is optional. You can assign or change it here at any time."}
                </p>
              </div>

              {/* 3-tier selection */}
              <div className="space-y-6">
                {/* 1. HEADER CATEGORY (Strictly Single-Select) */}
                <div id="field-headerCategory" data-field="headerCategory" className="bg-[#fdf9f9] border border-[#f5d6dc] rounded-xl p-4 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-800">
                      {isCreateMode ? "1. HEADER CATEGORY *" : "1. HEADER CATEGORY (OPTIONAL)"}
                    </label>
                    <span className="text-[11px] font-semibold text-[#800020] bg-white px-2 py-0.5 rounded-full border border-[#f5d6dc]">
                      Strictly 1 Category
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    {isCreateMode
                      ? "Top-level parent category (e.g. Laptop, Desktop, Storage). Products can only belong to one header category."
                      : "Leave unassigned until this product is ready for catalog placement."}
                  </p>
                  <Select
                    value={selectedHeaderId}
                    error={Boolean(fieldErrors.headerCategory)}
                    onChange={(e) => {
                      setSelectedHeaderId(e.target.value);
                      setSelectedMainIds([]);
                      setSelectedSubIds([]);
                      clearFieldError("headerCategory");
                    }}
                    placeholder="Select Header Category"
                    options={[
                      {
                        value: "",
                        label: isCreateMode ? "Select Header Category" : "None / Unassigned",
                      },
                      ...headerCategories.map((h) => ({
                        value: h._id,
                        label: `${h.name} (Header)`,
                      })),
                    ]}
                    required={isCreateMode}
                    className="font-semibold text-xs"
                  />
                  {fieldErrors.headerCategory && (
                    <p className="text-xs text-rose-600 font-bold mt-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {fieldErrors.headerCategory}
                    </p>
                  )}
                </div>

                {/* 2. MAIN CATEGORIES (Multi-Select) */}
                <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-2">
                        <span>2. MAIN CATEGORIES</span>
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Multi-Select Allowed
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Choose one or more main categories under this header. Leave unselected to assign directly to Header Category.
                      </p>
                    </div>

                    {selectedHeaderId && mainCategories.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                          {selectedMainIds.length} of {mainCategories.length} selected
                        </span>
                        <button
                          type="button"
                          onClick={handleSelectAllMain}
                          className="text-xs text-[#800020] hover:underline font-semibold px-1 py-0.5">
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={handleClearAllMain}
                          className="text-xs text-gray-500 hover:underline font-semibold px-1 py-0.5">
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {!selectedHeaderId ? (
                    <div className="p-3 bg-white rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 italic">
                      Please select a Header Category above to view and assign Main Categories.
                    </div>
                  ) : mainCategories.length === 0 ? (
                    <div className="p-3 bg-white rounded-lg border border-dashed border-gray-300 text-xs text-gray-500">
                      No main categories found under this header category. The product will belong directly to the Header Category.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {mainCategories.map((m) => {
                        const isChecked = selectedMainIds.includes(String(m._id));
                        return (
                          <button
                            key={m._id}
                            type="button"
                            onClick={() => handleToggleMainCategory(String(m._id))}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left ${
                              isChecked
                                ? "bg-[#800020] text-white border-[#800020] shadow-xs"
                                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}>
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                isChecked
                                  ? "bg-white text-[#800020] border-white"
                                  : "bg-white border-gray-300 text-transparent"
                              }`}>
                              {isChecked ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                            </div>
                            <span className="truncate">{m.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. SUB CATEGORIES (Multi-Select) */}
                <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-2">
                        <span>3. SUB CATEGORIES (OPTIONAL)</span>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Multi-Select Allowed
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Choose sub-categories belonging to your chosen main categories. Leave unselected to assign directly to Main Category.
                      </p>
                    </div>

                    {selectedMainIds.length > 0 && subCategories.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                          {selectedSubIds.length} of {subCategories.length} selected
                        </span>
                        <button
                          type="button"
                          onClick={handleSelectAllSub}
                          className="text-xs text-[#800020] hover:underline font-semibold px-1 py-0.5">
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={handleClearAllSub}
                          className="text-xs text-gray-500 hover:underline font-semibold px-1 py-0.5">
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedMainIds.length === 0 ? (
                    <div className="p-3 bg-white rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 italic">
                      Select at least one Main Category above to view available Sub-Categories.
                    </div>
                  ) : subCategories.length === 0 ? (
                    <div className="p-3 bg-white rounded-lg border border-dashed border-gray-300 text-xs text-gray-500">
                      No sub-categories available under the selected Main Categories. The product will belong directly to the selected Main Categories.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {subCategories.map((s) => {
                        const isChecked = selectedSubIds.includes(String(s._id));
                        const parentMainCat = categoriesList.find(
                          (c) => String(c._id) === String(s.parentId?._id || s.parentId),
                        );
                        return (
                          <button
                            key={s._id}
                            type="button"
                            onClick={() => handleToggleSubCategory(String(s._id))}
                            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left ${
                              isChecked
                                ? "bg-[#800020] text-white border-[#800020] shadow-xs"
                                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}>
                            <div className="flex items-center gap-2.5 truncate">
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                  isChecked
                                    ? "bg-white text-[#800020] border-white"
                                    : "bg-white border-gray-300 text-transparent"
                                }`}>
                                {isChecked ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                              </div>
                              <span className="truncate">{s.name}</span>
                            </div>
                            {parentMainCat && selectedMainIds.length > 1 && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                                  isChecked
                                    ? "bg-white/20 text-white"
                                    : "bg-gray-100 text-gray-500"
                                }`}>
                                {parentMainCat.name}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Visual Placement Feedback */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                  <span className="font-bold text-gray-700 block">
                    Catalog Placement Summary:
                  </span>
                  {selectedEffectiveCategoryId ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                          Header:
                        </span>
                        <span className="bg-[#800020] text-white px-2.5 py-1 rounded-md font-semibold text-xs shadow-xs">
                          {headerCategories.find(
                            (h) => String(h._id) === String(selectedHeaderId),
                          )?.name || "Header"}
                        </span>
                      </div>

                      {selectedMainIds.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                            Main ({selectedMainIds.length}):
                          </span>
                          {selectedMainIds.map((mid) => {
                            const mCat = mainCategories.find(
                              (m) => String(m._id) === String(mid),
                            );
                            return (
                              <span
                                key={mid}
                                className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-xs font-semibold">
                                {mCat?.name || mid}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {selectedSubIds.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                            Sub ({selectedSubIds.length}):
                          </span>
                          {selectedSubIds.map((sid) => {
                            const sCat = subCategories.find(
                              (s) => String(s._id) === String(sid),
                            );
                            return (
                              <span
                                key={sid}
                                className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-xs font-semibold">
                                {sCat?.name || sid}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs italic block">
                      {isCreateMode
                        ? "Please select a Header Category to establish catalog placement."
                        : "No category assigned. You can add one later."}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Nav Bar */}
              <div className="flex justify-between pt-4 border-t border-[#f0e6e8]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("variants")}
                  className="text-xs font-semibold">
                  ← Back: Pricing & Media
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActiveTab("specifications")}
                  className="bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold px-6">
                  Next: Specifications →
                </Button>
              </div>
            </div>
          )}

          {/* TAB 4: SPECIFICATIONS */}
          {activeTab === "specifications" && (
            <div className="bg-white border border-[#f0e6e8] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#800020]" />
                  Product Specifications
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure technical hardware specifications and
                  category-specific attributes.
                </p>
              </div>

              {/* Category-specific specifications (if defined for the category) */}
              {categoryFilterDefinitions.length > 0 && (
                <div className="space-y-3 rounded-xl border border-[#e7d5da] bg-[#fdfbfb] p-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                      Category-Specific Specifications
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      These attributes are defined for the selected category and
                      power storefront filters.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {categoryFilterDefinitions.map((definition) => {
                      const values = getCategorySpecValues(definition.key);
                      const label = `${definition.label || definition.key}${definition.unit ? ` (${definition.unit})` : ""}`;
                      const specError = fieldErrors[`spec-${definition.key}`];
                      return (
                        <div
                          key={definition.key}
                          id={`field-spec-${definition.key}`}
                          data-field={`spec-${definition.key}`}
                          className="space-y-1.5 rounded-xl transition-all p-1">
                          <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                            <span>
                              {label}
                              {definition.isRequired ? " *" : ""}
                            </span>
                            {specError && (
                              <span className="text-[10px] text-rose-600 font-bold">Required</span>
                            )}
                          </label>
                          {definition.inputType === "multi-select" ? (
                            <div className={`flex flex-wrap gap-2 rounded-lg border bg-white p-2 ${
                              specError ? "border-rose-500 ring-1 ring-rose-500/30" : "border-gray-200"
                            }`}>
                              {(definition.options || []).map((option) => (
                                <label
                                  key={option}
                                  className="flex items-center gap-1.5 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={values.includes(option)}
                                    onChange={(event) => {
                                      setCategorySpecValues(
                                        definition,
                                        event.target.checked
                                          ? [...values, option]
                                          : values.filter(
                                              (value) => value !== option,
                                            ),
                                      );
                                      clearFieldError(`spec-${definition.key}`);
                                    }}
                                  />{" "}
                                  {option}
                                </label>
                              ))}
                            </div>
                          ) : definition.inputType === "select" ||
                            definition.inputType === "boolean" ? (
                            <select
                              className={`w-full rounded-lg border bg-white px-3 py-2 text-xs ${
                                specError ? "border-rose-500 ring-1 ring-rose-500/30" : "border-gray-300"
                              }`}
                              value={values[0] || ""}
                              onChange={(event) => {
                                setCategorySpecValues(definition, [
                                  event.target.value,
                                ]);
                                clearFieldError(`spec-${definition.key}`);
                              }}>
                              <option value="">
                                Select {definition.label || definition.key}
                              </option>
                              {(definition.inputType === "boolean"
                                ? ["Yes", "No"]
                                : definition.options || []
                              ).map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              type={
                                definition.inputType === "number"
                                  ? "number"
                                  : "text"
                              }
                              value={values[0] || ""}
                              error={Boolean(specError)}
                              onChange={(event) => {
                                setCategorySpecValues(definition, [
                                  event.target.value,
                                ]);
                                clearFieldError(`spec-${definition.key}`);
                              }}
                              placeholder={`Enter ${definition.label || definition.key}`}
                              className="text-xs"
                            />
                          )}
                          {specError && (
                            <p className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {specError}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Manual Technical Specifications Section */}
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    Technical Specifications ({manualSpecifications.length})
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Add custom technical specifications (Processor, RAM,
                    Storage, Resolution, Ports, Power, etc.)
                  </p>
                </div>

                {/* Shared Quick Add shortcuts; removing one leaves product specifications intact. */}
                <div className="space-y-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Quick Add:</span>
                    {quickSpecsLoading ? <span className="text-xs text-gray-500" role="status">Loading shortcuts…</span> : quickSpecKeys.map((key) => (
                      <div key={key} className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xs">
                        <button type="button" onClick={() => handleQuickSpecKey(key)}
                          className="text-[10px] font-semibold px-2.5 py-1 hover:bg-[#800020] hover:text-white text-gray-700 transition-colors cursor-pointer">
                          + {key}
                        </button>
                        <button type="button" aria-label={`Delete ${key} shortcut`}
                          disabled={quickSpecsSaving || Boolean(quickSpecsError)}
                          onClick={() => saveQuickSpecs(quickSpecKeys.filter((item) => item !== key))}
                          className="px-1.5 border-l border-gray-200 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1">
                      <Input label="New Quick Add shortcut" value={newQuickSpecKey} maxLength={80}
                        isDisabled={quickSpecsLoading || quickSpecsSaving || Boolean(quickSpecsError)}
                        onChange={(event) => setNewQuickSpecKey(event.target.value)}
                        placeholder="e.g. Refresh Rate"
                        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleAddQuickSpec(); } }} />
                    </div>
                    <Button type="button" variant="outline" onClick={handleAddQuickSpec}
                      disabled={!newQuickSpecKey.trim() || quickSpecsLoading || quickSpecsSaving || Boolean(quickSpecsError) || quickSpecKeys.length >= 100}
                      isLoading={quickSpecsSaving}><Plus className="w-3.5 h-3.5 mr-1" />Add Shortcut</Button>
                  </div>
                  <p className="text-[11px] text-gray-500">Shortcuts are shared across products. Deleting a shortcut keeps existing product specifications.</p>
                  {quickSpecsError && <div className="text-xs text-rose-600" role="alert">{quickSpecsError} <button type="button" onClick={loadQuickSpecs} className="underline font-semibold">Retry</button></div>}
                </div>

                {/* Specification Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end bg-[#fdfbfb] p-3.5 rounded-xl border border-gray-200">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      Specification Key
                    </label>
                    <Input
                      id="specKeyInput"
                      value={specKey}
                      onChange={(e) => setSpecKey(e.target.value)}
                      placeholder="e.g. Processor, RAM, Battery"
                      className="text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSpec();
                        }
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      Specification Value
                    </label>
                    <Input
                      value={specVal}
                      onChange={(e) => setSpecVal(e.target.value)}
                      placeholder="e.g. Intel Core i7 13th Gen, 16GB DDR5"
                      className="text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSpec();
                        }
                      }}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleAddSpec}
                      className="w-full bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold py-2"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}>
                      Add Spec
                    </Button>
                  </div>
                </div>

                {/* Added Specifications List / Table */}
                {manualSpecifications.length > 0 ? (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 grid grid-cols-12 text-[10px] font-black uppercase tracking-wider text-gray-600">
                      <div className="col-span-4 sm:col-span-3">
                        Specification Key
                      </div>
                      <div className="col-span-7 sm:col-span-8">
                        Specification Value
                      </div>
                      <div className="col-span-1 text-right">Action</div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {manualSpecifications.map(({ spec: sp, index: idx }) => (
                        <div
                          key={idx}
                          className="px-4 py-2.5 grid grid-cols-12 items-center hover:bg-gray-50/50 transition-colors text-xs">
                          <div className="col-span-4 sm:col-span-3 font-bold text-gray-800 pr-2 truncate">
                            {sp.key}
                          </div>
                          <div className="col-span-7 sm:col-span-8 text-gray-600 pr-2 break-words">
                            {sp.value}
                          </div>
                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveSpec(idx)}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-md transition-colors"
                              title="Delete Specification">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/40">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-600">
                      No custom specifications added yet
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Use the inputs above or click quick tags to add
                      specifications
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Nav Bar */}
              <div className="flex justify-between pt-4 border-t border-[#f0e6e8]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("groups")}
                  className="text-xs font-semibold">
                  ← Back: Groups
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveAndPublish}
                  isLoading={formSubmitting}
                  leftIcon={<Save className="w-4 h-4" />}
                  className="bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold px-8 shadow-sm">
                  Save & Publish Product
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!imageDeleteTarget}
        onClose={() => setImageDeleteTarget(null)}
        onConfirm={handleImageDeleteConfirm}
        title="Remove Image"
        message="Are you sure you want to remove this image from the product gallery? This cannot be undone."
        confirmText="Remove"
        isLoading={imageDeleteLoading}
        variant="danger"
      />
    </div>
  );
};

export default AdminProductDetailPage;
