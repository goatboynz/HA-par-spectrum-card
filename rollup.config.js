import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'as7341-spectrum-card.js',
  output: {
    file: 'dist/as7341-spectrum-card.js',
    format: 'es',
  },
  plugins: [
    resolve(),
    terser()
  ]
};
