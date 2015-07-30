/* global AttentionWindow, Service */
'use strict';

(function(exports) {
  /**
   * CallscreenWindow is a special case of attention window.
   * It's the call screen UI but lives in system app.
   *
   * @example
   * var attention = new CallscreenWindow();
   *
   * @class CallscreenWindow
   * @requires System
   * @extends AttentionWindow
   */
  /**
   * Fired when the attention window is created.
   * @event AttentionWindow#attentioncreated
   */
  /**
   * Fired when the attention window is removed.
   * @event AttentionWindow#attentionterminated
   */
  /**
   * Fired when the attention window is opening.
   * @event AttentionWindow#attentionopening
   */
  /**
   * Fired when the attention window is opened.
   * @event AttentionWindow#attentionopened
   */
  /**
   * Fired when the attention window is cloing.
   * @event AttentionWindow#attentionclosing
   */
  /**
   * Fired when the attention window is closed.
   * @event AttentionWindow#attentionclosed
   */
  /**
   * Fired before the attention window is rendered.
   * @event AttentionWindow#attentionwillrender
   */
  /**
   * Fired when the attention window is rendered to the DOM tree.
   * @event AttentionWindow#attentionrendered
   */
  var CSORIGIN =
      window.location.origin.replace('system', 'callscreen') + '/';
  var CallscreenWindow = function CallscreenWindow() {
    this.config = {
      manifestURL: CSORIGIN + 'manifest.webapp',
      url: CSORIGIN + 'index.html',
      origin: CSORIGIN
    };
    this.isCallscreenWindow = true;
    this.reConfig(this.config);
    this.render();
    if (this._DEBUG) {
      CallscreenWindow[this.instanceID] = this;
    }
    this.publish('created');
  };

  CallscreenWindow.prototype = Object.create(AttentionWindow.prototype);
  CallscreenWindow.prototype.constructor = CallscreenWindow;
  /**
   * Turn on this flag to dump debugging messages for all attention windows.
   * @type {Boolean}
   */
  CallscreenWindow.prototype._DEBUG = false;
  CallscreenWindow.prototype.CLASS_LIST =
    'appWindow attentionWindow callscreenWindow';
  CallscreenWindow.prototype.CLASS_NAME = 'CallscreenWindow';

  CallscreenWindow.prototype.openAnimation = 'slide-from-top';
  CallscreenWindow.prototype.closeAnimation = 'slide-to-top';

  CallscreenWindow.SUB_COMPONENTS = {
    'transitionController': 'AppTransitionController',
    'attentionToaster': 'AttentionToaster'
  };

  CallscreenWindow.REGISTERED_EVENTS =
    AttentionWindow.REGISTERED_EVENTS;

  CallscreenWindow.prototype.render = function cw_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());

    this.element =
      document.getElementById(this.instanceID);
    // XXX: Use BrowserFrame
    var iframe = document.createElement('iframe');
    iframe.setAttribute('name', 'call_screen');
    iframe.setAttribute('mozbrowser', 'true');
    iframe.setAttribute('remote', 'false');
    iframe.setAttribute('mozapp', this.config.manifestURL);
    iframe.src = this.config.url;
    this.browser = {
      element: iframe
    };
    this.browserContainer = this.element.querySelector('.browser-container');
    this.browserContainer.insertBefore(this.browser.element, null);
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');

    this._registerEvents();
    this.installSubComponents();
    this.publish('rendered');
  };

  CallscreenWindow.prototype.ensure = function() {
    if (!this.browser || !this.browser.element) {
      return;
    }
    var timestamp = new Date().getTime();
    var src = this.config.url + '#' +
              (Service.query('locked') ? 'locked' : '');
    src = src + '&timestamp=' + timestamp;
    this.browser.element.src = src;
    this._terminated = false;
    this.show();
  };

  CallscreenWindow.prototype._handle_mozbrowserclose = function() {
    if (this._terminated) {
      return;
    }
    this._terminated = true;
    this.publish('terminated');
    if (this.isActive()) {
      var self = this;
      this.element.addEventListener('_closed', function onclosed() {
        // XXX: We will have trouble if the second call comes during closing.
        self.element.removeEventListener('_closed', onclosed);
        self.hide();
        self.reloadWindow();
      });
      this.requestClose();
    } else {
      this.hide();
      this.reloadWindow();
    }
    // XXX: We are leaving the focus in the callscreen iframe
    if (document.activeElement === this.browser.element) {
      document.activeElement.blur();
    }
  };

  CallscreenWindow.prototype.reloadWindow = function() {
    var src = this.browser.element.src.split('#')[0];
    this.browser.element.src = ''; // cocotte
    setTimeout(function nextTick() {
      this.browser.element.src = src;
    }.bind(this));
    this.setVisible(false);
  };

  CallscreenWindow.prototype.free = function() {
    if (this.browser.element) {
      this.browser.element.src = '';
    }
  };

  exports.CallscreenWindow = CallscreenWindow;

}(window));
