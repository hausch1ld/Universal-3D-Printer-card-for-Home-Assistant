# Widget configuration — stage 1

This is an internal foundation for the next build, not a released editor or a
user-facing YAML interface. The visible card and editor still use the existing
configuration. The release version remains 0.8.3 until the widget rollout is
ready.

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
The slider widget will be implemented in a later stage.

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

## Stage boundary

The card currently prepares `_widgetConfig` on `setConfig`; `_config`, rendering
and the existing visual editor remain unchanged. Merely loading a dashboard
does not emit `config-changed`, rewrite YAML, update a release, or contact GitHub.
The future widget editor must work on the migrated copy and emit it only through
the normal explicit configuration editing flow. Do not pass the new schema
through the old editor's lossy legacy action conversion.

Next: render each widget independently, including repeated widget types and
per-widget camera/control state. Then replace tabs with collapsible, reorderable
rows. Migration tests must remain green throughout both changes.

Run the migration checks with `node --test tests/widget-config.test.cjs`.
