function renderPlansGrid(plans) {
    if (!plans || plans.length === 0) {
      console.log('empty state');
      return;
    }

    const activePlans = plans.filter(p => p.isActive !== false);
    const sortedByRate = [...activePlans].sort((a, b) => a.monthlyRate - b.monthlyRate);
    const recommendedId = sortedByRate.length >= 2 ? (sortedByRate[Math.floor(sortedByRate.length / 2)].$id || sortedByRate[Math.floor(sortedByRate.length / 2)].id) : null;

    const html = plans.map(p => {
      const isActive = p.isActive !== false;
      const speedNum = parseInt(p.speed) || 50;
      const isRecommended = (p.$id || p.id) === recommendedId;

      let savedFeatures = null;
      try { savedFeatures = p.features ? JSON.parse(p.features) : null; } catch(e) {}
      
      let featuresToRender = [];
      
      if (Array.isArray(savedFeatures)) {
         featuresToRender = savedFeatures;
      } else if (savedFeatures && Object.keys(savedFeatures).length > 0) {
         featuresToRender = [
            { text: `Up to ${p.speed || speedNum + ' Mbps'} speed`, included: true },
            { text: 'Browsing & social media', included: !!savedFeatures.browsing },
            { text: 'Email & messaging', included: !!savedFeatures.email },
            { text: 'HD video streaming', included: !!savedFeatures.hd },
            { text: 'Online gaming', included: !!savedFeatures.gaming },
            { text: 'Priority support', included: !!savedFeatures.priority }
         ];
      } else {
         featuresToRender = [
            { text: `Up to ${p.speed || speedNum + ' Mbps'} speed`, included: true },
            { text: 'Browsing & social media', included: true },
            { text: 'Email & messaging', included: true },
            { text: 'HD video streaming', included: speedNum > 25 },
            { text: 'Online gaming', included: speedNum > 25 },
            { text: 'Priority support', included: speedNum > 50 }
         ];
      }

      const featuresHTML = featuresToRender.map(f => `
        <li class="pricing-feature ${f.included ? '' : 'pricing-feature-disabled'}">
          <span class="material-icons-outlined" style="font-size:16px; color:${f.included ? 'var(--accent-blue)' : 'var(--text-muted)'};">
            ${f.included ? 'check' : 'close'}
          </span>
          <span ${!f.included ? 'style="text-decoration:line-through; opacity:0.5;"' : ''}>${f.text}</span>
        </li>
      `).join('');

      return 'success card for ' + p.name;
    }).join('');
    
    console.log(html);
}

const data = [
    {
      "name": "Basic",
      "monthlyRate": 500,
      "speed": "50",
      "description": "",
      "isActive": true,
      "features": "[{\"text\":\"Unlimited Data Allocation\",\"included\":false},{\"text\":\"Symmetrical Speeds (Equal Upload/Download)\",\"included\":false},{\"text\":\"Optimized for Online Gaming (Low Ping)\",\"included\":false},{\"text\":\"Supports 5+ Simultaneous Devices\",\"included\":true},{\"text\":\"Free Dual-Band 5GHz Router Included\",\"included\":false},{\"text\":\"Seamless 4K & HD Video Streaming\",\"included\":false},{\"text\":\"24/7 Priority Tech Support\",\"included\":false},{\"text\":\"Static Public IP Address\",\"included\":false},{\"text\":\"No Lock-In Contract\",\"included\":false},{\"text\":\"Free Backup Power Supply (Mini UPS)\",\"included\":true}]",
      "$id": "69e9c51a00092ea36aee"
    }
];

try {
  renderPlansGrid(data);
} catch(e) {
  console.error("CRASHED:", e);
}
