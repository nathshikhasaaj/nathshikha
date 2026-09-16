import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Palette,
  Check,
  Power,
  Layers,
  ArrowUp,
  ArrowDown,
  Type
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import './AdminParameterManager.css';

const DEFAULT_COLOR_PALETTE = [
  { label: 'Ruby Red', hex: '#dc2626' },
  { label: 'Emerald Green', hex: '#16a34a' },
  { label: 'Pearl White', hex: '#f8fafc' },
  { label: 'Rose Pink', hex: '#db2777' },
  { label: 'Sapphire Blue', hex: '#2563eb' },
  { label: 'Antique Maroon', hex: '#78350f' },
  { label: 'Onyx Black', hex: '#1e293b' },
  { label: 'Golden Honey', hex: '#d97706' }
];

export default function AdminParameterManager({ onParametersUpdated }) {
  const { setToast } = useToast();
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingParam, setEditingParam] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  // Parameter Form State
  const [formName, setFormName] = useState('');
  const [formDisplayType, setFormDisplayType] = useState('buttons');
  const [formSelectionMode, setFormSelectionMode] = useState('single');
  const [formRequired, setFormRequired] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formValues, setFormValues] = useState([]);
  const [newValueInput, setNewValueInput] = useState('');
  const [newColorHex, setNewColorHex] = useState('#dc2626');

  const loadParameters = async () => {
    setLoading(true);
    try {
      const data = await api('/parameters/admin/all');
      if (Array.isArray(data)) {
        setParameters(data);
        if (onParametersUpdated) onParametersUpdated(data);
      }
    } catch (err) {
      setToast(err.message || 'Failed to load parameters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParameters();
  }, []);

  const handleStartCreate = () => {
    setEditingParam(null);
    setIsCreating(true);
    setFormName('');
    setFormDisplayType('buttons');
    setFormSelectionMode('single');
    setFormRequired(true);
    setFormIsActive(true);
    setFormValues([
      { label: '', value: '', colorCode: null, isActive: true, order: 0 }
    ]);
    setNewValueInput('');
  };

  const handleStartEdit = (param) => {
    setIsCreating(false);
    setEditingParam(param);
    setFormName(param.name || '');
    setFormDisplayType(param.displayType || 'buttons');
    setFormSelectionMode(param.selectionMode || 'single');
    setFormRequired(param.required !== undefined ? param.required : true);
    setFormIsActive(param.isActive !== undefined ? param.isActive : true);
    setFormValues(
      Array.isArray(param.values) && param.values.length > 0
        ? JSON.parse(JSON.stringify(param.values))
        : [{ label: '', value: '', colorCode: null, isActive: true, order: 0 }]
    );
    setNewValueInput('');
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingParam(null);
  };

  const handleAddValueToForm = (labelOverride, colorOverride) => {
    const valText = (labelOverride !== undefined ? labelOverride : newValueInput).trim();
    if (!valText) return;

    setFormValues((prev) => [
      ...prev.filter((v) => v.label || v.value),
      {
        label: valText,
        value: valText,
        colorCode: formDisplayType === 'color' ? (colorOverride || newColorHex) : null,
        isActive: true,
        order: prev.length
      }
    ]);
    setNewValueInput('');
  };

  const handleUpdateValue = (valIdx, field, val) => {
    setFormValues((prev) =>
      prev.map((v, idx) => {
        if (idx !== valIdx) return v;
        const next = { ...v, [field]: val };
        if (field === 'label' && (!v.value || v.value === v.label)) {
          next.value = val;
        }
        return next;
      })
    );
  };

  const handleRemoveValue = (valIdx) => {
    setFormValues((prev) => prev.filter((_, idx) => idx !== valIdx));
  };

  const handleMoveValue = (valIdx, direction) => {
    const targetIdx = valIdx + direction;
    if (targetIdx < 0 || targetIdx >= formValues.length) return;
    const list = [...formValues];
    const temp = list[valIdx];
    list[valIdx] = list[targetIdx];
    list[targetIdx] = temp;
    setFormValues(list);
  };

  const handleSaveParameter = async (e) => {
    if (e) e.preventDefault();
    if (!formName.trim()) {
      return setToast('Please enter a parameter name.');
    }

    let cleanValues = formValues
      .filter((v) => v && (v.label || v.value))
      .map((v, idx) => ({
        label: String(v.label || v.value).trim(),
        value: String(v.value || v.label).trim(),
        colorCode: formDisplayType === 'color' ? (v.colorCode || '#dc2626') : null,
        isActive: v.isActive !== undefined ? v.isActive : true,
        order: idx
      }));

    if (formDisplayType === 'text') {
      if (cleanValues.length === 0) {
        cleanValues = [
          {
            label: formValues[0]?.label?.trim() || 'Custom Name / Inscription',
            value: 'custom_text',
            colorCode: null,
            isActive: true,
            order: 0
          }
        ];
      }
    } else if (cleanValues.length === 0) {
      return setToast('Please add at least 1 value choice to this parameter.');
    }

    setBusy(true);
    try {
      const payload = {
        name: formName.trim(),
        displayType: formDisplayType,
        selectionMode: formSelectionMode,
        required: formRequired,
        isActive: formIsActive,
        values: cleanValues
      };

      if (isCreating) {
        await api('/parameters/admin', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setToast(`✓ Parameter "${formName.trim()}" created successfully!`);
      } else if (editingParam) {
        await api(`/parameters/admin/${editingParam.id || editingParam._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        setToast(`✓ Parameter "${formName.trim()}" updated successfully!`);
      }

      setIsCreating(false);
      setEditingParam(null);
      await loadParameters();
    } catch (err) {
      setToast(err.message || 'Failed to save parameter.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (param) => {
    const nextState = !param.isActive;
    try {
      await api(`/parameters/admin/${param.id || param._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextState })
      });
      setToast(`Parameter "${param.name}" marked as ${nextState ? 'Active' : 'Inactive'}.`);
      await loadParameters();
    } catch (err) {
      setToast(err.message || 'Failed to update parameter status.');
    }
  };

  const handleSeedDefaults = async () => {
    setLoading(true);
    try {
      await api('/parameters/admin/seed', { method: 'POST' });
      setToast('✓ Default Master Parameter Library loaded successfully!');
      await loadParameters();
    } catch (err) {
      setToast(err.message || 'Failed to seed parameter library.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adminParameterManager">
      {/* Header Banner */}
      <div className="parameterManagerHeader">
        <div className="parameterHeaderTitle">
          <div className="parameterHeaderBadge">
            <SlidersHorizontal size={14} />
            <span>Master Parameter Library</span>
          </div>
          <h3>Global Product Parameters & Choice Sets</h3>
          <p>
            Create reusable parameters (e.g. <b>Length, Size, Stone Color, Bangle Size</b>). In the product form, you select which specific values are available for each piece.
          </p>
        </div>

        <div className="parameterHeaderActions">
          <button
            type="button"
            className="outlineBtn seedLibraryBtn"
            onClick={handleSeedDefaults}
            disabled={loading || busy}
            title="Load standard jewellery parameter templates"
          >
            <Sparkles size={14} /> Load Presets
          </button>
          <button
            type="button"
            className="goldBtn createParameterBtn"
            onClick={handleStartCreate}
            disabled={loading || busy}
          >
            <Plus size={15} /> + NEW PARAMETER
          </button>
        </div>
      </div>

      {/* Create / Edit Form Modal Card */}
      {(isCreating || editingParam) && (
        <div className="parameterEditorCard">
          <div className="editorCardHeader">
            <div>
              <span className="editorEyebrow">
                {isCreating ? 'CREATE PARAMETER' : 'EDIT PARAMETER'}
              </span>
              <h4>{isCreating ? 'New Master Parameter' : `Edit: ${formName || 'Parameter'}`}</h4>
            </div>
            <button
              type="button"
              className="outlineBtn closeEditorBtn"
              onClick={handleCancelForm}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveParameter} className="parameterEditorForm">
            <div className="paramFormGrid">
              {/* Parameter Name */}
              <div className="paramFormField">
                <label>Parameter Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Length, Size, Stone Color, Bangle Size"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="paramTextInput"
                />
              </div>

              {/* Display Type */}
              <div className="paramFormField">
                <label>Display Type</label>
                <select
                  value={formDisplayType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setFormDisplayType(newType);
                    if (newType === 'text') {
                      setFormSelectionMode('single');
                      if (formValues.length === 0 || !formValues[0]?.label) {
                        setFormValues([{ label: 'Enter custom name / text', value: 'custom_text', colorCode: null, isActive: true, order: 0 }]);
                      }
                    }
                  }}
                  className="paramSelect"
                >
                  <option value="buttons">Pill Buttons (Default)</option>
                  <option value="dropdown">Dropdown Select Menu</option>
                  <option value="color">Color Swatches (with Color Codes)</option>
                  <option value="text">✍️ Custom Textbox (Customer Types In Name/Text)</option>
                </select>
              </div>

              {/* Customer Selection Mode */}
              <div className="paramFormField">
                <label>Customer Selection Mode</label>
                <select
                  value={formSelectionMode}
                  onChange={(e) => setFormSelectionMode(e.target.value)}
                  className="paramSelect"
                  disabled={formDisplayType === 'text'}
                >
                  <option value="single">Single Choice {formDisplayType === 'text' ? '(Customer types text)' : '(Customer picks 1)'}</option>
                  {formDisplayType !== 'text' && <option value="multiple">Multiple Choices</option>}
                </select>
              </div>

              {/* Required & Active Toggles */}
              <div className="paramFormToggles">
                <label className="paramToggleLabel">
                  <input
                    type="checkbox"
                    checked={formRequired}
                    onChange={(e) => setFormRequired(e.target.checked)}
                  />
                  <span>Required (Customer must {formDisplayType === 'text' ? 'enter text' : 'choose'})</span>
                </label>

                <label className="paramToggleLabel">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <span>Active in Library</span>
                </label>
              </div>
            </div>

            {/* Parameter Values / Textbox Configuration Section */}
            {formDisplayType === 'text' ? (
              <div className="textParamSettingsSection">
                <div className="textParamInfoBanner">
                  <div className="textParamIconWrap">
                    <Type size={20} />
                  </div>
                  <div>
                    <h5>Custom Name / Textbox Input Mode</h5>
                    <p>
                      Customers will be prompted to type their customized name, initials, or custom inscription directly on the product detail page when ordering.
                    </p>
                  </div>
                </div>

                <div className="textParamPlaceholderRow">
                  <label>Input Box Placeholder / Hint for Customer</label>
                  <input
                    type="text"
                    className="paramTextInput"
                    placeholder="e.g. Enter name to be engraved (e.g. Ananya, Priya)"
                    value={formValues[0]?.label || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormValues([{ label: val, value: 'custom_text', colorCode: null, isActive: true, order: 0 }]);
                    }}
                  />
                  <small className="textParamFieldHint">
                    This guidance hint will be displayed inside the empty textbox on the storefront.
                  </small>
                </div>

                <div className="textboxLivePreview">
                  <span className="previewSectionHeading">Live Storefront Customer View Preview:</span>
                  <div className="previewBoxMockup">
                    <div className="previewMockupHeader">
                      <label className="previewMockupLabel">
                        {formName.trim() || 'Name on Product'}
                        {formRequired && <span className="previewMockupReq">*</span>}:
                      </label>
                    </div>
                    <div className="previewMockupInputWrapper">
                      <Type size={14} className="previewInputIcon" />
                      <input
                        type="text"
                        readOnly
                        className="previewMockupInput"
                        placeholder={formValues[0]?.label?.trim() || `Enter ${formName.trim() || 'name'} (e.g. Ananya, Priya)`}
                      />
                      <span className="previewMockupCharCounter">0/50</span>
                    </div>
                    <span className="previewMockupNote">
                      ✨ Customer types their custom name before clicking &ldquo;Add to Bag&rdquo;. This custom name will be saved in their order.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="paramValuesSection">
                <div className="valuesSectionHeader">
                  <h5>Master Values for &ldquo;{formName || 'this parameter'}&rdquo;</h5>
                  <span className="valuesSectionNote">
                    Add all possible choices. When adding products, you can select only the applicable subset.
                  </span>
                </div>

                {/* Quick Add Bar */}
                <div className="addValueBar">
                  {formDisplayType === 'color' && (
                    <div className="colorPickerWrap">
                      <input
                        type="color"
                        className="colorPickerMain"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        title="Pick swatch color"
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder={
                      formDisplayType === 'color'
                        ? 'e.g. Ruby Red, Emerald Green'
                        : 'e.g. 22", 24", Small, Medium, 2.6'
                    }
                    value={newValueInput}
                    onChange={(e) => setNewValueInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddValueToForm();
                      }
                    }}
                    className="newValueInput"
                  />
                  <button
                    type="button"
                    className="outlineBtn addValueBtn"
                    onClick={() => handleAddValueToForm()}
                    disabled={!newValueInput.trim()}
                  >
                    <Plus size={14} /> Add Value
                  </button>
                </div>

                {/* Color Presets Palette for Color Display Type */}
                {formDisplayType === 'color' && (
                  <div className="colorPresetsPalette">
                    <span className="paletteLabel">Quick Color Presets:</span>
                    <div className="paletteList">
                      {DEFAULT_COLOR_PALETTE.map((pal) => (
                        <button
                          key={pal.label}
                          type="button"
                          className="paletteChip"
                          onClick={() => handleAddValueToForm(pal.label, pal.hex)}
                          title={`Add ${pal.label} (${pal.hex})`}
                        >
                          <span className="paletteDot" style={{ backgroundColor: pal.hex }} />
                          <span>{pal.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Values List */}
                <div className="formValuesTable">
                  {formValues.map((v, idx) => (
                    <div key={idx} className="formValueRow">
                      <span className="valIndex">#{idx + 1}</span>

                      {formDisplayType === 'color' ? (
                        <div className="colorInputGroup">
                          <input
                            type="color"
                            className="colorPickerMini"
                            value={v.colorCode || '#dc2626'}
                            onChange={(e) => handleUpdateValue(idx, 'colorCode', e.target.value)}
                            title="Pick swatch color"
                          />
                          <input
                            type="text"
                            className="valLabelInput"
                            placeholder="Color label (e.g. Ruby Red)"
                            value={v.label || ''}
                            onChange={(e) => handleUpdateValue(idx, 'label', e.target.value)}
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          className="valLabelInput"
                          placeholder="Value label (e.g. 24 inch, Medium)"
                          value={v.label || ''}
                          onChange={(e) => handleUpdateValue(idx, 'label', e.target.value)}
                        />
                      )}

                      <div className="valRowActions">
                        <button
                          type="button"
                          className="valMoveBtn"
                          onClick={() => handleMoveValue(idx, -1)}
                          disabled={idx === 0}
                          title="Move Up"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          className="valMoveBtn"
                          onClick={() => handleMoveValue(idx, 1)}
                          disabled={idx === formValues.length - 1}
                          title="Move Down"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          type="button"
                          className="valDeleteBtn"
                          onClick={() => handleRemoveValue(idx)}
                          title="Delete value"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form Submit Bar */}
            <div className="editorSubmitBar">
              <button
                type="submit"
                className="goldBtn saveParamBtn"
                disabled={busy || !formName.trim()}
              >
                {busy ? 'SAVING…' : isCreating ? 'CREATE PARAMETER' : 'SAVE CHANGES'}
              </button>
              <button
                type="button"
                className="outlineBtn cancelParamBtn"
                onClick={handleCancelForm}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Master Parameters List Grid */}
      <div className="parametersGrid">
        {loading ? (
          <div className="paramLoadingState">
            <RefreshCw size={20} className="spinIcon" />
            <span>Loading master parameters…</span>
          </div>
        ) : parameters.length > 0 ? (
          parameters.map((param) => (
            <div
              key={param.id || param._id}
              className={`parameterCard ${!param.isActive ? 'parameterCard--inactive' : ''}`}
            >
              <div className="paramCardTop">
                <div className="paramCardMeta">
                  <h4>{param.name}</h4>
                  <div className="paramBadges">
                    <span className="paramTypeBadge">
                      {param.displayType === 'color'
                        ? '🎨 Color Swatches'
                        : param.displayType === 'dropdown'
                        ? '▾ Dropdown'
                        : param.displayType === 'text' || param.displayType === 'textbox'
                        ? '✍️ Custom Textbox'
                        : '🔘 Pill Buttons'}
                    </span>
                    <span className="paramModeBadge">
                      {param.displayType === 'text' || param.displayType === 'textbox'
                        ? 'Custom Text'
                        : param.selectionMode === 'multiple'
                        ? 'Multi-select'
                        : 'Single-select'}
                    </span>
                    {param.required && <span className="paramReqBadge">Required</span>}
                    {!param.isActive && <span className="paramInactiveBadge">Inactive</span>}
                  </div>
                </div>

                <div className="paramCardActions">
                  <button
                    type="button"
                    className="outlineBtn compact editParamBtn"
                    onClick={() => handleStartEdit(param)}
                    title="Edit parameter & values"
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    className={`toggleActiveBtn ${param.isActive ? 'isActive' : 'isInactive'}`}
                    onClick={() => handleToggleActive(param)}
                    title={param.isActive ? 'Deactivate parameter' : 'Activate parameter'}
                  >
                    <Power size={13} />
                  </button>
                </div>
              </div>

              {/* Parameter Values Preview */}
              <div className="paramCardValues">
                {param.displayType === 'text' || param.displayType === 'textbox' ? (
                  <div className="paramTextSummary">
                    <div className="paramTextInputBadge">
                      <Type size={13} />
                      <span>Custom text input (Customer types name / inscription)</span>
                    </div>
                    {param.values?.[0]?.label && param.values[0].label !== 'custom_text' && (
                      <span className="paramTextHintBadge">
                        Placeholder hint: &ldquo;{param.values[0].label}&rdquo;
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <span className="valuesCountLabel">
                      {(param.values || []).length} Available Master Choices:
                    </span>
                    <div className="paramValuesChipList">
                      {(param.values || []).map((val, vIdx) => (
                        <span key={vIdx} className="paramValueChip">
                          {param.displayType === 'color' && val.colorCode && (
                            <span
                              className="chipColorDot"
                              style={{ backgroundColor: val.colorCode }}
                            />
                          )}
                          <span>{val.label}</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="emptyParametersState">
            <SlidersHorizontal size={24} />
            <h4>No Parameters in Library Yet</h4>
            <p>
              Click "Load Presets" to initialize standard jewellery parameters (Length, Size, Stone Color, Bangles) or click "+ NEW PARAMETER".
            </p>
            <button
              type="button"
              className="goldBtn"
              onClick={handleSeedDefaults}
            >
              <Sparkles size={14} /> LOAD STANDARD PRESETS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
