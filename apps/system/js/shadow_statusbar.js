/* global BaseUI */

'use strict';

(function(exports) {
  var ShadowStatusBar = function(app) {
    this.app = app;
    this.containerElement = app.element;
    this.render();
    this.app.element.addEventListener('_shadowtouchstart', this);
    this.app.element.addEventListener('_shadowtouchend', this);
    this.app.element.addEventListener('_shadowtouchmove', this);
  };

  ShadowStatusBar.prototype = Object.create(BaseUI.prototype);
  ShadowStatusBar.prototype.constructor = ShadowStatusBar;
  ShadowStatusBar.prototype.EVENT_PREFIX = 'shadowstatusbar';
  ShadowStatusBar.prototype.view = function() {
    return '<div class="titlebar">' +
            ' <div class="statusbar-shadow titlebar-maximized"></div>' +
            ' <div class="statusbar-shadow titlebar-minimized"></div>' +
          '</div>';
  };
  ShadowStatusBar.prototype.RELEASE_TIMEOUT = 5000;

  ShadowStatusBar.prototype._fetchAllElements = function(first_argument) {
    this.titleBar = this.containerElement.querySelector('.titlebar');
    // XXX: This is rendered by appChrome.
    this.chromeBar = this.app.element.querySelector('.chrome');
  };

  ShadowStatusBar.prototype.handleEvent = function(evt) {
    switch (evt.type) {
      case '_shadowtouchstart':
        clearTimeout(this._releaseTimeout);
        this.chromeBar.style.transition = 'transform';
        this.titleBar.style.transition = 'transform';
        break;

      case '_shadowtouchmove':
        this.chromeBar.style.transform =
          this.titleBar.style.transform =
          evt.detail.transform;
        break;

      case '_shadowtouchend':
        clearTimeout(this._releaseTimeout);
        if (evt.detail.timeout) {
          this._releaseAfterTimeout();
        } else {
          this._releaseBar();
        }
        break;
    }
  };

  ShadowStatusBar.prototype._releaseBar = function() {
    var titleBar = this.titleBar;
    var chromeBar = this.chromeBar;

    chromeBar.classList.remove('dragged');
    chromeBar.style.transform = '';
    chromeBar.style.transition = '';

    titleBar.classList.remove('dragged');
    titleBar.style.transform = '';
    titleBar.style.transition = '';

    clearTimeout(this._releaseTimeout);
    this._releaseTimeout = null;
    this.publish('released');
  };

  ShadowStatusBar.prototype._releaseAfterTimeout = function() {
    var chromeBar = this.chromeBar;
    var titleBar = this.titleBar;

    var self = this;
    titleBar.style.transform = '';
    titleBar.style.transition = '';
    titleBar.classList.add('dragged');

    chromeBar.style.transform = '';
    chromeBar.style.transition = '';
    chromeBar.classList.add('dragged');

    self._releaseTimeout = setTimeout(function() {
      self._releaseBar();
      window.removeEventListener('touchstart', closeOnTap);
    }, this.RELEASE_TIMEOUT);

    function closeOnTap(evt) {
      if (evt.target !== self.app.browser.element) {
        return;
      }

      window.removeEventListener('touchstart', closeOnTap);
      self._releaseBar();
    }
    window.addEventListener('touchstart', closeOnTap);
  },
  exports.ShadowStatusBar = ShadowStatusBar;
}(window));
