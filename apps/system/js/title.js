/**
 * Logic for the global title in the statusbar
 */
var Title = {

  element: document.getElementById('statusbar-title'),

  set content(val) {
    this.element.textContent = val;
  },

  /**
   * Initializes listeners to set the state
   */
  init: function() {
    window.addEventListener('apploading', this);
    window.addEventListener('appforeground', this);
    window.addEventListener('apptitlechange', this);
    window.addEventListener('home', this);
    window.addEventListener('rocketbarhidden', this);
    window.addEventListener('rocketbarshown', this);
  },

  handleEvent: function(e) {

    if (!Rocketbar.enabled) {
      return;
    }

    switch (e.type) {
      case 'home':
        this.content = '';
        break;
      case 'rocketbarshown':
        this.element.classList.add('hidden');
        break;
      case 'apploading':
      case 'apptitlechange':
      case 'appforeground':
        if (e.detail instanceof AppWindow && e.detail.config.chrome &&
            e.detail.isActive()) {
          this.content = e.detail.title;
          this.element.classList.remove('hidden');
        }
        break;
      case 'rocketbarhidden':
        this.element.classList.remove('hidden');
        break;
      default:
        break;
    }
  }
};

Title.init();
