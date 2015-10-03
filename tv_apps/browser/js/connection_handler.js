/* global ConnectionManager, ConnectionHandler, Browser,
   UrlHelper, Awesomescreen */
'use strict';
(function(exports) {
  var ConnectionHandler = function() {};

  ConnectionHandler.prototype = {
    _active: false,
    _messageQueue: [],

    init: function() {
      this._connectionManager = new ConnectionManager();
      this._connectionManager.init(['iac-webpage-open']);
      this._connectionManager.on('view', this.preHandleMessage.bind(this));
    },

    preHandleMessage: function(detail) {
      if (this._active) {
        this._digestMessage();
        this.openPage(detail.url);
      } else {
        this._messageQueue.push(detail);
      }
    },

    _digestMessage: function() {
      if (this._messageQueue.length !== 0) {
        this._messageQueue.forEach(function(detail){
          this.openPage(detail.url);
        }.bind(this));
        this._messageQueue = [];
      }
    },

    openPage: function(url) {
      url = Browser.getUrlFromInput(url);
      if (Browser.currentInfo.url && UrlHelper.isURL(Browser.currentInfo.url)) {
        var ev = {
          detail: {
            url: url,
            frameElement: null
          }
        };
        Awesomescreen.openNewTab(ev);
      } else {
        Browser.navigate(url);
      }
      this.bringToFront();
    },

    bringToFront: function() {
      if (document.visibilityState === 'hidden') {
        navigator.mozApps.getSelf().onsuccess = function(evt) {
          var app = evt.target.result;
          if (app) {
            app.launch();
          }
        };
      }
    },

    activate: function() {
      this._active = true;
      this._digestMessage();
    },

    pause: function() {
      this._active = false;
    },
  };

  exports.ConnectionHandler = ConnectionHandler;
}(window));

var connectionHandler = new ConnectionHandler();
connectionHandler.init();
