<p align="center">
  <img width="22%" alt="3D printer dashboard example 0" src="https://github.com/user-attachments/assets/e9257613-aca1-48b1-8981-3502514ad413" />
  <img width="22%" alt="3D printer dashboard example 2" src="https://github.com/user-attachments/assets/7b4ea512-93ee-4c58-ac5a-f0938e9c54cf" />
  <img width="22%" alt="3D printer dashboard example 3" src="https://github.com/user-attachments/assets/e50f75c4-3ac1-43f1-a485-3029f1143881" />
  <img width="22%" alt="3D printer dashboard example 4" src="https://github.com/user-attachments/assets/76840c14-372c-4347-a30e-8f887504ef82" />
  <img width="50" height="1228" alt="image" src="https://github.com/user-attachments/assets/55ed1764-2242-469d-9d5d-74f21c2aed1d" />
</p>

<p align="center">
 <img width="50" alt="3D printer dashboard example 5" src="https://github.com/user-attachments/assets/55ed1764-2242-469d-9d5d-74f21c2aed1d" />
</p>

**Universal 3D Printer Card for Home Assistant** brings your printer, live camera, filament spools, print progress and controls into one customizable dashboard card. Build your layout in the visual editor using independent, reorderable widgets. The card works with any integration that provides suitable entities; no manufacturer-specific entity names are hardcoded.

## Features

- **Flexible widget layout:** add Filaments, Printer / Live Camera, Progress, Information, Buttons and Slider widgets. Repeat types, collapse settings, duplicate or remove rows, and reorder them using drag-and-drop or up/down buttons.
- **Visual configuration:** configure entities, labels, icons, images and colors without writing YAML. Show or hide individual widgets and the header independently.
- **Printer and model images:** combine a printer image with a dynamic model overlay, or use either image on its own. Adjust model size from 1–100%, vertical position and printer-area height while preserving image proportions.
- **Progressive model reveal:** optionally reveal the model from bottom to top using a selectable progress entity.
- **Live camera:** switch between printer/model and camera views. Rotate, zoom or mirror the camera inside the clipped printer area. Choose native, adaptive or disabled controls; adaptive controls stay upright when the image rotates.
- **Filament rows:** display up to five automatically centered spools per Filaments widget. Add more rows for additional spools.
- **Combined or separate filament entities:** use one entity for filament type, color and image, or separate color and type entities. Switching modes preserves both configurations. Hex/RGB colors are supported; missing or failed images fall back to a colored spool with a transparent center.
- **Embedded printer overlays:** optionally show up to six filaments on the left and five action controls on the right. The camera/model toggle is separate.
- **Progress and information:** display a filename and progress bar with a theme-based or custom color. Each Information widget supports up to four entries with custom labels, icons and optional secondary entities. Choose inline values or a line break with a custom separator.
- **Large metric buttons:** show up to four sensor values per row, each with an optional clickable secondary entity, label, icon and units.
- **Small action buttons:** configure up to five `button`, `switch` or `light` controls per row. Place icons above or beside labels, or hide icons. Embedded printer controls are icon-only.
- **Tile-style sliders:** control `number` and `input_number` entities using their own limits, step and units. Place up to three sliders beneath their labels in a row, or one slider to the right of its text/icon. Customize the icon, color and subtitle, including a live `{value}` placeholder.
- **Images and backgrounds:** enter paths or use Home Assistant's image upload/media picker. Set printer and filament background colors, images and optional gradients.
- **Theme and language support:** responsive layouts follow light, dark and custom themes. English is the default; German follows Home Assistant's language setting. Numeric values respect Home Assistant's locale and entity display precision.
- **Backward compatibility:** existing configurations are automatically adapted to widgets while preserving settings and assets. Advanced configuration remains available in YAML.

## Latest Update
- Flexible widget-based configuration with collapsible sections, drag-and-drop ordering, duplication, and removal.
- Unlimited Number of filaments, buttons, and slider widgets
- Independent widgets for filaments, printer/live camera, progress, information, buttons, and sliders.
- Up to six embedded filaments and five controls in printer widgets.
- Progressive model reveal based on a selectable print-progress entity.
- Tile-style sliders supporting up to three controls per row, or one right-aligned slider beside its label and icon.
- Custom slider subtitles with a {value} placeholder.
- Combined or separate filament color and material entities, with Hex/RGB support and colored spool graphics when no image is available.
- Optional line breaks between primary and secondary information values.

## How to

### 1. Install the card

> This guide describes the widget-based build on `main`. If your installed HACS version still uses the older tabbed editor, update to a release containing the widget editor or use the manual installation below with the JavaScript file from `main`.

#### HACS custom repository

1. Open **HACS** in Home Assistant.
2. Open the three-dot menu and select **Custom repositories**.
3. Add `https://github.com/hausch1ld/Universal-3D-Printer-card-for-Home-Assistant`.
4. Select **Dashboard** as the category.
5. Find **Universal 3D Printer Card**, download it and reload the browser.

HACS should register the resource automatically. Otherwise, open **Settings → Dashboards → Resources** and add this URL as a **JavaScript module**:

```text
/hacsfiles/Universal-3D-Printer-card-for-Home-Assistant/3d-printer-card.js
```

#### Manual installation / preview build

1. Download `dist/3d-printer-card.js` from the version or branch you want to use.
2. Create `/config/www/universal-3d-printer-card/` and copy the JavaScript file directly into it.
3. In **Settings → Dashboards → Resources**, add this URL as a **JavaScript module**:

   ```text
   /local/universal-3d-printer-card/3d-printer-card.js
   ```

4. Reload the browser completely.

This is a frontend card, not a backend integration: nothing belongs in `custom_components`. Avoid an extra nested `www` directory, and do not load both HACS and manual copies at the same time.

When updating, replace the file and reload. If an old version remains cached, add or update a version suffix on the existing resource URL, for example `?v=0.9.0-beta.6`, and reload again. Do not add a duplicate resource.

### 2. Add and arrange widgets

1. Edit a dashboard and select **Add card**.
2. Search for **Universal 3D Printer Card**.
3. In **General**, set the title, optional subtitle and status entity, or hide the header.
4. Select **Add Widget** and choose a type.
5. Expand each row to configure it. Drag its handle or use the arrow buttons to reorder it, then save.

Alternatively, start with a Manual card:

```yaml
type: custom:three-d-printer-card
name: My 3D Printer
schema_version: 1
widgets: []
```

The card's configuration uses collapsible rows, not tabs. Home Assistant's surrounding **Configuration**, **Visibility** and **Layout** tabs remain unchanged.

### 3. Configure your widgets

#### Filaments

Add up to five spools to a Filaments row, or enable **Show Filaments** in a Printer widget for up to six embedded spools.

- **Single entity:** select an entity whose state contains the filament type, such as `PLA` or `PETG`. Color can come from attributes such as `color_hex`, `colors_hex`, `color`, `rgb_color` or `filament_color`. An available `entity_picture` supplies the spool image.
- **Separate entities:** click **Separate entities** beside the spool entity's Clear button. Select a color entity and a type entity. Click **Single entity** to switch back without losing either set of selections.
- A custom **Label** overrides the automatic filament label. A static spool image can also be selected or uploaded.
- Without a usable image, the card draws a colored spool. Missing colors use neutral gray.

Accepted color examples: `#212721`, `212721`, `rgb(33, 39, 33)`, `33, 39, 33` and an RGB array such as `[33, 39, 33]`.

Standalone filament rows support a title, title alignment, background image/color and optional gradient. An empty title stays hidden. Embedded filaments use the printer overlay and ignore the standalone filament background.

#### Printer / live camera

Choose a printer image, model image entity or static model image, and an optional camera. The model overlay is intentional, but you can omit the printer image to display only the model.

- Adjust model size, vertical position and printer height. Position `0%` aligns the model box to the top, `50%` centers it and `100%` aligns it to the bottom.
- Enable **Use effect** and select a progress sensor reporting `0–100` to reveal the model from bottom to top. Missing progress shows the full model.
- Enable **Show Filaments** and/or **Show Controls** for the embedded overlays.
- Select **Compact** to reduce the configured height by 30%, subject to the minimum space required by overlays.
- Set the starting view and camera rotation, zoom and mirroring. Camera content stays clipped inside the printer area.
- **Adaptive** camera controls keep play/pause, audio and fullscreen upright. **Native** retains the camera's controls; **Disabled** hides them.

Transparent model images work best. Printer and model assets are not bundled, so you can use your own. Image controls accept paths/URLs and Home Assistant's upload/media picker.

#### Progress and information

Use a Progress widget for the filename and percentage bar. Leave its color unset to follow the theme, or select a custom color.

Use an Information widget for up to four freely chosen entities. Each entry has a label, optional icon, value format and optional secondary entity. A separator joins the values. Enable **Use line break** to place the secondary value on a new line, keeping the separator at the end of the first line. **Clear** removes the secondary entity.

Status and information fields open their primary entity's Home Assistant dialog when tapped. Information entries remain centered for every item count.

#### Buttons

Choose a **Large** or **Small** Buttons row and add entries with the plus button:

- **Large:** up to four entries, each with a main sensor and optional secondary entity. Tapping an entry with a secondary entity opens its dialog. Units default to the entity's units unless overridden.
- **Small:** up to five actions. `button` entities are pressed; `switch` and `light` entities are toggled.

Place icons above or beside labels, or hide them. For large buttons, icon and label work independently: clearing either removes it; clearing both leaves only the value. Selecting an entity initially copies its icon when available, which can then be replaced or cleared.

Embedded printer controls support up to five actions in a vertical, icon-only overlay, plus a separate camera/model toggle.

#### Sliders

Select a `number` or `input_number` entity. Its `min`, `max`, `step` and unit determine the range and value. Commands are sent when a value is committed rather than on every intermediate movement.

- **Bottom:** up to three sliders in one row, beneath their labels/icons. Use **Add slider** to add another.
- **Right:** one slider beside its label/icon. Remove extra sliders before switching a multi-slider row to this layout; existing entries are never silently deleted.
- Customize label, icon, color and subtitle. Use `{value}` for Home Assistant's formatted entity state, fixed text, or an empty subtitle to hide it.
- Entities reporting `unknown` remain controllable so an initial value can be set. Missing or `unavailable` entities stay disabled. The default subtitle follows Home Assistant's actual state, including unknown states.

### 4. Existing configurations and advanced YAML

Existing configurations continue to load. The visual editor adapts them to widgets and writes the new structure when you edit and save. Opening the editor alone does not save a migration.

The new format uses an ordered `widgets` list. Each widget has a unique, stable `id`, a `type`, an optional `enabled` switch and its own `config`. Repeated types are supported. When `widgets` is present, it is authoritative; original legacy fields are retained for recovery.

- [example-widgets.yaml](example-widgets.yaml): widget configuration, including sliders and separate filament entities.
- [example.yaml](example.yaml): compatible legacy configuration.
- [widget-migration.md](docs/widget-migration.md): migration details.

The Lovelace type remains `custom:three-d-printer-card`; `custom:3d-printer-card` is not valid. The filename remains `3d-printer-card.js`.

The editor defaults to English and uses German when Home Assistant's language starts with `de`. User-defined labels are not translated. Numeric formatting respects Home Assistant's locale and entity precision. The outer card follows the active card background in light and dark themes.

Tested with [hass-anycubic](https://github.com/Nino6689/hass-anycubic) by [@Nino6689](https://github.com/Nino6689), but designed for any integration exposing suitable entities.
