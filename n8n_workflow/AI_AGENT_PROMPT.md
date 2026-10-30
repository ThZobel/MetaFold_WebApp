# 🤖 MetaFold v4 – AI Agent Prompt & Step-by-Step Setup-Anleitung (für Unis & Institute)

Dieses Dokument enthält:
1. Den **fertigen System-Prompt** für euren internen KI-Agenten.
2. Den **exakten Code-Ersatz** für deinen Knoten `Prepare Payload & HTML1` in n8n (inkl. GUI-Option).
3. Eine **vollständige Step-by-Step-Anleitung für andere Universitäten**, um das System mit eigenem Agenten **oder** mit einem Standard-LLM aufzusetzen.

---

## 📋 Teil 1: System-Prompt für den internen AI Agenten

Kopiere diesen Block direkt in die System-Prompt-Konfiguration eures internen Agenten (z. B. uniGPT Assistant / OpenWebUI / Custom GPT / vLLM Agent):

```markdown
Du bist ein erfahrener wissenschaftlicher Labor- und Datenkurator für das MetaFold Metadaten-System im Bereich der biologischen und medizinischen Forschung (Grundlagenforschung, Modellorganismen, Zellkulturen, Mikroskopie, Molekularbiologie).

Deine Aufgabe ist es, aus den bereitgestellten Eingabedaten ("current_metadata", "field_types_reference", "current_title") und der gesprochenen Sprachnotiz ("voice_note") einen professionell aufbereiteten, konsistenten und wissenschaftlich sauberen JSON-Datensatz zu erstellen.

REGELN:
1. STRIKTES ANTWORTFORMAT (CRITICAL):

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt.

KEIN Markdown, KEINE Backticks (kein ```json), KEIN Text vor oder nach dem JSON.

Das JSON-Objekt MUSS exakt folgende Struktur haben:
{
"title": "",
"metadata": { ... },
"additional_notes": ""
}

2. DATEN-HIERARCHIE & KONTEXT-PRÜFUNG:

Voice Note hat Vorrang: Wenn die Sprachnotiz einem bestehenden Wert in "current_metadata" inhaltlich widerspricht, überschreibe den alten Wert. Fehlt eine Information in der Notiz, behalte den bestehenden Wert bei.

Kontext-Abgleich: Prüfe vor dem Überschreiben genau, ob logisch derselbe Parameter gemeint ist.Beispiel: Enthält "current_metadata" den Wert "temperature": "37°C" (Inkubator) und die Notiz sagt "Raumtemperatur 22 Grad", darf der bestehende Wert NICHT überschrieben werden. Mappe dies stattdessen in einen neuen Key (z. B. "room_temperature").

3. TEMPLATE-NUTZUNG, DATENTYPEN & DYNAMISCHE ERWEITERUNG:

Primäres Gerüst: Die übergebenen Keys in "current_metadata" bilden dein Grundgerüst. Befülle oder aktualisiere primär diese vorgegebenen Keys.

Datentypen respektieren: Behalte den vorgegebenen Datentyp eines existierenden Keys bei (z. B. keine Strings in reine Zahlen- oder Rating-Felder). Orientierung dafür bietet das "field_types_reference" Objekt.

Flexible Optionen (ERWEITERUNG ERLAUBT): Wenn ein Template-Feld normalerweise feste Optionen hat, die Sprachnotiz aber explizit einen ANDEREN Wert für diesen Parameter nennt, darfst (und sollst) du diesen neuen Wert einfügen/erweitern. Der Input der Sprachnotiz ist hier wichtiger als die strikte Limitierung auf alte Optionen.

Neue Keys (Nur bei Bedarf): Nennt die Notiz relevante Parameter, für die es noch keinen Key gibt, lege ein neues Key-Value-Paar in "metadata" an (Key-Namen immer in snake_case). Wähle den Datentyp für diesen neuen Key passend zur "field_types_reference".

4. INTELLIGENTE FEHLERKORREKTUR & WISSENSCHAFTLICHE STANDARDISIERUNG:

Korrektur: Handle als wissenschaftlicher Editor. Korrigiere aktiv Tippfehler und Speech-to-Text-Ungenauigkeiten (z. B. "Drosophyla" -> "Drosophila melanogaster", "clsm" -> "CLSM", "paraformaldehyd" -> "Paraformaldehyd (PFA)").

Nomenklatur Antikörper: Einheitlich nach dem Schema: [Wirtsorganismus] anti-[Target] [Fluorophor/Konjugat] (z. B. "Mouse anti-Tubulin", "Rabbit anti-GFP").

Farbstoffe: Etablierte Standardbezeichnungen nutzen (z. B. "Alexa Fluor 488", "DAPI", "Hoechst 33342").

Einheiten: Einheiten normieren (z. B. "534 nm", "100 ms", "µm", "°C") und stets mit einem Leerzeichen vom Zahlenwert trennen.

5. REGELN FÜR "additional_notes":

Verfasse einen gut lesbaren, sachlichen und professionellen Fließtext. Entferne mündliche Füllwörter ("ähm", "also", "glaube ich").

Keine stumpfen Doppelungen: Zähle Metadaten nicht isoliert im Text auf, wenn sie bereits strukturiert im "metadata"-Block stehen.

Kontext erhalten: Wenn ein Parameter Teil einer Versuchsbeschreibung oder Begründung ist (z. B. "Da das Signal schwach war, wurde die Laserleistung auf 15% erhöht"), bleibt er als Fließtext erhalten.

Falls die Notiz komplett in die Metadaten überführt wurde und keine qualitativen Beobachtungen übrig sind, gib einen leeren String "" zurück.

6. REGELN FÜR "title":

Wenn ein "current_title" übergeben wurde und nicht leer ist, behalte diesen bei (korrigiere nur offensichtliche Tippfehler).

Generiere nur dann einen neuen, prägnanten Titel (z. B. "Confocal imaging of Drosophila egg chamber"), wenn noch kein Titel existiert.

### BEISPIEL FÜR KORREKTEN OUTPUT (AM BEISPIEL ALLER METAFOLD-FELDTYPEN):
{
  "title": "Confocal imaging of Drosophila melanogaster egg chamber",
  "metadata": {
    "field_text": "Drosophila melanogaster",
    "field_textarea": "Late stage egg chamber preparation",
    "field_number": 40,
    "field_date": "2026-10-30",
    "field_time": "14:30",
    "field_email": "researcher@uni-muenster.de",
    "field_url": "https://elab.uni-muenster.de",
    "field_rating": 4,
    "field_dropdown": "Option 1",
    "field_checkbox": true,
    "field_multicheckbox": ["Choice A", "Choice C"],
    "field_tags": ["GFP", "CLSM"],
    "field_id_anchor": "EXP-2026-042",
    "field_derived_from": ["FLY-STOCK-01"]
  },
  "additional_notes": "Die Aufnahme erfolgte bei Raumtemperatur mit stabiler Fluoreszenzintensität."
}
```
englisch:
System Prompt:

You are an experienced scientific laboratory and data curator for the MetaFold metadata system in the field of biological and medical research (basic research, model organisms, cell cultures, microscopy, molecular biology).

Your task is to create a professionally formatted, consistent, and scientifically clean JSON dataset from the provided input data ("current_metadata", "field_types_reference", "current_title") and the spoken voice note ("voice_note").

RULES:
1. STRICT RESPONSE FORMAT (CRITICAL):

Reply EXCLUSIVELY with a valid JSON object.

NO markdown, NO backticks (no ```json), NO text before or after the JSON.

The JSON object MUST have exactly the following structure:
{
"title": "",
"metadata": { ... },
"additional_notes": ""
}

2. DATA HIERARCHY & CONTEXT CHECKING:

Voice Note Takes Precedence: If the voice note contradicts an existing value in "current_metadata", overwrite the old value. If information is missing in the note, keep the existing value.

Context Check: Before overwriting, carefully verify if it logically refers to the exact same parameter.Example: If "current_metadata" contains "temperature": "37°C" (incubator) and the note says "room temperature 22 degrees", DO NOT overwrite the existing value. Instead, map this to a new key (e.g., "room_temperature").

3. TEMPLATE USAGE, DATA TYPES & DYNAMIC EXPANSION:

Primary Framework: The keys provided in "current_metadata" form your foundation. Primarily fill or update these specified keys.

Respect Data Types: Maintain the intended data type of an existing key (e.g., no strings in pure number or rating fields). Use the "field_types_reference" object as a guideline for this.

Flexible Options (EXPANSION ALLOWED): If a template field normally has fixed options, but the voice note explicitly mentions a DIFFERENT value for this parameter, you may (and should) insert/add this new value. The input from the voice note overrides the strict limitation of predefined options.

New Keys (Only if needed): If the note mentions relevant parameters for which no key exists yet, create a new key-value pair in "metadata" (always format key names in snake_case). Choose a data type for this new key that matches the "field_types_reference".

4. INTELLIGENT ERROR CORRECTION & SCIENTIFIC STANDARDIZATION:

Correction: Act as a scientific editor. Actively correct typos and speech-to-text inaccuracies (e.g., "Drosophyla" -> "Drosophila melanogaster", "clsm" -> "CLSM", "paraformaldehyd" -> "Paraformaldehyde (PFA)").

Antibody Nomenclature: Format uniformly according to the scheme: [Host Organism] anti-[Target] [Fluorophore/Conjugate] (e.g., "Mouse anti-Tubulin", "Rabbit anti-GFP").

Dyes/Fluorophores: Use established standard designations (e.g., "Alexa Fluor 488", "DAPI", "Hoechst 33342").

Units: Standardize units (e.g., "534 nm", "100 ms", "µm", "°C") and always separate them from the numerical value with a single space.

5. RULES FOR "additional_notes":

Write well-readable, objective, and professional continuous text. Remove conversational filler words (e.g., "um", "well", "I think").

No Mindless Duplication: Do not list metadata in isolation within the text if it is already structured in the "metadata" block.

Preserve Context: If a parameter is part of an experimental description or reasoning (e.g., "Because the signal was weak, the laser power was increased to 15%"), keep it in the continuous text.

If the entire note has been converted into metadata and no qualitative observations remain, return an empty string "".

6. RULES FOR "title":

If a "current_title" was provided and is not empty, keep it (only correct obvious typos).

Only generate a new, concise title (e.g., "Confocal imaging of Drosophila egg chamber") if no title exists yet.

### BEISPIEL FÜR KORREKTEN OUTPUT (AM BEISPIEL ALLER METAFOLD-FELDTYPEN):
{
  "title": "Confocal imaging of Drosophila melanogaster egg chamber",
  "metadata": {
    "field_text": "Drosophila melanogaster",
    "field_textarea": "Late stage egg chamber preparation",
    "field_number": 40,
    "field_date": "2026-10-30",
    "field_time": "14:30",
    "field_email": "researcher@uni-muenster.de",
    "field_url": "https://elab.uni-muenster.de",
    "field_rating": 4,
    "field_dropdown": "Option 1",
    "field_checkbox": true,
    "field_multicheckbox": ["Choice A", "Choice C"],
    "field_tags": ["GFP", "CLSM"],
    "field_id_anchor": "EXP-2026-042",
    "field_derived_from": ["FLY-STOCK-01"]
  },
  "additional_notes": "Die Aufnahme erfolgte bei Raumtemperatur mit stabiler Fluoreszenzintensität."
}
---

## 🛠️ Teil 2: Vollständiger Code für n8n (inkl. 100 % MetaFold Desktop Konsistenz)

Die WebApp v4 (`v4/js/modules/n8n.js` & `v4/js/modules/templates.js`) sendet nun das **komplette unveränderte Original-Template** (`template.raw`) sowie alle Feldeigenschaften (`origType`, `required`, `position`, `unit`, `useForFilename`) im Payload an n8n mit – ohne dass sich die Oberfläche der PWA ändert.

In n8n erzeugen die beiden Knoten **`Prepare Payload & HTML1`** und **`Build Final Payload from AI Draft1`** daraus automatisch das Objekt **`$json.metafold_desktop`** mit zwei fertigen JSON-Strukturen zum lokalen Speichern:
1. **`$json.metafold_desktop.populated_template`**: Das 100 % originale MetaFold-Desktop-Template (inkl. `structure`, `projectDefaults`, `options`, `metadata.fieldOrder`), in dem alle erfassten/KI-kuratierten Werte direkt in `metadata.fields[key].value` eingetragen sind.
2. **`$json.metafold_desktop.experiment_metadata`**: Die exakte **`*-metadata.json`**-Struktur, wie MetaFold Desktop (`experimentForm.collectData()`) sie im Projektordner speichert (inkl. `group`-Verschachtelung, Original-Datentypen wie `dropdown`/`id_anchor`/`derived_from` und `provenance`-Block).

### A. Kompletter Code für `Prepare Payload & HTML1` (1:1 kopierbar)

Öffne in n8n den Knoten **`Prepare Payload & HTML1`** und ersetze den gesamten Code durch:

```javascript
const body = $input.first().json;
const meta = body.metadata || {};
const template = body.template || {};
const templateFields = Array.isArray(template.fields) ? template.fields : [];
const fieldMap = new Map(templateFields.map(f => [f.key, f]));
const templateName = template.name || "Standard Messung";
const note = body.general_note || "";
const integrations = body.integrations || {};
const action = body.action || "direct";
const user = body.user || { name: "Unbekannter Nutzer", id: "terminal" };

const isElabActive = integrations.elabftw !== false;

const dateStr = new Date().toLocaleDateString("de-DE");
const title = `[MetaFold] ${templateName} - ${user.name} - ${dateStr}`;

// Helper 1: Convert metadata to elabFTW extra_fields format
function buildElabMetadata(metadataObj, fieldsArray) {
  const fMap = new Map(fieldsArray.map(f => [f.key, f]));
  const extra_fields = {};
  let pos = 1;

  for (const [key, val] of Object.entries(metadataObj)) {
    if (val === "" || val === null || val === undefined || (Array.isArray(val) && val.length === 0)) continue;
    
    const fDef = fMap.get(key);
    if (fDef?.type === "group" || fDef?.origType === "group") continue;
    const label = fDef?.label || key;
    const fType = fDef?.type || (typeof val === "boolean" ? "checkbox" : typeof val === "number" ? "number" : "text");
    
    let elabType = "text";
    if (fType === "select" || fType === "dropdown") elabType = "select";
    else if (fType === "checkbox") elabType = "checkbox";
    else if (fType === "number") elabType = "number";
    else if (fType === "date") elabType = "date";
    else elabType = "text";
    
    let elabVal = val;
    if (elabType === "checkbox") {
      elabVal = (val === true || val === "true" || val === "on" || val === "Ja" || val === "yes") ? "on" : "";
    } else if (Array.isArray(val)) {
      elabVal = val.join(", ");
    } else {
      elabVal = String(val);
    }
    
    const fieldObj = {
      type: elabType,
      value: elabVal,
      position: pos++
    };
    
    if (fDef?.description) fieldObj.description = fDef.description;
    if (fDef?.options && elabType === "select") {
      fieldObj.options = fDef.options.map(String);
    }
    
    extra_fields[label] = fieldObj;
  }

  return {
    extra_fields,
    elabftw: { display_main_text: true }
  };
}

// Helper 2: Reconstruct 100% MetaFold Desktop compatible template & *-metadata.json
function buildMetaFoldDesktopData(templateObj, metadataObj, fieldsArray, userObj, expTitle, notesText) {
  const rawTpl = (templateObj && templateObj.raw && typeof templateObj.raw === "object")
    ? JSON.parse(JSON.stringify(templateObj.raw))
    : {
        name: templateObj?.name || "MetaFold Template",
        description: templateObj?.description || "",
        type: "experiment",
        category: templateObj?.category || "category1",
        structure: "",
        metadata: { fields: {}, fieldOrder: [] }
      };

  if (!rawTpl.metadata) rawTpl.metadata = { fields: {}, fieldOrder: [] };
  if (!rawTpl.metadata.fields) rawTpl.metadata.fields = {};
  if (!Array.isArray(rawTpl.metadata.fieldOrder)) {
    rawTpl.metadata.fieldOrder = Object.keys(rawTpl.metadata.fields);
  }

  fieldsArray.forEach((f, idx) => {
    if (!rawTpl.metadata.fields[f.key]) {
      rawTpl.metadata.fields[f.key] = {
        type: f.origType || f.type || "text",
        label: f.label || f.key,
        value: f.defaultValue ?? "",
        required: !!f.required,
        position: f.position ?? (idx + 1),
        description: f.description || "",
        ...(Array.isArray(f.options) && f.options.length ? { options: f.options } : {}),
        ...(f.unit !== undefined ? { unit: f.unit } : {}),
        ...(f.useForFilename ? { useForFilename: true } : {})
      };
    }
    if (!rawTpl.metadata.fieldOrder.includes(f.key)) {
      rawTpl.metadata.fieldOrder.push(f.key);
    }
  });

  let maxPos = rawTpl.metadata.fieldOrder.length;
  for (const [key, val] of Object.entries(metadataObj || {})) {
    if (rawTpl.metadata.fields[key]) {
      if (rawTpl.metadata.fields[key].type !== "group") {
        rawTpl.metadata.fields[key].value = val;
      }
    } else if (val !== "" && val !== null && val !== undefined) {
      maxPos++;
      rawTpl.metadata.fields[key] = {
        type: typeof val === "boolean" ? "checkbox" : typeof val === "number" ? "number" : Array.isArray(val) ? "tags" : "text",
        label: key,
        value: val,
        required: false,
        position: maxPos,
        description: "Added via MetaFold AI Assistant"
      };
      rawTpl.metadata.fieldOrder.push(key);
    }
  }
  rawTpl.metadata.totalFields = rawTpl.metadata.fieldOrder.length;
  rawTpl.updatedAt = new Date().toISOString();

  const desktopExperimentMetadata = {};
  let currentGroupObj = null;

  rawTpl.metadata.fieldOrder.forEach((fieldName, idx) => {
    const fieldInfo = rawTpl.metadata.fields[fieldName];
    if (!fieldInfo) return;

    if (fieldInfo.type === "group") {
      currentGroupObj = {};
      desktopExperimentMetadata[fieldInfo.label || fieldName] = currentGroupObj;
      return;
    }

    const fieldData = {
      label: fieldInfo.label || fieldName,
      type: fieldInfo.type || "text",
      value: fieldInfo.value !== undefined ? fieldInfo.value : (metadataObj?.[fieldName] ?? ""),
      required: !!fieldInfo.required,
      position: fieldInfo.position || (idx + 1)
    };
    if (fieldInfo.options) fieldData.options = fieldInfo.options;
    if (fieldInfo.unit !== undefined) fieldData.unit = fieldInfo.unit;
    if (fieldInfo.description) fieldData.description = fieldInfo.description;
    if (fieldInfo.useForFilename) fieldData.useForFilename = true;

    if (currentGroupObj) {
      currentGroupObj[fieldName] = fieldData;
    } else {
      desktopExperimentMetadata[fieldName] = fieldData;
    }
  });

  desktopExperimentMetadata.provenance = {
    createdBy: userObj?.name || "Unknown",
    userId: userObj?.id || "terminal",
    createdAt: new Date().toISOString(),
    source: "MetaFold Mobile Terminal v4",
    templateName: rawTpl.name || templateObj?.name || "",
    templateId: rawTpl.id || templateObj?.id || "",
    experimentTitle: expTitle || "",
    additionalNotes: notesText || ""
  };

  return {
    populated_template: rawTpl,
    experiment_metadata: desktopExperimentMetadata
  };
}

const directElabMetadata = buildElabMetadata(meta, templateFields);
const metafoldDesktopData = buildMetaFoldDesktopData(template, meta, templateFields, user, title, note);

let rowsHtml = "";
for (const [key, val] of Object.entries(meta)) {
  if (val !== "" && val !== null && val !== undefined && (!Array.isArray(val) || val.length > 0)) {
    const fDef = fieldMap.get(key);
    if (fDef?.type === "group" || fDef?.origType === "group") continue;
    const label = fDef?.label || key;
    const displayVal = Array.isArray(val) ? val.join(", ") : val;
    rowsHtml += `<tr><td style="font-weight:600; padding:6px 10px; border:1px solid #e2e8f0; background:#f8fafc;">${label}</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${displayVal}</td></tr>`;
  }
}

const bodyHtml = `
  <h3 style="color:#0f172a; margin-bottom:6px;">📋 MetaFold Metadaten</h3>
  <div style="font-size:12px; color:#334155; margin-bottom:12px; background:#f1f5f9; padding:8px 12px; border-radius:6px; border-left:4px solid #3b82f6;">
    👤 <b>Erfasst von:</b> ${user.name} <i>(ID: ${user.id})</i>
  </div>
  <table style="border-collapse:collapse; width:100%; font-family:system-ui,sans-serif; font-size:13px; margin-bottom:16px;">
    <thead><tr style="background:#e2e8f0;"><th style="padding:8px 10px; text-align:left; border:1px solid #cbd5e1;">Parameter</th><th style="padding:8px 10px; text-align:left; border:1px solid #cbd5e1;">Wert</th></tr></thead>
    <tbody>${rowsHtml || "<tr><td colspan=\"2\" style=\"padding:8px; color:#64748b;\">Keine Metadatenfelder belegt.</td></tr>"}</tbody>
  </table>
  ${note ? `<h4 style="color:#0f172a; margin-bottom:4px;">🎙️ Diktierte Sprachnotiz</h4><div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:10px 14px; border-radius:4px; font-size:13px; color:#1e3a8a;">${note.replace(/\n/g, "<br>")}</div>` : ""}
  <hr style="margin-top:24px; border:0; border-top:1px solid #e2e8f0;">
  <p style="font-size:11px; color:#94a3b8;">Automatisch erfasst via MetaFold Mobile Terminal am ${new Date().toLocaleString("de-DE")}</p>
`;

// LLM System Prompt für fachliche Kuration & Entwurf (Fallback für Standard-LLM ohne eigenen Agenten)
const systemPrompt = `Du bist ein erfahrener wissenschaftlicher Labor- und Datenkurator für das MetaFold Metadaten-System im Bereich der biologischen und medizinischen Forschung (Grundlagenforschung, Modellorganismen wie z. B. Drosophila, Zebrafisch, C. elegans, Nagetiere, Zell- und Gewebekulturen, Mikroskopie & Bildgebung, Molekularbiologie und Biochemie).\nDeine Aufgabe ist es, aus den eingegebenen Metadaten ("current_metadata"), der Liste erlaubter Template-Felder ("allowed_fields") und der gesprochenen Sprachnotiz ("voice_note") einen professionell aufbereiteten, konsistenten und wissenschaftlich sauberen Labor-Entwurf zu erstellen.\n\n### REGELN:\n\n1. STRIKTES ANTWORTFORMAT (CRITICAL):\n   - Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt.\n   - KEIN Markdown, KEINE Backticks (kein \`\`\`json), KEIN Text vor oder nach dem JSON.\n   - Das JSON-Objekt MUSS exakt folgende Struktur haben:\n     {\n       "title": "<Experimenttitel>",\n       "metadata": { ... },\n       "additional_notes": "<Aufbereitete Notizen>"\n     }\n\n2. INTELLIGENTE FEHLERKORREKTUR & BIOLOGISCHER FACHKONTEXT:\n   - Handle als intelligenter wissenschaftlicher Editor, NICHT als stummer Abschreiber.\n   - Korrigiere aktiv und selbstständig Tippfehler, Spracherkennungsfehler (Whisper/STT) und phonetische Ungenauigkeiten sowohl in "current_metadata" als auch in der Notiz:\n     * Modellorganismen & Taxonomie: "Drosophyla" -> "Drosophila melanogaster", "Danio" -> "Danio rerio", etc.\n     * Anatomie & Proben: "Eggk chamber" -> "Egg chamber", "imaginal disk" -> "imaginal disc", "somites", "blastula", etc.\n     * Methoden & Parameter: "resonant Scanner" -> "Resonant Scanner", "clsm" -> "CLSM", "40x oil" -> "40x Oil", "paraformaldehyd" -> "Paraformaldehyd (PFA)".\n\n3. WISSENSCHAFTLICHE STANDARDISIERUNG & NOMENKLATUR:\n   - Antikörper: Einheitlich nach wissenschaftlicher Nomenklatur formatieren: [Wirtsorganismus] anti-[Target] [Fluorophor/Konjugat] (z. B. "Mouse anti-Tubulin", "Rabbit anti-GFP", "Goat anti-Mouse Alexa Fluor 488").\n   - Fluorophore & Farbstoffe: Etablierte Standardbezeichnungen nutzen (z. B. "Alexa Fluor 488" statt "Alexa 488", "DAPI", "Hoechst 33342", "mCherry", "EGFP", "Phalloidin-TRITC").\n   - Einheiten & Maße normieren (z. B. "534 nm", "100 ms", "µm", "°C").\n\n4. REGELN FÜR "metadata" & METAFOLD-FELDTYPEN:\n   - Mappe relevante Fakten aus der Notiz in existierende Template-Felder.\n   - Gib in "metadata" AUSSCHLIESSLICH flache Key-Value-Paare ("<field_key>": <Wert>) zurück – NIEMALS verschachtelte Feld-Definitionen.\n   - Hat ein Template-Feld feste Optionen ("options"), wähle exakt den passenden hinterlegten Optionswert.\n   - Falls in der Notiz neue Parameter mit klarer Key-Value-Logik genannt werden, für die es kein passendes Template-Feld gibt, kannst du hierfür einen prägnanten neuen Key in "metadata" anlegen.\n\n5. REGELN FÜR "additional_notes" (GUT LESBARER FLIESSTEXT, KEINE STUMPFE DOPPELUNG):\n   - KEINE STUMPFEN DOPPELUNGEN: Zähle nicht einfach Metadatenfelder als isolierte Liste erneut auf, wenn sie bereits im Metadaten-Block stehen.\n   - KONTEXT IST ERLAUBT: Wenn ein Parameter im Zusammenhang einer zusammenhängenden Versuchsbeschreibung, Beobachtung oder Begründung Sinn ergibt, darf er natürlich flüssig und lesbar im Text verbleiben.\n   - FLIESSTEXT & FORM: Formuliere die Notiz als gut lesbaren, sachlichen Fließtext. Entferne mündliche Füllwörter ("weiß nicht", "ähm", "also", "glaube ich").\n   - Falls alle Inhalte der Sprachnotiz bereits vollständig in den Metadatenfeldern abgebildet sind, gib "" zurück.\n\n6. TITEL ("title"):\n   - FALLS EIN TITEL MITGELIEFERT WIRD ("current_title"), behalte diesen bei.\n   - FALLS KEIN TITEL VORHANDEN IST: Generiere einen prägnanten Titel basierend auf Organismus, Probe, Marker oder Methode.`;

const userPromptObj = {
  template: {
    id: template.id || "",
    name: templateName,
    category: template.category || "",
    allowed_fields: templateFields
      .filter(f => f.type !== "group" && f.origType !== "group")
      .map(f => ({
        key: f.key,
        label: f.label || f.key,
        type: f.origType || f.type || "text",
        options: f.options || [],
        description: f.description || ""
      }))
  },
  current_title: body.title || "",
  current_metadata: meta,
  voice_note: note
};

// =========================================================================
// ⚙️ AGENT-KONFIGURATION:
// true  = Eigener Agent (System-Prompt, Temperature & Tokens sind im Agenten hinterlegt)
// false = Standard-LLM für andere Unis (sendet const systemPrompt im Payload mit)
// =========================================================================
const USE_PRECONFIGURED_AGENT = (body.use_preconfigured_agent !== undefined)
  ? Boolean(body.use_preconfigured_agent)
  : true;

const MODEL_OR_AGENT_NAME = body.model_or_agent_name || "Qwen3.8-27B";

const messages = USE_PRECONFIGURED_AGENT
  ? [
      { role: "user", content: JSON.stringify(userPromptObj) }
    ]
  : [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(userPromptObj) }
    ];

const llmRequest = {
  model: MODEL_OR_AGENT_NAME,
  messages: messages,
  // temperature: 0.1, // Wird im Agenten festgelegt (bei Standard-LLM ggf. einkommentieren)
  // max_tokens: 800   // Wird im Agenten festgelegt (bei Standard-LLM ggf. einkommentieren)
};

return {
  json: {
    action: action,
    is_elab_active: isElabActive,
    template_name: templateName,
    user: user,
    elab_api_key: body.elab_api_key || "",
    elab_host: body.elab_host || "https://elab.uni-muenster.de",
    unigpt_api_key: body.unigpt_api_key || "",
    elab_payload: {
      title: title,
      body: bodyHtml,
      metadata: JSON.stringify(directElabMetadata)
    },
    direct_metadata_obj: directElabMetadata,
    metafold_desktop: metafoldDesktopData,
    llm_request: llmRequest,
    ai_draft_input: body.ai_draft || null,
    original_body: body
  }
};
```

### A2. Kompletter Code für `Build Final Payload from AI Draft1` (1:1 kopierbar)

Öffne in n8n den Knoten **`Build Final Payload from AI Draft1`** und ersetze den gesamten Code durch:

```javascript
const prep = $json;
const body = prep.original_body || {};
const draft = body.ai_draft || prep.ai_draft_input || {};
const meta = (draft.metadata && typeof draft.metadata === "object") ? draft.metadata : (body.metadata || {});
const template = body.template || {};
const templateFields = Array.isArray(template.fields) ? template.fields : [];
const fieldMap = new Map(templateFields.map(f => [f.key, f]));
const user = prep.user || { name: "Unbekannter Nutzer", id: "terminal" };

const finalTitle = draft.title || prep.elab_payload.title;
const additionalNotes = draft.additional_notes || draft.notes || draft.text || "";

// Extra Fields for eLabFTW
const extra_fields = {};
let pos = 1;

for (const [key, val] of Object.entries(meta)) {
  if (val === "" || val === null || val === undefined || (Array.isArray(val) && val.length === 0)) continue;
  
  const fDef = fieldMap.get(key);
  if (fDef?.type === "group" || fDef?.origType === "group") continue;
  const label = fDef?.label || key;
  const fType = fDef?.type || (typeof val === "boolean" ? "checkbox" : typeof val === "number" ? "number" : "text");
  
  let elabType = "text";
  if (fType === "select" || fType === "dropdown") elabType = "select";
  else if (fType === "checkbox") elabType = "checkbox";
  else if (fType === "number") elabType = "number";
  else if (fType === "date") elabType = "date";
  else elabType = "text";
  
  let elabVal = val;
  if (elabType === "checkbox") {
    elabVal = (val === true || val === "true" || val === "on" || val === "Ja" || val === "yes") ? "on" : "";
  } else if (Array.isArray(val)) {
    elabVal = val.join(", ");
  } else {
    elabVal = String(val);
  }
  
  const fieldObj = {
    type: elabType,
    value: elabVal,
    position: pos++
  };
  
  if (fDef?.description) fieldObj.description = fDef.description;
  if (fDef?.options && elabType === "select") {
    fieldObj.options = fDef.options.map(String);
  }
  
  extra_fields[label] = fieldObj;
}

const elabftwMetadata = {
  extra_fields: extra_fields,
  elabftw: {
    display_main_text: true
  }
};

// Reconstruct 100% MetaFold Desktop compatible template & *-metadata.json with AI Draft values
function buildMetaFoldDesktopData(templateObj, metadataObj, fieldsArray, userObj, expTitle, notesText) {
  const rawTpl = (templateObj && templateObj.raw && typeof templateObj.raw === "object")
    ? JSON.parse(JSON.stringify(templateObj.raw))
    : {
        name: templateObj?.name || "MetaFold Template",
        description: templateObj?.description || "",
        type: "experiment",
        category: templateObj?.category || "category1",
        structure: "",
        metadata: { fields: {}, fieldOrder: [] }
      };

  if (!rawTpl.metadata) rawTpl.metadata = { fields: {}, fieldOrder: [] };
  if (!rawTpl.metadata.fields) rawTpl.metadata.fields = {};
  if (!Array.isArray(rawTpl.metadata.fieldOrder)) {
    rawTpl.metadata.fieldOrder = Object.keys(rawTpl.metadata.fields);
  }

  fieldsArray.forEach((f, idx) => {
    if (!rawTpl.metadata.fields[f.key]) {
      rawTpl.metadata.fields[f.key] = {
        type: f.origType || f.type || "text",
        label: f.label || f.key,
        value: f.defaultValue ?? "",
        required: !!f.required,
        position: f.position ?? (idx + 1),
        description: f.description || "",
        ...(Array.isArray(f.options) && f.options.length ? { options: f.options } : {}),
        ...(f.unit !== undefined ? { unit: f.unit } : {}),
        ...(f.useForFilename ? { useForFilename: true } : {})
      };
    }
    if (!rawTpl.metadata.fieldOrder.includes(f.key)) {
      rawTpl.metadata.fieldOrder.push(f.key);
    }
  });

  let maxPos = rawTpl.metadata.fieldOrder.length;
  for (const [key, val] of Object.entries(metadataObj || {})) {
    if (rawTpl.metadata.fields[key]) {
      if (rawTpl.metadata.fields[key].type !== "group") {
        rawTpl.metadata.fields[key].value = val;
      }
    } else if (val !== "" && val !== null && val !== undefined) {
      maxPos++;
      rawTpl.metadata.fields[key] = {
        type: typeof val === "boolean" ? "checkbox" : typeof val === "number" ? "number" : Array.isArray(val) ? "tags" : "text",
        label: key,
        value: val,
        required: false,
        position: maxPos,
        description: "Added via MetaFold AI Assistant"
      };
      rawTpl.metadata.fieldOrder.push(key);
    }
  }
  rawTpl.metadata.totalFields = rawTpl.metadata.fieldOrder.length;
  rawTpl.updatedAt = new Date().toISOString();

  const desktopExperimentMetadata = {};
  let currentGroupObj = null;

  rawTpl.metadata.fieldOrder.forEach((fieldName, idx) => {
    const fieldInfo = rawTpl.metadata.fields[fieldName];
    if (!fieldInfo) return;

    if (fieldInfo.type === "group") {
      currentGroupObj = {};
      desktopExperimentMetadata[fieldInfo.label || fieldName] = currentGroupObj;
      return;
    }

    const fieldData = {
      label: fieldInfo.label || fieldName,
      type: fieldInfo.type || "text",
      value: fieldInfo.value !== undefined ? fieldInfo.value : (metadataObj?.[fieldName] ?? ""),
      required: !!fieldInfo.required,
      position: fieldInfo.position || (idx + 1)
    };
    if (fieldInfo.options) fieldData.options = fieldInfo.options;
    if (fieldInfo.unit !== undefined) fieldData.unit = fieldInfo.unit;
    if (fieldInfo.description) fieldData.description = fieldInfo.description;
    if (fieldInfo.useForFilename) fieldData.useForFilename = true;

    if (currentGroupObj) {
      currentGroupObj[fieldName] = fieldData;
    } else {
      desktopExperimentMetadata[fieldName] = fieldData;
    }
  });

  desktopExperimentMetadata.provenance = {
    createdBy: userObj?.name || "Unknown",
    userId: userObj?.id || "terminal",
    createdAt: new Date().toISOString(),
    source: "MetaFold Mobile Terminal v4 (AI Curated)",
    templateName: rawTpl.name || templateObj?.name || "",
    templateId: rawTpl.id || templateObj?.id || "",
    experimentTitle: expTitle || "",
    additionalNotes: notesText || ""
  };

  return {
    populated_template: rawTpl,
    experiment_metadata: desktopExperimentMetadata
  };
}

const metafoldDesktopData = buildMetaFoldDesktopData(template, meta, templateFields, user, finalTitle, additionalNotes);

let rowsHtml = "";
for (const [key, val] of Object.entries(meta)) {
  if (val !== "" && val !== null && val !== undefined && (!Array.isArray(val) || val.length > 0)) {
    const fDef = fieldMap.get(key);
    if (fDef?.type === "group" || fDef?.origType === "group") continue;
    const label = fDef?.label || key;
    const displayVal = Array.isArray(val) ? val.join(", ") : val;
    rowsHtml += `<tr><td style="font-weight:600; padding:6px 10px; border:1px solid #e2e8f0; background:#f8fafc;">${label}</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${displayVal}</td></tr>`;
  }
}

const finalBodyHtml = `
  <h3 style="color:#0f172a; margin-bottom:6px;">📋 MetaFold Laborbericht (KI-geprüft & freigegeben)</h3>
  <div style="font-size:12px; color:#334155; margin-bottom:12px; background:#f1f5f9; padding:8px 12px; border-radius:6px; border-left:4px solid #3b82f6;">
    👤 <b>Erfasst von:</b> ${user.name} <i>(ID: ${user.id})</i>
  </div>
  <table style="border-collapse:collapse; width:100%; font-family:system-ui,sans-serif; font-size:13px; margin-bottom:16px;">
    <thead><tr style="background:#e2e8f0;"><th style="padding:8px 10px; text-align:left; border:1px solid #cbd5e1;">Parameter</th><th style="padding:8px 10px; text-align:left; border:1px solid #cbd5e1;">Wert</th></tr></thead>
    <tbody>${rowsHtml || "<tr><td colspan=\"2\" style=\"padding:8px; color:#64748b;\">Keine Metadatenfelder belegt.</td></tr>"}</tbody>
  </table>
  ${additionalNotes ? `<h4 style="color:#0f172a; margin-bottom:4px;">📝 Zusätzliche Notizen & Beobachtungen</h4><div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:10px 14px; border-radius:4px; font-size:13px; color:#1e3a8a;">${additionalNotes.replace(/\n/g, "<br>")}</div>` : ""}
  <hr style="margin-top:24px; border:0; border-top:1px solid #e2e8f0;">
  <p style="font-size:11px; color:#94a3b8;">Automatisch erfasst & KI-aufbereitet via MetaFold Mobile Terminal am ${new Date().toLocaleString("de-DE")}</p>
`;

return {
  json: {
    ...prep,
    elab_payload: {
      title: finalTitle,
      body: finalBodyHtml,
      metadata: JSON.stringify(elabftwMetadata)
    },
    extra_fields_obj: elabftwMetadata,
    metafold_desktop: metafoldDesktopData
  }
};
```

---

### B. Optionales Profi-Feature: Schalter direkt in der n8n-GUI bedienbar machen!

Du hast erwähnt, dass es cool wäre, wenn man das **direkt in der n8n-GUI per Schalter/Textfeld** einstellen kann, ohne in den JavaScript-Code zu gehen.

Beachte im Code oben diese beiden Zeilen:
```javascript
const USE_PRECONFIGURED_AGENT = (body.use_preconfigured_agent !== undefined) ? Boolean(body.use_preconfigured_agent) : true;
const MODEL_OR_AGENT_NAME = body.model_or_agent_name || 'Qwen3.8-27B';
```

Damit kannst du (oder eine andere Uni) jederzeit einen normalen **n8n `Edit Fields (Set)`-Knoten** direkt **vor** `Prepare Payload & HTML1` hängen:
1. Klicke auf das **`+`** auf der Verbindungslinie vor **`Prepare Payload & HTML1`**.
2. Wähle **`Edit Fields (Set)`** und nenne den Knoten **`⚙️ KI-Agent Einstellungen (GUI)`**.
3. Aktiviere unten den Schalter **`Include Other Input Fields`** (damit alle bisherigen Daten durchgereicht werden).
4. Lege über **Add Field** zwei GUI-Felder an:
   - **`use_preconfigured_agent`** (Typ: **Boolean**) → Ein echter visueller **An/Aus-Schalter** in der n8n-GUI! (`true` = Eigener Agent ohne Prompt im Payload, `false` = Mit System-Prompt im Payload).
   - **`model_or_agent_name`** (Typ: **String**) → Ein Textfeld in der GUI für die Agenten-ID oder den Modellnamen (z. B. `Qwen3.8-27B`).

---

## 🎓 Teil 3: Step-by-Step Anleitung für andere Universitäten

Diese Anleitung kann direkt an Partner-Universitäten oder andere Core Facilities weitergegeben werden, die **MetaFold Mobile Terminal v4** mit **n8n** und **eLabFTW** in ihrer Infrastruktur aufsetzen möchten.

### Voraussetzungen
- Eine laufende **n8n-Instanz** (Cloud oder Self-Hosted, per HTTPS erreichbar).
- Zugang zu einer **eLabFTW-Instanz** der Universität (inkl. API-Key).
- Zugang zu einem **LLM-Endpunkt** der Universität (z. B. OpenWebUI, uniGPT, vLLM, LiteLLM, Azure OpenAI oder OpenAI API).

---

### Schritt 1: n8n-Workflow importieren
1. Öffne n8n und klicke auf **Add Workflow**.
2. Öffne das Menü oben rechts (`...`) → **Import from File...** und wähle die Datei `n8n.json` aus dem Ordner `n8n_workflow/`.

---

### Schritt 2: Benutzer, NFC/QR-Badges & eLabFTW-Host einrichten
1. Öffne per Doppelklick den Knoten **`User Auth & Lookup`**.
2. Passe im Array `USERS_DB` die Benutzer deiner Arbeitsgruppe / Core Facility an:
   - `id`: Internes Kürzel (z. B. `mmustermann`)
   - `name`: Anzeigename im Laborbuch (z. B. `Dr. Max Mustermann`)
   - `badge_id`: Der Inhalt des NFC-Tags oder QR-Codes auf dem Laborausweis (z. B. `04:0c:2d:...` oder `USER001`)
   - `pin`: 4-stellige Sicherheits-PIN für das Terminal (z. B. `1234`)
   - `elab_api_key`: Persönlicher eLabFTW API-Key des Nutzers (aus eLabFTW unter *Einstellungen → API Keys*)
   - `elab_host`: Die Basis-URL eurer eLabFTW-Instanz (z. B. `https://elab.uni-beispiel.de`)
3. Prüfe in den beiden HTTP-Knoten **`Create eLabFTW Experiment1`** und **`Update eLabFTW Extra Fields (PATCH)1`**, ob in der URL eure eLabFTW-Domain steht (oder nutze dynamisch `={{ $json.elab_host }}/api/v2/experiments...`).

---

### Schritt 3: KI-Modus wählen (Eigener Agent vs. Standard-LLM)

Je nachdem, welche KI-Infrastruktur an eurer Universität vorhanden ist, wählt ihr **Option A** oder **Option B**:

#### Option A: Ihr nutzt einen eigenen vorkonfigurierten KI-Agenten (z. B. OpenWebUI / Custom Assistant)
*Empfohlen, wenn ihr den Prompt zentral in eurer KI-Plattform verwalten und pflegen wollt.*

1. Erstellt in eurer KI-Plattform einen neuen Agenten/Assistenten (z. B. Name/ID: `metafold-curator`).
2. Kopiert den **System-Prompt aus Teil 1** dieser Anleitung in die System-Prompt-Einstellungen eures Agenten.
3. Stellt in eurem Agenten die Parameter ein:
   - **Temperature:** `0.1` (für präzise, deterministische JSON-Ausgabe)
   - **Max Tokens:** ca. `800` bis `1500`
4. Öffnet in n8n den Knoten **`Prepare Payload & HTML1`** (bzw. den GUI-Knoten):
   - Setzt `USE_PRECONFIGURED_AGENT = true;` (es wird **kein** System-Prompt im Payload mitgeschickt, nur die Formulardaten).
   - Setzt `MODEL_OR_AGENT_NAME = '<EURE-AGENTEN-ID>';`.
5. Öffnet in n8n den Knoten **`LLM Draft Request1`**:
   - Tragt unter **URL** euren OpenAI-kompatiblen Endpunkt ein (z. B. `https://ki.uni-beispiel.de/api/chat/completions` oder `/v1/chat/completions`).
   - Hinterlegt im Header **`Authorization`** euren API-Key (`Bearer sk-...`).

#### Option B: Ihr habt KEINEN eigenen Agenten, sondern nutzt direkt ein Standard-LLM (z. B. Llama 3, Qwen, GPT-4o)
*Ideal für einen schnellen Start ohne vorherige Agenten-Einrichtung.*

1. Öffnet in n8n den Knoten **`Prepare Payload & HTML1`**:
   - Setzt `USE_PRECONFIGURED_AGENT = false;`
   - **Was passiert jetzt?** Der im Knoten bereits fertig hinterlegte `systemPrompt` wird bei jeder Anfrage automatisch als `{ role: 'system', content: systemPrompt }` im Payload an das Sprachmodell mitgeschickt.
   - Setzt `MODEL_OR_AGENT_NAME = '<EUER-MODELL-NAME>';` (z. B. `Qwen3.8-27B`, `llama-3.3-70b-instruct` oder `gpt-4o-mini`).
   - Entfernt bei Bedarf in `llmRequest` die Kommentarzeichen `//` vor `temperature: 0.1` und `max_tokens: 800`.
2. Öffnet in n8n den Knoten **`LLM Draft Request1`**:
   - Tragt unter **URL** die Chat-Completions-URL eures LLM-Servers ein.
   - Hinterlegt im Header **`Authorization`** euren API-Key (`Bearer sk-...`).

---

### Schritt 4: Workflow aktivieren & mit MetaFold WebApp v4 verbinden
1. Speichere den Workflow in n8n (`Ctrl + S` / **Save**) und schalte ihn oben rechts auf **Active** (grüner Schalter).
2. Öffne den ersten Knoten **`Webhook In1`**, klappe **Webhook URLs** auf und kopiere die **Production URL** (z. B. `https://n8n.uni-beispiel.de/webhook/metafold-test`).
3. Öffne die **MetaFold WebApp v4** auf dem Tablet/Smartphone/Terminal:
   - Klicke oben rechts auf **⚙️ (Einstellungen)**.
   - Öffne den Bereich **Server & Webhooks**.
   - Füge die kopierte URL in das Feld **n8n Webhook URL** ein.
   - Klicke auf **„🔌 Verbindung testen“** → Es erscheint die grüne Bestätigung *„✓ Verbindung zu n8n erfolgreich!“*.
4. **Fertig!** Nach dem Login per NFC/QR-Code und PIN können Vorlagen aus dem GitHub Template Hub oder direkt aus eLabFTW geladen, per Spracheingabe befüllt und über den **KI-Assistenten** kuratiert werden.
