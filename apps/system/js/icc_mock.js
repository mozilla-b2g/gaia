/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var icc_mock = (function() {
  function debug(msg, optObject) {
    DUMP('STKMOCK ' + msg, optObject);
  }

  function icc_mock() {
    var _commandNumber = 1;
    var _lastMenuOptionSent = 0;
    var _lastMenu = 0;
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
          debug('Lazy loading ICC faked menu');
          var loader = LazyLoader;
          loader.load('js/icc_mock_fakemenu.js', function() {
            self.iccMenu = getICCFakeMenu(self);
            debug('Fake ICC menu loaded: ', self.iccMenu);
            callback();
          });
        }
      };
      xhr.send();

      this.registerObserver();
    },

    ///////////////////////////////////////////////////////////////////////////
    // Mock auxiliar methods
    ///////////////////////////////////////////////////////////////////////////

    createCommand: function(_typeOfCommand, _options) {
      return {
        'commandNumber': this._commandNumber,
        'typeOfCommand': _typeOfCommand,
        'commandQualifier': 0,
        'rilMessageType': 'stkcommand',
        'options': _options
      };
    },

    emitCommand: function(command) {
      debug('icc_mock: Sending ICC Command: ', command);
      var event = new CustomEvent('_stkcommand', {
        detail: { 'command': command }
      });
      window.dispatchEvent(event);
      this.onstkcommand();
    },

    dispatchMainMenu: function() {
      // Main STK menu
      var self = this;
      setTimeout(function() {
        debug('icc_mock: Sending faked STK main menu');
        var _options = self.iccMenu['mainMenu'];
        _options.presentationType = 0;
        self.emitCommand(
          self.createCommand(
            self.STK_CMD_SET_UP_MENU,
            _options
          ));
      }, 5000);
    },

    sendStkSessionEnd: function() {
      this.onstksessionend();
      var settings = window.navigator.mozSettings;
      var reqIccSessionEnd = settings.createLock().set({
        'icc.sessionend': true
      });
    },

    /**
     * Observer to manage commands received from settings
     */
    registerObserver: function() {
      var settings = window.navigator.mozSettings;
      var reqIccMockRevData = settings.createLock().set({
        'icc.mock_reversedata': null
      });
      reqIccMockRevData.onsuccess = function icc_setIccMockRevData() {
        debug('ICC Reverse Cache cleared');
      };
      var self = this;
      settings.addObserver('icc.mock_reversedata', function(event) {
        try {
          var cmd = JSON.parse(event.settingValue);
          if (!cmd) {
            return;
          }
          debug('Fake ICC command received: ', cmd);
          if (cmd.command) {
            debug('Fake ICC Response received');
            self.sendStkResponse(
              cmd.command,
              cmd.response);
          }
          if (cmd.itemIdentifier) {
            debug('Fake ICC Menu selection received');
            self.sendStkMenuSelection(
              cmd.itemIdentifier,
              cmd.helpRequested);
          }
        } catch (e) {
          debug('Error parsing ICC Faked command');
        }
      });
    },

    sendToParent: function() {
      DUMP('Go to parent... ' + this._lastMenu);
      var parent = 0;
      if (this._lastMenu) {
        parent = this.iccMenu['subMenus'][this._lastMenu].parent || 0;
      }
      DUMP('parent=' + parent);
      if (!parent) {
        this.sendStkSessionEnd();
        return;
      }
      var _subMenu = this.iccMenu['subMenus'][parent];
      DUMP('Menu=' + subMenu);
      this._lastMenu = parent;
      this.emitCommand(
        this.createCommand(
          _subMenu.cmd,
          _subMenu.opt
        ));
    },

    ///////////////////////////////////////////////////////////////////////////
    // Methods (from nsIDOMIccManager.idl)
    ///////////////////////////////////////////////////////////////////////////

    /**
     * Send the response back to ICC after an attempt to execute STK Proactive
     * Command.
     *
     * command
     *   Command received from ICC. See MozStkCommand.
     * response
     *   The response that will be sent to ICC.
     * @see MozStkResponse for the detail of response.
     */
    sendStkResponse: function(command, response) {
      debug('Response received: ', response);
      debug('Command: ', command);
      var _subMenu = null;

      switch (response.resultCode) {
      case this.STK_RESULT_OK:
        if (response.itemIdentifier) {
          _subMenu = this.iccMenu['subMenus'][response.itemIdentifier];
        } else {
          _subMenu = this.iccMenu['subMenus'][this._lastMenuOptionSent];
        }
        this._lastMenuOptionSent = response.itemIdentifier;
        if (_subMenu.cmd == icc.STK_CMD_SELECT_ITEM) {
          this._lastMenu = response.itemIdentifier;
        }
        this.emitCommand(
          this.createCommand(
            _subMenu.cmd,
            _subMenu.opt
          ));
        break;
      case this.STK_RESULT_PRFRMD_WITH_PARTIAL_COMPREHENSION:
      case this.STK_RESULT_PRFRMD_WITH_MISSING_INFO:
      case this.STK_RESULT_PRFRMD_WITH_ADDITIONAL_EFS_READ:
      case this.STK_RESULT_PRFRMD_LIMITED_SERVICE:
      case this.STK_RESULT_UICC_SESSION_TERM_BY_USER:
        debug('Response not implemented');
        this.sendToParent();
      case this.STK_RESULT_BACKWARD_MOVE_BY_USER:
      case this.STK_RESULT_NO_RESPONSE_FROM_USER:
        this.sendToParent();
        break;
      case this.STK_RESULT_HELP_INFO_REQUIRED:
      case this.STK_RESULT_USSD_SS_SESSION_TERM_BY_USER:
      case this.STK_RESULT_TERMINAL_CRNTLY_UNABLE_TO_PROCESS:
      case this.STK_RESULT_NETWORK_CRNTLY_UNABLE_TO_PROCESS:
      case this.STK_RESULT_USER_NOT_ACCEPT:
      case this.STK_RESULT_USER_CLEAR_DOWN_CALL:
      case this.STK_RESULT_LAUNCH_BROWSER_ERROR:
      case this.STK_RESULT_BEYOND_TERMINAL_CAPABILITY: STK / Bug881675;
      case this.STK_RESULT_CMD_TYPE_NOT_UNDERSTOOD:
      case this.STK_RESULT_CMD_DATA_NOT_UNDERSTOOD:
      case this.STK_RESULT_CMD_NUM_NOT_KNOWN:
      case this.STK_RESULT_SS_RETURN_ERROR:
      case this.STK_RESULT_SMS_RP_ERROR:
      case this.STK_RESULT_REQUIRED_VALUES_MISSING:
      case this.STK_RESULT_USSD_RETURN_ERROR:
      case this.STK_RESULT_MULTI_CARDS_CMD_ERROR:
      case this.STK_RESULT_USIM_CALL_CONTROL_PERMANENT:
      case this.STK_RESULT_BIP_ERROR:
        debug('Response not implemented');
        this.sendToParent();
        break;
      default:
        debug('Response not recognized');
        this.sendToParent();
      }
    },

    /**
     * Send the "Menu Selection" Envelope command to ICC for menu selection.
     *
     * itemIdentifier
     *   The identifier of the item selected by user.
     * helpRequested
     *   true if user requests to provide help information, false otherwise.
     */
    sendStkMenuSelection: function(itemIdentifier, helpRequested) {
      debug('Menu selected: ', itemIdentifier);
      helpRequested && debug('Help requested');

      var _subMenu = this.iccMenu['subMenus'][itemIdentifier];
      if (helpRequested) {
        this.emitCommand(
          this.createCommand(
            this.STK_CMD_DISPLAY_TEXT,
            {
              'text': _subMenu.help || 'No help provided'
            }
          ));
        return;
      }
      this.emitCommand(
        this.createCommand(
          _subMenu.cmd,
          _subMenu.opt
        ));
    },

    /**
     * Send the "Timer Expiration" Envelope command to ICC for TIMER MANAGEMENT.
    `*
     * timer
     *   The identifier and value for a timer.
     *        timerId: Identifier of the timer that has expired.
     *        timerValue: Different between the time when this command is issued
     *                    and when the timer was initially started.
     *        @see MozStkTimer
     */
    sendStkTimerExpiration: function(timer) {
      debug('icc_mock - method not yet implemented');
    },

    /**
     * Send "Event Download" Envelope command to ICC.
     * ICC will not respond with any data for this command.
     *
     * event
     *   one of events below:
     *        - MozStkLocationEvent
     *        - MozStkCallEvent
     *        - MozStkLanguageSelectionEvent
     *        - MozStkGeneralEvent
     */
    sendStkEventDownload: function(event) {
      debug('icc_mock - method not yet implemented');
    },

    /**
     * The 'stkcommand' event is notified whenever STK Proactive Command is
     * issued from ICC.
     */
    onstkcommand: function() {
      debug('onstkcommand not changed');
    },

    /**
     * 'stksessionend' event is notified whenever STK Session is terminated by
     * ICC.
     */
    onstksessionend: function() {
      debug('onstksessionend not changed');
    },

    // UICC Phonebook Interfaces.

    /**
     * Read ICC contacts.
     *
     * contactType
     *   One of type as below,
     *        - 'adn': Abbreviated Dialling Number
     *        - 'fdn': Fixed Dialling Number
     */
    readContacts: function(contactType) {
      debug('icc_mock - method not yet implemented');
    },

    /**
     * Update ICC Phonebook contact.
     *
     * contactType
     *   One of type as below,
     *        - 'adn': Abbreviated Dialling Number
     *        - 'fdn': Fixed Dialling Number
     * contact
     *   The contact will be updated in ICC
     * [optional] pin2
     *   PIN2 is only required for 'fdn'.
     */
    updateContact: function(contactType, contact, pin2) {
      debug('icc_mock - method not yet implemented');
    },

    // End of UICC Phonebook Interfaces.

    // UICC Secure Element Interfaces

    /**
     * A secure element is a smart card chip that can hold
     * several different applications with the necessary security.
     * The most known secure element is the Universal Integrated Circuit Card
     * (UICC)
     */

    /**
     * Send request to open a logical channel defined by its
     * application identifier (AID)
     *
     * aid
     *   The Application Identifier of the Applet to be selected on this channel
     * return value : An instance of Channel (channelID) if available or null.
     */
    iccOpenChannel: function(aid) {
      debug('icc_mock - method not yet implemented');
    },

    /**
     * Interface, used to communicate with an applet through the
     * Application Data Protocol Units (APDUs) and is
     * used for all data that is exchanged between the UICC card and the
     * terminal (ME).
     *
     * channel
     *   The Application Identifier of the Applet to which APDU is directed
     * apdu
     *   Application Protocol Data Unit
     * return value : Response APDU
     */
    iccExchangeAPDU: function(channel, apdu) {
      debug('icc_mock - method not yet implemented');
    },

    /**
     * Send request to close the selected logical channel identified by its
     * application identifier (AID)
     *
     * aid
     *   The Application Identifier of the Applet , to be closed
     */
    iccCloseChannel: function(channel) {
      debug('icc_mock - method not yet implemented');
    }
  };

  return new icc_mock();
}());
