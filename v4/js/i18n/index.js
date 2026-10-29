/**
 * MetaFold Mobile Terminal v4 - i18n Translation Engine
 */

import { ref, watch } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import de from './de.js';
import en from './en.js';

const MESSAGES = { de, en };

// Legacy Fallback-Wörterbuch für abwärtskompatible Freitext-Aufrufe wie tr('Kategorie')
const EN_FALLBACK = {
  'Kategorie':'Category','Vorlage':'Template','Vorlagen':'Templates','Erfassen':'Record','Senden':'Send',
  'Was möchtest du erfassen?':'What do you want to record?','Kategorie wählen':'Choose category','Vorlage wählen':'Choose template',
  'Auf diesem Gerät sind noch keine Vorlagen gespeichert.':'No templates saved on this device yet.',
  'Aus Bibliothek wählen':'Choose from library','Datei laden':'Load file','Felder':'fields','Feldern ausgefüllt':'fields filled','von':'of',
  'Allgemeine Sprachnotiz':'General voice note','Aufnehmen':'Record','Stopp':'Stop',
  'Frei sprechen oder tippen: Besonderheiten, Probleme, Beobachtungen …':'Speak or type: notes, issues, observations …',
  'Auswählen':'Select','Ja':'Yes','Diktieren':'Dictate','Hört zu …':'Listening …',
  'Erfolgreich übertragen!':'Sent successfully!','Neue Erfassung':'New entry','Prüfen & senden':'Review & send','Sprachnotiz':'Voice note',
  'Noch nichts erfasst.':'Nothing recorded yet.','Pflichtfelder fehlen:':'Required fields missing:','Zurück zum Formular':'Back to form',
  'Wird übertragen …':'Sending …','Metadaten übertragen':'Send metadata','Zurück':'Back','Weiter':'Next',
  'Einstellungen':'Settings','Fertig':'Done','Sprache':'Language','Integrationen':'Integrations',
  'Aktivierte Integrationen erscheinen nach dem Erfassen zum An-/Abschalten. n8n führt sie anschließend aus.':'Enabled integrations appear after recording so you can switch them on or off. n8n then runs them.',
  'Elektronisches Laborbuch':'Electronic lab notebook','Bilddatenmanagement':'Image data management',
  'Template-Bibliothek':'Template library','GitHub-Repository mit':'GitHub repository with','Lade …':'Loading …','Bibliothek laden':'Load library',
  'Bibliothek konnte nicht geladen werden':'Library could not be loaded','Gespeichert':'Saved','Hinzufügen':'Add','gespeichert':'saved',
  'MetaFold-Template (.json) von deinem Laufwerk oder Share wählen. Es wird auf diesem Gerät gespeichert.':'Pick a MetaFold template (.json) from your drive or share. It is stored on this device.',
  'JSON-Datei wählen':'Choose JSON file','Meine Vorlagen':'My templates','Noch keine gespeichert.':'None saved yet.','Entfernen':'Remove',
  'Fehler':'Error','Fehler beim Senden':'Error while sending','Keine gültige Vorlage gefunden.':'No valid template found.',
  'Spracherkennung erfordert eine sichere Verbindung (HTTPS)!':'Speech recognition requires a secure connection (HTTPS)!',
  'Dieser Browser unterstützt keine direkte Spracherkennung.':'This browser does not support speech recognition.',
  'Bitte trage in den Einstellungen (⚙️) eine n8n Webhook URL ein.':'Please enter an n8n webhook URL in the settings (⚙️).',
  'QR-Code oder Barcode in den Rahmen halten':'Hold QR code or barcode inside the frame','Abbrechen':'Cancel','Schließen':'Close',
  'Tag eingeben, Enter oder Komma':'Type a tag, Enter or comma','Kamera erfordert HTTPS und Browser-Unterstützung.':'Camera requires HTTPS and browser support.',
  'Kamera nicht verfügbar':'Camera not available','Vorlagen wurden aktualisiert – bitte neu laden.':'Templates were updated – please reload them.'
};

export function createI18n() {
  const initialLang = localStorage.getItem('metafold_lang') || 
    ((navigator.language || 'de').startsWith('de') ? 'de' : 'en');
  
  const lang = ref(initialLang);

  /**
   * Main translation function with dot-notation and parameter interpolation:
   * tr('auth.loginSuccess', { name: 'Alice' })
   */
  const tr = (path, params = {}) => {
    if (path == null) return '';
    if (typeof path !== 'string') return String(path);
    const current = lang.value || 'de';

    // 1. Suche in strukturierten Messages
    let val = path.split('.').reduce((o, k) => o?.[k], MESSAGES[current]);

    // 2. Fallback auf Englisch
    if (val === undefined && current !== 'en') {
      val = path.split('.').reduce((o, k) => o?.[k], MESSAGES.en);
    }

    // 3. Fallback auf Legacy Freitext
    if (val === undefined) {
      val = (current === 'en' && EN_FALLBACK[path]) ? EN_FALLBACK[path] : path;
    }

    // 4. Parameter ersetzen {name}
    if (typeof val === 'string' && params && typeof params === 'object') {
      for (const [k, v] of Object.entries(params)) {
        val = val.replace(new RegExp(`{${k}}`, 'g'), v);
      }
    }

    return val ?? path;
  };

  const t = tr; // Alias

  watch(lang, (v) => {
    localStorage.setItem('metafold_lang', v);
    document.documentElement.lang = v;
  }, { immediate: true });

  return {
    lang,
    tr,
    t,
    MESSAGES
  };
}
