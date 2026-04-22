const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');

const opts = {
  fitTo: {
    mode: 'width',
    value: 512,
  },
};

const collectorSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gCollector" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ade80" />
      <stop offset="100%" stop-color="#0f766e" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#gCollector)" rx="112" />
  <g fill="none" stroke="white" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" transform="translate(128, 160) scale(1.0)">
    <path d="M 0 120 A 120 120 0 0 1 256 120" />
    <path d="M 40 160 A 80 80 0 0 1 216 160" />
    <path d="M 80 200 A 40 40 0 0 1 176 200" />
    <circle cx="128" cy="240" r="20" fill="white" stroke="none" />
  </g>
  <circle cx="340" cy="340" r="50" fill="#064e3b" />
  <text x="340" y="358" font-family="Arial, sans-serif" font-weight="bold" font-size="52" fill="#4ade80" text-anchor="middle">₱</text>
</svg>
`;

const technicianSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gTech" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#312e81" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#gTech)" rx="112" />
  <g fill="none" stroke="white" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" transform="translate(128, 160) scale(1.0)">
    <path d="M 0 120 A 120 120 0 0 1 256 120" />
    <path d="M 40 160 A 80 80 0 0 1 216 160" />
    <path d="M 80 200 A 40 40 0 0 1 176 200" />
    <circle cx="128" cy="240" r="20" fill="white" stroke="none" />
  </g>
  <circle cx="340" cy="340" r="50" fill="#1e1b4b" />
  <!-- Simple Wrench path -->
  <g transform="translate(315, 315) scale(2.0)">
    <path d="M10,2 L7.5,4.5 L6,3 L5,4 L6.5,5.5 L4.5,7.5 C3.5,8 3,9 3.5,10 C4,11 6,11 6.5,10 L8.5,8 L10,9.5 L11,8.5 L9.5,7 L12,4.5 C12.5,3.5 12,2 11,1.5 C10.5,1 10.5,1.5 10,2 Z" fill="#a855f7" />
  </g>
</svg>
`;

const resvgCollector = new Resvg(collectorSvg, opts);
const pngDataCollector = resvgCollector.render();
const pngBufferCollector = pngDataCollector.asPng();
fs.writeFileSync('collector_icon.png', pngBufferCollector);

const resvgTechnician = new Resvg(technicianSvg, opts);
const pngDataTechnician = resvgTechnician.render();
const pngBufferTechnician = pngDataTechnician.asPng();
fs.writeFileSync('technician_icon.png', pngBufferTechnician);

console.log('Icons generated successfully.');
