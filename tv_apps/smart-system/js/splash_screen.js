(function(exports) {
  'use strict';

  var _id = 0;

  var SplashScreen = function SplashScreen(app) {
    this.app = app;
    this.containerElement = app.element;

    this.instanceID = _id++;
    this.render();
  };

  SplashScreen.prototype = Object.create(window.BaseUI.prototype);

  SplashScreen.prototype.CLASS_NAME = 'SplashScreen';
  SplashScreen.prototype.EVENT_PREFIX = 'splashscreen';

  SplashScreen.prototype.view = function ss_view() {
    return `<div id="${this.CLASS_NAME + this.instanceID}"
                 class="splash-screen hidden"></div>`;
  };

  SplashScreen.prototype._fetchElements = function ss__fetchElements() {
    this.element = document.getElementById(this.CLASS_NAME + this.instanceID);
  };

  SplashScreen.prototype._registerEvents = function ss__registerEvents() {
    this.app.element.addEventListener('_loading', this);
    this.app.element.addEventListener('_loaded', this);
  };

  SplashScreen.prototype._unregisterEvents = function ss__unregisterEvents() {
    this.app.element.removeEventListener('_loading', this);
    this.app.element.removeEventListener('_loaded', this);
  };

  SplashScreen.prototype.handleEvent = function ss_handleEvent(evt) {
    switch (evt.type) {
      case '_loading':
        this.show();
        break;

      case '_loaded':
        this.hide();
        this._unregisterEvents();
        break;
    }
  };

  SplashScreen.prototype.show = function ss_show() {
    this.element.classList.remove('hidden');
  };

  SplashScreen.prototype.hide = function ss_hide() {
    this.element.classList.add('hidden');
  };

  exports.SplashScreen = SplashScreen;
}(window));
