/**
 * MetaFold Mobile Terminal v4 - Dynamic Integrations & Server Capability Discovery
 * 
 * Ermöglicht die automatische Erkennung der auf dem n8n-Server bereitgestellten Module
 * (z. B. eLabFTW, OMERO, RSpace, Local Storage, LLM-Assistent).
 */

import { ref, computed, watch } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { load, save } from '../utils/helpers.js';

// Standardkatalog aller von MetaFold prinzipiell unterstützten Integrationen
export const MASTER_INTEGRATIONS_CATALOG = [
  { 
    id: 'elabftw', 
    name: 'elabFTW', 
    icon: '🧪', 
    descKey: 'integrations.elabftwDesc', 
    desc: 'Elektronisches Laborbuch' 
  },
  { 
    id: 'omero', 
    name: 'OMERO', 
    icon: '🔬', 
    descKey: 'integrations.omeroDesc', 
    desc: 'Bilddatenmanagement' 
  },
  { 
    id: 'rspace', 
    name: 'RSpace', 
    icon: '📓', 
    descKey: 'integrations.rspaceDesc', 
    desc: 'Elektronisches Laborbuch' 
  },
  { 
    id: 'local_storage', 
    name: 'Local Storage', 
    icon: '💾', 
    descKey: 'integrations.local_storageDesc', 
    desc: 'Lokale Datei- oder Netzwerk-Ablage' 
  },
  { 
    id: 'llm', 
    name: 'AI / LLM Assist', 
    icon: '✨', 
    descKey: 'integrations.llmDesc', 
    desc: 'KI-gestützte Informationsextraktion' 
  }
];

export function createIntegrations({ tr, flash }) {
  // Benutzer-Aktivierungen
  const enabledIntegrations = ref(load('metafold_integrations', ['elabftw', 'omero', 'rspace']));
  watch(enabledIntegrations, (v) => save('metafold_integrations', v), { deep: true });

  // Vom n8n-Server gemeldete Fähigkeiten (Capabilities)
  const serverCapabilities = ref(load('metafold_server_capabilities', null));
  const isDiscovering = ref(false);

  // Filtert den Katalog: Wenn der Server spezifische Module meldet, werden nur diese angeboten
  const availableIntegrations = computed(() => {
    if (serverCapabilities.value && Array.isArray(serverCapabilities.value.modules) && serverCapabilities.value.modules.length > 0) {
      const allowedIds = serverCapabilities.value.modules.map(m => typeof m === 'string' ? m.toLowerCase() : m.id?.toLowerCase());
      return MASTER_INTEGRATIONS_CATALOG.filter(item => allowedIds.includes(item.id.toLowerCase()));
    }
    // Standard: Standardkatalog
    return MASTER_INTEGRATIONS_CATALOG;
  });

  // Nur die Integrationen, die sowohl vom Server verfügbar als auch vom Nutzer aktiviert sind
  const activeIntegrations = computed(() => {
    return availableIntegrations.value.filter(i => enabledIntegrations.value.includes(i.id));
  });

  // Temporäre Auswahl im Wizard (Schritt 4 Review)
  const integrationChoice = ref({});
  const integrationOn = (id) => integrationChoice.value[id] !== false;

  /**
   * Sendet eine Discovery-Anfrage an n8n, um bereitgestellte Module dynamisch abzufragen
   */
  const discoverServerCapabilities = async (webhookUrl) => {
    if (!webhookUrl || !webhookUrl.trim()) return null;
    isDiscovering.value = true;
    try {
      const res = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discover_capabilities',
          client: 'MetaFold Mobile Terminal v4'
        })
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json().catch(() => null);

      if (data && (data.capabilities || data.integrations || data.modules)) {
        const modulesList = data.capabilities || data.integrations || data.modules;
        serverCapabilities.value = {
          updatedAt: new Date().toISOString(),
          serverName: data.server_name || 'n8n Workflow Server',
          modules: modulesList
        };
        save('metafold_server_capabilities', serverCapabilities.value);
        flash(`✓ ${availableIntegrations.value.length} n8n-Module vom Server erkannt.`);
        return serverCapabilities.value;
      }
    } catch (err) {
      console.info('n8n capability discovery fallback to master catalog:', err.message);
    } finally {
      isDiscovering.value = false;
    }
    return null;
  };

  /**
   * Setzt den Serverkatalog zurück auf Offline-Standard
   */
  const resetToDefaultCatalog = () => {
    serverCapabilities.value = null;
    localStorage.removeItem('metafold_server_capabilities');
    flash('Standardkatalog wiederhergestellt.');
  };

  return {
    MASTER_INTEGRATIONS_CATALOG,
    availableIntegrations,
    activeIntegrations,
    enabledIntegrations,
    integrationChoice,
    integrationOn,
    serverCapabilities,
    isDiscovering,
    discoverServerCapabilities,
    resetToDefaultCatalog
  };
}
