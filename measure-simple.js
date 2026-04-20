// Simple measurement script using fetch to compare layouts
const fs = require('fs');
const path = require('path');

// Create HTML files to open in browser
const createMeasurementPage = (route) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Layout Measurement - ${route}</title>
  <style>
    body { margin: 20px; font-family: monospace; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
    .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
    .critical { background: #ffebee; border-color: #f44336; }
  </style>
</head>
<body>
  <h1>Layout Measurement: ${route}</h1>
  <p>Open DevTools Console (F12) and run:</p>
  <pre>
// Measure all critical nodes
const nodeIds = ['hero-title', 'hero-subtitle', 'hero-logo', 'hero-bg-image', 'intro-banner-gif'];
const metrics = {};

nodeIds.forEach(nodeId => {
  const element = document.getElementById(nodeId);
  if (element) {
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    metrics[nodeId] = {
      rect: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      computed: {
        transform: computed.transform,
        transformOrigin: computed.transformOrigin,
        textAlign: computed.textAlign,
        backgroundImage: computed.backgroundImage,
        color: computed.color,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        position: computed.position,
        display: computed.display,
      },
      dataset: {
        x: element.dataset.editorGeometryX,
        y: element.dataset.editorGeometryY,
        width: element.dataset.editorGeometryWidth,
        height: element.dataset.editorGeometryHeight,
        textAlign: element.dataset.editorTextAlign,
      }
    };
  }
});

console.log('METRICS for ${route}:', metrics);
console.log('Copy this to compare with other route:');
console.log(JSON.stringify(metrics, null, 2));
  </pre>
  
  <div id="results"></div>
  
  <script>
    // Auto-run measurement after page load
    setTimeout(() => {
      const nodeIds = ['hero-title', 'hero-subtitle', 'hero-logo', 'hero-bg-image', 'intro-banner-gif'];
      const metrics = {};
      
      nodeIds.forEach(nodeId => {
        const element = document.getElementById(nodeId);
        if (element) {
          const rect = element.getBoundingClientRect();
          const computed = window.getComputedStyle(element);
          metrics[nodeId] = {
            rect: {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
            computed: {
              transform: computed.transform,
              transformOrigin: computed.transformOrigin,
              textAlign: computed.textAlign,
              backgroundImage: computed.backgroundImage,
              color: computed.color,
              fontSize: computed.fontSize,
              lineHeight: computed.lineHeight,
              letterSpacing: computed.letterSpacing,
              position: computed.position,
              display: computed.display,
            },
            dataset: {
              x: element.dataset.editorGeometryX,
              y: element.dataset.editorGeometryY,
              width: element.dataset.editorGeometryWidth,
              height: element.dataset.editorGeometryHeight,
              textAlign: element.dataset.editorTextAlign,
            }
          };
        }
      });
      
      console.log('METRICS for ${route}:', metrics);
      
      // Display results on page
      const resultsDiv = document.getElementById('results');
      let html = '<h2>Results:</h2>';
      Object.entries(metrics).forEach(([nodeId, data]) => {
        const critical = Math.abs(data.rect.left) > 1000 || Math.abs(data.rect.top) > 1000;
        html += \`
          <div class="metric \${critical ? 'critical' : ''}">
            <h3>\${nodeId}</h3>
            <p>Position: \${data.rect.left},\${data.rect.top} | Size: \${data.rect.width}x\${data.rect.height}</p>
            <p>Transform: \${data.computed.transform || '(none)'}</p>
            <p>TextAlign: \${data.computed.textAlign}</p>
            <p>Dataset: x=\${data.dataset.x}, y=\${data.dataset.y}</p>
          </div>
        \`;
      });
      resultsDiv.innerHTML = html;
    }, 1000);
  </script>
</body>
</html>`;
};

// Create measurement pages
fs.writeFileSync(path.join(__dirname, 'measure-editor.html'), createMeasurementPage('/editor'));
fs.writeFileSync(path.join(__dirname, 'measure-public.html'), createMeasurementPage('/'));

console.log('📄 Measurement pages created:');
console.log('  - measure-editor.html (open in browser and navigate to http://localhost:3001/editor)');
console.log('  - measure-public.html (open in browser and navigate to http://localhost:3001/)');
console.log('\n📋 Instructions:');
console.log('1. Open both HTML files in browser');
console.log('2. Navigate to the correct URLs (see above)');
console.log('3. Open DevTools Console (F12)');
console.log('4. Copy the metrics JSON from console');
console.log('5. Compare the two sets of metrics');