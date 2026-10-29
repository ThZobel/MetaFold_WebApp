/**
 * MetaFold Mobile Terminal v4 - Utility & Helper Functions
 */

export const load = (key, defaultVal) => {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) ?? defaultVal) : defaultVal;
  } catch {
    return defaultVal;
  }
};

export const save = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.warn(`Failed to save to localStorage (${key}):`, err);
  }
};

export const remove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {}
};

/**
 * Transforms a GitHub repository URL into its raw.githubusercontent.com equivalent
 * e.g. github.com/owner/repo -> raw.githubusercontent.com/owner/repo/main/
 */
export const rawBase = (u) => {
  u = (u || '').trim();
  const m = u.match(/github\.com\/([^\/]+)\/([^\/#?]+?)(?:\.git)?(?:\/(?:tree|blob)\/([^\/]+))?\/?$/);
  return m ? `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3] || 'main'}/` : u.replace(/\/?$/, '/');
};

/**
 * Formats a duration in seconds into MM:SS
 */
export const formatTimer = (sec) => {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Checks if a value is considered empty
 */
export const isEmpty = (v) => {
  return v == null || v === '' || v === false || v === 0 || (Array.isArray(v) && !v.length);
};

/**
 * Formats form field values for summary review cards
 */
export const formatFieldValue = (field, val, tr = (k) => k) => {
  if (val == null || val === '') return '';
  if (field?.type === 'checkbox') {
    return (val === true || val === 'true' || val === 'on' || val === 'Ja' || val === 'yes') 
      ? ('✓ ' + tr('common.yes')) 
      : '';
  }
  if (field?.type === 'rating') {
    const num = Number(val) || 0;
    return num > 0 ? ('★'.repeat(Math.min(5, num)) + '☆'.repeat(Math.max(0, 5 - num))) : '';
  }
  if (Array.isArray(val)) {
    return val.join(', ');
  }
  return String(val);
};

/**
 * Universal touch & mouse long-press handler
 */
export function createLongPressController() {
  let longPressTimer = null;
  let longPressFired = false;
  let touchStartX = 0;
  let touchStartY = 0;

  const startLongPress = (callback, e) => {
    longPressFired = false;
    if (e.touches && e.touches[0]) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    } else if (e.clientX != null) {
      touchStartX = e.clientX;
      touchStartY = e.clientY;
    }
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      longPressFired = true;
      navigator.vibrate?.(40);
      callback();
    }, 500);
  };

  const cancelLongPress = (e) => {
    if (e && e.touches && e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimer);
      }
      return;
    } else if (e && e.clientX != null) {
      const dx = Math.abs(e.clientX - touchStartX);
      const dy = Math.abs(e.clientY - touchStartY);
      if (dx > 6 || dy > 6) {
        clearTimeout(longPressTimer);
      }
      return;
    }
    clearTimeout(longPressTimer);
  };

  const endLongPress = () => {
    clearTimeout(longPressTimer);
    if (longPressFired) {
      setTimeout(() => { longPressFired = false; }, 350);
    }
  };

  const onCardClick = (action) => {
    if (longPressFired) {
      longPressFired = false;
      return;
    }
    action();
  };

  return {
    startLongPress,
    cancelLongPress,
    endLongPress,
    onCardClick
  };
}
