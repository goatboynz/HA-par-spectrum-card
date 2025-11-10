# AS7341 Spectrum Card for Home Assistant

A custom Lovelace card for visualizing AS7341 spectral sensor data in Home Assistant with beautiful spectrum charts showing PAR (Photosynthetically Active Radiation) analysis.

## Features

- 📊 Real-time spectrum visualization with gradient colors
- 🌈 8-channel spectral data display (415nm - 680nm)
- 🌱 PAR range highlighting (400-700nm)
- 📈 Smooth curve interpolation
- 🎨 Automatic color mapping to wavelengths
- 📱 Responsive design

## Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Go to "Frontend"
3. Click the menu (three dots) in the top right
4. Select "Custom repositories"
5. Add this repository URL
6. Select category "Lovelace"
7. Click "Install"
8. Restart Home Assistant

### Manual Installation

1. Download `as7341-spectrum-card.js`
2. Copy to `config/www/as7341-spectrum-card.js`
3. Add to Lovelace resources:
   ```yaml
   url: /local/as7341-spectrum-card.js
   type: module
   ```
4. Restart Home Assistant

## ESPHome Configuration

First, configure your AS7341 sensor in ESPHome:

```yaml
i2c:
  sda: GPIO21
  scl: GPIO22
  scan: true

sensor:
  - platform: as7341
    f1:
      name: "AS7341 F1 415nm"
      id: as7341_f1
    f2:
      name: "AS7341 F2 445nm"
      id: as7341_f2
    f3:
      name: "AS7341 F3 480nm"
      id: as7341_f3
    f4:
      name: "AS7341 F4 515nm"
      id: as7341_f4
    f5:
      name: "AS7341 F5 555nm"
      id: as7341_f5
    f6:
      name: "AS7341 F6 590nm"
      id: as7341_f6
    f7:
      name: "AS7341 F7 630nm"
      id: as7341_f7
    f8:
      name: "AS7341 F8 680nm"
      id: as7341_f8
    clear:
      name: "AS7341 Clear"
    nir:
      name: "AS7341 NIR"
    gain: X8
    atime: 100
    astep: 999
    update_interval: 60s
```

## Card Configuration

Add the card to your Lovelace dashboard:

```yaml
type: custom:as7341-spectrum-card
title: Light Spectrum Analysis
entities:
  f1: sensor.415nm
  f2: sensor.445nm
  f3: sensor.480nm
  f4: sensor.515nm
  f5: sensor.555nm
  f6: sensor.590nm
  f7: sensor.630nm
  f8: sensor.680nm
```

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

## Understanding the Display

### Spectrum Chart
- **X-axis**: Wavelength in nanometers (nm)
- **Y-axis**: Relative intensity
- **Green background**: PAR range (400-700nm) - optimal for photosynthesis
- **Gradient fill**: Color-coded spectrum from violet to red
- **Smooth curve**: Interpolated data between measurement points

### Channel Information
Shows individual readings for each spectral channel with:
- Channel name (F1-F8)
- Wavelength
- Current value
- Color-coded display

### PAR Indicator
Displays:
- Total PAR value (sum of all channels in 400-700nm range)
- Average PAR value

## About PAR and Spectrum

**PAR (Photosynthetically Active Radiation)** is the range of light wavelengths (400-700nm) that plants use for photosynthesis. The AS7341 sensor measures 8 specific wavelengths within and around this range:

- **Violet/Blue (415-480nm)**: Promotes vegetative growth
- **Green (515-555nm)**: Penetrates deeper into plant canopy
- **Yellow/Orange (590-630nm)**: Supports flowering
- **Red (680nm)**: Critical for photosynthesis and flowering

## Troubleshooting

### Card not showing
1. Check that the resource is loaded in Lovelace
2. Clear browser cache
3. Check browser console for errors

### No data displayed
1. Verify ESPHome device is online
2. Check entity names match configuration
3. Ensure sensors are publishing data

### Incorrect values
1. Verify AS7341 gain and integration time settings
2. Check sensor calibration
3. Ensure proper I2C connection

## License

MIT License

## Credits

Based on AS7341 spectral sensor by AMS and ESPHome integration.
