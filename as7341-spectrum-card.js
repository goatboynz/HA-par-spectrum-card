class AS7341SpectrumCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    if (!config.entities && !config.entity) {
      throw new Error('Please define entities');
    }
    this.config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.updateChart();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 16px;
        }
        .card-header {
          font-size: 24px;
          font-weight: 500;
          padding-bottom: 12px;
        }
        .spectrum-container {
          position: relative;
          width: 100%;
          height: 300px;
          margin: 20px 0;
        }
        canvas {
          width: 100%;
          height: 100%;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        .info-item {
          text-align: center;
          padding: 8px;
          background: var(--secondary-background-color);
          border-radius: 8px;
        }
        .info-label {
          font-size: 11px;
          color: var(--secondary-text-color);
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 16px;
          font-weight: 500;
        }
        .par-indicator {
          margin-top: 12px;
          padding: 12px;
          background: var(--primary-color);
          color: var(--text-primary-color);
          border-radius: 8px;
          text-align: center;
          font-size: 14px;
        }
      </style>
      <ha-card>
        <div class="card-header">${this.config.title || 'Light Spectrum'}</div>
        <div class="spectrum-container">
          <canvas id="spectrum-canvas"></canvas>
        </div>
        <div class="info-grid" id="channel-info"></div>
        <div class="par-indicator" id="par-info"></div>
      </ha-card>
    `;
  }

  updateChart() {
    if (!this._hass || !this.config.entities) return;

    const channels = this.getChannelData();
    if (!channels || channels.length === 0) return;

    this.drawSpectrum(channels);
    this.updateChannelInfo(channels);
    this.updatePARInfo(channels);
  }

  getChannelData() {
    const entities = this.config.entities || {};
    const channels = [
      { name: 'F1', wavelength: 415, color: '#8B00FF', entity: entities.f1 },
      { name: 'F2', wavelength: 445, color: '#4169E1', entity: entities.f2 },
      { name: 'F3', wavelength: 480, color: '#00BFFF', entity: entities.f3 },
      { name: 'F4', wavelength: 515, color: '#00FF00', entity: entities.f4 },
      { name: 'F5', wavelength: 555, color: '#9ACD32', entity: entities.f5 },
      { name: 'F6', wavelength: 590, color: '#FFD700', entity: entities.f6 },
      { name: 'F7', wavelength: 630, color: '#FF8C00', entity: entities.f7 },
      { name: 'F8', wavelength: 680, color: '#FF0000', entity: entities.f8 }
    ];

    return channels.filter(ch => ch.entity).map(ch => {
      const entity = this._hass.states[ch.entity];
      const state = entity ? entity.state : 'unknown';
      const value = (state && state !== 'unknown' && state !== 'unavailable') ? parseFloat(state) : 0;
      
      return {
        ...ch,
        value: isNaN(value) ? 0 : value,
        unit: entity?.attributes?.unit_of_measurement || '',
        available: entity && state !== 'unknown' && state !== 'unavailable'
      };
    });
  }

  drawSpectrum(channels) {
    const canvas = this.shadowRoot.getElementById('spectrum-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 50;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    // Find max value for scaling
    const maxValue = Math.max(...channels.map(ch => ch.value), 1);

    // Create interpolated points for smoother curve
    const interpolatedPoints = this.interpolateSpectrum(channels, maxValue, chartWidth, chartHeight, padding);

    // Draw background gradient (soft pastel colors)
    const bgGradient = ctx.createLinearGradient(padding, 0, padding + chartWidth, 0);
    bgGradient.addColorStop(0, 'rgba(138, 43, 226, 0.12)');
    bgGradient.addColorStop(0.15, 'rgba(100, 149, 237, 0.12)');
    bgGradient.addColorStop(0.3, 'rgba(135, 206, 235, 0.12)');
    bgGradient.addColorStop(0.45, 'rgba(144, 238, 144, 0.12)');
    bgGradient.addColorStop(0.55, 'rgba(255, 255, 224, 0.12)');
    bgGradient.addColorStop(0.7, 'rgba(255, 218, 185, 0.12)');
    bgGradient.addColorStop(0.85, 'rgba(255, 192, 203, 0.12)');
    bgGradient.addColorStop(1, 'rgba(255, 182, 193, 0.12)');
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(padding, padding, chartWidth, chartHeight);

    // Draw the spectrum curve
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    
    interpolatedPoints.forEach((point, i) => {
      if (i === 0) {
        ctx.lineTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    
    ctx.lineTo(interpolatedPoints[interpolatedPoints.length - 1].x, padding + chartHeight);
    ctx.closePath();

    // Create vibrant rainbow gradient fill
    const dataGradient = ctx.createLinearGradient(padding, 0, padding + chartWidth, 0);
    dataGradient.addColorStop(0, 'rgba(138, 43, 226, 0.85)');
    dataGradient.addColorStop(0.15, 'rgba(75, 0, 130, 0.85)');
    dataGradient.addColorStop(0.25, 'rgba(0, 0, 255, 0.85)');
    dataGradient.addColorStop(0.4, 'rgba(0, 191, 255, 0.85)');
    dataGradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.85)');
    dataGradient.addColorStop(0.6, 'rgba(173, 255, 47, 0.85)');
    dataGradient.addColorStop(0.7, 'rgba(255, 255, 0, 0.85)');
    dataGradient.addColorStop(0.8, 'rgba(255, 165, 0, 0.85)');
    dataGradient.addColorStop(0.9, 'rgba(255, 69, 0, 0.85)');
    dataGradient.addColorStop(1, 'rgba(255, 0, 0, 0.85)');
    
    ctx.fillStyle = dataGradient;
    ctx.fill();

    // Draw smooth outline
    ctx.beginPath();
    interpolatedPoints.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Get text color from CSS variable
    const textColor = getComputedStyle(this).getPropertyValue('--primary-text-color') || '#ffffff';

    // Draw axes
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    // Draw wavelength labels
    ctx.fillStyle = textColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    
    for (let wl = 400; wl <= 700; wl += 50) {
      const x = this.wavelengthToX(wl, chartWidth, padding);
      ctx.fillText(`${wl}`, x, height - 15);
    }

    // Y-axis label
    ctx.save();
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    ctx.fillText('Relative Intensity', 0, 0);
    ctx.restore();

    // X-axis label
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    ctx.fillText('Wavelength (nm)', width / 2, height - 2);
  }

  interpolateSpectrum(channels, maxValue, chartWidth, chartHeight, padding) {
    const points = [];
    const numInterpolated = 100; // Number of points to create smooth curve
    
    // Create array of wavelength/value pairs
    const dataPoints = channels.map(ch => ({
      wavelength: ch.wavelength,
      value: ch.value
    }));
    
    // Interpolate between points using cubic interpolation
    for (let i = 0; i <= numInterpolated; i++) {
      const wavelength = 415 + (i / numInterpolated) * (680 - 415);
      const value = this.cubicInterpolate(dataPoints, wavelength);
      const x = this.wavelengthToX(wavelength, chartWidth, padding);
      const y = padding + chartHeight - (value / maxValue) * chartHeight;
      points.push({ x, y });
    }
    
    return points;
  }

  cubicInterpolate(dataPoints, wavelength) {
    // Find surrounding points
    let i1 = 0;
    for (let i = 0; i < dataPoints.length - 1; i++) {
      if (wavelength >= dataPoints[i].wavelength && wavelength <= dataPoints[i + 1].wavelength) {
        i1 = i;
        break;
      }
    }
    
    const i0 = Math.max(0, i1 - 1);
    const i2 = Math.min(dataPoints.length - 1, i1 + 1);
    const i3 = Math.min(dataPoints.length - 1, i1 + 2);
    
    const p0 = dataPoints[i0];
    const p1 = dataPoints[i1];
    const p2 = dataPoints[i2];
    const p3 = dataPoints[i3];
    
    // Normalize t between 0 and 1
    const t = (wavelength - p1.wavelength) / (p2.wavelength - p1.wavelength);
    
    // Catmull-Rom spline interpolation
    const t2 = t * t;
    const t3 = t2 * t;
    
    const v0 = p0.value;
    const v1 = p1.value;
    const v2 = p2.value;
    const v3 = p3.value;
    
    return 0.5 * (
      (2 * v1) +
      (-v0 + v2) * t +
      (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 +
      (-v0 + 3 * v1 - 3 * v2 + v3) * t3
    );
  }

  wavelengthToX(wavelength, chartWidth, padding) {
    const minWavelength = 400;
    const maxWavelength = 700;
    const ratio = (wavelength - minWavelength) / (maxWavelength - minWavelength);
    return padding + ratio * chartWidth;
  }

  updateChannelInfo(channels) {
    const container = this.shadowRoot.getElementById('channel-info');
    container.innerHTML = channels.map(ch => `
      <div class="info-item">
        <div class="info-label">${ch.name} (${ch.wavelength}nm)</div>
        <div class="info-value" style="color: ${ch.color}">${ch.value.toFixed(1)} ${ch.unit}</div>
      </div>
    `).join('');
  }

  updatePARInfo(channels) {
    const parChannels = channels.filter(ch => ch.wavelength >= 400 && ch.wavelength <= 700);
    const totalPAR = parChannels.reduce((sum, ch) => sum + ch.value, 0);
    const avgPAR = totalPAR / parChannels.length;

    const container = this.shadowRoot.getElementById('par-info');
    container.innerHTML = `
      <strong>PAR (400-700nm)</strong><br>
      Total: ${totalPAR.toFixed(1)} | Average: ${avgPAR.toFixed(1)}
    `;
  }

  getCardSize() {
    return 5;
  }

  static getConfigElement() {
    return document.createElement('as7341-spectrum-card-editor');
  }

  static getStubConfig() {
    return {
      entities: {
        f1: 'sensor.415nm',
        f2: 'sensor.445nm',
        f3: 'sensor.480nm',
        f4: 'sensor.515nm',
        f5: 'sensor.555nm',
        f6: 'sensor.590nm',
        f7: 'sensor.630nm',
        f8: 'sensor.680nm'
      },
      title: 'Light Spectrum'
    };
  }
}

customElements.define('as7341-spectrum-card', AS7341SpectrumCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'as7341-spectrum-card',
  name: 'AS7341 Spectrum Card',
  description: 'Display AS7341 spectral sensor data as a spectrum chart'
});
