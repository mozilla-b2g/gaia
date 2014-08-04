/* global BrowserConfigHelper, WidgetWindow, Applications */
'use strict';

(function(exports) {
  /**
   * WidgetFactory creates widget window by arguments supplied.
   * @class WidgetFactory
   */
  var WidgetFactory = function() {
  };

  WidgetFactory.prototype = {
    /** @lends WidgetFactory */

    /**
     * Add a widget window and put it into management.
     * @memberOf WidgetFactory
     * @fires WidgetFactory#launchwidget
     * @param {Object} args - Arguments for creating widget.
     * @param {String} args.app.manifestURL - manifest URL for widget
     * @param {String} args.app.entryPoint - (optional) entry point name that
     *                 need to be used. The name specified must consist with
     *                 the manifest file.
     * @param {integer} args.rect.left - left position of widget
     * @param {integer} args.rect.top - top position of widget
     * @param {integer} args.rect.width - width of widget
     * @param {integer} args.rect.height - height of widget
     */
    createWidget: function(args) {
      var manifestURL = args.app.manifestURL;
      var origin = manifestURL.split('/').slice(0,3).join('/');
      var manifest = Applications.getEntryManifest(manifestURL);
      if (!manifest) {
        return;
      }

      var appURL = origin + (args.app.entryPoint ?
        manifest.entry_points[args.app.entryPoint].launch_path :
        manifest.launch_path);

      var config = new BrowserConfigHelper(appURL, manifestURL);
      var widgetOverlay = document.getElementById('widget-container');
      var app = new WidgetWindow(config, widgetOverlay);
      // XXX: Separate styles.
      app.setStyle(args.rect);
      /**
       * fired when widget is being created and launched.
       * @event WidgetFactory#launchwidget
       */
      this.publish('launchwidget', app.instanceID);

      return app;
    },

    publish: function wf_publish(event, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, true, false, detail);
      window.dispatchEvent(evt);
    }
  };

  exports.WidgetFactory = WidgetFactory;
}(window));

