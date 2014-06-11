'use strict';

/* exported ValidationToolsHelper*/
/* globals IACHandler*/

/**
* Validation Tools Helper
*
* This file is a temporary solution for validationTools app to hack several
* special events such as hardware-button etc.. The current architecture of
* gecko only supports reporting those events to system module and no loger
* dispatching to other gaia apps. Therefore, we should establish an customized
* channel base on IAC to satisfy the specific function of validationTools.
*
*/

(function(exports) {

  var DEBUG = false;

  // Specified type identifier for events
  var KEYPADTYPE = 'hardware-button';
  var HEADSETTYPE = 'headset-button';

  // List all keypad events type here and should be strict one to one
  // mapping with the set of system_connection in validationtools app
  var EVENTLIST = {
    home: 'home',
    holdhome: 'holdhome',
    volumeup: 'volumeup',
    volumedown: 'volumedown'
  };

  // Note:to place this file before other system modules so as to ensure
  // we can prevent those modules from receiving and responding the event.
  var ValidationToolsHelper = function() {

    // true: port existes and validationtools app is alive
    // false: validationtools app is dead(no matter what status the port is)
    this._isPortEnable = false;

    this._eventList = null;

    // the identifier is to ensure the fault-tolerant especially on some
    // abnormal conditions such as validationtools app was exceptionally
    // killed without any chance to terminate the monitoring
    this._appIdentifier = null;
  };

  ValidationToolsHelper.prototype = {
    debug: function vth_debug() {
      if (DEBUG) {
        console.log('[ValidationToolsHelper]' + '[' + Date.now() + ']' +
          Array.prototype.slice.call(arguments).concat().join());
      }
    },

    attachEvent: function vth_attachEvent() {
      var list = this._eventList;

      for (var key in list) {
        window.addEventListener(list[key], this, true);
      }
    },

    detachEvent: function vth_attachEvent() {
      var list = this._eventList;

      for (var key in list) {
        window.removeEventListener(list[key], this);
      }
    },

    // Beacuse we must intercept the hardware-button events if needed,
    // so the monitor should be registered at the initial time to prevent
    // system app from receiving those messages first
    start: function vth_start() {
      this.debug(' start.');

      this._eventList = EVENTLIST;
      this.attachEvent();
      navigator.mozSetMessageHandler('headset-button',
        this.handleHSMessage.bind(this));
      window.addEventListener('iac-validationtools-request',
        this.handleIACMessage.bind(this));
    },

    stop: function vth_stop() {
      this.debug(' end.');
      window.removeEventListener('iac-validationtools-request',
        this.handleIACMessage.bind(this));
    },

    // To response the iac message from validationtools app
    // all message types should be consistent with the remote
    handleIACMessage: function vth_handleIACMessage(evt) {
      var message = evt.detail;
      var command = message.detail.command;

      if (command === 'open') {
        this._isPortEnable = true;
        this._appIdentifier = WindowManager.getDisplayedApp();
      } else if (command === 'close') {
        this._appIdentifier = null;
        this._isPortEnable = false;
        this.detachEvent();
      }

      this.debug('Exit handleIACMessage:' + JSON.stringify(message) +
        ', _isPortEnable=' + this._isPortEnable +
        ', _appIdentifier=' + this._appIdentifier);
    },

    handleHSMessage: function vth_handleHSMessage(message) {
      var targetMessage = {};

      if (!this._isAllowedToDispatch()) {
        return;
      }

      if (message == 'headset-button-press' ||
        message == 'headset-button-release') {
        this.debug('handleHSMessage.  to dispatch message:' + message);
        targetMessage.detail = this._packageMessage(HEADSETTYPE, message);
        this._sendMessage(targetMessage, this.notifySuccess.bind(this),
          this.notifyError.bind(this));
      }
    },

    handleEvent: function vth_handleEvent(evt) {
      var data = evt.type;
      var message = {};

      if (!this._isAllowedToDispatch()) {
        return;
      }

      if (data in this._eventList) {
        this.debug(' handleEvent, current type is ' + data);
        evt.stopImmediatePropagation();

        message.detail = this._packageMessage(KEYPADTYPE, data);
        this._sendMessage(message, this.notifySuccess.bind(this),
          this.notifyError.bind(this));
      }
    },

    _isAllowedToDispatch: function vth_isAllowedToDispatch() {
      var result = true;

      //To judge if the port is existed or not
      if (!this._isPortEnable) {
        this.debug(' Error: no handling for port is not enable.');
        result = false;
      }

      // Notice:if current app is not validationtools app and
      // portEnable is true, we should judge that validationtools
      // app has been killed abnormally and then the monitor should
      // be released immediately to enable system functioning.
      var currentApp = WindowManager.getDisplayedApp();
      if (currentApp !== this._appIdentifier) {
        this.debug(' Error: port is enable but no vt app.');
        this._isPortEnable = false;
        this.detachEvent();
        result = false;
      }

      return result;
    },

    // The detail of message should be defined as:
    // {
    //    command : XXX
    //    eventType: YYY
    // }
    _packageMessage: function vth_packageMessage(type, data) {
      if (type && data) {
        return {
          type: type,
          data: data
        };
      }
    },

    _sendMessage: function vth_sendMessage(message,
      successCallback, errorCallback) {
      var port;

      try {
        port = IACHandler.getPort('validationtools-request');
        port.postMessage(message);

        if (typeof successCallback === 'function') {
          this.debug('[ notifySuccess]' + JSON.stringify(message));
          successCallback(message);
        }
      } catch (e) {
        if (typeof errorCallback === 'function') {
          this.debug('[ notifyError] errorInfo:' + JSON.stringify(e) +
            '\n message:' + JSON.stringify(message));
          errorCallback(e.message, message);
        }
      }
    },

    // When callback function is called, there's no defination of this
    // for currently no time to research the issue and will solve soon
    notifySuccess: function vth_notifySuccess(message) {
      this.debug('[notifySuccess]' + JSON.stringify(message));
      return true;
    },

    notifyError: function vth_notifyError(errorInfo, message) {
      this.debug('[notifyError] errorInfo:' + JSON.stringify(errorInfo) +
        '\n message:' + JSON.stringify(message));
      return true;
    }
  };

  exports.ValidationToolsHelper = ValidationToolsHelper;
})(window);

window.validationToolsHelper = new ValidationToolsHelper();
window.validationToolsHelper.start();
