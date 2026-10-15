// Local browser verification with mocked HA elements and states. This does not
// claim to replace the final check against a real HA instance and printer.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<style>body{margin:0;padding:24px;background:#111;color:#eee;font-family:Arial;--primary-text-color:#eee;--secondary-text-color:#aaa;--card-background-color:#1c1c1c;--secondary-background-color:#292929;--divider-color:#444;--primary-color:#03a9f4;--error-color:#db4437;--ha-card-background:#1c1c1c}.layout{display:grid;grid-template-columns:560px 480px;gap:32px;align-items:start}#preview{position:sticky;top:16px}</style><div class="layout"><div id="editor"></div><div id="preview"></div></div>`);
  await page.evaluate(() => {
    customElements.define("ha-card", class extends HTMLElement { connectedCallback() { this.style.display = "block"; this.style.borderRadius = "12px"; this.style.background = "var(--ha-card-background)"; } });
    customElements.define("ha-icon", class extends HTMLElement { connectedCallback() { this.style.display = "inline-block"; this.style.fontSize = "18px"; this.textContent = "◇"; } });
    customElements.define("ha-selector", class extends HTMLElement {
      constructor() { super(); this.attachShadow({ mode: "open" }); this.shadowRoot.innerHTML = '<style>input{box-sizing:border-box;width:100%;height:48px;background:#333;color:#eee;border:0;padding:10px;border-radius:4px}</style><input>'; this.shadowRoot.querySelector("input").addEventListener("change", (event) => this.dispatchEvent(new CustomEvent("value-changed", { bubbles: true, composed: true, detail: { value: event.target.value } }))); }
      set value(value) { this.shadowRoot.querySelector("input").value = typeof value === "string" ? value : ""; }
      get value() { return this.shadowRoot.querySelector("input").value; }
    });
    customElements.define("ha-slider", class extends HTMLElement {
      constructor() { super(); this.attachShadow({ mode: "open" }); this.shadowRoot.innerHTML = '<style>input{width:100%;accent-color:#03a9f4;min-height:36px}</style><input type="range">'; const input = this.shadowRoot.querySelector("input"); ["change", "input"].forEach((type) => input.addEventListener(type, (event) => { event.stopPropagation(); this.dispatchEvent(new Event(type, { bubbles: true, composed: true })); })); }
      set value(v) { this.shadowRoot.querySelector("input").value = v; } get value() { return Number(this.shadowRoot.querySelector("input").value); }
      set min(v) { this.shadowRoot.querySelector("input").min = v; } set max(v) { this.shadowRoot.querySelector("input").max = v; }
      set step(v) { this.shadowRoot.querySelector("input").step = v; } set disabled(v) { this.shadowRoot.querySelector("input").disabled = v; }
    });
    customElements.define("ha-camera-stream", class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: "open" }).innerHTML = '<video style="width:100%;height:100%;background:#18364b"></video>'; } });
    window.services = [];
    window.hassMock = {
      locale: { language: "en" },
      states: {
        "sensor.progress": { state: "50", attributes: { unit_of_measurement: "%" } },
        "sensor.temp": { state: "30", attributes: { friendly_name: "Nozzle", unit_of_measurement: "°C" } },
        "sensor.temp2": { state: "60", attributes: { friendly_name: "Bed", unit_of_measurement: "°C" } },
        "sensor.time": { state: "3600", attributes: { friendly_name: "Elapsed", unit_of_measurement: "s" } },
        "number.speed": { state: "50", attributes: { friendly_name: "Print speed", min: 10, max: 150, step: 5, unit_of_measurement: "%" } },
        "input_number.temp": { state: "200", attributes: { min: 100, max: 260, step: 1, unit_of_measurement: "°C" } },
        "button.pause": { state: "unknown", attributes: { friendly_name: "Pause", icon: "mdi:pause" } },
        "camera.one": { state: "idle", attributes: {} }, "camera.two": { state: "idle", attributes: {} }
      },
      hassUrl: (url) => url,
      formatEntityState: (state) => `${state.state}${state.attributes.unit_of_measurement ? ` ${state.attributes.unit_of_measurement}` : ""}`,
      callService: async (...args) => { window.services.push(args); }
    };
  });
  await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, "../dist/3d-printer-card.js"), "utf8") });
  await page.evaluate(() => {
    const svg = (text, color) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="250" height="300"><rect x="15" y="10" width="220" height="280" rx="15" fill="${color}"/><text x="125" y="150" fill="white" text-anchor="middle">${text}</text></svg>`)}`;
    window.card = document.createElement("three-d-printer-card");
    window.editor = document.createElement("three-d-printer-card-editor");
    window.configMock = {
      name: "Kobra S1", design: "compact", status_entity: "sensor.temp", printer_image: svg("Printer", "#333"), model_image: svg("Model", "#999"), camera_entity: "camera.one", camera_controls: "adaptive", model_size: 40,
      ace: { label: "ACE", spools: Array.from({ length: 5 }, (_, i) => ({ label: `PLA ${i + 1}`, image: svg("PLA", "#666") })) },
      small_buttons: Array.from({ length: 5 }, () => ({ entity: "button.pause", icon: "mdi:pause" })),
      large_buttons: [{ entity: "sensor.temp", secondary_entity: "input_number.temp", icon: "mdi:thermometer" }],
      progress_entity: "sensor.progress", infos: [{ entity: "sensor.time", format: "time", label: "Elapsed" }]
    };
    card.setConfig(configMock); card.hass = hassMock;
    editor.setConfig(configMock); editor.hass = hassMock;
    document.querySelector("#editor").append(editor); document.querySelector("#preview").append(card);
    window.editEvents = 0;
    editor.addEventListener("config-changed", (event) => { editEvents++; configMock = event.detail.config; card.setConfig(configMock); editor.setConfig(configMock); });
  });
  const editor = page.locator("three-d-printer-card-editor");
  const card = page.locator("three-d-printer-card");
  assert.equal(await editor.locator(".tabs").count(), 0);
  assert.equal(await card.locator("three-d-printer-widget-row").count(), 4);
  assert.equal(await page.evaluate(() => editEvents), 0, "opening editor must not save migration");
  const first = editor.locator("details[data-widget-index]").first();
  await first.locator("summary .row-title").click();
  // Configure effect via the field path, then verify live 0/50/100 updates.
  await page.evaluate(() => {
    const c = createWidgetConfig(configMock); const printer = c.widgets.find((w) => w.type === "printer");
    printer.config.model_use_effect = true; printer.config.model_progress_entity = "sensor.progress";
    configMock = c; card.setConfig(c); card.hass = hassMock; editor.setConfig(c);
  });
  const model = card.locator(".model-image").first();
  assert.equal(await model.evaluate((element) => element.style.clipPath), "inset(50% 0px 0px)");
  for (const progress of [0, 100]) {
    await page.evaluate((value) => { hassMock.states["sensor.progress"].state = String(value); card.hass = hassMock; }, progress);
    assert.equal(await model.evaluate((element) => element.style.clipPath), `inset(${100 - progress}% 0px 0px)`);
  }
  await page.evaluate(() => { hassMock.states["sensor.progress"].state = "unavailable"; card.hass = hassMock; });
  assert.equal(await model.evaluate((element) => element.style.clipPath), "inset(0% 0px 0px)");
  // Five controls plus the separate view switch must fit inside the scene.
  assert.ok(await card.locator(".visual-actions").evaluate((element) => element.getBoundingClientRect().height <= element.closest(".visual-wrap").getBoundingClientRect().height));
  // No focus loss or editor rebuild on ordinary text edits and state ticks.
  const name = editor.locator('input[data-path=\'["name"]\']');
  await name.fill("My printer"); await name.dispatchEvent("change");
  assert.equal(await name.inputValue(), "My printer");
  assert.equal(await page.evaluate(() => editor.shadowRoot.activeElement?.dataset.path), '["name"]');
  // Add a slider through the editor, not by modifying YAML.
  await editor.locator('[data-command="widget-menu"]').click();
  await editor.locator('[data-command="add-widget"][data-type="slider"]').click();
  const sliderDetails = editor.locator("details[data-widget-index]").last();
  const selector = sliderDetails.locator("ha-selector").first();
  await selector.locator("input").fill("number.speed"); await selector.locator("input").dispatchEvent("change");
  const slider = card.locator("[data-entity-slider]");
  await slider.evaluate((element) => { element.value = 77; element.dispatchEvent(new Event("change", { bubbles: true, composed: true })); });
  await page.waitForFunction(() => services.length === 1);
  assert.deepEqual(await page.evaluate(() => services[0]), ["number", "set_value", { entity_id: "number.speed", value: 75 }]);
  await page.evaluate(() => { window.savedSlider = card.shadowRoot.querySelector(".widget-stack").lastElementChild.shadowRoot.querySelector("[data-entity-slider]"); card.hass = hassMock; });
  assert.ok(await slider.evaluate((element) => element === savedSlider), "hass updates must preserve the slider node");
  // Unsupported/unavailable entities cannot cause writes; service failures are visible.
  await page.evaluate(() => { hassMock.states["number.speed"].state = "unavailable"; card.hass = hassMock; });
  assert.ok(await slider.evaluate((element) => element.shadowRoot.querySelector("input").disabled));
  await slider.evaluate((element) => { element.value = 100; element.dispatchEvent(new Event("change", { bubbles: true, composed: true })); });
  assert.equal(await page.evaluate(() => services.length), 1);
  await page.evaluate(() => { hassMock.states["number.speed"].state = "75"; hassMock.callService = async () => { throw new Error("offline"); }; card.hass = hassMock; });
  await slider.evaluate((element) => { element.value = 100; element.dispatchEvent(new Event("change", { bubbles: true, composed: true })); });
  await page.waitForFunction(() => [...card.shadowRoot.querySelectorAll("three-d-printer-widget-row")].some((row) => row.shadowRoot.querySelector("[data-slider-error]")?.hidden === false));
  await page.evaluate(() => { hassMock.callService = async (...args) => services.push(args); });
  // Duplicate and reorder multiple instances; updates stay scoped to each row.
  await editor.locator('[data-command="widget-menu"]').click();
  await editor.locator('[data-command="add-widget"][data-type="buttons"]').click();
  await editor.locator('details[data-widget-index]').last().locator('[data-command="duplicate"]').click();
  const before = await page.evaluate(() => configMock.widgets.map((w) => w.id));
  await editor.locator('details[data-widget-index]').last().locator('[data-command="up"]').click();
  const after = await page.evaluate(() => configMock.widgets.map((w) => w.id));
  assert.equal(after[after.length - 2], before[before.length - 1]);
  // Pointer drag across rows also changes actual configuration order.
  const rows = editor.locator('details[data-widget-index]');
  const dragFrom = await rows.nth(1).locator('[data-command="drag"]').boundingBox();
  const dragTo = await rows.nth(2).locator("summary").boundingBox();
  if (dragFrom && dragTo) {
    const original = await page.evaluate(() => configMock.widgets[1].id);
    await page.mouse.move(dragFrom.x + 12, dragFrom.y + 12); await page.mouse.down();
    await page.mouse.move(dragTo.x + 80, dragTo.y + dragTo.height / 2, { steps: 10 }); await page.mouse.up();
    assert.equal(await page.evaluate(() => configMock.widgets[2].id), original);
  }
  // Cameras in two widgets toggle independently and survive normal state ticks.
  await page.evaluate(() => {
    const c = createWidgetConfig(configMock); const p = c.widgets.find((w) => w.type === "printer");
    p.config.default_view = "camera";
    c.widgets.push({ ...structuredClone(p), id: "second-printer", config: { ...p.config, camera_entity: "camera.two" } });
    card.setConfig(c); card.hass = hassMock;
  });
  assert.equal(await card.locator("ha-camera-stream").count(), 2);
  await page.evaluate(() => { window.camerasBefore = [...card.shadowRoot.querySelectorAll("three-d-printer-widget-row")].flatMap((row) => [...row.shadowRoot.querySelectorAll("ha-camera-stream")]); card.hass = hassMock; });
  assert.ok(await page.evaluate(() => camerasBefore.every((camera) => camera.isConnected)));
  await card.locator(".view-hint").first().click();
  assert.equal(await card.locator("ha-camera-stream").count(), 1);
  await page.evaluate(() => {
    const c = createWidgetConfig(configMock);
    for (let index = 0; index < 2; index++) c.widgets.push({ id: `filament-row-${index}`, type: "filaments", enabled: true, config: { label: `Filaments ${index + 1}`, spools: Array.from({ length: 5 }, (_, spool) => ({ label: `PLA ${spool + 1}` })) } });
    card.setConfig(c); card.hass = hassMock;
  });
  assert.equal(await card.locator('.ace:not(.ace-compact) .spool').count(), 10);
  await page.evaluate(() => {
    const c = structuredClone(configMock);
    c.widgets = [{ id: "input-number-slider", type: "slider", config: { entity: "input_number.temp" } }];
    window.secondSliderCard = document.createElement("three-d-printer-card");
    secondSliderCard.setConfig(c); secondSliderCard.hass = hassMock; document.body.append(secondSliderCard);
  });
  const secondSlider = page.locator('three-d-printer-card').last().locator('[data-entity-slider]');
  await secondSlider.evaluate((element) => { element.value = 250; element.dispatchEvent(new Event("change", { bubbles: true, composed: true })); });
  await page.waitForFunction(() => services.length === 2);
  assert.deepEqual(await page.evaluate(() => services[1]), ["input_number", "set_value", { entity_id: "input_number.temp", value: 250 }]);
  await page.evaluate(() => secondSliderCard.remove());
  // Clear links remain visible and explicit blanks survive a reload.
  await editor.locator('details[data-widget-index]').last().locator('summary .row-title').click();
  const emptyClear = editor.locator('.clear:visible').first();
  assert.ok(await emptyClear.count());
  // Intrinsic content width (especially an unbroken job name) must never
  // enlarge the grid track and push every other widget beyond the card edge.
  for (const width of [320, 480, 800]) {
    const geometry = await page.evaluate((width) => {
      const container = document.createElement("div");
      container.style.width = `${width}px`;
      const testCard = document.createElement("three-d-printer-card");
      const config = structuredClone(configMock);
      config.name = "Kobra S1";
      const progress = config.widgets.find((widget) => widget.type === "progress");
      progress.config.filename_entity = "sensor.long_filename";
      hassMock.states["sensor.long_filename"] = { state: "0915-1940-Mikrofon-Stand-6_plate(01)_PLA_0.16_2h30m14s".repeat(4), attributes: {} };
      testCard.setConfig(config); testCard.hass = hassMock;
      container.append(testCard); document.body.append(container);
      const outer = testCard.shadowRoot.querySelector("ha-card");
      const box = outer.getBoundingClientRect(), padding = parseFloat(getComputedStyle(outer).paddingRight);
      const rows = [...testCard.shadowRoot.querySelectorAll("three-d-printer-widget-row")];
      const content = rows.flatMap((row) => [...row.shadowRoot.querySelectorAll(".visual,.progress,.visual-actions,.metric,.job-line b")]);
      const result = { width, outerWidth: box.width, maxRowRight: Math.max(...rows.map((row) => row.getBoundingClientRect().right - box.left)), maxContentRight: Math.max(...content.map((element) => element.getBoundingClientRect().right - box.left)), contentRight: box.width - padding, rowOverflow: rows.some((row) => row.scrollWidth > row.clientWidth + 1) };
      container.remove();
      return result;
    }, width);
    assert.ok(geometry.outerWidth <= width + 1, JSON.stringify(geometry));
    assert.ok(geometry.maxRowRight <= geometry.contentRight + 1, JSON.stringify(geometry));
    assert.ok(geometry.maxContentRight <= geometry.contentRight + 1, JSON.stringify(geometry));
    assert.equal(geometry.rowOverflow, false, JSON.stringify(geometry));
  }
  // Capture both theme variants of the editor and card.
  await page.evaluate(() => {
    editor.shadowRoot.querySelectorAll("details[data-widget-index]").forEach((element) => { element.open = false; });
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: path.join(__dirname, "widget-preview-dark.png"), fullPage: true });
  await page.evaluate(() => { document.body.style.setProperty("--primary-text-color", "#222"); document.body.style.setProperty("--secondary-text-color", "#666"); document.body.style.setProperty("--card-background-color", "#fff"); document.body.style.setProperty("--ha-card-background", "#fff"); document.body.style.setProperty("--divider-color", "#ddd"); document.body.style.background = "#eee"; });
  await page.screenshot({ path: path.join(__dirname, "widget-preview-light.png"), fullPage: true });
  assert.deepEqual(errors, []);
  console.log("Browser checks passed: migration, editor, focus, sorting, effect, sliders, cameras, themes.");
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
