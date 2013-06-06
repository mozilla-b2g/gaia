'use strict';

var SoftwareButtonManager = {
  _enable: false,

  get height() {
    if (this._enable) {
      return this._cacheHeight ||
            (this._cacheHeight = this.element.getBoundingClientRect().height);
    } else {
      return 0;
    }
  },

  init: function sbm_init() {
    this.element = document.getElementById('software-buttons');
    this.homeButton = document.getElementById('software-home-button');
    this.fullscreenHomeButton =
      document.getElementById('fullscreen-software-home-button');
    this.screenElement = document.getElementById('screen');
    if (this.height > 0) {
      // By result of media query.
      this._enable = true;
    } else {
      this._enable = false;
      SettingsListener.observe('software-button.enabled', true,
        function onObserve(value) {
          console.log(value);
          this._enable = !!value;
          this.toggle();
        }.bind(this));
    }

    this.homeButton.addEventListener('click', this);
    this.homeButton.addEventListener('mousedown', this);
    this.homeButton.addEventListener('mouseup', this);
    this.fullscreenHomeButton.addEventListener('click', this);
    window.addEventListener('mozfullscreenchange', this);
  },

  toggle: function sbm_toggle() {
    if (this._enable) {
      this.element.classList.add('visible');
      this.screenElement.classList.add('software-button-enabled');
    } else {
      this.element.classList.remove('visible');
      this.screenElement.classList.remove('software-button-enabled');
    }
  },

  handleEvent: function sbm_handleEvent(evt) {
    switch (evt.type) {
      case 'mousedown':
        this.element.classList.add('pressed');
        break;
      case 'mouseup':
        this.element.classList.remove('pressed');
        break;
      case 'click':
        window.dispatchEvent(new Event('home'));
        break;
      case 'mozfullscreenchange':
        if (!this._enable)
          return;

        if (document.mozFullScreenElement) {
          this.fullscreenHomeButton.classList.add('visible');
        } else {
          this.fullscreenHomeButton.classList.remove('visible');
        }
        break;
    }
  }
};

SoftwareButtonManager.init();
