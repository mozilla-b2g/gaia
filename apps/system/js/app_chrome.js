'use strict';

(function(window) {
  var _id = 0;
  window.AppChrome = function AppChrome(config, app) {
    this.debug('new chrome');
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

  AppChrome.prototype._fetchElements = function an__fetchElements() {
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

  AppChrome.prototype._registerEvents = function an__registerEvents() {
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
      this.app.reload();
    }.bind(this));

    this.forwardButton.addEventListener('click', function pnforward() {
      this.app.forward();
    }.bind(this));

    this.backButton.addEventListener('click', function onback() {
      this.app.back();
    }.bind(this));

    this.bookmarkButton.addEventListener('click', function onbookmark() {
      // TODO
    }.bind(this));
  };
}(this));
