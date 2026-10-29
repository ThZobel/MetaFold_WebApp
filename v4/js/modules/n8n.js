/**
 * MetaFold Mobile Terminal v4 - n8n Webhook & AI Assistant Module
 */

import { ref, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { formatFieldValue } from '../utils/helpers.js';

export function createN8n({
  config,
  auth,
  tr,
  flash,
  currentTemplate,
  formData,
  generalNote,
  activeIntegrations,
  integrationOn,
  resetWizard,
  openSettings
}) {
  const n8nTestStatus = ref(null);
  const isTestingN8n = ref(false);
  const isSubmitting = ref(false);
  const sendError = ref('');
  const serverEchoData = ref(null);
  const submitMode = ref('');
  const aiDraft = ref(null);
  const editingAiField = ref(null);
  const sent = ref(false);

  const testN8nConnection = async () => {
    if (!config.value.n8nWebhookUrl) {
      n8nTestStatus.value = {
        ok: false,
        message: 'Keine URL angegeben',
        details: 'Bitte trage zuerst eine gültige n8n Webhook-URL ein.'
      };
      return;
    }
    isTestingN8n.value = true;
    n8nTestStatus.value = null;
    const url = config.value.n8nWebhookUrl.trim();

    // Mixed Content Check
    if (window.location.protocol === 'https:' && url.startsWith('http:')) {
      n8nTestStatus.value = {
        ok: false,
        message: 'Mixed-Content-Blockade (HTTPS -> HTTP)',
        details: 'Die PWA läuft über eine sichere HTTPS-Verbindung. Browser blockieren unverschlüsselte HTTP-Verbindungen. Bitte binde n8n über HTTPS an (z. B. https://... oder über n8n Cloud / Reverse Proxy).'
      };
      isTestingN8n.value = false;
      return;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping', client: 'MetaFold Mobile Terminal v4' })
      });

      if (!res.ok) {
        n8nTestStatus.value = {
          ok: false,
          message: `HTTP-Fehler ${res.status}`,
          details: res.status === 404
            ? 'Webhook nicht gefunden (HTTP 404).\nPrüfe die URL und stelle sicher, dass der Workflow in n8n oben rechts auf „Active“ geschaltet ist (bei /webhook/...) bzw. im Test-Modus aktiv ist.'
            : `n8n antwortete mit Fehlerstatus HTTP ${res.status}.`
        };
        return;
      }

      const data = await res.json().catch(() => null);
      n8nTestStatus.value = {
        ok: true,
        message: data?.message || 'Verbindung zu n8n erfolgreich!',
        details: 'Der Webhook ist erreichbar und antwortet mit korrekten CORS-Headern.'
      };
    } catch (err) {
      const isFetchFail = err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'));
      n8nTestStatus.value = {
        ok: false,
        message: isFetchFail ? 'Verbindungsfehler (Failed to fetch)' : ('Fehler: ' + err.message),
        details: 'Mögliche Ursachen:\n' +
          '1. Ist der Workflow in n8n aktiv? (Oben rechts Schalter auf „Active“, falls /webhook/... genutzt wird; oder im Bearbeitungsmodus auf „Test step“ klicken, falls /webhook-test/... genutzt wird).\n' +
          '2. Ist n8n über das Netzwerk/WLAN von diesem Mobilgerät erreichbar?\n' +
          '3. Bei selbst gehostetem n8n: Verwende HTTPS oder prüfe CORS-Einstellungen.'
      };
    } finally {
      isTestingN8n.value = false;
    }
  };

  const aiDraftRows = computed(() => {
    if (!aiDraft.value || !aiDraft.value.metadata) return [];
    return Object.entries(aiDraft.value.metadata)
      .filter(([k, v]) => v !== '' && v != null && (!Array.isArray(v) || v.length > 0))
      .map(([key, value]) => {
        const field = currentTemplate.value?.fields.find(f => f.key === key) || { key, label: key, type: 'text' };
        return {
          key,
          label: field.label || key,
          field,
          value: formatFieldValue(field, value, tr)
        };
      });
  });

  const toggleAiMulti = (key, opt) => {
    if (!aiDraft.value) return;
    if (!aiDraft.value.metadata) aiDraft.value.metadata = {};
    const arr = Array.isArray(aiDraft.value.metadata[key]) ? [...aiDraft.value.metadata[key]] : [];
    const idx = arr.indexOf(opt);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(opt);
    aiDraft.value.metadata[key] = arr;
  };

  const sendPayload = async (mode = 'direct') => {
    if (!auth.currentUser.value) {
      auth.openLogin();
      return;
    }
    if (!config.value.n8nWebhookUrl) {
      alert(tr('settings.n8nMissing') || 'Bitte trage in den Einstellungen (⚙️) eine n8n Webhook URL ein.');
      if (openSettings) openSettings();
      return;
    }
    isSubmitting.value = true;
    sendError.value = '';
    serverEchoData.value = null;
    submitMode.value = mode;

    try {
      const payload = {
        action: mode,
        timestamp: new Date().toISOString(),
        auth: {
          userId: auth.currentUser.value.id,
          pin: auth.currentUser.value.pin
        },
        user: {
          id: auth.currentUser.value.id,
          name: auth.currentUser.value.name
        },
        template: {
          id: currentTemplate.value.id,
          name: currentTemplate.value.name,
          category: currentTemplate.value.category,
          fields: (currentTemplate.value.fields || []).map(f => ({
            key: f.key,
            label: f.label,
            type: f.type,
            options: f.options || [],
            description: f.description || ''
          }))
        },
        metadata: formData.value,
        general_note: generalNote.value,
        integrations: Object.fromEntries(activeIntegrations.value.map(i => [i.id, integrationOn(i.id)]))
      };

      const res = await fetch(config.value.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const echo = await res.json().catch(() => null);
      serverEchoData.value = echo;

      if (mode === 'ai_assistant' && echo && (echo.ai_draft || echo.draft || echo.status === 'ai_draft')) {
        const d = echo.ai_draft || echo.draft || {};
        if (typeof d === 'string') {
          aiDraft.value = {
            title: echo.title || currentTemplate.value?.name || '',
            metadata: { ...formData.value },
            additional_notes: d
          };
        } else {
          aiDraft.value = {
            title: d.title || (echo.title ?? currentTemplate.value?.name ?? ''),
            metadata: (d.metadata && typeof d.metadata === 'object') ? { ...d.metadata } : { ...formData.value },
            additional_notes: d.additional_notes || d.notes || d.text || ''
          };
        }
        editingAiField.value = null;
      } else {
        sent.value = true;
        if (auth.autoLogoutAfterSend.value) {
          setTimeout(() => {
            auth.logout();
            if (resetWizard) resetWizard();
          }, 2500);
        }
      }
    } catch (err) {
      let msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = 'Verbindungsfehler (Failed to fetch). Bitte prüfe in den Einstellungen (⚙️), ob n8n erreichbar und der Workflow aktiv ist.';
      }
      sendError.value = (tr('alerts.sendError') || 'Fehler beim Senden') + ': ' + msg;
    } finally {
      isSubmitting.value = false;
    }
  };

  const approveAiDraft = async () => {
    if (!auth.currentUser.value) {
      auth.openLogin();
      return;
    }
    if (!config.value.n8nWebhookUrl) return;
    isSubmitting.value = true;
    sendError.value = '';

    try {
      if (aiDraft.value?.metadata) {
        formData.value = { ...formData.value, ...aiDraft.value.metadata };
      }
      const payload = {
        action: 'approve_and_create',
        timestamp: new Date().toISOString(),
        auth: {
          userId: auth.currentUser.value.id,
          pin: auth.currentUser.value.pin
        },
        user: {
          id: auth.currentUser.value.id,
          name: auth.currentUser.value.name
        },
        template: {
          id: currentTemplate.value.id,
          name: currentTemplate.value.name,
          category: currentTemplate.value.category,
          fields: (currentTemplate.value.fields || []).map(f => ({
            key: f.key,
            label: f.label,
            type: f.type,
            options: f.options || [],
            description: f.description || ''
          }))
        },
        metadata: aiDraft.value?.metadata || formData.value,
        general_note: generalNote.value,
        ai_draft: aiDraft.value,
        integrations: Object.fromEntries(activeIntegrations.value.map(i => [i.id, integrationOn(i.id)]))
      };

      const res = await fetch(config.value.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const echo = await res.json().catch(() => null);
      serverEchoData.value = echo;
      aiDraft.value = null;
      editingAiField.value = null;
      sent.value = true;

      if (auth.autoLogoutAfterSend.value) {
        setTimeout(() => {
          auth.logout();
          if (resetWizard) resetWizard();
        }, 2500);
      }
    } catch (err) {
      let msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = 'Verbindungsfehler (Failed to fetch). Bitte prüfe in den Einstellungen (⚙️), ob n8n erreichbar und der Workflow aktiv ist.';
      }
      sendError.value = (tr('alerts.sendError') || 'Fehler beim Senden') + ': ' + msg;
    } finally {
      isSubmitting.value = false;
    }
  };

  const discardAiDraft = () => {
    aiDraft.value = null;
    editingAiField.value = null;
  };

  return {
    n8nTestStatus,
    isTestingN8n,
    testN8nConnection,
    isSubmitting,
    sendError,
    serverEchoData,
    submitMode,
    aiDraft,
    editingAiField,
    aiDraftRows,
    toggleAiMulti,
    sent,
    sendPayload,
    approveAiDraft,
    discardAiDraft
  };
}
