/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var icc = {
  _iccLastCommand: null,
  _displayTextTimeout: 40000,
  _defaultURL: null,
  _inputTimeout: 40000,

  init: function icc_init() {
    this._icc = this.getICC();
    this.hideViews();
    this.protectForms();
    this.getIccInfo();
    var self = this;
    this.clearMenuCache(function() {
      window.navigator.mozSetMessageHandler('icc-stkcommand',
        function callHandleSTKCommand(message) {
          self.handleSTKCommand(message);
        });
    });

    // Update displayTextTimeout with settings parameter
    var reqDisplayTimeout = window.navigator.mozSettings.createLock().get(
      'icc.displayTextTimeout');
    reqDisplayTimeout.onsuccess = function icc_getDisplayTimeout() {
      this._displayTextTimeout =
        reqDisplayTimeout.result['icc.displayTextTimeout'];
    };
    // Update inputTimeout with settings parameter
    var reqInputTimeout = window.navigator.mozSettings.createLock().get(
      'icc.inputTextTimeout');
    reqInputTimeout.onsuccess = function icc_getInputTimeout() {
      this._inputTimeout = reqInputTimeout.result['icc.inputTextTimeout'];
    };
  },

  getIccInfo: function icc_getIccInfo() {
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.onerror = function() {
      DUMP('Failed to fetch file: ' + href, xhr.statusText);
    };
    xhr.onload = function() {
      self._defaultURL = xhr.response.defaultURL;
      DUMP('ICC default URL: ', self._defaultURL);
    };
    xhr.open('GET', '/resources/icc.json', true);
    xhr.responseType = 'json';
    xhr.send();
  },

  getICC: function icc_getICC() {
    if (!window.navigator.mozMobileConnection) {
      return;
    }

    // See bug 859712
    // To have the backward compatibility for bug 859220.
    // If we could not get iccManager from navigator,
    // try to get it from mozMobileConnection.
    // 'window.navigator.mozMobileConnection.icc' can be dropped
    // after bug 859220 is landed.
    return window.navigator.mozIccManager ||
           window.navigator.mozMobileConnection.icc;
  },

  clearMenuCache: function icc_clearMenuCache(callback) {
    if (typeof callback != 'function') {
      callback = function() {};
    }
    // Remove previous menu
    var resetApplications = window.navigator.mozSettings.createLock().set({
      'icc.applications': '{}'
    });
    resetApplications.onsuccess = function icc_resetApplications() {
      DUMP('STK Cache Reseted');
      callback();
    };
  },

  handleSTKCommand: function icc_handleSTKCommand(command) {
    DUMP('STK Proactive Command:', command);
    if (FtuLauncher.isFtuRunning()) {
      // Delay the stk command until FTU is done
      var self = this;
      window.addEventListener('ftudone', function ftudone() {
        DUMP('FTU is done!... processing STK command:', command);
        self.handleSTKCommand(command);
      });
      return DUMP('FTU is running, delaying STK...');
    }

    this._iccLastCommand = command;

    var cmdId = '0x' + command.typeOfCommand.toString(16);
    if (icc_worker[cmdId]) {
      return icc_worker[cmdId](command, this);
    }

    DUMP('STK Command not recognized ! - ', command);
  },


  /**
   * Response ICC Command
   */
  responseSTKCommand: function icc_responseSTKCommand(response) {
    DUMP('sendStkResponse to command: ', this._iccLastCommand);
    DUMP('sendStkResponse -- # response = ', response);

    this._icc.sendStkResponse(this._iccLastCommand, response);
    this._iccLastCommand = null;
  },

  /**
   * Common responses
   */
  terminateResponse: function() {
    this.responseSTKCommand({
      resultCode: this._icc.STK_RESULT_UICC_SESSION_TERM_BY_USER
    });
  },

  backResponse: function() {
    this.responseSTKCommand({
      resultCode: this._icc.STK_RESULT_BACKWARD_MOVE_BY_USER
    });
  },

  /**
   * Protect forms from reloading system app
   */
  protectForms: function() {
    var protect = function(event) {
      if (!event) {
        return;
      }

      event.preventDefault();
    };

    // Prevents from reloading the system app when
    // the user taps on the Enter key
    var iccView = document.getElementById('icc-view');
    if (!iccView) {
      return;
    }

    var forms = iccView.getElementsByTagName('form');
    if (!forms) {
      return;
    }

    for (var i = 0; i < forms.length; i++) {
      var form = forms[i];
      form.onsubmit = protect;
    }
  },

  /******************************************
   * ICC Helper methods
   ******************************************/

  calculateDurationInMS: function icc_calculateDurationInMS(timeUnit,
    timeInterval) {
    var timeout = timeInterval;
    switch (timeUnit) {
      case this._icc.STK_TIME_UNIT_MINUTE:
        timeout *= 3600000;
        break;
      case this._icc.STK_TIME_UNIT_SECOND:
        timeout *= 1000;
        break;
      case this._icc.STK_TIME_UNIT_TENTH_SECOND:
        timeout *= 100;
        break;
    }
    return timeout;
  },

  hideViews: function icc_hideViews() {
    if (!this.icc_view) {
      this.icc_view = document.getElementById('icc-view');
    }
    this.icc_view.classList.remove('visible');
    var icc_view_boxes = this.icc_view.children;
    for (var i = 0; i < icc_view_boxes.length; i++) {
      icc_view_boxes[i].classList.remove('visible');
    }
  },

  alert: function icc_alert(message) {
    if (!this.icc_alert) {
      this.icc_alert = document.getElementById('icc-alert');
      this.icc_alert_msg = document.getElementById('icc-alert-msg');
      this.icc_alert_btn = document.getElementById('icc-alert-btn');
    }

    var self = this;
    this.icc_alert_btn.onclick = function closeICCalert() {
      self.hideViews();
    };

    this.icc_alert_msg.textContent = message;
    this.icc_alert.classList.add('visible');
    this.icc_view.classList.add('visible');
  },

  /**
   * callback responds with "userCleared"
   */
  confirm: function(message, timeout, callback) {
    if (!this.icc_confirm) {
      this.icc_confirm = document.getElementById('icc-confirm');
      this.icc_confirm_msg = document.getElementById('icc-confirm-msg');
      this.icc_confirm_btn = document.getElementById('icc-confirm-btn');
      this.icc_confirm_btn_back =
        document.getElementById('icc-confirm-btn_back');
      this.icc_confirm_btn_close =
        document.getElementById('icc-confirm-btn_close');
    }

    if (typeof callback != 'function') {
      callback = function() {};
    }
    var self = this;

    // STK Default response (BACK and CLOSE)
    this.icc_confirm_btn_back.onclick = function() {
      clearTimeout(timeoutId);
      self.hideViews();
      self.backResponse();
      callback(null);
    };
    this.icc_confirm_btn_close.onclick = function() {
      clearTimeout(timeoutId);
      self.hideViews();
      self.terminateResponse();
      callback(null);
    };

    // User acceptance
    if (timeout) {
      var timeoutId = setTimeout(function() {
        self.hideViews();
        callback(false);
      }, timeout);
    }

    this.icc_confirm_btn.onclick = function() {
      clearTimeout(timeoutId);
      self.hideViews();
      callback(true);
    };

    this.icc_confirm_msg.textContent = message;
    this.icc_confirm.classList.add('visible');
    this.icc_view.classList.add('visible');
  },

  asyncConfirm: function(message, callback) {
    if (typeof callback != 'function') {
      callback = function() {};
    }
    if (!this.icc_asyncconfirm) {
      this.icc_asyncconfirm =
        document.getElementById('icc-asyncconfirm');
      this.icc_asyncconfirm_msg =
        document.getElementById('icc-asyncconfirm-msg');
      this.icc_asyncconfirm_btn_no =
        document.getElementById('icc-asyncconfirm-btn-no');
      this.icc_asyncconfirm_btn_yes =
        document.getElementById('icc-asyncconfirm-btn-yes');
    }

    var self = this;
    this.icc_asyncconfirm_btn_no.onclick = function rejectConfirm() {
      self.hideViews();
      callback(false);
    };
    this.icc_asyncconfirm_btn_yes.onclick = function acceptConfirm() {
      self.hideViews();
      callback(true);
    };

    this.icc_asyncconfirm_msg.textContent = message;
    this.icc_asyncconfirm.classList.add('visible');
    this.icc_view.classList.add('visible');
  },

  /**
   * Open URL
   */
  showURL: function(url, confirmMessage) {
    function openURL(url) {
      // Sanitise url just in case it doesn't start with http or https
      // the web activity won't work, so add by default the http protocol
      if (url.search('^https?://') == -1) {
        // Our url doesn't contains the protocol
        url = 'http://' + url;
      }
      new MozActivity({
        name: 'view',
        data: { type: 'url', url: url }
      });
    }
    if (url == null || url.length == 0) {
      url = this._defaultURL;
    }
    DUMP('Final URL to open: ' + url);
    if (url != null || url.length != 0) {
      if (confirmMessage) {
        this.asyncConfirm(confirmMessage, function(res) {
          if (res) {
            openURL(url);
          }
        });
      } else {
        openURL(url);
      }
    }
  },

  input: function(message, timeout, options, callback) {
    /**
     * Check if the length of the input is valid.
     *
     * @param {Integer} inputLen    The length of the input.
     * @param {Integer} minLen      Minimum length required of the input.
     * @param {Integer} maxLen      Maximum length required of the input.
     */
    function checkInputLengthValid(inputLen, minLen, maxLen) {
      return (inputLen >= minLen) && (inputLen <= maxLen);
    }

    if (!this.icc_input) {
      this.icc_input = document.getElementById('icc-input');
      this.icc_input_msg = document.getElementById('icc-input-msg');
      this.icc_input_box = document.getElementById('icc-input-box');
      this.icc_input_btn = document.getElementById('icc-input-btn');
      this.icc_input_btn_yes = document.getElementById('icc-input-btn_yes');
      this.icc_input_btn_no = document.getElementById('icc-input-btn_no');
      this.icc_input_btn_back = document.getElementById('icc-input-btn_back');
      this.icc_input_btn_help = document.getElementById('icc-input-btn_help');
    }

    if (typeof callback != 'function') {
      callback = function() {};
    }
    var self = this;
    var timeoutId = null;

    // Help
    this.icc_input_btn_help.disabled = !options.isHelpAvailable;

    if (!options.isYesNoRequired && !options.isYesNoRequested) {
      this.icc_input.classList.remove('yesnomode');

      // Workaround. See bug #818270. Followup: #895314
      setTimeout(function workaround_bug818270() {
        self.icc_input_box.maxLength = options.maxLength;
      });
      this.icc_input_box.placeholder = message;
      this.icc_input_box.type = options.isAlphabet ? 'text' : 'tel';
      this.icc_input_box.value = options.defaultText || '';
      if (options.hideInput) {
        this.icc_input_box.type = 'password';
      }
      if (options.hidden) {
        this.icc_input_box.type = 'hidden';
      }
      this.icc_input_btn.disabled = !checkInputLengthValid(
        this.icc_input_box.value.length, options.minLength, options.maxLength);
      this.icc_input_box.onkeyup = function(event) {
        clearTimeout(timeoutId);
        if (self.icc_input_box.type === 'tel') {
          // Removing unauthorized characters
          self.icc_input_box.value =
            self.icc_input_box.value.replace(/[()-]/g, '');
        }
        self.icc_input_btn.disabled = !checkInputLengthValid(
          self.icc_input_box.value.length, options.minLength,
          options.maxLength);
        if (self.icc_input_box.value.length == options.maxLength) {
          self.icc_input_btn.focus();
        }
      };
      this.icc_input_btn.onclick = function() {
        clearTimeout(timeoutId);
        self.hideViews();
        callback(true, self.icc_input_box.value);
      };
      this.icc_input_box.focus();
    } else {
      this.icc_input.classList.add('yesnomode');
      this.icc_input_box.type = 'hidden';
      this.icc_input_btn_yes.onclick = function(event) {
        clearTimeout(timeoutId);
        self.hideViews();
        callback(true, 1);
      };
      this.icc_input_btn_no.onclick = function(event) {
        clearTimeout(timeoutId);
        self.hideViews();
        callback(true, 0);
      };
    }

    this.icc_input_box.value = '';
    this.icc_input_msg.textContent = message;
    this.icc_input.classList.add('visible');
    this.icc_view.classList.add('visible');

    // STK Default response (BACK and HELP)
    this.icc_input_btn_back.onclick = function() {
      clearTimeout(timeoutId);
      self.hideViews();
      self.backResponse();
      callback(null);
    };
    this.icc_input_btn_help.onclick = function() {
      clearTimeout(timeoutId);
      self.hideViews();
      self.responseSTKCommand({
        resultCode: self._icc.STK_RESULT_HELP_INFO_REQUIRED
      });
      callback(null);
    };
  }
};

// Initialize icc management
icc.init();
