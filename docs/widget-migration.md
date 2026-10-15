# Widget configuration — preview build

The 0.9.0-beta.2 test build uses this model for rendering and editing. Legacy
configurations are normalized in memory; merely opening a dashboard/editor does
not save changes. The widget schema is emitted through the usual HA
`config-changed` event when the user edits the configuration.

## Model

`createWidgetConfig(source)` builds a detached JSON-compatible copy:

```yaml
schema_version: 1
widgets:
  - id: legacy-filaments-1
    type: filaments
    enabled: true
    config:
      label: ACE Pro
      spools:
        - entity: sensor.spool_1
  - id: legacy-printer
    type: printer
    enabled: true
    config:
      printer_image: /local/printer.png
      camera_entity: camera.printer
      show_filaments: false
      filaments:
        spools: []
      show_controls: false
      controls: []
  - id: legacy-progress
    type: progress
    enabled: true
    config:
      progress_entity: sensor.progress
  - id: legacy-infos-1
    type: infos
    enabled: true
    config:
      layout: vertical
      items:
        - entity: sensor.elapsed
          format: time
  - id: legacy-large-buttons-1
    type: buttons
    enabled: true
    config:
      style: large
      layout: horizontal
      buttons:
        - entity: sensor.temperature
          secondary_entity: number.target_temperature
```

Array order defines row order. Stable IDs identify individual widgets so
reordering can preserve expansion state, focused fields and camera playback.
Repeated widget types are allowed. General settings (name, subtitle, status,
header visibility, HA layout settings, etc.) remain on the card itself.
Buttons use `style: large` for metrics and `style: small` for action controls.
The slider widget uses `type: slider` and `config: {entity, label, icon}`.

## Legacy mapping

- Normal: filaments → printer → progress → infos → large buttons → controls.
- Compact: the first group of up to five spools/controls is embedded in the
  printer widget using independent `show_filaments` and `show_controls` flags.
  Filament settings (including background settings) are retained, even though
  the compact presentation does not display their standalone background.
- Each standalone filament widget contains at most five spools. Extra spools
  are split into further rows, preserving source order.
- Large buttons and infos are grouped in rows of at most four; standalone
  controls in rows of at most five. Overflow is preserved, including values
  previously ignored by rendering limits.
- Disabled sections keep their settings with `enabled: false`. Embedded
  filament/control settings are retained when their show flag is false.
- Legacy metrics keep their original fields and gain the secondary-entity
  aliases. Legacy actions retain their complete action definition, including
  confirmation, data and targets; they are not reduced to one entity.
- Info formatting, secondary entities, separators, explicit empty icons/labels,
  units and unrecognized item settings survive migration.
- Existing `widgets`, including an explicit empty array and unknown future
  widget types, are cloned unchanged. Migration never overwrites them from old
  top-level fields. It is deterministic and safe to run more than once.
- Original top-level fields are retained for recovery and extensions. Once the
  widget renderer is introduced, `widgets` is authoritative whenever present.

## Runtime behavior

The dashboard owns the single outer `ha-card` and reconciles rows by widget ID.
Each internal row owns its shadow DOM, camera state and handlers. State changes
update row contents rather than replace the whole dashboard. Unchanged rows are
retained during configuration edits; `moveBefore` preserves their state on
reorder where supported by the browser.

The editor preserves all row properties, including unknown extensions, advanced
info formatting and legacy service actions. Selecting a replacement simple
entity on an action explicitly removes its old custom action. Clearing an icon
saves an explicit empty value so the entity icon is not silently restored.

Printer widgets use independent `show_filaments` and `show_controls` flags. The
normal/compact choice only controls the height reduction; embedded content stays
inside the printer widget either way. `model_use_effect` and
`model_progress_entity` control clipping only the model image.

Unknown widget types are retained in YAML and display a warning. An explicit
empty `widgets` array renders no rows instead of resurrecting legacy sections.

The beta is delivered locally for testing. It has not been pushed or released.

Run the migration checks with `node --test tests/widget-config.test.cjs`.
