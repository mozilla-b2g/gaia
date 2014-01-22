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
    window.addEventListener('homescreenopened', this);
    window.addEventListener('rocketbarhidden', this);
    window.addEventListener('rocketbarshown', this);
  },

  /**
   * Sets the default title if we're viewing the homescreen.
   */
  defaultTitle: function() {
    var activeApp = AppWindowManager.getActiveApp();
    if (!Rocketbar.shown && activeApp.isHomescreen) {
      this.content = navigator.mozL10n.get('search');
    }
  },

  handleEvent: function(e) {
    switch (e.type) {
      case 'home':
        this.content = '';
        break;
      case 'rocketbarshown':
        this.content = '';
        this.element.classList.add('hidden');
        break;
      case 'apploading':
      case 'apptitlechange':
      case 'appforeground':
        if (e.detail instanceof AppWindow && e.detail.isActive()) {
          this.content = e.detail.title;
          this.element.classList.remove('hidden');
        }
        break;
      case 'homescreenopened':
        this.defaultTitle();
        break;
      case 'rocketbarhidden':
        this.element.classList.remove('hidden');
        this.defaultTitle();
        break;
      default:
        break;
    }
  }
};

Title.init();
