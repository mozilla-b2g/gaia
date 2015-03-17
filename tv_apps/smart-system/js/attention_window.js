/* global AppWindow, focusManager */
'use strict';

(function(exports) {
  /**
   * AttentionWindow is a special opened window with specific
   * permission: 'attention'. It would show in front of any
   * existing app windows to get users' attention.
   *
   * ##### Flow chart
   * <a href="http://i.imgur.com/4O1Frs3.png" target="_blank">
   * <img src="http://i.imgur.com/4O1Frs3.png"></img>
   * </a>
   *
   * @example
   * var attention = new AttentionWindow({
   *   url: 'app://clock.gaiamobile.org:8080/alarm.html',
   *   manifestURL: 'http://gallery.gaiamobile.org:8080/manifest.webapp',
   *   iframe: iframe
   * });
   *
   * @class AttentionWindow
   * @param {Object} config The configuration object of this attention.
   * @extends AppWindow
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
   * Fired when the attention window is closing.
   * @event AttentionWindow#attentionclosing
   */
  /**
   * Fired when the attention window is closed.
   * @event AttentionWindow#attentionclosed
   */
  /**
   * Fired before the attention window will be rendered.
   * @event AttentionWindow#attentionwillrender
   */
  /**
   * Fired when the attention window is rendered to the DOM tree.
   * @event AttentionWindow#attentionrendered
   */
  var AttentionWindow = function AttentionWindow(config) {
    this.isAttentionWindow = true;
    this.reConfig(config);
    this.render();
    if (this._DEBUG) {
      AttentionWindow[this.instanceID] = this;
    }
    focusManager.addUI(this);
    this.publish('created');
  };

  AttentionWindow.prototype = Object.create(AppWindow.prototype);

  AttentionWindow.prototype.constructor = AttentionWindow;

  AttentionWindow.prototype.eventPrefix = 'attention';

  AttentionWindow.prototype.CLASS_NAME = 'AttentionWindow';

  AttentionWindow.prototype.CLASS_LIST = 'appWindow attentionWindow';

  /**
   * Turn on this flag to dump debugging messages for all attention windows.
   * @type {Boolean}
   */
  AttentionWindow.prototype._DEBUG = false;
  AttentionWindow.prototype.closedHeight = 40;

  AttentionWindow.prototype.openAnimation = 'immediate';
  AttentionWindow.prototype.closeAnimation = 'immediate';

  AttentionWindow.prototype.view = function attw_view() {
    this.debug('intance id: ' + this.instanceID);
    return '<div class="' + this.CLASS_LIST +
            '" id="' + this.instanceID + '">' +
            '<div class="titlebar">' +
            '</div>' +
            '<div class="browser-container"></div>' +
            '<div class="screenshot-overlay"></div>' +
            '</div>';
  };

  AttentionWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'authDialog': window.AppAuthenticationDialog,
    'attentionToaster': window.AttentionToaster
  };

  AttentionWindow.REGISTERED_EVENTS =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
      'mozbrowserloadend', 'mozbrowserloadstart',
      '_localized', 'click'];

  AttentionWindow.prototype.render = function attw_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    // the iframe is provided already.
    this.browser = {
      element: this.config.iframe
    };
    this.element = document.getElementById(this.instanceID);
    this.browserContainer = this.element.querySelector('.browser-container');
    this.browserContainer.insertBefore(this.browser.element, null);
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');

    this._registerEvents();
    this.installSubComponents();
    this.publish('rendered');
  };

  AttentionWindow.prototype._handle_click =
    function attw__handle_click(evt) {
      this.publish('will-become-active');
      this.requestOpen();
    };

  AttentionWindow.prototype.ready = function attw_ready(callback) {
    if (!this.element) {
      return;
    }

    var self = this;
    if (!this.loaded) {
      this.element.addEventListener('_loaded', function onLoaded() {
        self.element.removeEventListener('_loaded', onLoaded);
        setTimeout(callback);
      });
    } else {
      this.tryWaitForFullRepaint(function() {
        setTimeout(callback);
      });
    }
  };

  // XXX: We may need to wait the underlying window,
  // which may be attention window or app window
  // to be repainted, but we don't care it here.
  AttentionWindow.prototype.requestOpen = function() {
    // XXX: A hack to reset height.
    AppWindow.prototype.requestOpen.apply(this);
  };

  AttentionWindow.prototype.show = function() {
    AppWindow.prototype.show.call(this);
  };

  AttentionWindow.prototype.hide = function() {
    AppWindow.prototype.hide.call(this);
  };

  AttentionWindow.prototype.promote = function() {
    this.element && this.element.classList.add('top-most');
  };

  AttentionWindow.prototype.demote = function() {
    this.element && this.element.classList.remove('top-most');
  };

  /**
   * AttentionWindow's default container is '#windows'.
   * However, we could dynamically change this in layout manager
   * after it recieves the attentionwillrender event.
   */
  AttentionWindow.prototype.containerElement =
    document.getElementById('windows');

  exports.AttentionWindow = AttentionWindow;

}(window));
