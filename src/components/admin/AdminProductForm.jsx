import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Camera,
  Plus,
  Trash2,
  Star,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Layers,
  Tag as TagIcon,
  SlidersHorizontal,
  Palette,
  Check,
  ChevronDown
} from 'lucide-react';
import { api } from '../../services/api';
import { ALL_CATEGORIES } from '../../utils/parameterHelpers';
import './AdminProductForm.css';

const CATEGORIES = ALL_CATEGORIES;
const POPULAR_TAGS = ['NEW', 'BESTSELLER', 'BRIDAL', 'TRENDING', 'FEATURED', 'HANDMADE'];

export default function AdminProductForm({
  form,
  setForm,
  editing,
  setEditing,
  saveProduct,
  uploadImage,
  uploadMultipleImages,
  busy,
  emptyForm
}) {
  const [manualUrl, setManualUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [masterParameters, setMasterParameters] = useState([]);
  const [selectedParamToAdd, setSelectedParamToAdd] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Load master parameter library
  useEffect(() => {
    api('/parameters/admin/all')
      .then((data) => {
        if (Array.isArray(data)) {
          setMasterParameters(data);
        }
      })
      .catch(() => {});
  }, []);

  const imagesList = Array.isArray(form.images) && form.images.length > 0
    ? form.images.filter(Boolean)
    : (form.img ? [form.img.trim()].filter(Boolean) : []);

  const assignedParameters = Array.isArray(form.productParameters) ? form.productParameters : [];

  const handleAddManualUrl = (e) => {
    if (e) e.preventDefault();
    const url = manualUrl.trim();
    if (!url) return;

    const currentList = [...imagesList];
    const base = (currentList.length === 1 && currentList[0] === '/assets/thushi.jpg')
      ? []
      : currentList;

    const updated = [...base, url].slice(0, 10);
    setForm({
      ...form,
      images: updated,
      img: updated[0] || url
    });
    setManualUrl('');
  };

  const handleRemoveImage = (indexToRemove) => {
    const updated = imagesList.filter((_, idx) => idx !== indexToRemove);
    setForm({
      ...form,
      images: updated,
      img: updated[0] || ''
    });
  };

  const handleSetPrimaryCover = (indexToPrimary) => {
    if (indexToPrimary === 0) return;
    const list = [...imagesList];
    const [selected] = list.splice(indexToPrimary, 1);
    list.unshift(selected);
    setForm({
      ...form,
      images: list,
      img: list[0]
    });
  };

  const handleMoveImage = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= imagesList.length) return;
    const list = [...imagesList];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setForm({
      ...form,
      images: list,
      img: list[0]
    });
  };

  const handleFilesSelected = (files) => {
    if (!files || files.length === 0) return;
    if (uploadMultipleImages) {
      uploadMultipleImages(files);
    } else if (uploadImage) {
      uploadImage({ target: { files } });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFilesSelected(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // =========================================================================
  // PRODUCT PARAMETER ASSIGNMENT & MULTISELECT LOGIC
  // =========================================================================

  const handleAssignParameter = (paramId) => {
    if (!paramId) return;
    const masterParam = masterParameters.find((p) => String(p.id || p._id) === String(paramId));
    if (!masterParam) return;

    // Avoid duplicate assignment
    const isAlreadyAssigned = assignedParameters.some(
      (ap) => String(ap.parameterId) === String(masterParam.id || masterParam._id)
    );
    if (isAlreadyAssigned) return;

    // By default, select all active values of this parameter
    const activeValues = Array.isArray(masterParam.values)
      ? masterParam.values.filter((v) => v.isActive !== false)
      : [];

    const newAssignment = {
      parameterId: masterParam.id || masterParam._id,
      name: masterParam.name,
      displayType: masterParam.displayType || 'buttons',
      selectionMode: masterParam.selectionMode || 'single',
      required: masterParam.required !== undefined ? masterParam.required : true,
      selectedValueIds: activeValues.map((v) => String(v.id || v._id || v.value || v.label)),
      selectedValues: activeValues.map((v) => ({
        valueId: String(v.id || v._id || v.value || v.label),
        label: v.label,
        value: v.value || v.label,
        colorCode: v.colorCode || null,
        inStock: true
      }))
    };

    setForm({
      ...form,
      productParameters: [...assignedParameters, newAssignment]
    });
    setSelectedParamToAdd('');
  };

  const handleRemoveAssignedParameter = (indexToRemove) => {
    const updated = assignedParameters.filter((_, idx) => idx !== indexToRemove);
    setForm({
      ...form,
      productParameters: updated
    });
  };

  const handleToggleValueSelection = (assignedParamIdx, masterVal) => {
    const valKey = String(masterVal.id || masterVal._id || masterVal.value || masterVal.label);
    const targetParam = assignedParameters[assignedParamIdx];
    if (!targetParam) return;

    const currentSelectedIds = Array.isArray(targetParam.selectedValueIds)
      ? targetParam.selectedValueIds
      : [];
    const isSelected = currentSelectedIds.includes(valKey);

    let nextSelectedIds;
    let nextSelectedValues;

    if (isSelected) {
      // Uncheck
      nextSelectedIds = currentSelectedIds.filter((id) => id !== valKey);
      nextSelectedValues = (targetParam.selectedValues || []).filter((v) => v.valueId !== valKey);
    } else {
      // Check
      nextSelectedIds = [...currentSelectedIds, valKey];
      nextSelectedValues = [
        ...(targetParam.selectedValues || []),
        {
          valueId: valKey,
          label: masterVal.label,
          value: masterVal.value || masterVal.label,
          colorCode: masterVal.colorCode || null,
          inStock: true
        }
      ];
    }

    const updatedList = assignedParameters.map((ap, idx) => {
      if (idx !== assignedParamIdx) return ap;
      return {
        ...ap,
        selectedValueIds: nextSelectedIds,
        selectedValues: nextSelectedValues
      };
    });

    setForm({
      ...form,
      productParameters: updatedList
    });
  };

  const handleSelectAllValues = (assignedParamIdx, masterParam) => {
    const allVals = Array.isArray(masterParam.values) ? masterParam.values : [];
    const updatedList = assignedParameters.map((ap, idx) => {
      if (idx !== assignedParamIdx) return ap;
      return {
        ...ap,
        selectedValueIds: allVals.map((v) => String(v.id || v._id || v.value || v.label)),
        selectedValues: allVals.map((v) => ({
          valueId: String(v.id || v._id || v.value || v.label),
          label: v.label,
          value: v.value || v.label,
          colorCode: v.colorCode || null,
          inStock: true
        }))
      };
    });
    setForm({
      ...form,
      productParameters: updatedList
    });
  };

  const handleClearValuesForParam = (assignedParamIdx) => {
    const updatedList = assignedParameters.map((ap, idx) => {
      if (idx !== assignedParamIdx) return ap;
      return {
        ...ap,
        selectedValueIds: [],
        selectedValues: []
      };
    });
    setForm({
      ...form,
      productParameters: updatedList
    });
  };

  const handleResetForm = () => {
    if (setEditing) setEditing(null);
    if (setForm && emptyForm) setForm(emptyForm);
    setManualUrl('');
  };

  // Filter available parameters that can be added
  const availableToAdd = masterParameters.filter(
    (mp) =>
      mp.isActive !== false &&
      !assignedParameters.some((ap) => String(ap.parameterId) === String(mp.id || mp._id))
  );

  return (
    <div className="adminCard adminProductFormCard" id="adminProductFormTop">
      {/* Form Header */}
      <div className="cardHeading formHeading">
        <div className="headingTitleWrap">
          <div className="formHeaderBadge">
            <Sparkles size={14} />
            <span>{editing ? 'Editing Mode' : 'Catalog Management'}</span>
          </div>
          <h3>{editing ? `Edit: ${form.name || 'Product'}` : 'Add New Product'}</h3>
          <p className="formSubText">
            {imagesList.length} of 10 photos uploaded · First image serves as primary storefront cover.
          </p>
        </div>

        <div className="headingActions">
          {editing ? (
            <button
              className="outlineBtn cancelEditBtn"
              type="button"
              onClick={handleResetForm}
            >
              Cancel Edit
            </button>
          ) : (
            <button
              className="outlineBtn clearFormBtn"
              type="button"
              onClick={handleResetForm}
            >
              Clear Form
            </button>
          )}
        </div>
      </div>

      <form onSubmit={saveProduct} className="adminProductForm">
        {/* Product Title */}
        <div className="formFieldGroup">
          <label className="fieldLabel">
            <span>Product Title *</span>
          </label>
          <input
            required
            type="text"
            className="mainTitleInput"
            placeholder="e.g. Kolhapuri Traditional Saaj with Pearls"
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        {/* Price & Stock */}
        <div className="formRow">
          <div className="formFieldGroup">
            <label className="fieldLabel">
              <span>Price (₹) *</span>
            </label>
            <div className="inputWithPrefix">
              <span className="inputPrefix">₹</span>
              <input
                required
                type="number"
                min="1"
                step="1"
                placeholder="1499"
                value={form.price || ''}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
          </div>

          <div className="formFieldGroup">
            <label className="fieldLabel">
              <span>Stock Quantity *</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder="10"
              value={form.stock !== undefined ? form.stock : 10}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </div>
        </div>

        {/* Category Selection with Quick Chips */}
        <div className="formFieldGroup">
          <div className="fieldLabelWithChips">
            <label className="fieldLabel">
              <Layers size={13} />
              <span>Category *</span>
            </label>
            <div className="quickChipsList">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`chipBtn ${form.category === cat ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, category: cat })}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <select
            value={form.category || 'Traditional'}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Tag Selection with Quick Chips */}
        <div className="formFieldGroup">
          <div className="fieldLabelWithChips">
            <label className="fieldLabel">
              <TagIcon size={13} />
              <span>Badge Tag</span>
            </label>
            <div className="quickChipsList">
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`chipBtn ${form.tag === tag ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, tag: tag })}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            placeholder="NEW, BESTSELLER, BRIDAL..."
            value={form.tag || ''}
            onChange={(e) => setForm({ ...form, tag: e.target.value })}
          />
        </div>

        {/* Image Upload Area */}
        <div className="formFieldGroup">
          <label className="fieldLabel">
            <ImageIcon size={13} />
            <span>Product Photos ({imagesList.length}/10) *</span>
          </label>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            multiple
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          <input
            type="file"
            ref={cameraInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          <div
            className={`photoUploadDropzone ${dragOver ? 'dragOver' : ''} ${busy ? 'isBusy' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="dropzoneContent">
              <div className="dropzoneIcon">
                <Upload size={24} />
              </div>
              <div className="dropzoneText">
                <b>Drag & drop product photos here</b>
                <span>Supports JPG, PNG, WEBP. High-resolution camera photos auto-compressed & watermarked.</span>
              </div>
            </div>

            <div className="uploadActionRow">
              <button
                type="button"
                className="goldBtn chooseFilesBtn"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || imagesList.length >= 10}
              >
                <Upload size={14} /> Choose Photos
              </button>

              <button
                type="button"
                className="outlineBtn cameraCaptureBtn"
                onClick={() => cameraInputRef.current?.click()}
                disabled={busy || imagesList.length >= 10}
                title="Take live photo using camera"
              >
                <Camera size={14} /> Take Photo
              </button>
            </div>

            {busy && (
              <div className="uploadingOverlay">
                <div className="spinnerPulse" />
                <span>Processing & auto-watermarking Nathshikha insignia…</span>
              </div>
            )}
          </div>

          {/* Manual URL Input Bar */}
          <div className="manualUrlBar">
            <input
              type="text"
              placeholder="Or paste image URL (/uploads/... or https://...)"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddManualUrl(e);
                }
              }}
            />
            <button
              type="button"
              className="outlineBtn addUrlBtn"
              onClick={handleAddManualUrl}
              disabled={!manualUrl.trim() || busy}
            >
              <Plus size={14} /> Add URL
            </button>
          </div>

          {/* Multi-Image Thumbnails Grid */}
          {imagesList.length > 0 ? (
            <div className="productImagesGrid">
              {imagesList.map((imgUrl, idx) => {
                const isPrimary = idx === 0;
                return (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className={`productImageCard ${isPrimary ? 'isPrimaryCover' : ''}`}
                  >
                    <div className="productImageThumbWrapper">
                      <img src={imgUrl} alt={`Product photo ${idx + 1}`} loading="lazy" />
                      <span className="photoIndexBadge">#{idx + 1}</span>
                      {isPrimary ? (
                        <span className="primaryCoverBadge">
                          <Star size={11} fill="#fff" /> Cover Photo
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="quickMakeCoverBtn"
                          title="Click to set as primary storefront cover photo"
                          onClick={() => handleSetPrimaryCover(idx)}
                        >
                          <Star size={11} /> Make Cover
                        </button>
                      )}
                    </div>

                    <div className="productImageActions">
                      <div className="reorderBtnsGroup">
                        <button
                          type="button"
                          className="reorderBtn"
                          title="Move photo earlier"
                          disabled={idx === 0 || busy}
                          onClick={() => handleMoveImage(idx, -1)}
                        >
                          <ArrowLeft size={13} />
                        </button>
                        <button
                          type="button"
                          className="reorderBtn"
                          title="Move photo later"
                          disabled={idx === imagesList.length - 1 || busy}
                          onClick={() => handleMoveImage(idx, 1)}
                        >
                          <ArrowRight size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="deleteImgBtn"
                        title="Remove photo"
                        disabled={busy}
                        onClick={() => handleRemoveImage(idx)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="noImagesWarning">
              <AlertCircle size={16} />
              <div>
                <b>No photos added yet</b>
                <p>Upload at least 1 photo. You can add up to 10 photos for multi-angle showcase.</p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="formFieldGroup">
          <label className="fieldLabel">
            <span>Product Description & Craft Details</span>
          </label>
          <textarea
            placeholder="Describe the Maharashtrian craftsmanship, plating quality, dimensions, and styling suggestions..."
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* ========================================================================= */}
        {/* NEW PRODUCT PARAMETER ASSIGNMENT SYSTEM                                   */}
        {/* ========================================================================= */}
        <div className="formProductParametersSection">
          <div className="paramSectionHeader">
            <div className="paramHeaderTitles">
              <div className="paramHeaderBadge">
                <SlidersHorizontal size={13} />
                <span>Product Parameters</span>
              </div>
              <h4>Applicable Customer Choices & Options</h4>
              <p className="paramHeaderDesc">
                Assign parameters (e.g. <b>Length, Size, Stone Color</b>) and multiselect only the specific values available for this piece. If left empty, this piece sells without options.
              </p>
            </div>

            {/* Add Parameter Dropdown Bar */}
            <div className="addParamActionWrap">
              <select
                value={selectedParamToAdd}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    handleAddManualUrl();
                    handleAssignParameter(val);
                  }
                }}
                className="paramPickerSelect"
              >
                <option value="">+ Add Parameter from Library…</option>
                {availableToAdd.map((mp) => (
                  <option key={mp.id || mp._id} value={mp.id || mp._id}>
                    + {mp.name} ({(mp.values || []).length} choices)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Parameters Cards */}
          {assignedParameters.length > 0 ? (
            <div className="assignedParametersList">
              {assignedParameters.map((ap, apIdx) => {
                const masterParam = masterParameters.find(
                  (mp) => String(mp.id || mp._id) === String(ap.parameterId)
                );
                const masterValues = masterParam ? masterParam.values || [] : ap.selectedValues || [];
                const selectedCount = (ap.selectedValueIds || []).length;

                return (
                  <div key={ap.parameterId || apIdx} className="assignedParamCard">
                    <div className="assignedParamCardHeader">
                      <div className="assignedParamMeta">
                        <span className="paramNameTag">Parameter:</span>
                        <h5>{ap.name}</h5>
                        <span className="paramTypePill">
                          {ap.displayType === 'color'
                            ? 'Color Swatches'
                            : ap.displayType === 'dropdown'
                            ? 'Dropdown'
                            : 'Buttons'}
                        </span>
                        <span className="selectedCountPill">
                          {selectedCount} of {masterValues.length} choices selected
                        </span>
                      </div>

                      <div className="paramCardHeaderActions">
                        {masterParam && (
                          <>
                            <button
                              type="button"
                              className="paramQuickSelectBtn"
                              onClick={() => handleSelectAllValues(apIdx, masterParam)}
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              className="paramQuickSelectBtn"
                              onClick={() => handleClearValuesForParam(apIdx)}
                            >
                              Clear
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="deleteAssignedParamBtn"
                          onClick={() => handleRemoveAssignedParameter(apIdx)}
                          title="Remove this parameter from product"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>

                    {/* Multiselect Value Chips */}
                    <div className="multiselectValuesContainer">
                      <span className="multiselectLabel">
                        Select which choices are available for this piece:
                      </span>

                      <div className="multiselectChipsGrid">
                        {masterValues.map((mv, vIdx) => {
                          const valKey = String(mv.id || mv._id || mv.value || mv.label);
                          const isChecked = (ap.selectedValueIds || []).includes(valKey);

                          return (
                            <label
                              key={vIdx}
                              className={`multiselectValChip ${isChecked ? 'isChecked' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleValueSelection(apIdx, mv)}
                              />
                              {ap.displayType === 'color' && mv.colorCode && (
                                <span
                                  className="chipColorDot"
                                  style={{ backgroundColor: mv.colorCode }}
                                />
                              )}
                              <span className="chipText">{mv.label}</span>
                              {isChecked && <Check size={12} className="checkIconSmall" />}
                            </label>
                          );
                        })}
                      </div>

                      {selectedCount === 0 && (
                        <div className="noValuesSelectedWarning">
                          <AlertCircle size={13} />
                          <span>No choices selected. Please check at least one value above for this parameter to appear to customers.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="noAssignedParamsNotice">
              <SlidersHorizontal size={15} color="var(--gold, #b8860b)" />
              <span>Standard single-variant piece (no customer option selectors). Click "+ Add Parameter from Library" above if this piece has sizes, colors, or lengths.</span>
            </div>
          )}
        </div>

        {/* Switches */}
        <div className="switchesContainer">
          <label className="switchCard">
            <input
              type="checkbox"
              checked={form.active !== undefined ? !!form.active : true}
              onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })}
            />
            <div className="switchCardText">
              <b>Visible in Storefront</b>
              <span>Customers can view and purchase this item</span>
            </div>
          </label>

          <label className="switchCard bestsellerHighlightCard">
            <input
              type="checkbox"
              checked={!!form.isBestseller}
              onChange={(e) =>
                setForm({
                  ...form,
                  isBestseller: e.target.checked,
                  tag: e.target.checked ? (form.tag || 'BESTSELLER') : form.tag
                })
              }
            />
            <div className="switchCardText">
              <b>⭐ Show in Homepage Bestsellers</b>
              <span>Highlights product on home page showcase</span>
            </div>
          </label>
        </div>

        {/* Submit Actions */}
        <div className="formSubmitBar">
          <button
            className="goldBtn submitProductBtn"
            disabled={busy || imagesList.length === 0 || !form.name?.trim() || !form.price}
            type="submit"
          >
            {busy ? (
              <span>Saving Product…</span>
            ) : editing ? (
              <span>SAVE PRODUCT CHANGES</span>
            ) : (
              <span>+ ADD PRODUCT TO CATALOGUE</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
