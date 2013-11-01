'use strict';

(function(window) {
  var _id = 0;
  window.AppChrome = function AppChrome(app) {
    this.app = app;
    this.instanceID = _id++;
    this.containerElement = app.element;
    this.render();
  };

  AppChrome.prototype.__proto__ = window.BaseUI.prototype;

  AppChrome.prototype.CLASS_NAME = 'AppChrome';

  AppChrome.prototype.EVENT_PREFIX = 'chrome';

  AppChrome.prototype.view = function an_view() {
    return '<div class="chrome" id="' +
            this.CLASS_NAME + this.instanceID + '">' +
            '<header class="progress"><div class="title"></div></header>' +
            '<footer class="navigation closed">' +
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
    this.element = this.containerElement('.chrome');
    this.navigation = this.element.querySelector('.navigation');
    this.progress = this.element.querySelector('.progress');
    this.handler = this.element.querySelector('.handler');
    this.bookmarkButton = this.element.querySelector('.bookmark-button');
    this.reloadButton = this.element.querySelector('.reload-button');
    this.forwardButton = this.element.querySelector('.forward-button');
    this.backButton = this.element.querySelector('.back-button');
  };

  AppChrome.prototype._registerEvents = function an__registerEvents() {
    this.app.once('loading', 'true', function onLoadStart() {
      this.show(this.progress);
    }.bind(this));

    this.app.once('loading', 'false', function onLoadEnd() {
      this.hide(this.progress);
    }.bind(this));

    this.reloadButton.addEventListener(function onreload() {
      this.app.reload();
    }.bind(this));

    this.forwardButton.addEventListener(function pnforward() {
      this.app.forward();
    }.bind(this));

    this.backButton.addEventListener(function onback() {
      this.app.back();
    }.bind(this));

    this.bookmarkButton.addEventListener(function onbookmark() {
      // TODO
    }.bind(this));
  };
}(this));
