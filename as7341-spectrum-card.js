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
          cursor: crosshair;
        }
        canvas {
          width: 100%;
          height: 100%;
        }
        .tooltip {
          position: absolute;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 1000;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .tooltip.show {
          opacity: 1;
        }
        .tooltip-wavelength {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .tooltip-value {
          color: #4CAF50;
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
        .warning-indicator {
          margin-top: 12px;
          padding: 12px;
          background: var(--warning-color, #ff9800);
          color: var(--text-primary-color);
          border-radius: 8px;
          text-align: center;
          font-size: 13px;
          display: none;
        }
        .warning-indicator.show {
          display: block;
        }
        .info-indicator {
          margin-top: 12px;
          padding: 12px;
          background: var(--info-color, #2196F3);
          color: var(--text-primary-color);
          border-radius: 8px;
          text-align: center;
          font-size: 13px;
          display: none;
        }
        .info-indicator.show {
          display: block;
        }
      </style>
      <ha-card>
        <div class="card-header">${this.config.title || 'Light Spectrum'}</div>
        <div class="spectrum-container" id="spectrum-container">
          <canvas id="spectrum-canvas"></canvas>
          <div class="tooltip" id="tooltip">
            <div class="tooltip-wavelength"></div>
            <div class="tooltip-value"></div>
          </div>
        </div>
        <div class="warning-indicator" id="warning-info"></div>
        <div class="info-indicator" id="status-info"></div>
        <div class="par-indicator" id="par-info"></div>
      </ha-card>
    `;
    
    // Add mouse event listeners after rendering
    setTimeout(() => this.setupTooltip(), 0);
  }

  updateChart() {
    if (!this._hass || !this.config.entities) return;

    const channels = this.getChannelData();
    if (!channels || channels.length === 0) return;

    this._channels = channels; // Store for tooltip
    this.checkSensorStatus(channels);
    this.drawSpectrum(channels);
    this.updatePARInfo(channels);
  }

  setupTooltip() {
    const container = this.shadowRoot.getElementById('spectrum-container');
    const canvas = this.shadowRoot.getElementById('spectrum-canvas');
    const tooltip = this.shadowRoot.getElementById('tooltip');
    
    if (!container || !canvas || !tooltip) return;

    const handleMouseMove = (e) => {
      if (!this._channels) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const padding = 50;
      const chartWidth = rect.width - padding * 2;
      
      // Check if mouse is within chart area
      if (x < padding || x > rect.width - padding) {
        tooltip.classList.remove('show');
        return;
      }
      
      // Calculate wavelength from x position
      const ratio = (x - padding) / chartWidth;
      const wavelength = Math.round(380 + ratio * 370);
      
      // Find closest channel or interpolate
      const value = this.getValueAtWavelength(wavelength);
      const unit = this._channels[0]?.unit || '';
      
      // Find if we're near a specific channel
      const nearestChannel = this._channels.find(ch => 
        Math.abs(ch.wavelength - wavelength) < 15
      );
      
      // Update tooltip content
      const wavelengthEl = tooltip.querySelector('.tooltip-wavelength');
      const valueEl = tooltip.querySelector('.tooltip-value');
      
      if (nearestChannel) {
        wavelengthEl.textContent = `${nearestChannel.name} (${nearestChannel.wavelength}nm)`;
        valueEl.textContent = `${nearestChannel.value.toFixed(1)} ${unit}`;
        valueEl.style.color = nearestChannel.color;
      } else if (wavelength < 400) {
        wavelengthEl.textContent = `${wavelength}nm (UV)`;
        valueEl.textContent = `${value.toFixed(1)} ${unit}`;
        valueEl.style.color = '#9370DB';
      } else if (wavelength > 700) {
        wavelengthEl.textContent = `${wavelength}nm (Near-IR)`;
        if (this._nirValue !== undefined && wavelength > 720) {
          valueEl.textContent = `NIR: ${this._nirValue.toFixed(1)} ${this._nirUnit}`;
          valueEl.style.color = '#8B0000';
        } else {
          valueEl.textContent = `${value.toFixed(1)} ${unit}`;
          valueEl.style.color = '#8B0000';
        }
      } else {
        wavelengthEl.textContent = `${wavelength}nm`;
        valueEl.textContent = `${value.toFixed(1)} ${unit}`;
        valueEl.style.color = '#4CAF50';
      }
      
      // Show Clear value when hovering over the full spectrum
      if (this._clearValue !== undefined && wavelength >= 400 && wavelength <= 700) {
        const clearInfo = document.createElement('div');
        clearInfo.style.fontSize = '10px';
        clearInfo.style.marginTop = '4px';
        clearInfo.style.color = '#CCCCCC';
        clearInfo.textContent = `Clear: ${this._clearValue.toFixed(1)} ${this._clearUnit}`;
        
        // Only add if not already there
        if (!tooltip.querySelector('.clear-info')) {
          clearInfo.className = 'clear-info';
          tooltip.appendChild(clearInfo);
        }
      } else {
        const clearInfo = tooltip.querySelector('.clear-info');
        if (clearInfo) clearInfo.remove();
      }
      
      // Position tooltip
      tooltip.style.left = `${x + 15}px`;
      tooltip.style.top = `${y - 40}px`;
      tooltip.classList.add('show');
    };
    
    const handleMouseLeave = () => {
      tooltip.classList.remove('show');
    };
    
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
  }

  getValueAtWavelength(wavelength) {
    if (!this._channels) return 0;
    
    const dataPoints = this._channels.map(ch => ({
      wavelength: ch.wavelength,
      value: ch.value
    }));
    
    return this.cubicInterpolate(dataPoints, wavelength);
  }

  checkSensorStatus(channels) {
    const warningContainer = this.shadowRoot.getElementById('warning-info');
    const statusContainer = this.shadowRoot.getElementById('status-info');
    
    const values = channels.map(ch => ch.value).filter(v => v > 0);
    
    if (values.length === 0) {
      // All zeros
      statusContainer.innerHTML = '💡 No light detected. Ensure sensor is exposed to light source.';
      statusContainer.classList.add('show');
      warningContainer.classList.remove('show');
      return;
    }
    
    const maxValue = Math.max(...values);

    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Check for saturation (all values very similar and high)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avgValue;
    
    if (coefficientOfVariation < 0.1 && maxValue > 50000) {
      // Likely saturated
      warningContainer.innerHTML = '⚠️ Sensors may be saturated! Reduce <strong>gain</strong> or <strong>atime</strong> in ESPHome config.';
      warningContainer.classList.add('show');
      statusContainer.classList.remove('show');
    } else if (maxValue < 100) {
      // Values too low
      statusContainer.innerHTML = '📉 Signal weak. Increase <strong>gain</strong> or <strong>atime</strong> in ESPHome config.';
      statusContainer.classList.add('show');
      warningContainer.classList.remove('show');
    } else {
      // Good readings
      warningContainer.classList.remove('show');
      statusContainer.classList.remove('show');
    }
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

    const spectrumData = channels.filter(ch => ch.entity).map(ch => {
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

    // Store clear and NIR data separately for display
    if (entities.clear) {
      const clearEntity = this._hass.states[entities.clear];
      const clearState = clearEntity ? clearEntity.state : 'unknown';
      const clearValue = (clearState && clearState !== 'unknown' && clearState !== 'unavailable') ? parseFloat(clearState) : 0;
      this._clearValue = isNaN(clearValue) ? 0 : clearValue;
      this._clearUnit = clearEntity?.attributes?.unit_of_measurement || '';
    }

    if (entities.nir) {
      const nirEntity = this._hass.states[entities.nir];
      const nirState = nirEntity ? nirEntity.state : 'unknown';
      const nirValue = (nirState && nirState !== 'unknown' && nirState !== 'unavailable') ? parseFloat(nirState) : 0;
      this._nirValue = isNaN(nirValue) ? 0 : nirValue;
      this._nirUnit = nirEntity?.attributes?.unit_of_measurement || '';
    }

    return spectrumData;
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
    
    for (let wl = 400; wl <= 750; wl += 50) {
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
    const numInterpolated = 150; // More points for smoother curve
    
    // Create array of wavelength/value pairs with extended range
    const dataPoints = channels.map(ch => ({
      wavelength: ch.wavelength,
      value: ch.value
    }));
    
    // Add virtual points at the edges for smooth drop-off
    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;
    
    // Extend the range from 380nm to 750nm for smooth edges
    const extendedDataPoints = [
      { wavelength: 380, value: 0 },
      { wavelength: 395, value: firstValue * 0.3 },
      ...dataPoints,
      { wavelength: 700, value: lastValue * 0.5 },
      { wavelength: 730, value: lastValue * 0.2 },
      { wavelength: 750, value: 0 }
    ];
    
    // Interpolate between points using cubic interpolation
    for (let i = 0; i <= numInterpolated; i++) {
      const wavelength = 380 + (i / numInterpolated) * (750 - 380);
      const value = this.cubicInterpolate(extendedDataPoints, wavelength);
      const x = this.wavelengthToX(wavelength, chartWidth, padding);
      const y = padding + chartHeight - (Math.max(0, value) / maxValue) * chartHeight;
      points.push({ x, y, wavelength });
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
    const minWavelength = 380;
    const maxWavelength = 750;
    const ratio = (wavelength - minWavelength) / (maxWavelength - minWavelength);
    return padding + ratio * chartWidth;
  }



  updatePARInfo(channels) {
    const parChannels = channels.filter(ch => ch.wavelength >= 400 && ch.wavelength <= 700);
    const totalPAR = parChannels.reduce((sum, ch) => sum + ch.value, 0);
    const avgPAR = totalPAR / parChannels.length;

    const container = this.shadowRoot.getElementById('par-info');
    
    let parInfo = `<strong>PAR (400-700nm)</strong><br>Total: ${totalPAR.toFixed(1)} | Average: ${avgPAR.toFixed(1)}`;
    
    // Add Clear and NIR if available
    if (this._clearValue !== undefined || this._nirValue !== undefined) {
      parInfo += '<br><span style="font-size: 12px;">';
      if (this._clearValue !== undefined) {
        parInfo += `Clear: ${this._clearValue.toFixed(1)} ${this._clearUnit}`;
      }
      if (this._nirValue !== undefined) {
        if (this._clearValue !== undefined) parInfo += ' | ';
        parInfo += `NIR: ${this._nirValue.toFixed(1)} ${this._nirUnit}`;
      }
      parInfo += '</span>';
    }
    
    container.innerHTML = parInfo;
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
        f8: 'sensor.680nm',
        clear: 'sensor.clear',
        nir: 'sensor.nir'
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
