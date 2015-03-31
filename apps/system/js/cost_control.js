'use strict';
/* global applications*/

(function(exports) {

  const activityThreshold = 75;
  const host = document.location.host;
  const domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
  const protocol = document.location.protocol + '//';
  const origin = protocol + 'costcontrol.' + domain;

  function CostControl() {}

  CostControl.prototype = {

    /**
     * A reference to the widget container.
     * @memberof CostControl.prototype
     */
    widgetContainer: document.getElementById('cost-control-widget'),

    /**
     * A reference to the widget element.
     * @memberof CostControl.prototype
     */
    widgetFrame: null,

    /**
     * Current activity measure.
     * @typeof {Integer}
     * @memberof CostControl.prototype
     */
    activityCounter: 0,

    /**
     * Starts listening to events to show/hide the widget.
     * @memberof CostControl.prototype
     */
    start: function() {
      window.addEventListener('utilitytrayshow', this);
      window.addEventListener('utilitytray-overlayopening', this);
      window.addEventListener('utilitytrayhide', this);
    },

    /**
     * General event handler interface.
     * @memberof CostControl.prototype
     */
    handleEvent: function(e) {
      switch(e.type) {
        case 'mozbrowsererror':
        case 'mozbrowserclose':
          this._onError();
          break;
        case 'moznetworkupload':
        case 'moznetworkdownload':
          this._onNetworkActivity();
          break;
        case 'mozbrowserlocationchange':
          this._onUpdateDone();
          break;
        case 'utilitytrayshow':
          this._showWidget();
          break;
        case 'utilitytray-overlayopening':
          this._showWidgetIfLoaded();
          break;
        case 'utilitytrayhide':
          this._hideWidget();
          break;
      }
    },

    /**
     * Ensures the widget is loaded.
     * @memberof CostControl.prototype
     */
    _ensureWidget: function() {
      if (!applications.ready) {
        return;
      }

      if (!applications.getByManifestURL(origin + '/manifest.webapp')) {
        return;
      }

      // Check widget is there
      this.widgetFrame = this.widgetContainer.querySelector('iframe');
      if (this.widgetFrame) {
        return;
      }

      // Create the widget
      if (!this.widgetFrame) {
        this.widgetFrame = document.createElement('iframe');
        this.widgetFrame.addEventListener('mozbrowsererror', this);
        this.widgetFrame.addEventListener('mozbrowserclose', this);
      }

      this.widgetFrame.dataset.frameType = 'widget';
      this.widgetFrame.dataset.frameOrigin = origin;

      this.widgetFrame.setAttribute('mozbrowser', true);
      this.widgetFrame.setAttribute('remote', 'true');
      this.widgetFrame.setAttribute('mozapp', origin + '/manifest.webapp');

      this.widgetFrame.src = origin + '/widget.html';
      this.widgetContainer.appendChild(this.widgetFrame);

      this._attachNetworkEvents();
    },

    /**
     * Called when the widget fires an error event.
     * @memberof CostControl.prototype
     */
    _onError: function(e) {
      this.widgetContainer.removeChild(this.widgetFrame);
      this.widgetFrame = null;
    },

    /**
     * Starts listening to network events.
     * @memberof CostControl.prototype
     */
    _attachNetworkEvents: function() {
      window.removeEventListener('moznetworkupload', this);
      window.removeEventListener('moznetworkdownload', this);
      window.addEventListener('moznetworkupload', this);
      window.addEventListener('moznetworkdownload', this);
    },

    /**
     * Called when we detect some network activity.
     * @memberof CostControl.prototype
     */
    _onNetworkActivity: function() {
      this.activityCounter++;
      if (this.activityCounter === activityThreshold) {
        this.activityCounter = 0;
        window.removeEventListener('moznetworkupload', this);
        window.removeEventListener('moznetworkdownload', this);
        this.widgetFrame.addEventListener('mozbrowserlocationchange', this);
        this.widgetFrame.src = origin + '/widget.html#update#' +
          window.performance.now();
      }
    },

    /**
     * Called after the widget has updated its location.
     * @memberof CostControl.prototype
     */
    _onUpdateDone: function(evt) {
      if (evt.detail.split('#')[1] === 'updateDone') {
        this.widgetFrame.removeEventListener('mozbrowserlocationchange', this);
        this._attachNetworkEvents();
      }
    },

    /**
     * Shows the Usage widget in the utility tray.
     * @memberof CostControl.prototype
     */
    _showWidget: function() {
      this._ensureWidget();
      // Ensure the widget is updated when is visible
      this._attachNetworkEvents();
      this.widgetFrame.setVisible(true);
    },

    /**
     * Ensures we show the loaded widget.
     * @memberof CostControl.prototype
     */
    _showWidgetIfLoaded: function() {
      if (this.widgetFrame) {
        this.widgetFrame.setVisible(true);
      }
    },

    /**
     * Hides the widget when we close the utility tray.
     * @memberof CostControl.prototype
     */
    _hideWidget: function() {
      // It's not necessary to update the widget when it is hidden.
      window.removeEventListener('moznetworkupload', this);
      window.removeEventListener('moznetworkdownload', this);
      if (this.widgetFrame) {
        this.widgetFrame.setVisible(false);
      }
    }
  };

  exports.CostControl = CostControl;

}(window));
