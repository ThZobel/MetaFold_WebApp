/**
 * MetaFold Mobile Terminal v4 - Authentication & User Management Module
 */

import { ref, watch, nextTick } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { load, save, remove } from '../utils/helpers.js';

export function createAuth({ config, flash, tr, openSettings }) {
  const currentUser = ref(load('metafold_current_user', null));
  const showLoginModal = ref(!currentUser.value);
  const showUserMenuModal = ref(false);
  const loginStep = ref(1); // 1 = identifier, 2 = PIN
  const loginIdentifier = ref('');
  const loginPin = ref('');
  const isLoggingIn = ref(false);
  const loginError = ref('');
  const isNfcListening = ref(false);
  const autoLogoutAfterSend = ref(load('metafold_autologout', false));
  const loginInputRef = ref(null);

  watch(autoLogoutAfterSend, (v) => save('metafold_autologout', v));

  const proceedToPin = () => {
    if (!loginIdentifier.value.trim()) return;
    loginStep.value = 2;
    loginPin.value = '';
    loginError.value = '';
  };

  const pressPinDigit = (d) => {
    if (loginPin.value.length < 6) {
      loginPin.value += String(d);
      if (loginPin.value.length === 4) {
        submitLogin();
      }
    }
  };

  const openLogin = () => {
    loginStep.value = 1;
    loginIdentifier.value = '';
    loginPin.value = '';
    loginError.value = '';
    showLoginModal.value = true;
    nextTick(() => {
      loginInputRef.value?.focus();
    });
  };

  const closeLogin = () => {
    showLoginModal.value = false;
    loginStep.value = 1;
    loginPin.value = '';
    loginError.value = '';
    isNfcListening.value = false;
  };

  const switchUser = () => {
    showUserMenuModal.value = false;
    openLogin();
  };

  const logout = () => {
    currentUser.value = null;
    remove('metafold_current_user');
    showUserMenuModal.value = false;
    openLogin();
  };

  const openUserMenu = () => {
    showUserMenuModal.value = true;
  };

  const submitLogin = async () => {
    if (!loginIdentifier.value.trim() || !loginPin.value) return;
    if (!config.value.n8nWebhookUrl) {
      loginError.value = tr('settings.n8nMissing') || 'Bitte zuerst in den Einstellungen (⚙️) die n8n Webhook-URL eintragen.';
      return;
    }
    isLoggingIn.value = true;
    loginError.value = '';
    const url = config.value.n8nWebhookUrl.trim();

    if (window.location.protocol === 'https:' && url.startsWith('http:')) {
      loginError.value = 'Mixed Content: HTTPS -> HTTP blockiert. Bitte n8n über HTTPS konfigurieren.';
      isLoggingIn.value = false;
      return;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          identifier: loginIdentifier.value.trim(),
          pin: loginPin.value.trim()
        })
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Webhook nicht gefunden (HTTP 404). Ist der Workflow in n8n aktiv?');
        }
        throw new Error('HTTP ' + res.status);
      }

      const data = await res.json().catch(() => null);
      if (data && (data.status === 'success' || data.authenticated === true)) {
        currentUser.value = {
          id: data.user?.id || loginIdentifier.value.trim(),
          name: data.user?.name || loginIdentifier.value.trim(),
          badge_id: data.user?.badge_id || loginIdentifier.value.trim(),
          pin: loginPin.value.trim()
        };
        save('metafold_current_user', currentUser.value);
        showLoginModal.value = false;
        loginPin.value = '';
        loginError.value = '';
        flash(tr('auth.loginSuccess', { name: currentUser.value.name }), true);
      } else {
        loginError.value = data?.message || tr('auth.loginFailed');
        loginPin.value = '';
      }
    } catch (err) {
      let msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = 'Verbindungsfehler (Failed to fetch). Prüfe in den Einstellungen (⚙️), ob n8n erreichbar und der Workflow aktiv ist.';
      }
      loginError.value = msg;
      loginPin.value = '';
    } finally {
      isLoggingIn.value = false;
    }
  };

  const startWebNfcScan = async () => {
    if (!('NDEFReader' in window)) {
      flash(tr('auth.nfcUnsupported'), false);
      return;
    }
    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();
      isNfcListening.value = true;
      flash(tr('auth.nfcListening'), true);
      ndef.onreading = (event) => {
        isNfcListening.value = false;
        let text = '';
        if (event.message?.records) {
          for (const record of event.message.records) {
            if (record.recordType === 'text') {
              const textDecoder = new TextDecoder(record.encoding || 'utf-8');
              text = textDecoder.decode(record.data);
            }
          }
        }
        const val = text || event.serialNumber || '';
        if (val) {
          navigator.vibrate?.([50, 50, 50]);
          loginIdentifier.value = val;
          proceedToPin();
        }
      };
      ndef.onreadingerror = () => {
        flash('NFC Lesefehler – bitte erneut versuchen.', false);
      };
    } catch (err) {
      isNfcListening.value = false;
      flash('NFC: ' + err.message, false);
    }
  };

  return {
    currentUser,
    showLoginModal,
    showUserMenuModal,
    loginStep,
    loginIdentifier,
    loginPin,
    isLoggingIn,
    loginError,
    isNfcListening,
    autoLogoutAfterSend,
    loginInputRef,
    proceedToPin,
    pressPinDigit,
    openLogin,
    closeLogin,
    switchUser,
    logout,
    openUserMenu,
    submitLogin,
    startWebNfcScan
  };
}
