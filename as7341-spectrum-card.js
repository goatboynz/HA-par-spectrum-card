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
        }
        .debug-info {
          margin-top: 12px;
          padding: 8px;
          background: var(--secondary-background-color);
          border-radius: 4px;
          font-size: 11px;
          font-family: monospace;
          color: var(--secondary-text-color);
          max-height: 200px;
          overflow-y: auto;
        }
      </style>
      <ha-card>
        <div class="card-header">${this.config.title || 'Light Spectrum'}</div>
        <div class="spectrum-container">
          <canvas id="spectrum-canvas"></canvas>
        </div>
        <div class="info-grid" id="channel-info"></div>
        <div class="par-indicator" id="par-info"></div>
        <div class="debug-info" id="debug-info"></div>
      </ha-card>
    `;
  }

  updateChart() {
    const debugInfo = [];
    
    if (!this._hass) {
      debugInfo.push('ERROR: No hass object');
      this.updateDebugInfo(debugInfo);
      return;
    }
    
    if (!this.config.entities) {
      debugInfo.push('ERROR: No entities configured');
      this.updateDebugInfo(debugInfo);
      return;
    }

    debugInfo.push('Config entities:', JSON.stringify(this.config.entities, null, 2));

    const channels = this.getChannelData();
    
    if (!channels || channels.length === 0) {
      debugInfo.push('ERROR: No channel data retrieved');
      this.updateDebugInfo(debugInfo);
      return;
    }

    debugInfo.push(`Found ${channels.length} channels`);
    channels.forEach(ch => {
      debugInfo.push(`${ch.name}: ${ch.value} ${ch.unit} (${ch.available ? 'available' : 'unavailable'})`);
    });

    this.updateDebugInfo(debugInfo);
    this.drawSpectrum(channels);
    this.updateChannelInfo(channels);
    this.updatePARInfo(channels);
  }

  updateDebugInfo(messages) {
    const container = this.shadowRoot.getElementById('debug-info');
    if (container) {
      container.innerHTML = messages.join('<br>');
    }
  }

  getChannelData() {
    const entities = this.config.entities || {};
    const channels = [
      { name: 'F1', wavelength: 415, color: '#8B00FF', entity: entities.f1 },
      { name: 'F2', wavelength: 445, color: '#0000FF', entity: entities.f2 },
      { name: 'F3', wavelength: 480, color: '#00BFFF', entity: entities.f3 },
      { name: 'F4', wavelength: 515, color: '#00FF00', entity: entities.f4 },
      { name: 'F5', wavelength: 555, color: '#9ACD32', entity: entities.f5 },
      { name: 'F6', wavelength: 590, color: '#FFFF00', entity: entities.f6 },
      { name: 'F7', wavelength: 630, color: '#FF8C00', entity: entities.f7 },
      { name: 'F8', wavelength: 680, color: '#FF0000', entity: entities.f8 }
    ];

    console.log('AS7341 Card - Configured entities:', entities);
    console.log('AS7341 Card - Available states:', Object.keys(this._hass.states).filter(k => k.includes('spectrum')));

    return channels.filter(ch => ch.entity).map(ch => {
      const entity = this._hass.states[ch.entity];
      console.log(`AS7341 Card - Channel ${ch.name} (${ch.entity}):`, entity);
      
      const state = entity ? entity.state : 'unknown';
      const value = (state !== 'unknown' && state !== 'unavailable') ? parseFloat(state) : 0;
      
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
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    // Find max value for scaling
    const maxValue = Math.max(...channels.map(ch => ch.value), 1);

    // Draw PAR range background (400-700nm)
    ctx.fillStyle = 'rgba(100, 200, 100, 0.1)';
    const parStart = this.wavelengthToX(400, chartWidth, padding);
    const parEnd = this.wavelengthToX(700, chartWidth, padding);
    ctx.fillRect(parStart, padding, parEnd - parStart, chartHeight);

    // Draw spectrum curve with gradient fill
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);

    channels.forEach((ch, i) => {
      const x = this.wavelengthToX(ch.wavelength, chartWidth, padding);
      const y = padding + chartHeight - (ch.value / maxValue) * chartHeight;
      
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        const prevCh = channels[i - 1];
        const prevX = this.wavelengthToX(prevCh.wavelength, chartWidth, padding);
        const prevY = padding + chartHeight - (prevCh.value / maxValue) * chartHeight;
        
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        ctx.quadraticCurveTo(cpX, (prevY + y) / 2, x, y);
      }
    });

    ctx.lineTo(this.wavelengthToX(channels[channels.length - 1].wavelength, chartWidth, padding), padding + chartHeight);
    ctx.closePath();

    // Create gradient fill
    const gradient = ctx.createLinearGradient(padding, 0, padding + chartWidth, 0);
    gradient.addColorStop(0, 'rgba(139, 0, 255, 0.6)');
    gradient.addColorStop(0.2, 'rgba(0, 0, 255, 0.6)');
    gradient.addColorStop(0.4, 'rgba(0, 255, 0, 0.6)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 0, 0.6)');
    gradient.addColorStop(0.8, 'rgba(255, 140, 0, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0.6)');
    
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Get text color from CSS variable
    const textColor = getComputedStyle(this).getPropertyValue('--primary-text-color') || '#ffffff';

    // Draw axes
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = textColor;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    channels.forEach(ch => {
      const x = this.wavelengthToX(ch.wavelength, chartWidth, padding);
      ctx.fillText(`${ch.wavelength}nm`, x, height - 10);
    });

    // Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Intensity', 0, 0);
    ctx.restore();

    // X-axis label
    ctx.textAlign = 'center';
    ctx.fillText('Wavelength (nm)', width / 2, height - 5);
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
