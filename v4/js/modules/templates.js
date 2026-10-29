/**
 * MetaFold Mobile Terminal v4 - Templates & Library Management Module
 */

import { ref, computed, watch, nextTick } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { load, save, rawBase } from '../utils/helpers.js';

export const DEFAULT_LIB = 'https://github.com/ThZobel/MetaFold-Templates';

export const DEFAULT_CATEGORY_NAMES = {
  category1: 'Standard',
  category2: 'Projekte',
  category3: 'Microscopy',
  category4: 'Archiv'
};

export const getCategoryNames = () => {
  try {
    const s = localStorage.getItem('metafold_category_names');
    if (s) {
      const parsed = JSON.parse(s);
      return { ...DEFAULT_CATEGORY_NAMES, ...parsed };
    }
  } catch (_) {}
  return { ...DEFAULT_CATEGORY_NAMES };
};

export const prettyCat = (c, customMap = null) => {
  if (!c) return 'Allgemein';
  const names = customMap || getCategoryNames();
  const m = String(c).match(/^category\s*(\d+)$/i) || String(c).match(/^kategorie\s*(\d+)$/i);
  if (m) {
    const key = 'category' + m[1];
    return names[key] || ('Kategorie ' + m[1]);
  }
  return c;
};

// MetaFold-Template -> interne Form
export const parseTpl = (raw, id, fallback = 'Vorlage') => {
  if (!raw || typeof raw !== 'object') return null;
  let obj = {}, order = [];
  const mf = raw.metadata && raw.metadata.fields;
  if (mf && typeof mf === 'object') {
    obj = mf;
    order = Array.isArray(raw.metadata.fieldOrder) ? raw.metadata.fieldOrder
      : Object.keys(mf).sort((a, b) => (mf[a].position ?? 0) - (mf[b].position ?? 0));
  } else {
    const list = Array.isArray(raw.fields) ? raw.fields : Array.isArray(raw.variables) ? raw.variables : null;
    if (list) list.forEach((f, i) => { const k = f.key || f.name || `field_${i}`; obj[k] = f; order.push(k); });
    else if (raw.fields && typeof raw.fields === 'object') { obj = raw.fields; order = Object.keys(obj); }
  }
  const fields = [];
  for (const key of order) {
    const f = obj[key];
    if (!f || typeof f !== 'object') continue;
    if (f.type === 'group') { fields.push({ key, label: f.label || key, type: 'group' }); continue; }
    const t = f.type;
    const type = t === 'multicheckbox' ? 'multicheckbox'
      : (t === 'tags' || t === 'derived_from') ? 'tags'
      : t === 'rating' ? 'rating'
      : (t === 'dropdown' || t === 'select' || Array.isArray(f.options)) ? 'select'
      : t === 'textarea' ? 'textarea' : t === 'checkbox' ? 'checkbox'
      : ['number', 'date', 'time', 'email', 'url'].includes(t) ? t : 'text';
    const dv = f.defaultValue ?? f.value ?? '';
    fields.push({
      key, label: f.label || key, type, origType: t,
      options: Array.isArray(f.options) ? f.options : [],
      required: !!f.required,
      defaultValue: type === 'checkbox' ? !!dv
        : (type === 'tags' || type === 'multicheckbox') ? (Array.isArray(dv) ? [...dv] : (dv ? [dv] : []))
        : type === 'rating' ? (Number(dv) || 0) : dv,
      description: f.description || ''
    });
  }
  return {
    id: id || String(raw.id || raw.name || fallback),
    name: raw.name || raw.title || fallback,
    category: prettyCat(raw.category || raw.group),
    description: raw.description || '',
    fields,
    raw
  };
};

// eLabFTW-Template -> interne Form (entsprechend MetaFold Desktop)
export const parseElabFTWTemplate = (tplData) => {
  if (!tplData || typeof tplData !== 'object') return null;
  const tplId = tplData.id || ('elab_' + Date.now());
  const title = tplData.title || tplData.name || `eLabFTW Vorlage #${tplId}`;

  let metadata = {};
  if (tplData.metadata) {
    try {
      metadata = typeof tplData.metadata === 'string' ? JSON.parse(tplData.metadata) : tplData.metadata;
    } catch (e) {
      console.warn('Could not parse eLabFTW metadata JSON:', e);
    }
  }

  const mappedFields = {};
  const fieldOrder = [];
  const fields = [];

  if (metadata && metadata.extra_fields && typeof metadata.extra_fields === 'object') {
    for (const [key, field] of Object.entries(metadata.extra_fields)) {
      if (!field || typeof field !== 'object') continue;
      let metafoldType = 'text';
      if (field.type === 'number') metafoldType = 'number';
      else if (field.type === 'date' || field.type === 'datetime') metafoldType = 'date';
      else if (field.type === 'select' || field.type === 'radio' || field.type === 'items') metafoldType = 'select';
      else if (field.type === 'checkbox') metafoldType = 'checkbox';
      else if (field.type === 'email') metafoldType = 'email';
      else if (field.type === 'textarea') metafoldType = 'textarea';
      else if (field.type === 'rating') metafoldType = 'rating';
      else if (field.type === 'tags') metafoldType = 'tags';

      const sourceText = field.description || key;
      let baseKey = sourceText.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase();
      if (baseKey.length > 20) baseKey = baseKey.substring(0, 20);
      if (!baseKey) baseKey = 'field';

      let finalKey = baseKey;
      let counter = 1;
      while (mappedFields[finalKey]) {
        finalKey = `${baseKey}_${counter}`;
        counter++;
      }

      const options = Array.isArray(field.options) ? field.options
        : (typeof field.options === 'string' ? field.options.split('|').map(s => s.trim()).filter(Boolean) : []);

      const mappedField = {
        key: finalKey,
        label: key,
        type: metafoldType,
        origType: field.type || 'text',
        required: field.required === true || field.required === 'true',
        options: options,
        defaultValue: field.value !== undefined && field.value !== '' ? field.value : (metafoldType === 'checkbox' ? false : ''),
        description: field.description || ''
      };

      mappedFields[finalKey] = mappedField;
      fieldOrder.push(finalKey);
      fields.push(mappedField);
    }
  }

  return {
    id: 'elabftw:' + tplId,
    name: title,
    category: '🧪 eLabFTW Vorlagen',
    description: tplData.description || `eLabFTW Vorlage #${tplId}`,
    source: 'elabftw',
    elabftwId: tplId,
    fields,
    raw: {
      id: tplId,
      name: title,
      category: '🧪 eLabFTW Vorlagen',
      source: 'elabftw',
      elabftwId: tplId,
      metadata: {
        fields: mappedFields,
        fieldOrder
      }
    }
  };
};

export function createTemplates({ flash, tr, config, auth, resetWizard, selectedCategory, selectedTemplateId }) {
  const categoryNames = ref(getCategoryNames());
  watch(categoryNames, (v) => save('metafold_category_names', v), { deep: true });

  const onCategorySettingChange = (key) => {
    const newName = categoryNames.value[key];
    if (!newName) return;
    templates.value.forEach(t => {
      if (t.raw?.category === key) {
        t.category = newName;
      }
    });
    save('metafold_templates', templates.value);
  };

  const stored = load('metafold_templates', []);
  const seenTplKeys = new Set();
  const templates = ref(stored.filter(t => t.raw).map(t => {
    const p = parseTpl(t.raw, t.id, t.name);
    if (!p) return null;
    if (t.name) p.name = t.name;
    if (t.category) {
      if (t.category === 'Kategorie 3' || t.category === 'category3') {
        p.category = categoryNames.value.category3 || 'Microscopy';
      } else {
        p.category = t.category;
      }
    }
    const idKey = (p.id || '').trim().toLowerCase();
    const nameKey = (p.name || '').trim().toLowerCase();
    if ((idKey && seenTplKeys.has('id:' + idKey)) || (nameKey && seenTplKeys.has('name:' + nameKey))) {
      return null;
    }
    if (idKey) seenTplKeys.add('id:' + idKey);
    if (nameKey) seenTplKeys.add('name:' + nameKey);
    return p;
  }).filter(Boolean));

  watch(templates, (v) => save('metafold_templates', v), { deep: true });

  const categories = computed(() => {
    const m = new Map();
    templates.value.forEach(t => m.set(t.category, (m.get(t.category) || 0) + 1));
    return [...m].map(([name, count]) => ({ name, count }));
  });

  const filteredTemplates = computed(() => {
    return templates.value.filter(t => t.category === selectedCategory.value);
  });

  const currentTemplate = computed(() => {
    return templates.value.find(t => t.id === selectedTemplateId.value);
  });

  const fieldTotal = (t) => (t?.fields || []).filter(f => f.type !== 'group').length;

  const upsert = (p) => {
    const cleanPName = (p.name || '').trim().toLowerCase();
    const i = templates.value.findIndex(t => 
      t.id === p.id || 
      (cleanPName && t.name && t.name.trim().toLowerCase() === cleanPName)
    );
    if (i >= 0) templates.value.splice(i, 1, p);
    else templates.value.push(p);
  };

  const hasTemplate = (idOrPath) => {
    if (!idOrPath) return false;
    const cleanPathName = String(idOrPath).replace(/^.*[\\\/]/, '').replace(/\.json$/i, '').trim().toLowerCase();
    return templates.value.some(t => 
      t.id === idOrPath || 
      t.id?.toLowerCase() === idOrPath.toLowerCase() ||
      (t.name && (t.name.trim().toLowerCase() === cleanPathName || t.name.trim().toLowerCase() === String(idOrPath).trim().toLowerCase()))
    );
  };

  const removeTemplate = (id) => {
    templates.value = templates.value.filter(t => t.id !== id);
    if (selectedTemplateId.value === id || !categories.value.some(c => c.name === selectedCategory.value)) {
      if (resetWizard) resetWizard();
    }
  };

  // GitHub Template Library
  const library = ref([]);
  const libLoading = ref(false);
  const libError = ref('');
  const showLibraryModal = ref(false);
  const librarySearch = ref('');
  const selectedLibraryPaths = ref([]);
  const isAddingLibrary = ref(false);

  const loadLibrary = async () => {
    libLoading.value = true;
    libError.value = '';
    try {
      const url = rawBase(config.value.libraryUrl) + 'templates-index.json?t=' + Date.now();
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) throw new Error('Index leer');

      const seenLib = new Set();
      library.value = data.filter(e => {
        const pathKey = (e.path || e.id || '').toLowerCase();
        const nameKey = (e.name || '').trim().toLowerCase();
        if ((pathKey && seenLib.has('p:' + pathKey)) || (nameKey && seenLib.has('n:' + nameKey))) {
          return false;
        }
        if (pathKey) seenLib.add('p:' + pathKey);
        if (nameKey) seenLib.add('n:' + nameKey);
        return true;
      });
    } catch (e) {
      libError.value = `${tr('Bibliothek konnte nicht geladen werden')} (${e.message}).`;
    } finally {
      libLoading.value = false;
    }
  };

  const filteredLibrary = computed(() => {
    const q = (librarySearch.value || '').trim().toLowerCase();
    if (!q) return library.value;
    return library.value.filter(e => 
      (e.name || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q)
    );
  });

  const selectAllUnsaved = () => {
    selectedLibraryPaths.value = filteredLibrary.value
      .filter(e => !hasTemplate(e.path))
      .map(e => e.path);
  };

  const openLibraryModal = async () => {
    showLibraryModal.value = true;
    selectedLibraryPaths.value = [];
    librarySearch.value = '';
    if (!library.value.length) {
      await loadLibrary();
    }
  };

  const addSelectedFromLibrary = async () => {
    if (!selectedLibraryPaths.value.length) return;
    isAddingLibrary.value = true;
    let added = 0;
    try {
      for (const p of selectedLibraryPaths.value) {
        const e = library.value.find(item => item.path === p);
        if (!e) continue;
        const res = await fetch(rawBase(config.value.libraryUrl) + e.path);
        if (!res.ok) continue;
        const parsed = parseTpl(await res.json(), e.path, e.name);
        if (parsed) {
          upsert(parsed);
          added++;
        }
      }
      if (added > 0) {
        flash(`✓ ${added} ${added === 1 ? tr('common.template') : tr('common.templates')} ${tr('common.savedSuccess')}!`);
        showLibraryModal.value = false;
        selectedLibraryPaths.value = [];
      } else {
        flash(tr('alerts.noValidTemplate'), false);
      }
    } catch (err) {
      flash(tr('common.error') + ': ' + err.message, false);
    } finally {
      isAddingLibrary.value = false;
    }
  };

  const addFromLibrary = async (e) => {
    try {
      const res = await fetch(rawBase(config.value.libraryUrl) + e.path);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const p = parseTpl(await res.json(), e.path, e.name);
      if (!p) throw new Error('Ungültiges Format');
      upsert(p);
      flash(`✓ „${p.name}“ ${tr('gespeichert')}`);
    } catch (err) {
      flash(tr('Fehler') + ': ' + err.message, false);
    }
  };

  const onFiles = async (ev) => {
    let n = 0;
    for (const f of [...ev.target.files]) {
      try {
        const raw = JSON.parse(await f.text());
        const list = Array.isArray(raw) ? raw : [raw];
        list.forEach((r, i) => {
          const p = parseTpl(r, 'file:' + f.name + (list.length > 1 ? '#' + i : ''), f.name.replace(/\.json$/i, ''));
          if (p) { upsert(p); n++; }
        });
      } catch (e) {
        console.warn('Datei übersprungen:', f.name, e);
      }
    }
    ev.target.value = '';
    n ? flash(`✓ ${n} ${tr(n > 1 ? 'Vorlagen' : 'Vorlage')} ${tr('gespeichert')}`) : flash(tr('Keine gültige Vorlage gefunden.'), false);
  };

  // Umbenennen Modal (Kategorien & Templates)
  const renameModal = ref({
    show: false,
    type: 'category', // 'category' | 'template'
    target: '',
    name: '',
    category: ''
  });
  const renameInputRef = ref(null);

  const availableCategories = computed(() => {
    const set = new Set();
    Object.values(categoryNames.value).forEach(v => {
      if (v && String(v).trim()) set.add(String(v).trim());
    });
    templates.value.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  });

  const openRenameCategory = (name) => {
    renameModal.value = {
      show: true,
      type: 'category',
      target: name,
      name: name,
      category: ''
    };
    nextTick(() => {
      renameInputRef.value?.focus();
      renameInputRef.value?.select();
    });
  };

  const openRenameTemplate = (tpl) => {
    renameModal.value = {
      show: true,
      type: 'template',
      target: tpl.id,
      name: tpl.name,
      category: tpl.category
    };
    nextTick(() => {
      renameInputRef.value?.focus();
      renameInputRef.value?.select();
    });
  };

  const closeRename = () => {
    renameModal.value.show = false;
  };

  const saveRename = () => {
    const newName = (renameModal.value.name || '').trim();
    if (!newName) return;

    if (renameModal.value.type === 'category') {
      const oldName = renameModal.value.target;
      if (newName !== oldName) {
        templates.value.forEach(t => {
          if (t.category === oldName) {
            t.category = newName;
          }
        });
        for (const [k, v] of Object.entries(categoryNames.value)) {
          if (v === oldName || k === oldName || (k === 'category3' && oldName === 'Microscopy')) {
            categoryNames.value[k] = newName;
          }
        }
        save('metafold_category_names', categoryNames.value);
        save('metafold_templates', templates.value);
        if (selectedCategory.value === oldName) {
          selectedCategory.value = newName;
        }
        flash(`✓ ${tr('rename.successCat', { name: newName })}`);
      }
    } else if (renameModal.value.type === 'template') {
      const tpl = templates.value.find(t => t.id === renameModal.value.target);
      if (tpl) {
        tpl.name = newName;
        if (renameModal.value.category) {
          tpl.category = renameModal.value.category;
        }
        save('metafold_templates', templates.value);
        flash(`✓ ${tr('rename.successTpl', { name: newName })}`);
      }
    }
    closeRename();
  };

  // eLabFTW Template Hub & Integration
  const elabftwTemplates = ref([]);
  const isFetchingElabftw = ref(false);
  const elabftwError = ref('');
  const showElabftwModal = ref(false);
  const elabftwSearch = ref('');
  const selectedElabftwIds = ref([]);
  const isImportingElabftw = ref(false);

  const filteredElabftw = computed(() => {
    const q = elabftwSearch.value.trim().toLowerCase();
    if (!q) return elabftwTemplates.value;
    return elabftwTemplates.value.filter(t => {
      const title = (t.title || t.name || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      return title.includes(q) || cat.includes(q) || desc.includes(q);
    });
  });

  const hasElabTemplate = (id) => {
    if (id == null) return false;
    const strId = String(id);
    return templates.value.some(t => 
      t.id === ('elabftw:' + strId) || 
      String(t.elabftwId) === strId ||
      String(t.raw?.elabftwId) === strId
    );
  };

  const fetchElabftwTemplates = async () => {
    isFetchingElabftw.value = true;
    elabftwError.value = '';
    try {
      if (!config.value?.n8nWebhookUrl) {
        throw new Error('Keine n8n Webhook-URL konfiguriert. Bitte in den Einstellungen unter „n8n Server“ eintragen.');
      }

      const payload = {
        action: 'get_elabftw_templates',
        client: 'MetaFold Mobile Terminal v4',
        auth: auth?.currentUser?.value ? {
          userId: auth.currentUser.value.id,
          pin: auth.currentUser.value.pin,
          badge_id: auth.currentUser.value.badge_id
        } : {}
      };

      const res = await fetch(config.value.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`n8n Webhook antwortet mit HTTP ${res.status} (${res.statusText})`);
      }

      const data = await res.json();
      if (data.status === 'error' || data.is_auth_error) {
        throw new Error(data.message || 'Fehler beim Abrufen der Vorlagen von n8n/eLabFTW.');
      }

      const list = Array.isArray(data.templates) ? data.templates 
        : Array.isArray(data) ? data 
        : (Array.isArray(data.items) ? data.items : null);

      if (list) {
        elabftwTemplates.value = list;
        if (list.length === 0) {
          elabftwError.value = data.message || 'eLabFTW hat 0 Vorlagen zurückgegeben. Bitte prüfe in eLabFTW, ob dein Account bzw. Team Vorlagen unter „Experimente > Vorlagen“ besitzt.';
        }
      } else {
        throw new Error(data.message || 'Ungültiges Antwortformat von n8n.');
      }
    } catch (e) {
      elabftwError.value = e.message;
      elabftwTemplates.value = [];
    } finally {
      isFetchingElabftw.value = false;
    }
  };

  const openElabftwModal = async () => {
    showElabftwModal.value = true;
    selectedElabftwIds.value = [];
    elabftwError.value = '';
    await fetchElabftwTemplates();
  };

  const closeElabftwModal = () => {
    showElabftwModal.value = false;
  };

  const selectAllUnsavedElabftw = () => {
    selectedElabftwIds.value = filteredElabftw.value
      .filter(t => !hasElabTemplate(t.id))
      .map(t => t.id);
  };

  const importSelectedElabftw = async () => {
    if (!selectedElabftwIds.value.length) return;
    isImportingElabftw.value = true;
    let added = 0;
    try {
      for (const id of selectedElabftwIds.value) {
        let tpl = elabftwTemplates.value.find(t => String(t.id) === String(id));
        // Falls Details noch geholt werden müssen
        if (tpl && (!tpl.metadata || !tpl.metadata.extra_fields) && config.value?.n8nWebhookUrl) {
          try {
            const res = await fetch(config.value.n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'get_elabftw_template_details',
                templateId: id,
                auth: auth?.currentUser?.value ? {
                  userId: auth.currentUser.value.id,
                  pin: auth.currentUser.value.pin
                } : {}
              })
            });
            if (res.ok) {
              const details = await res.json();
              if (details && (details.template || details.metadata)) {
                tpl = details.template || details;
              }
            }
          } catch (_) {}
        }
        if (tpl) {
          const parsed = parseElabFTWTemplate(tpl);
          if (parsed) {
            upsert(parsed);
            added++;
          }
        }
      }
      if (added > 0) {
        flash(`✓ ${added} eLabFTW-${added === 1 ? 'Vorlage' : 'Vorlagen'} ${tr('common.savedSuccess')}!`);
        showElabftwModal.value = false;
        selectedElabftwIds.value = [];
      } else {
        flash(tr('alerts.noValidTemplate'), false);
      }
    } catch (err) {
      flash(tr('common.error') + ': ' + err.message, false);
    } finally {
      isImportingElabftw.value = false;
    }
  };

  return {
    categoryNames,
    onCategorySettingChange,
    templates,
    categories,
    filteredTemplates,
    currentTemplate,
    fieldTotal,
    hasTemplate,
    upsert,
    removeTemplate,
    onFiles,
    // Bibliothek (GitHub)
    library,
    libLoading,
    libError,
    showLibraryModal,
    librarySearch,
    selectedLibraryPaths,
    isAddingLibrary,
    filteredLibrary,
    loadLibrary,
    openLibraryModal,
    selectAllUnsaved,
    addSelectedFromLibrary,
    addFromLibrary,
    // eLabFTW Templates
    elabftwTemplates,
    isFetchingElabftw,
    elabftwError,
    showElabftwModal,
    elabftwSearch,
    filteredElabftw,
    selectedElabftwIds,
    isImportingElabftw,
    hasElabTemplate,
    fetchElabftwTemplates,
    openElabftwModal,
    closeElabftwModal,
    selectAllUnsavedElabftw,
    importSelectedElabftw,
    // Rename
    renameModal,
    renameInputRef,
    availableCategories,
    openRenameCategory,
    openRenameTemplate,
    closeRename,
    saveRename,
    prettyCat: (c) => prettyCat(c, categoryNames.value)
  };
}
