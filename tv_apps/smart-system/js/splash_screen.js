/* global applications */

(function(exports) {
  'use strict';

  var _id = 0;

  var SplashScreen = function SplashScreen(app) {
    this.app = app;
    this.containerElement = app.element;

    this.iconUrl = this.getIconUrl(app);

    this.instanceID = _id++;
    this.render();
  };

  SplashScreen.prototype = Object.create(window.BaseUI.prototype);

  SplashScreen.prototype.CLASS_NAME = 'SplashScreen';
  SplashScreen.prototype.EVENT_PREFIX = 'splashscreen';

  SplashScreen.prototype.view = function ss_view() {
    return `<div id="${this.CLASS_NAME + this.instanceID}"
                 class="splash-screen hidden">
                <span class="icon"
                      style="background-image: url('${this.iconUrl}');"></span>
            </div>`;
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

  SplashScreen.prototype.isVisible = function ss_isVisible() {
    return !this.element.classList.contains('hidden');
  };

  SplashScreen.prototype.getIconUrl = function ss_getIconUrl(app) {
    if (app.manifestURL) {
      return this.getIconFromManifestURL(app.manifestURL);
    } else if (app.features.iconUrl) {
      return app.features.iconUrl;
    }
  };

  SplashScreen.prototype.getIconFromManifestURL = function(manifestURL) {
    var app = applications.getByManifestURL(manifestURL);
    var icons = app.manifest.icons;

    var iconUrl = icons[Math.max.apply(null, Object.keys(icons))];

    if (!iconUrl) {
      return;
    }

    if (iconUrl.startsWith('data:') ||
        iconUrl.startsWith('app://') ||
        iconUrl.startsWith('http://') ||
        iconUrl.startsWith('https://')) {
      return iconUrl;
    }

    if (!iconUrl.startsWith('/')) {
      return;
    }

    if (app.origin.endsWith('/')) {
      return app.origin.slice(0, -1) + iconUrl;
    }

    return app.origin + iconUrl;
  };

  exports.SplashScreen = SplashScreen;
}(window));
