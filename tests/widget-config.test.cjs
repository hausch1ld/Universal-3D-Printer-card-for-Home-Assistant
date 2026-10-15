const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "../dist/3d-printer-card.js"), "utf8");
const registry = new Map();
const context = vm.createContext({
  HTMLElement: class {},
  window: {},
  customElements: { get: (name) => registry.get(name), define: (name, value) => registry.set(name, value) },
  console: { info() {} }
});
vm.runInContext(`${source}\nglobalThis.migrate = createWidgetConfig;`, context);
const plain = (value) => JSON.parse(JSON.stringify(value));
const migrate = (config) => plain(context.migrate(config));
const find = (config, type) => config.widgets.find((widget) => widget.type === type);
const spools = (count) => Array.from({ length: count }, (_, index) => ({ entity: `sensor.spool_${index}`, image: `/local/spool-${index}.png` }));
const controls = (count) => Array.from({ length: count }, (_, index) => ({ entity: `button.control_${index}`, icon: "mdi:play", label: `Control ${index}` }));

test("normal cards retain order and all widget-specific settings", () => {
  const config = {
    type: "custom:three-d-printer-card", name: "Kobra", subtitle: "Workshop", status_entity: "sensor.status",
    sections: { header: false }, design: "normal",
    ace: { label: "ACE", title_alignment: "right", image: "/local/ace.png", background_color: "#123456", use_gradient: false, spools: spools(5) },
    printer_image: "/local/printer.png", model_image_entity: "image.model", model_image: "/local/fallback.png", model_size: 65, model_position: 70,
    camera_entity: "camera.printer", camera_rotation: 180, camera_zoom: 120, camera_mirror: "vertical", camera_controls: "adaptive", default_view: "camera",
    printer_height: 400, printer_use_gradient: false, printer_background_color: "#654321",
    filename_entity: "sensor.filename", progress_entity: "sensor.progress", progress_color: "#abcdef",
    infos: [{ entity: "sensor.layer", secondary_entity: "sensor.total", separator: " of ", icon: "", custom_setting: "keep" }, { entity: "sensor.time", format: "time" }],
    info_layout: "horizontal", large_button_layout: "text-only", small_button_layout: "horizontal",
    large_buttons: [{ entity: "sensor.temp", secondary_entity: "number.target", label: "", icon: "", unit: "°C", secondary_unit: "°C" }],
    small_buttons: controls(4), extension: { extra: true }
  };
  const migrated = migrate(config);
  assert.deepEqual(migrated.widgets.map((widget) => widget.type), ["filaments", "printer", "progress", "infos", "buttons", "buttons"]);
  assert.deepEqual(find(migrated, "filaments").config, config.ace);
  assert.deepEqual(find(migrated, "infos").config.items, config.infos);
  assert.deepEqual(migrated.widgets[4].config.buttons, config.large_buttons);
  assert.deepEqual(migrated.widgets[5].config.buttons, config.small_buttons);
  for (const key of ["camera_entity", "camera_rotation", "camera_zoom", "camera_mirror", "camera_controls", "default_view", "printer_height", "model_position", "model_size", "model_image", "printer_image"]) {
    assert.deepEqual(find(migrated, "printer").config[key], config[key]);
  }
  assert.equal(find(migrated, "printer").config.show_filaments, false);
  assert.equal(find(migrated, "printer").config.show_controls, false);
  assert.equal(migrated.sections.header, false);
  assert.deepEqual(migrated.extension, config.extension);
});

test("compact cards embed up to five spools and five controls without duplicates", () => {
  const migrated = migrate({ design: "compact", ace: { label: "ACE", spools: spools(5) }, small_buttons: controls(5) });
  const printer = find(migrated, "printer").config;
  assert.equal(printer.design, "compact");
  assert.equal(printer.show_filaments, true);
  assert.equal(printer.show_controls, true);
  assert.deepEqual(printer.filaments.spools, spools(5));
  assert.deepEqual(printer.controls, controls(5));
  assert.equal(migrated.widgets.some((widget) => widget.type === "filaments"), false);
  assert.equal(migrated.widgets.some((widget) => widget.type === "buttons"), false);
});

test("extra configured entries become additional rows instead of disappearing", () => {
  const migrated = migrate({ ace: { spools: spools(12) }, small_buttons: controls(11), large_buttons: controls(9), infos: controls(6) });
  assert.deepEqual(migrated.widgets.filter((widget) => widget.type === "filaments").map((widget) => widget.config.spools.length), [5, 5, 2]);
  assert.deepEqual(migrated.widgets.filter((widget) => widget.config.style === "large").flatMap((widget) => widget.config.buttons), controls(9));
  assert.deepEqual(migrated.widgets.filter((widget) => widget.config.style === "small").flatMap((widget) => widget.config.buttons), controls(11));
  assert.deepEqual(migrated.widgets.filter((widget) => widget.type === "infos").flatMap((widget) => widget.config.items), controls(6));
});

test("compact overflow is preserved outside the embedded group", () => {
  const migrated = migrate({ design: "compact", ace: { spools: spools(8) }, small_buttons: controls(7) });
  const printer = find(migrated, "printer").config;
  assert.deepEqual(printer.filaments.spools.concat(find(migrated, "filaments").config.spools), spools(8));
  assert.deepEqual(printer.controls.concat(find(migrated, "buttons").config.buttons), controls(7));
});

test("disabled sections keep their data and enabled state", () => {
  const input = { design: "compact", sections: { multi_filament: false, printer: false, progress: false, large_buttons: false, small_buttons: false }, ace: { spools: spools(2) }, infos: controls(2), small_buttons: controls(2), large_buttons: controls(2) };
  const migrated = migrate(input);
  assert.ok(migrated.widgets.every((widget) => widget.enabled === false));
  const printer = find(migrated, "printer").config;
  assert.equal(printer.show_filaments, false);
  assert.equal(printer.show_controls, false);
  assert.deepEqual(printer.filaments.spools, input.ace.spools);
  assert.deepEqual(printer.controls, input.small_buttons);
});

test("legacy actions keep service data, targets, confirmation and action type", () => {
  const action = { label: "Stop", icon: "mdi:stop", tap_action: { action: "call-service", service: "script.cancel_print", confirmation: { text: "Cancel?" }, target: { entity_id: ["script.cancel_print"] }, data: { printer: "Kobra", force: false } } };
  const migrated = migrate({ actions: { stop: action } });
  const button = find(migrated, "buttons").config.buttons[0];
  assert.deepEqual(button.tap_action, action.tap_action);
  assert.equal(button._legacyKey, "stop");
  const navigate = migrate({ actions: { custom: { action: "navigate", navigation_path: "/lovelace/printer" } } });
  assert.equal(find(navigate, "buttons").config.buttons[0].navigation_path, "/lovelace/printer");
});

test("legacy metrics and time/layer settings migrate without losing metadata", () => {
  const migrated = migrate({ metrics: { nozzle: { entity: "sensor.temp", target_entity: "number.target", target_label: "Target", target_unit: "°C", custom: true } }, layer_current_entity: "sensor.current", layer_total_entity: "sensor.total", elapsed_time_entity: "sensor.elapsed", remaining_time_entity: "sensor.remaining", estimated_end_entity: "sensor.end", detail_labels: { layer: "Schicht" } });
  const items = find(migrated, "infos").config.items;
  assert.equal(items[0].secondary_entity, "sensor.total");
  assert.equal(items[0].label, "Schicht");
  assert.equal(items[0].separator, " / ");
  assert.deepEqual(items.slice(1).map((item) => item.format), ["time", "time", "end"]);
  const button = find(migrated, "buttons").config.buttons[0];
  assert.equal(button.secondary_entity, "number.target");
  assert.equal(button.target_entity, "number.target");
  assert.equal(button.custom, true);
});

test("migration is idempotent, preserves unknown fields and never mutates input", () => {
  const config = { design: "compact", ace: { spools: spools(2) }, small_buttons: controls(2) };
  const original = structuredClone(config);
  const migrated = migrate(config);
  assert.deepEqual(config, original);
  assert.deepEqual(migrate(migrated), migrated);
  migrated.widgets[0].config.filaments.spools[0].entity = "sensor.changed";
  assert.deepEqual(config, original);
  const future = { schema_version: 2, widgets: [{ id: "custom", type: "future", config: { arbitrary: [1, 2, 3] } }] };
  assert.deepEqual(migrate(future), future);
});

test("explicit empty widgets and empty arrays do not resurrect legacy fields", () => {
  assert.deepEqual(migrate({ schema_version: 1, widgets: [], ace: { spools: spools(3) } }).widgets, []);
  const migrated = migrate({ large_buttons: [], metrics: { nozzle: { entity: "sensor.old" } }, small_buttons: [], actions: { stop: { entity: "button.old" } }, infos: [], elapsed_time_entity: "sensor.old" });
  assert.equal(migrated.widgets.some((widget) => widget.type === "buttons" || widget.type === "infos"), false);
});

test("widget ids are stable and unique across repeated normalization", () => {
  const input = { ace: { spools: spools(11) }, small_buttons: controls(12), large_buttons: controls(10), infos: controls(9) };
  const ids = migrate(input).widgets.map((widget) => widget.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(migrate(input).widgets.map((widget) => widget.id), ids);
});
