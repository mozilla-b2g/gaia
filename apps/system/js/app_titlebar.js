'use strict';

(function(exports) {
  var _id = 0;

  /**
   * The titlebar UI of the AppWindow.
   *
   * @class AppTitleBar
   * @param {AppWindow} app The app window instance this chrome belongs to.
   * @extends BaseUI
   */
  var AppTitleBar = function AppTitleBar(app) {
    this.app = app;
    this.instanceID = _id++;
    this._gotName = false;
    this._recentTitle = false;
    this._titleTimeout = null;
    this.containerElement = app.element;
    this.render();

    var appName = this.app.name;
    if (this.app.manifest && appName) {
      this._gotName = true;
      this.title.textContent = appName;
    }

    if (this.app.themeColor) {
      this.element.style.backgroundColor = this.app.themeColor;
    }
  };

  AppTitleBar.prototype = Object.create(window.BaseUI.prototype);

  AppTitleBar.prototype.CLASS_NAME = 'AppTitleBar';

  AppTitleBar.prototype.EVENT_PREFIX = 'titlebar';

  AppTitleBar.prototype.FRESH_TITLE = 500;
  AppTitleBar.prototype.LOCATION_COALESCE = 250;

  AppTitleBar.prototype._DEBUG = false;

  AppTitleBar.prototype.view = function at_view() {
    return '<div class="titlebar" id="' +
            this.CLASS_NAME + this.instanceID + '">' +
             '<div class="title">&hellip;</div>' +
           '</div>';
  };

  AppTitleBar.prototype._fetchElements = function at__fetchElements() {
    this.element = this.containerElement.querySelector('.titlebar');
    this.title = this.element.querySelector('.title');
  };

  AppTitleBar.prototype.handleEvent = function at_handleEvent(evt) {
    if (evt.type.startsWith('mozbrowser') || evt.type.startsWith('_')) {
      if (this['_handle_' + evt.type]) {
        this['_handle_' + evt.type](evt);
      }
      return;
    }
  };

  AppTitleBar.prototype._registerEvents = function at__registerEvents() {
    this.app.element.addEventListener('mozbrowsermetachange', this);
    this.app.element.addEventListener('mozbrowsertitlechange', this);
    this.app.element.addEventListener('mozbrowserlocationchange', this);
    this.app.element.addEventListener('_namechanged', this);
  };

  AppTitleBar.prototype._unregisterEvents = function at__unregisterEvents() {
    if (!this.app) {
      return;
    }

    this.app.element.removeEventListener('mozbrowsermetachange', this);
    this.app.element.removeEventListener('mozbrowsertitlechange', this);
    this.app.element.removeEventListener('mozbrowserlocationchange', this);
    this.app.element.removeEventListener('_namechanged', this);
    this.app = null;
  };

  AppTitleBar.prototype._handle_mozbrowsermetachange =
    function at__handle_mozbrowsermetachange(evt) {
      var detail = evt.detail;
      if (detail.name !== 'theme-color' || !detail.type) {
        return;
      }

      // If the theme-color meta is removed, let's reset the color.
      var color = '';

      // Otherwise, set it to the color that has been asked.
      if (detail.type !== 'removed') {
        color = detail.content;
      }

      this.element.style.backgroundColor = color;
    };

  // Name has priority over the rest
  AppTitleBar.prototype._handle__namechanged =
    function at__handle__namechanged(evt) {
      this.title.textContent = this.app.name;
      this._gotName = true;
    };

  AppTitleBar.prototype._handle_mozbrowsertitlechange =
    function at__handle_mozbrowsertitlechange(evt) {
      this.title.textContent = evt.detail;
      clearTimeout(this._titleTimeout);
      this._recentTitle = true;
      this._titleTimeout = setTimeout((function() {
        this._recentTitle = false;
      }).bind(this), this.FRESH_TITLE);
    };

  AppTitleBar.prototype._handle_mozbrowserlocationchange =
    function at__handle_mozbrowserlocationchange(evt) {
      // We wait a small while because if we get a title/name it's even better
      // and we don't want the label to flash
      setTimeout(this._updateLocation.bind(this, evt.detail),
                 this.LOCATION_COALESCE);
    };

  AppTitleBar.prototype._updateLocation =
    function at_updateTitle(title) {
      if (this._gotName || this._recentTitle) {
        return;
      }
      this.title.textContent = title;
    };

  exports.AppTitleBar = AppTitleBar;
}(window));
