/**
 * MetaFold Mobile Terminal v4 - Scanner Module (Camera QR / Barcode & Zebra DataWedge)
 */

import { ref, nextTick } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';

export function createScanner({ tr, flash, auth, formData, currentTemplate, addTags }) {
  const scanning = ref(false);
  const scanVideo = ref(null);
  let scanKey = null;
  let scanStream = null;
  let scanRaf = 0;
  let scanMode = 'field'; // 'field' | 'auth'

  const scanable = (f) => {
    if (!f) return false;
    return ['url', 'tags', 'id_anchor', 'derived_from'].includes(f.origType)
      || (f.type === 'text' && /\b(id|nr|nummer|number|code|barcode|serial|slide|plate|lot|charge|batch|rrid|catalog|katalog)\b/i.test((f.key + ' ' + f.label).replace(/[_\-.]/g, ' ')));
  };

  const stopScan = () => {
    cancelAnimationFrame(scanRaf);
    if (scanStream) {
      scanStream.getTracks().forEach(t => t.stop());
      scanStream = null;
    }
    scanning.value = false;
  };

  const applyScan = (val) => {
    const f = currentTemplate.value?.fields.find(x => x.key === scanKey);
    if (f?.type === 'tags') {
      addTags(scanKey, val.replace(/,/g, ' '));
    } else {
      formData.value[scanKey] = val;
    }
    navigator.vibrate?.(60);
  };

  const openScan = async (key, mode = 'field') => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      alert(tr('scanner.cameraHttps') || 'Kamera erfordert HTTPS und Browser-Unterstützung.');
      return;
    }
    scanKey = key;
    scanMode = mode;
    scanning.value = true;

    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      await nextTick();
      const v = scanVideo.value;
      if (!v) throw new Error('Video element not found');
      v.srcObject = scanStream;
      await v.play();

      const det = window.BarcodeDetector ? new window.BarcodeDetector() : null;
      const cv = document.createElement('canvas');
      const cx = cv.getContext('2d', { willReadFrequently: true });
      let last = 0;

      const tick = async (ts) => {
        if (!scanning.value) return;
        if (ts - last > 150 && v.readyState >= 2) {
          last = ts;
          try {
            let val = '';
            if (det) {
              const detected = await det.detect(v);
              val = detected[0]?.rawValue || '';
            } else if (window.jsQR) {
              cv.width = v.videoWidth;
              cv.height = v.videoHeight;
              cx.drawImage(v, 0, 0);
              const img = cx.getImageData(0, 0, cv.width, cv.height);
              val = window.jsQR(img.data, img.width, img.height)?.data || '';
            }

            if (val) {
              navigator.vibrate?.(60);
              if (scanMode === 'auth') {
                if (auth) {
                  auth.loginIdentifier.value = val;
                  stopScan();
                  auth.proceedToPin();
                } else {
                  stopScan();
                }
              } else {
                applyScan(val);
                stopScan();
              }
              return;
            }
          } catch (_) {
            // Nächster Frame
          }
        }
        scanRaf = requestAnimationFrame(tick);
      };
      scanRaf = requestAnimationFrame(tick);
    } catch (e) {
      stopScan();
      alert((tr('scanner.cameraUnavailable') || 'Kamera nicht verfügbar') + ': ' + e.message);
    }
  };

  const startLoginQrScan = () => {
    openScan('__auth_login', 'auth');
  };

  return {
    scanning,
    scanVideo,
    scanable,
    openScan,
    stopScan,
    startLoginQrScan
  };
}
