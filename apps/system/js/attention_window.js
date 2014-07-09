/* global AppWindow */
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
   *   url: 'http://gallery.gaiamobile.org:8080/pick.html',
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
  var AttentionWindow = function AttentionWindow(config) {
    this.config = config;
    for (var key in config) {
      this[key] = config[key];
    }

    this.render();
    if (this._DEBUG) {
      AttentionWindow[this.instanceID] = this;
    }
    this.publish('created');

    // We'll open ourselves automatically,
    // but maybe we should do requestOpen and let manager open us.
    this.requestOpen();
  };

  AttentionWindow.prototype = Object.create(AppWindow.prototype);

  AttentionWindow.prototype.eventPrefix = 'attention';

  AttentionWindow.prototype.CLASS_NAME = 'AttentionWindow';

  /**
   * Turn on this flag to dump debugging messages for all attention windows.
   * @type {Boolean}
   */
  AttentionWindow.prototype._DEBUG = true;

  AttentionWindow.prototype.openAnimation = 'slidedown';
  AttentionWindow.prototype.closeAnimation = 'slideup';

  AttentionWindow.prototype.getBarHeight = function attw_getBarHeight() {
    if (this.transitionController._transitionState == 'closed') {
      if (this._barHeight) {
        return this._barHeight;
      }
      this._barHeight = this.attentionBar.getBoundingClientRect().height;
      return this._barHeight;
    } else {
      return 0;
    }
  };

  AttentionWindow.prototype.view = function attw_view() {
    this.generateID();
    this.debug('intance id: ' + this.instanceID);
    return '<div class="appWindow attentionWindow' +
            '" id="' + this.instanceID +
            '" transition-state="initial">' +
            '<div class="attention-bar"></div>' +
            '<div class="screenshot-overlay"></div>' +
            '<div class="fade-overlay"></div>' +
            '</div>';
  };

  AttentionWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'authDialog': window.AppAuthenticationDialog
  };

  AttentionWindow.REGISTERED_EVENTS =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
      'mozbrowserloadend', 'mozbrowserattentiondone', 'mozbrowserloadstart',
      '_localized', '_opened', '_closing', 'mozbrowserresize', 'click'];

  AttentionWindow.prototype.render = function attw_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    // the iframe is provided already.
    this.browser = {
      element: this.config.iframe
    };
    this.element =
      document.getElementById(this.instanceID);
    this.element.insertBefore(this.browser.element, this.element.childNodes[0]);
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');
    this.fadeOverlay = this.element.querySelector('.fade-overlay');
    this.attentionBar = this.element.querySelector('.attention-bar');

    this._registerEvents();
    this.installSubComponents();
    this.publish('rendered');
  };

  AttentionWindow.prototype._handle_click = function attw__handle_click(evt) {
    if (evt.target === this.attentionBar) {
      this.requestOpen();
    }
  };

  AttentionWindow.prototype._handle_mozbrowserresize =
    function attw__handle_mozbrowserresize(evt) {
      this.resized = true;
      this.debug('browser is resized..' + JSON.stringify(evt.detail));
      // XXX: Do not hardcode
      if (evt.detail.height <= (this._barHeight || 40)) {
        this.close();
      } else {
        this.requestOpen();
      }
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
      this.element.setAttribute('transition-state', 'initial');
      this.tryWaitForFullRepaint(function() {
        setTimeout(callback);
      });
    }
  };

  AttentionWindow.prototype.requestClose = function() {
    this.close();
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
