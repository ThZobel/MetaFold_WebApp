/**
 * MetaFold Mobile Terminal v4 - Main Application Entry Point
 * 
 * Modular Vue 3 architecture combining auth, integrations, templates, speech, scanner, and n8n services.
 */

import { createApp, ref, computed, watch, nextTick } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { createI18n } from './i18n/index.js';
import { load, save, isEmpty, formatFieldValue, createLongPressController, formatTimer } from './utils/helpers.js';
import { createAuth } from './modules/auth.js';
import { createIntegrations } from './modules/integrations.js';
import { createTemplates, DEFAULT_LIB } from './modules/templates.js';
import { createScanner } from './modules/scanner.js';
import { createSpeech } from './modules/speech.js';
import { createN8n } from './modules/n8n.js';

const app = createApp({
  setup() {
    // 1. Internationalization (i18n)
    const { lang, tr, t } = createI18n();

    // 2. Global Toast Notification System
    const toast = ref('');
    const toastOk = ref(true);
    let toastTimer = null;
    const flash = (msg, ok = true) => {
      toast.value = msg;
      toastOk.value = ok;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.value = ''; }, 3500);
    };

    // 3. Central Configuration
    const config = ref({
      libraryUrl: localStorage.getItem('metafold_library_url') || DEFAULT_LIB,
      n8nWebhookUrl: localStorage.getItem('metafold_n8n_url') || '',
      whisperWebhookUrl: localStorage.getItem('metafold_whisper_url') || ''
    });

    // 4. Modal Settings State & Collapsible Sticky Accordions (Apple / Android Style)
    const showSettings = ref(false);
    const openSections = ref({
      auth: true,
      lang: true,
      integrations: true,
      templateHub: true,
      myTemplates: true,
      categories: true,
      server: true
    });
    const toggleSection = (sec) => {
      openSections.value[sec] = !openSections.value[sec];
    };
    const expandAllSections = () => {
      Object.keys(openSections.value).forEach(k => { openSections.value[k] = true; });
    };
    const collapseAllSections = () => {
      Object.keys(openSections.value).forEach(k => { openSections.value[k] = false; });
    };

    const openSettings = () => {
      showSettings.value = true;
      if (templatesModule && !templatesModule.library.value.length) {
        templatesModule.loadLibrary();
      }
    };
    const closeSettings = () => {
      save('metafold_library_url', config.value.libraryUrl);
      save('metafold_n8n_url', config.value.n8nWebhookUrl);
      save('metafold_whisper_url', config.value.whisperWebhookUrl || '');
      if (templatesModule) {
        save('metafold_category_names', templatesModule.categoryNames.value);
      }
      showSettings.value = false;
    };

    // 5. Wizard Navigation & Form State
    const stepLabels = ['steps.category', 'steps.template', 'steps.capture', 'steps.send'];
    const step = ref(1);
    const selectedCategory = ref('');
    const selectedTemplateId = ref('');
    const formData = ref({});
    const generalNote = ref('');
    const editingField = ref(null);
    const tagDraft = ref({});

    const canGo = (n) => !n8nModule?.sent.value && (n === 1 || (n === 2 && !!selectedCategory.value) || (n >= 3 && !!templatesModule?.currentTemplate.value));
    const goStep = (n) => { if (canGo(n)) step.value = n; };

    const initForm = () => {
      formData.value = {};
      const current = templatesModule?.currentTemplate.value;
      (current?.fields || []).forEach(f => {
        if (f.type === 'group') return;
        const d = f.defaultValue ?? '';
        formData.value[f.key] = Array.isArray(d) ? [...d] : d;
      });
    };

    const pickCategory = (c) => {
      selectedCategory.value = c;
      step.value = 2;
    };

    const pickTemplate = (id) => {
      const changed = id !== selectedTemplateId.value;
      selectedTemplateId.value = id;
      if (changed) initForm();
      step.value = 3;
    };

    const resetWizard = () => {
      if (n8nModule) {
        n8nModule.sent.value = false;
        n8nModule.serverEchoData.value = null;
        n8nModule.sendError.value = '';
        n8nModule.submitMode.value = '';
        n8nModule.aiDraft.value = null;
        n8nModule.editingAiField.value = null;
      }
      step.value = 1;
      selectedCategory.value = '';
      selectedTemplateId.value = '';
      formData.value = {};
      generalNote.value = '';
      editingField.value = null;
      if (integrationsModule) {
        integrationsModule.integrationChoice.value = {};
      }
    };

    // Tags & Form Inputs Handlers
    const addTags = (key, raw) => {
      const cur = formData.value[key] || [];
      String(raw).split(/[,;\n]/).map(x => x.trim()).filter(Boolean).forEach(p => {
        if (!cur.includes(p)) cur.push(p);
      });
      formData.value[key] = cur;
    };

    const commitTag = (key) => {
      addTags(key, tagDraft.value[key] || '');
      tagDraft.value[key] = '';
    };

    const onTagInput = (key, e) => {
      let v = e.target.value;
      if (/[,;]/.test(v)) {
        const parts = v.split(/[,;]/);
        v = parts.pop();
        addTags(key, parts.join(','));
        e.target.value = v;
      }
      tagDraft.value[key] = v;
    };

    const removeTag = (key, i) => {
      formData.value[key]?.splice(i, 1);
    };

    const setRating = (key, n) => {
      formData.value[key] = formData.value[key] === n ? 0 : n;
    };

    const toggleMulti = (key, o) => {
      const cur = formData.value[key] || [];
      const i = cur.indexOf(o);
      if (i >= 0) cur.splice(i, 1);
      else cur.push(o);
      formData.value[key] = cur;
    };

    // 6. Initialize Modules
    const authModule = createAuth({ config, flash, tr, openSettings });
    const integrationsModule = createIntegrations({ tr, flash });
    const templatesModule = createTemplates({ flash, tr, config, auth: authModule, resetWizard, selectedCategory, selectedTemplateId });
    const scannerModule = createScanner({
      tr,
      flash,
      auth: authModule,
      formData,
      currentTemplate: templatesModule.currentTemplate,
      addTags
    });
    const speechModule = createSpeech({
      tr,
      flash,
      config,
      lang,
      formData,
      generalNote,
      currentTemplate: templatesModule.currentTemplate,
      openSettings
    });
    const n8nModule = createN8n({
      config,
      auth: authModule,
      tr,
      flash,
      currentTemplate: templatesModule.currentTemplate,
      formData,
      generalNote,
      activeIntegrations: integrationsModule.activeIntegrations,
      integrationOn: integrationsModule.integrationOn,
      resetWizard,
      openSettings
    });

    // 7. Touch & Mouse Long-Press Controller
    const { startLongPress, cancelLongPress, endLongPress, onCardClick } = createLongPressController();

    // 8. Computed Summary & Validation
    const summaryRows = computed(() => {
      const current = templatesModule.currentTemplate.value;
      return (current?.fields || [])
        .filter(f => f.type !== 'group')
        .map(f => {
          const v = formData.value[f.key];
          return {
            key: f.key,
            label: f.label || f.key,
            field: f,
            value: formatFieldValue(f, v, tr)
          };
        })
        .filter(r => r.value !== '' && r.value != null);
    });

    const missingRequired = computed(() => {
      const current = templatesModule.currentTemplate.value;
      return (current?.fields || [])
        .filter(f => f.required && f.type !== 'group' && isEmpty(formData.value[f.key]));
    });

    // 9. Global Escape Listener for Modal Navigation
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (scannerModule.scanning.value) { scannerModule.stopScan(); return; }
        if (templatesModule.showElabftwModal.value) { templatesModule.closeElabftwModal(); return; }
        if (templatesModule.showLibraryModal.value) { templatesModule.showLibraryModal.value = false; return; }
        if (templatesModule.renameModal.value.show) { templatesModule.closeRename(); return; }
        if (authModule.showUserMenuModal.value) { authModule.showUserMenuModal.value = false; return; }
        if (authModule.showLoginModal.value) { authModule.closeLogin(); return; }
        if (showSettings.value) { closeSettings(); return; }
      }
    });

    return {
      // General & i18n
      lang,
      tr,
      t,
      toast,
      toastOk,
      flash,
      config,
      showSettings,
      openSettings,
      closeSettings,

      // Settings Accordion Navigation (Apple / Android Style)
      openSections,
      toggleSection,
      expandAllSections,
      collapseAllSections,

      // Navigation & Wizard
      stepLabels,
      step,
      canGo,
      goStep,
      pickCategory,
      pickTemplate,
      resetWizard,
      selectedCategory,
      selectedTemplateId,
      formData,
      generalNote,
      editingField,
      tagDraft,
      onTagInput,
      commitTag,
      removeTag,
      setRating,
      toggleMulti,
      summaryRows,
      missingRequired,
      formatTimer,

      // Long Press
      startLongPress,
      cancelLongPress,
      endLongPress,
      onCardClick,

      // Auth Module
      currentUser: authModule.currentUser,
      showLoginModal: authModule.showLoginModal,
      showUserMenuModal: authModule.showUserMenuModal,
      loginStep: authModule.loginStep,
      loginIdentifier: authModule.loginIdentifier,
      loginPin: authModule.loginPin,
      isLoggingIn: authModule.isLoggingIn,
      loginError: authModule.loginError,
      isNfcListening: authModule.isNfcListening,
      autoLogoutAfterSend: authModule.autoLogoutAfterSend,
      loginInputRef: authModule.loginInputRef,
      proceedToPin: authModule.proceedToPin,
      pressPinDigit: authModule.pressPinDigit,
      openLogin: authModule.openLogin,
      closeLogin: authModule.closeLogin,
      switchUser: authModule.switchUser,
      logout: authModule.logout,
      openUserMenu: authModule.openUserMenu,
      submitLogin: authModule.submitLogin,
      startWebNfcScan: authModule.startWebNfcScan,

      // Integrations Module
      availableIntegrations: integrationsModule.availableIntegrations,
      activeIntegrations: integrationsModule.activeIntegrations,
      enabledIntegrations: integrationsModule.enabledIntegrations,
      integrationChoice: integrationsModule.integrationChoice,
      integrationOn: integrationsModule.integrationOn,
      serverCapabilities: integrationsModule.serverCapabilities,
      isDiscovering: integrationsModule.isDiscovering,
      discoverServerCapabilities: () => integrationsModule.discoverServerCapabilities(config.value.n8nWebhookUrl),

      // Templates Module
      categoryNames: templatesModule.categoryNames,
      onCategorySettingChange: templatesModule.onCategorySettingChange,
      templates: templatesModule.templates,
      categories: templatesModule.categories,
      filteredTemplates: templatesModule.filteredTemplates,
      currentTemplate: templatesModule.currentTemplate,
      fieldTotal: templatesModule.fieldTotal,
      hasTemplate: templatesModule.hasTemplate,
      upsert: templatesModule.upsert,
      removeTemplate: templatesModule.removeTemplate,
      onFiles: templatesModule.onFiles,
      library: templatesModule.library,
      libLoading: templatesModule.libLoading,
      libError: templatesModule.libError,
      showLibraryModal: templatesModule.showLibraryModal,
      librarySearch: templatesModule.librarySearch,
      selectedLibraryPaths: templatesModule.selectedLibraryPaths,
      isAddingLibrary: templatesModule.isAddingLibrary,
      filteredLibrary: templatesModule.filteredLibrary,
      loadLibrary: templatesModule.loadLibrary,
      openLibraryModal: templatesModule.openLibraryModal,
      selectAllUnsaved: templatesModule.selectAllUnsaved,
      addSelectedFromLibrary: templatesModule.addSelectedFromLibrary,
      addFromLibrary: templatesModule.addFromLibrary,
      // eLabFTW Templates
      elabftwTemplates: templatesModule.elabftwTemplates,
      isFetchingElabftw: templatesModule.isFetchingElabftw,
      elabftwError: templatesModule.elabftwError,
      showElabftwModal: templatesModule.showElabftwModal,
      elabftwSearch: templatesModule.elabftwSearch,
      filteredElabftw: templatesModule.filteredElabftw,
      selectedElabftwIds: templatesModule.selectedElabftwIds,
      isImportingElabftw: templatesModule.isImportingElabftw,
      hasElabTemplate: templatesModule.hasElabTemplate,
      fetchElabftwTemplates: templatesModule.fetchElabftwTemplates,
      openElabftwModal: templatesModule.openElabftwModal,
      closeElabftwModal: templatesModule.closeElabftwModal,
      selectAllUnsavedElabftw: templatesModule.selectAllUnsavedElabftw,
      importSelectedElabftw: templatesModule.importSelectedElabftw,
      // Rename
      renameModal: templatesModule.renameModal,
      renameInputRef: templatesModule.renameInputRef,
      availableCategories: templatesModule.availableCategories,
      openRenameCategory: templatesModule.openRenameCategory,
      openRenameTemplate: templatesModule.openRenameTemplate,
      closeRename: templatesModule.closeRename,
      saveRename: templatesModule.saveRename,
      prettyCat: templatesModule.prettyCat,

      // Scanner Module
      scanning: scannerModule.scanning,
      scanVideo: scannerModule.scanVideo,
      scanable: scannerModule.scanable,
      openScan: scannerModule.openScan,
      stopScan: scannerModule.stopScan,
      startLoginQrScan: scannerModule.startLoginQrScan,

      // Speech Module
      speechMode: speechModule.speechMode,
      setSpeechMode: speechModule.setSpeechMode,
      activeSpeechField: speechModule.activeSpeechField,
      isRecordingAudio: speechModule.isRecordingAudio,
      isTranscribing: speechModule.isTranscribing,
      recordingTarget: speechModule.recordingTarget,
      recordingSeconds: speechModule.recordingSeconds,
      isRecordingNow: speechModule.isRecordingNow,
      handleSpeechAction: speechModule.handleSpeechAction,
      toggleSpeech: speechModule.toggleBrowserSpeech,

      // n8n Webhook & AI Module
      n8nTestStatus: n8nModule.n8nTestStatus,
      isTestingN8n: n8nModule.isTestingN8n,
      testN8nConnection: () => n8nModule.testN8nConnection(),
      isSubmitting: n8nModule.isSubmitting,
      sendError: n8nModule.sendError,
      serverEchoData: n8nModule.serverEchoData,
      submitMode: n8nModule.submitMode,
      aiDraft: n8nModule.aiDraft,
      editingAiField: n8nModule.editingAiField,
      aiDraftRows: n8nModule.aiDraftRows,
      toggleAiMulti: n8nModule.toggleAiMulti,
      sent: n8nModule.sent,
      sendPayload: n8nModule.sendPayload,
      approveAiDraft: n8nModule.approveAiDraft,
      discardAiDraft: n8nModule.discardAiDraft
    };
  }
});

app.mount('#app');
