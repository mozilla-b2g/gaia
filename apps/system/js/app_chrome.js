'use strict';

(function(window) {
  var _id = 0;
  var _ = navigator.mozL10n.get;
  var BUTTONBAR_TIMEOUT = 5000;
  var BUTTONBAR_INITIAL_OPEN_TIMEOUT = 1500;
  var _buttonBarHeight = 0;

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
        '<div class="item settings">Settings</div>' +
        '<div class="close">Close</div>' +
      '</div>';

    return '<div class="chrome" id="' +
            this.CLASS_NAME + this.instanceID + '">' +
            '<header class="progress"></header>' +
            ctx +
            '<footer class="navigation">' +
              '<menu type="buttonbar">' +
                '<button type="button" class="back-button"' +
                ' alt="Back" data-disabled="disabled"></button>' +
                '<button type="button" class="forward-button"' +
                ' alt="Forward" data-disabled="disabled"></button>' +
                '<button type="button" class="reload-button"' +
                ' alt="Reload"></button>' +
                '<button type="button" class="bookmark-button"' +
                ' alt="Bookmark" data-disabled="disabled"></button>' +
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
    this.bookmarkButton = this.element.querySelector('.bookmark-button');
    this.reloadButton = this.element.querySelector('.reload-button');
    this.forwardButton = this.element.querySelector('.forward-button');
    this.backButton = this.element.querySelector('.back-button');
    this.closeButton = this.element.querySelector('.close-button');
  };

  AppChrome.prototype.handleEvent = function ac_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        this.handleClickEvent(evt);
        break;

      case '_loading':
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

      case '_opened':
        this.handleOpened(evt);
        break;

      case '_closing':
        this.handleClosing(evt);
        break;

      case '_withkeyboard':
        if (this.app && this.app.isActive()) {
          this.hide(this.navigation);
          this.hidingNavigation = true;
        }
        break;

      case '_withoutkeyboard':
        if (this.app) {
          this.show(this.navigation);
          this.hidingNavigation = false;
        }
        break;

      case '_homegesture-enabled':
        this.holdNavigation();
        break;

      case '_homegesture-disabled':
        this.releaseNavigation();
        break;
    }
  };

  AppChrome.prototype.handleClickEvent = function ac_handleClickEvent(evt) {
    switch (evt.target) {
      case this.reloadButton:
        this.clearButtonBarTimeout();
        this.app.reload();
        break;

      case this.backButton:
        this.clearButtonBarTimeout();
        this.app.back();
        break;

      case this.forwardButton:
        this.clearButtonBarTimeout();
        this.app.forward();
        break;

      case this.bookmarkButton:
        this.addBookmark();
        break;

      case this.closeButton:
        this.toggleContextMenu();
        break;
    }
  };

  AppChrome.prototype._registerEvents = function ac__registerEvents() {
    this.reloadButton.addEventListener('click', this);
    this.forwardButton.addEventListener('click', this);
    this.backButton.addEventListener('click', this);
    this.bookmarkButton.addEventListener('click', this);
    this.closeButton.addEventListener('click', this);
    this.app.element.addEventListener('mozbrowserlocationchange', this);
    this.app.element.addEventListener('mozbrowserasyncscroll', this);
    this.app.element.addEventListener('_loading', this);
    this.app.element.addEventListener('_loaded', this);
    this.app.element.addEventListener('_opened', this);
    this.app.element.addEventListener('_closing', this);
    this.app.element.addEventListener('_withkeyboard', this);
    this.app.element.addEventListener('_withoutkeyboard', this);
    this.app.element.addEventListener('_homegesture-enabled', this);
    this.app.element.addEventListener('_homegesture-disabled', this);

    var app = this.app;
    var ctx = this.app.frame.querySelector('.context-menu');

    // Always hide when click on any of the items
    ctx.onclick = this.toggleContextMenu.bind(this);

    ctx.querySelector('.reload').onclick = app.reload.bind(app);
    ctx.querySelector('.share').onclick = alert.bind(window, 'Share');
    ctx.querySelector('.new').onclick = alert.bind(window, 'New window');
    ctx.querySelector('.forward').onclick = app.forward.bind(app);
    ctx.querySelector('.homescreen').onclick = this.addBookmark.bind(this);
    ctx.querySelector('.settings').onclick = alert.bind(window, 'Settings');
  };

  AppChrome.prototype._unregisterEvents = function ac__unregisterEvents() {
    this.reloadButton.removeEventListener('click', this);
    this.forwardButton.removeEventListener('click', this);
    this.backButton.removeEventListener('click', this);
    this.bookmarkButton.removeEventListener('click', this);
    this.closeButton.removeEventListener('click', this);
    if (!this.app)
      return;
    this.app.element.removeEventListener('mozbrowserlocationchange', this);
    this.app.element.removeEventListener('mozbrowserasyncscroll', this);
    this.app.element.removeEventListener('_loading', this);
    this.app.element.removeEventListener('_loaded', this);
    this.app.element.removeEventListener('_opened', this);
    this.app.element.removeEventListener('_closing', this);
    this.app.element.removeEventListener('_withkeyboard', this);
    this.app.element.removeEventListener('_withoutkeyboard', this);
    this.app.element.removeEventListener('_homegesture-enabled', this);
    this.app.element.removeEventListener('_homegesture-disabled', this);
    this.app = null;
  };

  /**
   * Force the navigation to stay opened,
   * because we don't want to conflict with home gesture.
   */
  AppChrome.prototype.holdNavigation = function ac_holdNavigation() {
  };

  /**
   * Release the navigation opened state.
   */
  AppChrome.prototype.releaseNavigation = function ac_releaseNavigation() {
  };

  /**
   * Return buttonbar height for AppWindow calibration
   */
  AppChrome.prototype.getBarHeight = function ac_getBarHeight() {
    return _buttonBarHeight;
  };

  AppChrome.prototype.isButtonBarDisplayed = true;

  AppChrome.prototype.toggleButtonBar = function ac_toggleButtonBar(time) {
  };

  AppChrome.prototype.clearButtonBarTimeout =
    function ac_clearButtonBarTimeout() {
    };

  AppChrome.prototype.handleOpened =
    function ac_handleOpened() {

    };

  AppChrome.prototype.handleLocationChanged =
    function ac_handleLocationChange() {
      if (!this.app)
        return;
      this.app.canGoForward(function forwardSuccess(result) {
        if (result === true) {
          delete this.forwardButton.dataset.disabled;
        } else {
          this.forwardButton.dataset.disabled = true;
        }
      }.bind(this));

      this.app.canGoBack(function backSuccess(result) {
        if (result === true) {
          delete this.backButton.dataset.disabled;
        } else {
          this.backButton.dataset.disabled = true;
        }
      }.bind(this));

      this.app.frame.classList.remove('context-menu');
    };

  AppChrome.prototype.handleScroll = function ac_scroll(evt) {
    if (!this.app)
      return;

    if (this.app.frame.classList.contains('has-context-menu'))
      return;

    // Scrolling threshold before we do anything with the navigation bar
    var threshold = 20;

    if (evt.detail.top - threshold > this.lastTop) {
      // scrolling down
      this.app.frame.classList.remove('has-navigation');
      this.lastTop = evt.detail.top;
    }
    else if (evt.detail.top + threshold < this.lastTop) {
      this.app.frame.classList.add('has-navigation');
      this.lastTop = evt.detail.top;
    }
  };

  AppChrome.prototype.addBookmark = function ac_addBookmark() {
    if (this.bookmarkButton.dataset.disabled)
      return;

    this.clearButtonBarTimeout();
    var dataset = this.app.config;
    var self = this;

    function selected(value) {
      if (!value)
        return;

      var name, url;
      if (value === 'origin') {
        name = dataset.originName;
        url = dataset.originURL;
      }

      if (value === 'search') {
        name = dataset.searchName;
        url = dataset.searchURL;
      }

      var activity = new MozActivity({
        name: 'save-bookmark',
        data: {
          type: 'url',
          url: url,
          name: name,
          icon: dataset.icon,
          useAsyncPanZoom: dataset.useAsyncPanZoom,
          iconable: false
        }
      });

      activity.onsuccess = function onsuccess() {
        if (value === 'origin') {
          delete self.app.config.originURL;
        }

        if (value === 'search') {
          delete self.app.config.searchURL;
        }

        if (!self.app.config.originURL &&
          !self.app.config.searchURL) {
          self.bookmarkButton.dataset.disabled = true;
        }
      };
    };

    var data = {
      title: _('add-to-home-screen'),
      options: []
    };

    if (dataset.originURL) {
      data.options.push({ id: 'origin', text: dataset.originName });
    }

    if (dataset.searchURL) {
      data.options.push({ id: 'search', text: dataset.searchName });
    }

    ModalDialog.selectOne(data, selected);
  };

  AppChrome.prototype.toggleContextMenu = function() {
    var self = this;

    if (!self.app) return;

    self.app.frame.classList.toggle('has-context-menu');
  };
}(this));
