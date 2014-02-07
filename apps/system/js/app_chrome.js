'use strict';

(function(window) {
  var _id = 0;
  var _ = navigator.mozL10n.get;
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
    this.app.element.addEventListener('_loading', this);
    this.app.element.addEventListener('_loaded', this);
    this.app.element.addEventListener('_opened', this);
    this.app.element.addEventListener('_closing', this);
    this.app.element.addEventListener('_withkeyboard', this);
    this.app.element.addEventListener('_withoutkeyboard', this);

    var app = this.app;
    var ctx = app.frame.querySelector('.context-menu');

    // Always hide when click on any of the items
    ctx.onclick = this.toggleContextMenu.bind(this);

    ctx.querySelector('.reload').onclick = app.reload.bind(app);
    ctx.querySelector('.share').onclick = alert.bind(window, 'Share');
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
   * Return buttonbar height for AppWindow calibration
   */
  AppChrome.prototype.getBarHeight = function ac_getBarHeight() {
    return _buttonBarHeight;
  };

  AppChrome.prototype.handleLocationChanged =
    function ac_handleLocationChange() {
      if (!this.app)
        return;
      this.app.canGoForward(function forwardSuccess(result) {
        if (result === true) {
          // use in ctx menu
        }
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
