/* ============================================================
   mobile-modules.js – MOBIILIOPTIMOIDUT MODUULIT
   Vastuu: Mobiililaitteille optimoidut komponentit
============================================================ */

const MobileModules = {
  id: "mobile_optimizer",
  
  init() {
    this.observeDeviceChanges();
    this.enhanceTouchInteractions();
  },
  
  observeDeviceChanges() {
    window.addEventListener('resize', () => {
      const isMobile = window.innerWidth <= 767;
      const prevIsMobile = window.AppState?.ui.isMobile;
      
      if (isMobile !== prevIsMobile) {
        window.AppState.ui.isMobile = isMobile;
        window.EventBus.emit('device:changed', { isMobile });
        this.toggleMobileFeatures(isMobile);
      }
    });
  },
  
  toggleMobileFeatures(isMobile) {
    // Piilota/näytä mobiili-navigaatio
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) {
      mobileNav.style.display = isMobile ? 'flex' : 'none';
    }
    
    // Mukauta moduulien asettelua
    const moduleColumn = document.getElementById('moduleColumn');
    if (moduleColumn) {
      if (isMobile) {
        moduleColumn.style.height = '300px';
        moduleColumn.style.overflowY = 'auto';
      } else {
        moduleColumn.style.height = 'auto';
      }
    }
  },
  
  enhanceTouchInteractions() {
    // Paranna kosketuskokemusta
    document.addEventListener('touchstart', () => {}, { passive: true });
    
    // Estä zoomaaminen tekstialueella (paitsi jos haluaa)
    const textArea = document.getElementById('textArea');
    if (textArea) {
      textArea.addEventListener('touchmove', (e) => {
        if (e.target.tagName === 'P' && e.scale !== 1) {
          e.preventDefault();
        }
      }, { passive: false });
    }
  },
  
  getPreferredPanel() {
    return window.AppState?.ui.isMobile ? 'moduleColumn' : null;
  },
  
  mount(container) {
    if (!container || !window.AppState?.ui.isMobile) return;
    
    container.innerHTML = `
      <div class="mobile-module-card">
        <h3>📱 Mobiili-optimoitu</h3>
        <p>Tämä sisältö on optimoitu pienille näytöille.</p>
        <div class="mobile-tips">
          <p><strong>Vinkkejä:</strong></p>
          <ul>
            <li>Pyyhkäise vasemmalle/oikealle vaihtaaksesi lukua</li>
            <li>Paina pitkään tekstissä korostaaksesi</li>
            <li>Käytä alanavigaatiota näkymien vaihtoon</li>
          </ul>
        </div>
      </div>
    `;
  }
};

// Rekisteröi moduuli
if (window.ModuleRegistry) {
  window.ModuleRegistry.register(MobileModules);
}