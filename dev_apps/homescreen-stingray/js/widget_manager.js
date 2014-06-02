'use strict';

(function(exports) {
  /**
   * WidgetManager manages lifecycles and visiblity of all created
   * widgetWindows.
   * @class WidgetManager
   */
  var WidgetManager = function() {
    this.runningWidgetsById = {};
    this.widgetOverlay = document.getElementById('widget-container');
  };

  WidgetManager.prototype = {
    /** @lends WidgetManager */
    start: function() {
      window.addEventListener('widgetcreated', this);
      window.addEventListener('widgetterminated', this);
      window.addEventListener('launchwidget', this);
      return this;
    },
    stop: function() {
      window.removeEventListener('widgetcreated', this);
      window.removeEventListener('widgetterminated', this);
      window.removeEventListener('launchwidget', this);
    },

    /**
     * Hide all widgets.
     * @memberOf WidgetManager
     * @fires WidgetManager#hidewidget
     */
    hideAll: function() {
      this.widgetOverlay.style.display = 'none';
      /**
       * fired when all widgets are being hided.
       * @event WidgetManager#hidewidget
       */
      this._publish('hidewidget');
    },

    /**
     * Show all widgets.
     * @memberOf WidgetManager
     * @fires WidgetManager#showwwidget
     */
    showAll: function() {
      this.widgetOverlay.style.display = 'block';
      /**
       * fired when all widgets are being shown.
       * @event WidgetManager#showwwidget
       */
      this._publish('showwidget');
    },

    /**
     * get widget instance by instanceID.
     * @memberOf WidgetManager
     * @param  {String} instanceID instanceID of target widget.
     * @return {Object}            the WidgetWindow instance of target widget.
     */
    getWidget: function(instanceID) {
      return this.runningWidgetsById[instanceID];
    },

    /**
     * Trigger remove process of widget window. The widgetWindow won't be
     * removed until members are really destructed.
     * @memberOf WidgetManager
     * @param  {String} instanceID instanceID of target widget.
     * @return {Boolean}           whether remove process is successful.
     */
    remove: function(instanceID) {
      if (this.runningWidgetsById[instanceID]) {
        this.runningWidgetsById[instanceID].destroy();
        return true;
      } else {
        return false;
      }
    },

    handleEvent: function(evt) {
      var instanceID;
      switch (evt.type) {
        case 'widgetcreated':
          var app = evt.detail;
          this.runningWidgetsById[evt.detail.instanceID] = app;
          break;
        case 'launchwidget':
          instanceID = evt.detail;
          this._display(instanceID);
          break;
        case 'widgetterminated':
          delete this.runningWidgetsById[evt.detail.instanceID];
          break;
      }
    },

    _display: function wm_launch(instanceID) {
      var app = this.runningWidgetsById[instanceID];
      if (!app) {
        return;
      }
      app.setVisible(true);
    },

    _publish: function wm_publish(event, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, true, false, detail);
      window.dispatchEvent(evt);
    }
  };
  exports.WidgetManager = WidgetManager;

}(window));
