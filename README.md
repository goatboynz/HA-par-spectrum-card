# AS7341 Spectrum Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![GitHub Release](https://img.shields.io/github/release/goatboynz/HA-par-spectrum-card.svg)](https://github.com/goatboynz/HA-par-spectrum-card/releases)

A beautiful custom Lovelace card for visualizing AS7341 11-channel spectral sensor data in Home Assistant. Perfect for monitoring grow lights, analyzing light quality, and optimizing plant growth conditions.

![AS7341 Spectrum Card](screenshot.png)

## ✨ Features

- 🌈 **Beautiful spectrum visualization** - Smooth rainbow gradient showing your light's spectral distribution
- 📊 **Interactive tooltips** - Hover over the spectrum to see exact values at any wavelength
- 🎯 **8 spectral channels** - Displays all AS7341 channels (415nm - 680nm)
- 💡 **Clear & NIR support** - Shows Clear and Near-Infrared readings
- ⚠️ **Smart calibration warnings** - Automatically detects sensor saturation or weak signals
- 🎨 **Modern design** - Sleek, gradient-based UI that fits perfectly with Home Assistant
- 📱 **Fully responsive** - Works great on desktop, tablet, and mobile

## 📦 Installation

### Method 1: HACS (Recommended)

1. Open **HACS** in Home Assistant
2. Go to **Frontend** section
3. Click the **⋮** menu (top right) → **Custom repositories**
4. Add repository: `https://github.com/goatboynz/HA-par-spectrum-card`
5. Category: **Lovelace**
6. Click **Add** → Find "AS7341 Spectrum Card" → **Download**
7. **Restart** Home Assistant
8. Clear browser cache (Ctrl+F5)

### Method 2: Manual Installation

1. Download [`as7341-spectrum-card.js`](https://github.com/goatboynz/HA-par-spectrum-card/releases/latest)
2. Copy to `config/www/as7341-spectrum-card.js`
3. Add resource in Lovelace:
   - Go to **Settings** → **Dashboards** → **Resources**
   - Click **Add Resource**
   - URL: `/local/as7341-spectrum-card.js`
   - Type: **JavaScript Module**
4. **Restart** Home Assistant

---

## ⚙️ ESPHome Configuration

Configure your AS7341 sensor in ESPHome with optimized settings:

```yaml
i2c:
  sda: GPIO21
  scl: GPIO22
  scan: true

sensor:
  - platform: as7341
    # Integration time settings - adjust based on your light levels
    atime: 29        # Integration time (0-255, each = 2.78ms)
    astep: 599       # Integration steps (0-65534)
    gain: X8         # Gain: X0.5, X1, X2, X4, X8, X16, X32, X64, X128, X256, X512
    update_interval: 5s
    
    f1:
      name: "AS7341 F1 415nm"
    f2:
      name: "AS7341 F2 445nm"
    f3:
      name: "AS7341 F3 480nm"
    f4:
      name: "AS7341 F4 515nm"
    f5:
      name: "AS7341 F5 555nm"
    f6:
      name: "AS7341 F6 590nm"
    f7:
      name: "AS7341 F7 630nm"
    f8:
      name: "AS7341 F8 680nm"
    clear:
      name: "AS7341 Clear"
    nir:
      name: "AS7341 NIR"
```

### Tuning Integration Time

Integration time = `(atime + 1) × (astep + 1) × 2.78µs`

**If all channels show the same high value (saturated):**
- Decrease `gain`: X128 → X64 → X32 → X16 → X8
- Or decrease `atime`: 100 → 50 → 29
- Or decrease `astep`: 999 → 599 → 299

**If all values are too low (near 0):**
- Increase `gain`: X8 → X16 → X32 → X64
- Or increase `atime`: 29 → 50 → 100
- Or increase `astep`: 599 → 999

**Recommended starting points:**
- Bright indoor/outdoor: `atime: 29, astep: 599, gain: X8`
- Normal indoor: `atime: 50, astep: 999, gain: X16`
- Dim lighting: `atime: 100, astep: 999, gain: X64`

---

## 🎨 Card Configuration

Add the card to your Lovelace dashboard:

```yaml
type: custom:as7341-spectrum-card
title: Light Spectrum Analysis
entities:
  f1: sensor.as7341_f1_415nm
  f2: sensor.as7341_f2_445nm
  f3: sensor.as7341_f3_480nm
  f4: sensor.as7341_f4_515nm
  f5: sensor.as7341_f5_555nm
  f6: sensor.as7341_f6_590nm
  f7: sensor.as7341_f7_630nm
  f8: sensor.as7341_f8_680nm
  clear: sensor.as7341_clear      # Optional
  nir: sensor.as7341_nir          # Optional
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `entities` | object | **Yes** | - | Map of channel names to entity IDs |
| `entities.f1` - `entities.f8` | string | **Yes** | - | Spectral channel entities (415-680nm) |
| `entities.clear` | string | No | - | Clear channel entity (optional) |
| `entities.nir` | string | No | - | Near-infrared channel entity (optional) |
| `title` | string | No | `"Light Spectrum"` | Card title |

### Channel Mapping

| Channel | Wavelength | Color | Description |
|---------|------------|-------|-------------|
| `f1` | 415nm | Violet | UV-A / Deep violet |
| `f2` | 445nm | Blue | Royal blue |
| `f3` | 480nm | Cyan | Sky blue |
| `f4` | 515nm | Green | True green |
| `f5` | 555nm | Yellow-Green | Lime green |
| `f6` | 590nm | Yellow | Amber |
| `f7` | 630nm | Orange | Deep orange |
| `f8` | 680nm | Red | Deep red |
| `clear` | - | - | Broadband visible light |
| `nir` | ~910nm | - | Near-infrared |

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `entities` | object | Yes | - | Map of channel names to entity IDs |
| `title` | string | No | "Light Spectrum" | Card title |

### Entity Mapping

Map each AS7341 channel (f1-f8) to your Home Assistant entity:

```yaml
entities:
  f1: sensor.415nm      # 415nm - Violet
  f2: sensor.445nm      # 445nm - Blue
  f3: sensor.480nm      # 480nm - Cyan
  f4: sensor.515nm      # 515nm - Green
  f5: sensor.555nm      # 555nm - Yellow-Green
  f6: sensor.590nm      # 590nm - Yellow
  f7: sensor.630nm      # 630nm - Orange
  f8: sensor.680nm      # 680nm - Red
```

You can use any entity naming scheme - just map them to the correct channels.

---

## 💡 How to Use

### Interactive Features

- **Hover over the spectrum** - See exact values at any wavelength
- **Hover near sensor points** - View specific channel readings with color coding
- **UV region (<400nm)** - Shows extrapolated UV values
- **Near-IR region (>700nm)** - Shows NIR sensor data when available

### Understanding the Visualization

The card displays a smooth, interpolated curve based on your 8 sensor readings:

- **Smooth edges** - Spectrum gracefully tapers to zero at both ends (380-750nm)
- **Rainbow gradient** - Color-coded from violet → blue → green → yellow → orange → red
- **Interpolation** - Values between sensor points are calculated using cubic splines
- **Real-time updates** - Chart updates automatically when sensor values change

### Calibration Warnings

The card automatically detects sensor issues:

- ⚠️ **Saturation warning** - All channels showing similar high values (>50,000)
  - **Fix**: Reduce `gain` or `atime` in ESPHome
- 📉 **Weak signal** - All values very low (<100)
  - **Fix**: Increase `gain` or `atime` in ESPHome
- 💡 **No light detected** - All values are zero
  - **Fix**: Ensure sensor is exposed to light source

---

## 🌱 About Light Spectrum & PAR

**PAR (Photosynthetically Active Radiation)** is the 400-700nm wavelength range that plants use for photosynthesis.

### Wavelength Effects on Plants

| Range | Color | Plant Response |
|-------|-------|----------------|
| 380-450nm | Violet/Blue | Vegetative growth, compact structure |
| 450-500nm | Blue | Chlorophyll absorption, photosynthesis |
| 500-600nm | Green/Yellow | Canopy penetration, secondary photosynthesis |
| 600-700nm | Orange/Red | Flowering, fruiting, photosynthesis |
| 700-750nm | Far-Red/NIR | Shade avoidance, flowering timing |

---

## 🔧 Troubleshooting

### Card not appearing

- ✅ Verify resource is loaded: **Settings** → **Dashboards** → **Resources**
- ✅ Clear browser cache: **Ctrl+F5** or **Cmd+Shift+R**
- ✅ Check browser console (F12) for errors
- ✅ Restart Home Assistant

### No data / All zeros

- ✅ Verify ESPHome device is **online**
- ✅ Check entity names match your configuration exactly
- ✅ Ensure sensor is exposed to **light source**
- ✅ Check **Developer Tools** → **States** for entity values

### Saturation (all channels same value)

- ✅ **Reduce** `gain`: X128 → X64 → X32 → X16 → X8
- ✅ **Reduce** `atime`: 100 → 50 → 29
- ✅ **Reduce** `astep`: 999 → 599 → 299

### Weak signal (values too low)

- ✅ **Increase** `gain`: X8 → X16 → X32 → X64
- ✅ **Increase** `atime`: 29 → 50 → 100
- ✅ Check sensor is not obstructed
- ✅ Verify I2C connection is stable

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Credits

- AS7341 sensor by [AMS](https://ams.com/)
- ESPHome integration
- Inspired by professional spectroradiometer visualizations

## ⭐ Support

If you find this card useful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting issues
- 💡 Suggesting features
- 🔧 Contributing improvements

---

**Made with 🌱 for the Home Assistant community**
