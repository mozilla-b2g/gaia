/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var icc_mock = (function() {

  function icc_mock() {
    var _commandNumber = 1;
  }

  icc_mock.prototype = {
    init: function(callback) {
      if (typeof callback !== 'function') {
        callback = function() {};
      }

      var self = this;
      var xhr = new XMLHttpRequest();
      // Recovering ICC constansts fetched from nsIDOMIccManager.idl
      // http://hg.mozilla.org/mozilla-central/file/tip/dom/icc/interfaces/
      //                                                nsIDOMIccManager.idl
      xhr.open('GET', 'shared/resources/icc_consts.json', true);
      xhr.responseType = 'json';
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
          for (var _const in xhr.response) {
            self[_const] = parseInt(xhr.response[_const]);
          }
          callback();
        }
      };
      xhr.send();

      this.registerObserver();
    },

    ///////////////////////////////////////////////////////////////////////////
    // Mock auxiliar methods
    ///////////////////////////////////////////////////////////////////////////

    sendIccCommand2System: function(obj) {
      var reqIccMockRevData = window.navigator.mozSettings.createLock().set({
        'icc.mock_reversedata': JSON.stringify(obj)
      });
      reqIccMockRevData.onsuccess = function icc_setIccMockRevData() {
        DUMP('ICC Mocked response sent to system!', obj);
      };
    },

    /**
     * Observer to manage commands received from settings
     */
    registerObserver: function() {
      var settings = window.navigator.mozSettings;
      var reqIccSessionEnd = settings.createLock().set({
        'icc.sessionend': null
      });
      var self = this;
      settings.addObserver('icc.sessionend', function(event) {
        DUMP('onstksessionend');
        self.onstksessionend();
      });
    },

    ///////////////////////////////////////////////////////////////////////////
    // Methods (from nsIDOMIccManager.idl)
    ///////////////////////////////////////////////////////////////////////////

    /**
     * Send the response back to ICC after an attempt to execute STK Proactive
     * Command.
     *
     * command
     *  Command received from ICC. See MozStkCommand.
     * response
     *  The response that will be sent to ICC.
     * @see MozStkResponse for the detail of response.
     */
    sendStkResponse: function(command, response) {
      DUMP('Response received: ', response);
      this.sendIccCommand2System({
        'command': command,
        'response': response
      });
    },

    /**
     * Send the "Menu Selection" Envelope command to ICC for menu selection.
     *
     * itemIdentifier
     *  The identifier of the item selected by user.
     * helpRequested
     *  true if user requests to provide help information, false otherwise.
     */
    sendStkMenuSelection: function(itemIdentifier, helpRequested) {
      DUMP('STK Menu selected: ', itemIdentifier);
      this.sendIccCommand2System({
        'itemIdentifier': itemIdentifier,
        'helpRequested': helpRequested
      });
    },

    /**
     * The 'stkcommand' event is notified whenever STK Proactive Command is
     * issued from ICC.
     */
    onstkcommand: function() {
      DUMP('onstkcommand not changed');
    },

    /**
     * 'stksessionend' event is notified whenever STK Session is terminated by
     * ICC.
     */
    onstksessionend: function() {
      DUMP('onstksessionend not changed');
    }
  };

  return new icc_mock();
}());
