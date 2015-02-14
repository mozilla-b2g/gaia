/* global AppWindow */

'use strict';

(function(exports) {
  /**
   * GlobalOverlayWindow is a special type of window that is shown on top of
   * *any* existing element.
   *
   * The owner must have the 'global-clickthrough-overlay' permission in order
   * to create this kind of window.
   *
   * GlobalOverlayWindow instances are not handling the home button click,
   * instead we present a chrome UI that allows the user to close the overlay
   * window.
   *
   * This kind of window is rendered with transparent background and allows
   * passing clicks to the overlayed content.
   *
   * @example
   * var overlay = new GlobalOverlayWindow({
   *   url: 'app://clock.gaiamobile.org:8080/alarm.html',
   *   manifestURL: 'http://clock.gaiamobile.org:8080/manifest.webapp',
   *   iframe: iframe
   * });
   *
   * @class GlobalOverlayWindow
   * @param {Object} config Object holding the overlay configuration options.
   * @extends AppWindow
   */

  var GlobalOverlayWindow = function GlobalOverlayWindow(config) {
    this.reConfig(config);
    this.render();
    if (this._DEBUG) {
      GlobalOverlayWindow[this.instanceID] = this;
    }
    this.publish('created');
  };

  GlobalOverlayWindow.prototype = Object.create(AppWindow.prototype);

  GlobalOverlayWindow.prototype.constructor = GlobalOverlayWindow;

  GlobalOverlayWindow.prototype.eventPrefix = 'globaloverlay';

  GlobalOverlayWindow.prototype.CLASS_NAME = 'GlobalOverlayWindow';

  GlobalOverlayWindow.prototype.CLASS_LIST = 'appWindow globalOverlayWindow';

  GlobalOverlayWindow.prototype.HIERARCHY_MANAGER =
    'GlobalOverlayWindowManager';

  /**
   * Turn on this flag to dump debugging messages for all global overlay
   * windows.
   * @type {Boolean}
   */
  GlobalOverlayWindow.prototype._DEBUG = false;

  GlobalOverlayWindow.prototype.openAnimation = 'immediate';
  GlobalOverlayWindow.prototype.closeAnimation = 'immediate';

  GlobalOverlayWindow.prototype.view = function ow_view() {
    this.debug('intance id: ' + this.instanceID);
    return '<div class="' + this.CLASS_LIST +
            '"   id="' + this.instanceID + '">' +
            '<button id="' + this.instanceID + '-close" ' +
            'class="close-global-overlay">Close</button>' +
            '<div class="browser-container"></div>' +
            '</div>';
  };

  GlobalOverlayWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog
  };

  GlobalOverlayWindow.REGISTERED_EVENTS =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
      'mozbrowserloadend', 'mozbrowserloadstart',
      '_localized', '_willdestroy'];

  GlobalOverlayWindow.prototype.render = function ow_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.browser = {
      element: this.config.iframe
    };
    this.element = document.getElementById(this.instanceID);
    this.browserContainer = this.element.querySelector('.browser-container');
    this.browserContainer.insertBefore(this.browser.element, null);
    this.frame = this.element;
    this.iframe = this.browser.element;

    this.registerEvents();
    this.installSubComponents();
    this.publish('rendered');
  };

  GlobalOverlayWindow.prototype.registerEvents = function ow_registerEvents() {
    var self = this;
    document.getElementById(this.instanceID + '-close')
            .addEventListener('click', function() {
      self.kill();
    });
    GlobalOverlayWindow.prototype._registerEvents.apply(this);
  };

  GlobalOverlayWindow.prototype.ready = function ow_ready(callback) {
    if (!this.element) {
      return;
    }

    var self = this;
    if (!this.loaded) {
      this.element.addEventListener('_loaded', function onLoaded() {
        self.element.removeEventListener('_loaded', onLoaded);
        // We allow passing the mouse clicks done in the overlay window
        // to the overlayed content by setting mozpasspointerevents to true
        // on the overlay window iframe. Check bug 796452 for more details.
        self.browser.element.setAttribute('mozpasspointerevents' , 'true');
        setTimeout(callback);
      });
    } else {
      this.tryWaitForFullRepaint(function() {
        setTimeout(callback);
      });
    }
  };

  /**
   * GlobalOverlayWindow's default container is '#overlays'.
   */
  GlobalOverlayWindow.prototype.containerElement =
    document.getElementById('global-overlays');

  exports.GlobalOverlayWindow = GlobalOverlayWindow;

})(window);
