/* global BaseUI, TouchForwarder */

'use strict';

(function(exports) {
  var AppStatusbar = function(app) {
    this.app = app;
    this.containerElement = app.element;
    this.render();
    this._fetchAllElements();
    this._touchForwarder = new TouchForwarder();
    this._touchForwarder.destination = this.app.browser.element;
    this.app.element.addEventListener('_suspended', this);
    this.app.element.addEventListener('_resumed', this);
  };

  AppStatusbar.prototype = Object.create(BaseUI.prototype);
  AppStatusbar.prototype.constructor = AppStatusbar;
  AppStatusbar.prototype.EVENT_PREFIX = 'appstatusbar';
  AppStatusbar.prototype.DEBUG = false;
  AppStatusbar.prototype.view = function() {
    var content = `<div class="titlebar">
             <div class="notifications-shadow"></div>
             <div class="statusbar-shadow titlebar-maximized"></div>
           </div>`;
    return content;
  };
  AppStatusbar.prototype.RELEASE_TIMEOUT = 5000;
  AppStatusbar.prototype.screen = document.getElementById('screen');

  AppStatusbar.prototype._fetchAllElements = function(first_argument) {
    this.titleBar = this.containerElement.querySelector('.titlebar');
  };

  AppStatusbar.prototype.handleEvent = function(evt) {
    switch (evt.type) {
      case '_resumed':
        this._touchForwarder.destination = this.app.browser.element;
        break;
      case '_suspended':
        this._touchForwarder.destination = null;
        break;
    }
  };

  AppStatusbar.prototype.handleStatusbarTouch = function(evt, barHeight) {
    this.app.debug('preprocessing touch event...', evt.type);
    var touch;
    var cacheHeight = barHeight;
    if (!this.chromeBar) {
      // Because app chrome is loaded after us.
      this.chromeBar = this.app.element.querySelector('.chrome');
    }
    if (this._dontStopEvent) {
      return;
    }
    // If system is at fullscreen mode, let utility tray to handle the event.
    if (!this.app || !this.app.isFullScreen()) {
      return;
    }
    this.app.debug('processing touch event...', evt.type);

    evt.stopImmediatePropagation();
    evt.preventDefault();
    switch (evt.type) {
      case 'touchstart':
        clearTimeout(this._releaseTimeout);
        this._touchStart = evt;
        this._shouldForwardTap = true;

        touch = evt.changedTouches[0];
        this._startX = touch.clientX;
        this._startY = touch.clientY;

        this.chromeBar.style.transition = 'transform';
        this.titleBar.style.transition = 'transform';

        this.chromeBar.classList.add('dragging');
        break;

      case 'touchmove':
        touch = evt.touches[0];
        var height = cacheHeight;
        var deltaX = touch.clientX - this._startX;
        var deltaY = touch.clientY - this._startY;

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          this._shouldForwardTap = false;
        }

        var translate = Math.min(deltaY, height);
        var heightThreshold = height;

        if (this.app && this.app.isFullScreen() && this.app.config.chrome &&
            this.app.config.chrome.navigation) {
          translate = Math.min(deltaY, this.app.appChrome.height);
          heightThreshold = this.app.appChrome.height;

          this.titleBar.style.transform = 'translateY(calc(' +
            (translate - this.app.appChrome.height) + 'px)';
        } else {
          this.titleBar.style.transform =
            'translateY(calc(' + translate + 'px - 100%)';
        }
        this.chromeBar.style.transform =
          'translateY(calc(' + translate + 'px - 100%)';

        this.app.debug(translate, heightThreshold);
        if (translate >= heightThreshold) {
          if (this._touchStart) {
            this._touchForwarder.forward(this._touchStart);
            this._touchStart = null;
          }
          this._touchForwarder.forward(evt);
        }
        break;

      case 'touchend':
        clearTimeout(this._releaseTimeout);

        if (this._touchStart) {
          if (this._shouldForwardTap) {
            this._touchForwarder.forward(this._touchStart);
            this._touchForwarder.forward(evt);
            this._touchStart = null;
          }
          this._releaseBar();
        } else {
          this._dontStopEvent = true;
          this._touchForwarder.forward(evt);
          this._releaseAfterTimeout();
        }
        break;
      }
  };

  AppStatusbar.prototype._releaseBar = function() {
    this.app.debug('releasing statusbar');
    this._dontStopEvent = false;
    var titleBar = this.titleBar;
    var chromeBar = this.chromeBar;

    chromeBar.classList.remove('dragged');
    chromeBar.classList.remove('dragging');
    chromeBar.style.transform = '';
    chromeBar.style.transition = '';

    titleBar.classList.remove('dragged');
    titleBar.style.transform = '';
    titleBar.style.transition = '';

    this.screen.classList.remove('minimized-tray');

    clearTimeout(this._releaseTimeout);
    this._releaseTimeout = null;
  };

  AppStatusbar.prototype._releaseAfterTimeout = function() {
    this.app.debug('stay until 5s');
    this.screen.classList.add('minimized-tray');
    var chromeBar = this.chromeBar;
    var titleBar = this.titleBar;

    var self = this;
    titleBar.style.transform = '';
    titleBar.style.transition = '';
    titleBar.classList.add('dragged');

    chromeBar.style.transform = '';
    chromeBar.style.transition = '';
    chromeBar.classList.add('dragged');
    chromeBar.classList.remove('dragging');

    self._releaseTimeout = setTimeout(function() {
      self._releaseBar();
      window.removeEventListener('touchstart', closeOnTap);
    }, this.RELEASE_TIMEOUT);

    function closeOnTap(evt) {
      if (evt.target != self._touchForwarder.destination) {
        return;
      }
      window.removeEventListener('touchstart', closeOnTap);
      self.app.debug('user interaction, will release statusbar.');
      self._releaseBar(titleBar);
    }
    window.addEventListener('touchstart', closeOnTap);
  };
  exports.AppStatusbar = AppStatusbar;
}(window));
