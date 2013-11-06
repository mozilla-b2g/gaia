'use strict';

(function(window) {
  var _id = 0;
  var _ = navigator.mozL10n.get;
  var BUTTONBAR_TIMEOUT = 5000;
  var BUTTONBAR_INITIAL_OPEN_TIMEOUT = 1500;

  window.AppChrome = function AppChrome(config, app) {
    this.config = config;
    this.app = app;
    this.instanceID = _id++;
    this.containerElement = app.element;
    this.render();
  };

  AppChrome.prototype.__proto__ = window.BaseUI.prototype;

  AppChrome.prototype.CLASS_NAME = 'AppChrome';

  AppChrome.prototype.EVENT_PREFIX = 'chrome';

  AppChrome.prototype._DEBUG = true;

  AppChrome.prototype.view = function an_view() {
    return '<div class="chrome" id="' +
            this.CLASS_NAME + this.instanceID + '">' +
            '<header class="progress"><div class="title"></div></header>' +
            '<footer class="navigation closed visible">' +
              '<div class="handler"></div>' +
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
    this.handler = this.element.querySelector('.handler');
    this.bookmarkButton = this.element.querySelector('.bookmark-button');
    this.reloadButton = this.element.querySelector('.reload-button');
    this.forwardButton = this.element.querySelector('.forward-button');
    this.backButton = this.element.querySelector('.back-button');
    this.closeButton = this.element.querySelector('.close-button');
  };

  AppChrome.prototype._registerEvents = function ac__registerEvents() {
    this.app.once('loading', 'true', function onLoadStart() {
      this.show(this.progress);
    }.bind(this));

    this.app.once('loading', 'false', function onLoadEnd() {
      this.hide(this.progress);
    }.bind(this));

    this.handler.addEventListener('click', function onhandle() {
      if (this.closingTimer)
        window.clearTimeout(this.closingTimer);
      this.navigation.classList.remove('closed');
      this.closingTimer = setTimeout(function() {
        this.navigation.classList.add('closed');
      }.bind(this), 5000);
    }.bind(this));

    this.closeButton.addEventListener('click', function onclose() {
      if (this.closingTimer)
        window.clearTimeout(this.closingTimer);
      this.navigation.classList.add('closed');
    }.bind(this));

    this.reloadButton.addEventListener('click', function onreload() {
      this.clearButtonBarTimeout();
      this.app.reload();
    }.bind(this));

    this.forwardButton.addEventListener('click', function pnforward() {
      this.clearButtonBarTimeout();
      this.app.forward();
    }.bind(this));

    this.backButton.addEventListener('click', function onback() {
      this.clearButtonBarTimeout();
      this.app.back();
    }.bind(this));

    this.bookmarkButton.addEventListener('click', function onbookmark() {
      this.addBookmark();
    }.bind(this));

    this.app.element.addEventListener('mozbrowserlocationchange',
      this.onLocationChange.bind(this));

    this.app.element.addEventListener('_appopened',
      this.onDisplayedApplicationChange.bind(this));

    this.app.element.addEventListener('_appclosing', function onAppClose(e) {
      clearTimeout(this.buttonBarTimeout);
      if (!HomeGesture.enable) {
        this.navigation.classList.add('closed');
      }
      this.isButtonBarDisplayed = false;
    }.bind(this));

    // XXX: Memory leak pattern!!!
    // TODO: Let appWindow dispatch internal events instead.
    this.app.element.addEventListener('_withkeyboard',
      function onKeyboardChange(e) {
        if (this.app && this.app.isActive()) {
          if (this.navigation.classList.contains('visible')) {
            this.navigation.classList.remove('visible');
          }
        }
      }.bind(this));

    this.app.element.addEventListener('_withoutkeyboard',
      function onKeyboardChange(e) {
        if (this.app && this.app.isActive()) {
          if (!this.navigation.classList.contains('visible')) {
            this.navigation.classList.add('visible');
          }
        }
      }.bind(this));

    this.app.element.addEventListener('_homegesture-enabled',
      this.showNavigation.bind(this));

    this.app.element.addEventListener('_homegesture-disabled',
      this.hideNavigation.bind(this));
  };

  // TODO
  AppChrome.prototype.showNavigation = function ac_showNavigation() {
    if (this.closeButton.style.visibility !== 'hidden') {
      this.closeButton.style.visibility = 'hidden';
    }
    if (this.navigation.classList.contains('closed')) {
      this.navigation.classList.remove('closed');
    }
  };

  AppChrome.prototype.hideNavigation = function ac_hideNavigation() {
    if (this.closeButton.style.visibility !== 'visible') {
      this.closeButton.style.visibility = 'visible';
    }
    if (!this.navigation.classList.contains('closed')) {
      this.navigation.classList.add('closed');
    }
  };

  AppChrome.prototype.toggleButtonBar = function ac_toggleButtonBar(time) {
    this.isButtonBarDisplayed = false;
    clearTimeout(this.buttonBarTimeout);
    if (!HomeGesture.enable) {
      this.navigation.classList.toggle('closed');
    }
    this.isButtonBarDisplayed = !this.isButtonBarDisplayed;
    if (this.isButtonBarDisplayed) {
      this.buttonBarTimeout = setTimeout(this.toggleButtonBar.bind(this),
        time || BUTTONBAR_TIMEOUT);
    }
  };

  AppChrome.prototype.clearButtonBarTimeout =
    function ac_clearButtonBarTimeout() {
      clearTimeout(this.buttonBarTimeout);
      this.buttonBarTimeout =
        setTimeout(this.toggleButtonBar.bind(this), BUTTONBAR_TIMEOUT);
    };

  AppChrome.prototype.onDisplayedApplicationChange =
    function ac_onDisplayedApplicationChange() {
      this.toggleButtonBar(BUTTONBAR_INITIAL_OPEN_TIMEOUT);

      var dataset = this.app.config;
      if (dataset.originURL || dataset.searchURL) {
        delete this.bookmarkButton.dataset.disabled;
        return;
      }

      bookmarkButton.dataset.disabled = true;
    };

  AppChrome.prototype.onLocationChange = function ac_onLocationChange() {
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

    // TODO: Refine this
    ModalDialog.selectOne(data, selected);
  };
}(this));
