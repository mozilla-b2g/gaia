'use strict';

(function(window) {
  var _id = 0;
  var _ = navigator.mozL10n.get;

  /**
   * The chrome UI of the AppWindow.
   *
   * @class AppChrome
   * @param {AppWindow} app The app window instance this chrome belongs to.
   * @extends BaseUI
   */
  window.AppChrome = function AppChrome(app) {
    this.app = app;
    this.instanceID = _id++;
    this.containerElement = app.element;
    this.render();

    if (this.app.config.chrome && this.app.config.chrome.navigation) {
      this.app.element.classList.add('has-navigation');
    }

    if (this.app.config.chrome && this.app.config.chrome.rocketbar) {
      this.app.element.classList.add('rocketbar');
    }

    this.bottomChromeThreshold = this.navigation.clientHeight + 2;

    this.scrollState = { scrolling: false, atTop: false, atBottom: false };
    this.lastTop = 0;
  };

  AppChrome.prototype.__proto__ = window.BaseUI.prototype;

  AppChrome.prototype.CLASS_NAME = 'AppChrome';

  AppChrome.prototype.EVENT_PREFIX = 'chrome';

  AppChrome.prototype._DEBUG = true;

  AppChrome.prototype.hidingNavigation = false;

  AppChrome.prototype.view = function an_view() {
    var ctx = '<div class="context-menu">' +
        '<div class="item reload">Reload</div>' +
        '<div class="item new">New Window</div>' +
        '<div class="item homescreen">Add to Home Screen</div>' +
        '<div class="item share">Share</div>' +
        '<div class="item forward">Forward</div>' +
      '</div>';

    // @todo: hide add to homescreen button if launched from homescreen

    return '<div class="chrome" id="' +
            this.CLASS_NAME + this.instanceID + '">' +
            '<header class="progress"></header>' +
            ctx +
            '<footer class="navigation">' +
              '<menu type="buttonbar">' +
                '<button type="button" class="back-button"' +
                ' alt="Back" data-disabled="disabled"></button>' +
                '<button type="button" class="close-button"' +
                ' alt="Close"></button>' +
              '</menu>' +
            '</footer>' +
          '</div>';
  };

  AppChrome.prototype._fetchElements = function ac__fetchElements() {
    this.element = this.containerElement.querySelector('.chrome');
    this.navigation = this.element.querySelector('.navigation');
    this.progress = this.element.querySelector('.progress');
    this.backButton = this.element.querySelector('.back-button');
    this.closeButton = this.element.querySelector('.close-button');
  };

  AppChrome.prototype.handleEvent = function ac_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        this.handleClickEvent(evt);
        break;

      case '_loading':
        this.app.frame.classList.add('has-navigation');
        this.show(this.progress);
        break;

      case '_loaded':
        this.hide(this.progress);
        break;

      case 'mozbrowserlocationchange':
        this.handleLocationChanged(evt);
        break;

      case 'mozbrowserasyncscroll':
        this.handleScroll(evt);
        break;

      case 'mozbrowsertitlechange':
        this.windowTitle = evt.detail;
        break;

      case '_withkeyboard':
        if (this.app && this.app.isActive()) {
          this.app.frame.classList.remove('has-navigation');
        }
        break;

      case '_withoutkeyboard':
        if (this.app) {
          this.app.frame.classList.add('has-navigation');
        }
        break;
    }
  };

  AppChrome.prototype.handleClickEvent = function ac_handleClickEvent(evt) {
    switch (evt.target) {
      case this.backButton:
        this.app.back();
        break;

      case this.closeButton:
        this.toggleContextMenu();
        break;
    }
  };

  AppChrome.prototype._registerEvents = function ac__registerEvents() {
    this.backButton.addEventListener('click', this);
    this.closeButton.addEventListener('click', this);
    this.app.element.addEventListener('mozbrowserlocationchange', this);
    this.app.element.addEventListener('mozbrowserasyncscroll', this);
    this.app.element.addEventListener('mozbrowsertitlechange', this);
    this.app.element.addEventListener('_loading', this);
    this.app.element.addEventListener('_loaded', this);
    this.app.element.addEventListener('_opened', this);
    this.app.element.addEventListener('_closing', this);
    this.app.element.addEventListener('_withkeyboard', this);
    this.app.element.addEventListener('_withoutkeyboard', this);

    var app = this.app;
    var ctx = app.frame.querySelector('.context-menu');

    // Tapping the chrome with the context menu open should close the menu
    // Normally this doesn't trigger because of pointer events on the chrome
    this.element.addEventListener('click', this.handleChromeClick.bind(this));

    ctx.onclick = this.toggleContextMenu.bind(this);
    ctx.querySelector('.reload').onclick = app.reload.bind(app);
    ctx.querySelector('.share').onclick = this.share.bind(this);
    // @todo: implement new window action
    ctx.querySelector('.new').onclick = alert.bind(window, 'New window');
    ctx.querySelector('.forward').onclick = app.forward.bind(app);
    ctx.querySelector('.homescreen').onclick = this.addBookmark.bind(this);
  };

  AppChrome.prototype._unregisterEvents = function ac__unregisterEvents() {
    this.backButton.removeEventListener('click', this);
    this.closeButton.removeEventListener('click', this);
    if (!this.app)
      return;
    this.app.element.removeEventListener('mozbrowserlocationchange', this);
    this.app.element.removeEventListener('mozbrowserasyncscroll', this);
    this.app.element.removeEventListener('mozbrowsertitlechange', this);
    this.app.element.removeEventListener('_loading', this);
    this.app.element.removeEventListener('_loaded', this);
    this.app.element.removeEventListener('_opened', this);
    this.app.element.removeEventListener('_closing', this);
    this.app.element.removeEventListener('_withkeyboard', this);
    this.app.element.removeEventListener('_withoutkeyboard', this);
    this.app.element.removeEventListener('_homegesture-enabled', this);
    this.app.element.removeEventListener('_homegesture-disabled', this);

    var ctx = this.app.frame.querySelector('.context-menu');
    ctx.querySelector('.reload').onclick = null;
    ctx.querySelector('.share').onclick = null;
    ctx.querySelector('.new').onclick = null;
    ctx.querySelector('.forward').onclick = null;
    ctx.querySelector('.homescreen').onclick = null;
    // @todo un-bind the app.frame.onclick handle

    this.app = null;
  };

  AppChrome.prototype.handleLocationChanged =
    function ac_handleLocationChange() {
      if (!this.app)
        return;
      this.app.canGoForward(function forwardSuccess(result) {
        // @todo: disable forward button in context menu if result === false
      }.bind(this));

      this.app.canGoBack(function backSuccess(result) {
        if (result === true) {
          delete this.backButton.dataset.disabled;
        } else {
          this.backButton.dataset.disabled = true;
        }
      }.bind(this));
    };

  AppChrome.prototype.handleScroll = function ac_scroll(evt) {
    if (!this.app)
      return;

    // context menu visible or progress visible, return...
    if (this.app.frame.classList.contains('has-context-menu') ||
        this.progress.classList.contains('visible'))
      return;

    // Scrolling threshold before we do anything with the navigation bar
    var threshold = this.bottomChromeThreshold;
    var top = evt.detail.top | 0;

    if (top === 0) {
      this.app.frame.classList.add('has-navigation');
      this.lastTop = top;
    }
    else if (top - threshold > this.lastTop) {
      // scrolling down
      this.app.frame.classList.remove('has-navigation');
      this.lastTop = top;
    }
    else if (top + threshold < this.lastTop) {
      this.app.frame.classList.add('has-navigation');
      this.lastTop = top;
    }
  };

  AppChrome.prototype.addBookmark = function ac_addBookmark() {
    var dataset = this.app.config;

    new MozActivity({
      name: 'save-bookmark',
      data: {
        type: 'url',
        url: dataset.url,
        name: this.windowTitle,
        icon: dataset.icon,
        useAsyncPanZoom: dataset.useAsyncPanZoom,
        iconable: false
      }
    });
  };

  AppChrome.prototype.share = function ac_share() {
    new MozActivity({
      name: 'share',
      data: {
        type: 'url',
        url: this.app.config.url
      }
    });
  };

  AppChrome.prototype.toggleContextMenu = function() {
    if (!this.app) return;

    this.app.frame.classList.toggle('has-context-menu');
  };

  AppChrome.prototype.handleChromeClick = function(e) {
    if (e.target === e.currentTarget) {
      this.toggleContextMenu();
    }
  };
}(this));
