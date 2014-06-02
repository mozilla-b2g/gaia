'use strict';

(function(exports) {
  var _id = 0;
  var DEBUG = false;

  /**
   * WidgetWindow creates and maintain a
   * [mozbrowser](https://developer.mozilla.org/en-US/docs/WebAPI/Browser)
   * iframe. WidgetWindow is directly managed by WidgetManager.
   * @param {BrowserConfigHelper} configuration  manifest of the target app.
   * @param {HTMLElement} containerElement  the container to which the widget
   *                                        attached.
   * @class WidgetWindow
   */
  var WidgetWindow = function WidgetWindow(configuration, containerElement) {
    this.containerElement = containerElement;
    this.reConfig(configuration);
    this.render();
    /**
     * This is fired when the widget window is instantiated.
     * @event WidgetWindow#widgetcreated
     */
    this.publish('created');

    this.launchTime = Date.now();

    return this;
  };

  WidgetWindow.prototype = {
    /** @lends WidgetWindow */
    eventPrefix: 'widget',

    CLASS_NAME: 'WidgetWindow',

    CLASS_LIST: 'widgetWindow',

    /**
     * Update style of widget.
     * @memberOf WidgetWindow
     * @param {Object} arg properties that need to be updated.
     * @param {integer} arg.left - left position of widget
     * @param {integer} arg.top - top position of widget
     * @param {integer} arg.width - width of widget
     * @param {integer} arg.height - height of widget
     */
    setStyle: function(arg) {
      this.width = arg.width || this.width;
      this.height = arg.height || this.height;
      this.left = arg.left || this.left;
      this.top = arg.top || this.top;
      this.element.style.width = this.width + 'px';
      this.element.style.height = this.height + 'px';
      this.element.style.left = this.left + 'px';
      this.element.style.top = this.top + 'px';
    },

    _render: function() {
      if (this.element) {
        return;
      }
      /**
       * Fired before this element is appended to the DOM tree.
       * @event WidgetWindow#widgetwillrender
       */
      this.publish('willrender');
      this.containerElement.insertAdjacentHTML('beforeend', this.view());
      // window.open would offer the iframe so we don't need to generate.
      this.browser = new self.BrowserFrame(this.browser_config);
      this.element = document.getElementById(this.instanceID);

      // For gaiauitest usage.
      this.element.dataset.manifestName =
          this.manifest ? this.manifest.name : '';

      this.element.appendChild(this.browser.element);
      this.fadeOverlay = this.element.querySelector('.fade-overlay');

      // Launched as background: set visibility and overlay screenshot.
      if (this.config.stayBackground) {
        this.setVisible(false);
      }

      /**
       * Fired after the widget window element is appended to the DOM tree.
       * @event WidgetWindow#widgetrendered
       */
      this.publish('rendered');
      this._rendered = true;
    },

    /**
     * Render the mozbrowser iframe and some overlays.
     * @memberOf WidgetWindow
     * @fires WidgetWindow#widgetrendered
     */
    render: function() {
      this._render();
    },

    /**
     * Returns the string representing the container view of this widget.
     * @memberOf WidgetWindow
     * @return {String} string of the HTML structure of the container.
     */
    view: function() {
      return '<div class=" ' + this.CLASS_LIST +
              ' " id="' + this.instanceID +
              '">' +
                '<div class="identification-overlay">' +
                  '<div>' +
                    '<div class="icon"></div>' +
                    '<span class="title"></span>' +
                  '</div>' +
                '</div>' +
                '<div class="fade-overlay"></div>' +
             '</div>';
    },
    /**
     * Generate all configurations we need.
     * @memberOf WidgetWindow
     * @param  {Object} configuration Initial configuration object
     *  Includes manifestURL, manifest, url, origin, name.
     */
    reConfig: function(configuration) {
      // Some modules are querying widgetWindow.manifestURL or
      // widgetWindow.origin so we inject all configurations into widgetWindow
      // first.
      for (var key in configuration) {
        this[key] = configuration[key];
      }

      this.browser_config = configuration;
      // Store initial configuration in this.config
      this.config = configuration;
      this.config.chrome = (this.manifest && this.manifest.chrome) ?
        this.manifest.chrome :
        this.config.chrome;

      if (!this.manifestURL && !this.config.chrome) {
        this.config.chrome = {
          navigation: true
        };
      }

      if (!this.manifest && this.config && this.config.title) {
        this.updateName(this.config.title);
      } else {
        this.name = new self.ManifestHelper(this.manifest).name;
      }

      this._generateID();
    },

    /**
     * Generates next instance ID.
     * @memberOf WidgetWindow
     * @inner
     * @return {String} the generated instance ID
     */
    _generateID: function() {
      if (!this.instanceID) {
        this.instanceID = this.CLASS_NAME + '_' + _id;
        _id++;
      }
    },

    /**
     * Set visibility of this widget.
     * @memberOf WidgetWindow
     * @param {Boolean} visible specified visibility.
     */
    setVisible: function(visible) {
      if (this.browser && this.browser.element &&
          'setVisible' in this.browser.element) {
        this.debug('setVisible on browser element:' + visible);
        this.browser.element.setVisible(visible);
      }
    },
    /**
     * Destroy the instance.
     * @memberOf WidgetWindow
     * @fires WidgetWindow#widgetdestroyed
     */
    destroy: function() {
      /**
       * Fired before the instance id destroyed.
       * @event WidgetWindow#widgetwilldestroy
       */
      this.publish('willdestroy');
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
        this.element = null;
      }

      /**
       * Fired after the instance id destroyed.
       * @event WidgetWindow#widgetdestroyed
       */
      this.publish('destroyed');
    },

    publish: function(event, detail) {
      var evt = new CustomEvent(this.eventPrefix + event,
                  {
                    bubbles: true,
                    detail: detail || this
                  });

      this.debug(' publishing external event: ' + event);

      // Publish external event.
      window.dispatchEvent(evt);
    },

    debug: function(msg) {
      if (DEBUG || this._DEBUG) {
        console.log('[Dump: ' + this.CLASS_NAME + ']' +
          '[' + (this.name || this.origin) + ']' +
          '[' + this.instanceID + ']' +
          '[' + self.System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    }
  };
  exports.WidgetWindow = WidgetWindow;
}(window));

