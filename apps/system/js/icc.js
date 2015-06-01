/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global LazyLoader, DUMP, inputWindowManager */
'use strict';

var icc = {
  _displayTextTimeout: 40000,
  _defaultURL: null,
  _inputTimeout: 40000,
  _toneDefaultTimeout: 5000,
  _screen: null,
  _currentMessage: null,

  checkPlatformCompatibility: function icc_checkPlatformCompat() {
    // The STK_RESULT_ACTION_CONTRADICTION_TIMER_STATE constant will be added
    // in the next versions of the platform. This code avoid errors if running
    // in old versions. See bug #1026556
    // Remove this workaround as soon as Gecko has the constant defined.
    // Followup bug #1059166
    if (!('STK_RESULT_ACTION_CONTRADICTION_TIMER_STATE' in this._iccManager)) {
      this._iccManager.STK_RESULT_ACTION_CONTRADICTION_TIMER_STATE = 0x24;
    }
  },

  init: function icc_init() {
    this._iccManager = window.navigator.mozIccManager;
    if (!this._iccManager) {
      return;
    }
    this._screen = document.getElementById('screen');
    this.checkPlatformCompatibility();
    var self = this;
    this.clearMenuCache(function() {
      window.navigator.mozSetMessageHandler('icc-stkcommand',
        function callHandleSTKCommand(message) {
          if (self._iccManager && self._iccManager.getIccById) {
            self.handleSTKCommand(message);
          }
        });
    });
    window.addEventListener('home', this);
    this.hideViews();
    this.protectForms();
    this.getIccInfo();

    var self = this;
    // Update displayTextTimeout with settings parameter
    var reqDisplayTimeout = window.navigator.mozSettings.createLock().get(
      'icc.displayTextTimeout');
    reqDisplayTimeout.onsuccess = function icc_getDisplayTimeout() {
      self._displayTextTimeout =
        reqDisplayTimeout.result['icc.displayTextTimeout'];
    };
    window.navigator.mozSettings.addObserver('icc.displayTextTimeout',
      function(e) {
        self._displayTextTimeout = e.settingValue;
      }
    );
    // Update inputTimeout with settings parameter
    var reqInputTimeout = window.navigator.mozSettings.createLock().get(
      'icc.inputTextTimeout');
    reqInputTimeout.onsuccess = function icc_getInputTimeout() {
      self._inputTimeout = reqInputTimeout.result['icc.inputTextTimeout'];
    };
    window.navigator.mozSettings.addObserver('icc.inputTextTimeout',
      function(e) {
        self._inputTimeout = e.settingValue;
      }
    );
    // Update toneDefaultTimeout with settings parameter
    var reqToneDefaultTimeout = window.navigator.mozSettings.createLock().get(
      'icc.toneDefaultTimeout');
    reqToneDefaultTimeout.onsuccess = function icc_getToneDefaultTimeout() {
      self._toneDefaultTimeout =
        reqToneDefaultTimeout.result['icc.toneDefaultTimeout'];
    };
    window.navigator.mozSettings.addObserver('icc.toneDefaultTimeout',
      function(e) {
        self._toneDefaultTimeout = e.settingValue;
      }
    );

    window.addEventListener('iac-settingsstk', function(evt) {
      var message = evt.detail;
      DUMP('STK_System IAC!!!!');
      if (message === 'StkMenuHidden') {
        window.dispatchEvent(new CustomEvent('stkMenuHidden'));
      }
    });

    // Wait desktop-notification-resend event
    // for loading all notifications before last power off.
    window.addEventListener('desktop-notification-resend',
      self.clearIdleTextNotification);
  },

  clearIdleTextNotification: function icc_clearIdleTextNotification() {
    Notification.get().then(function(notifications) {
      for (var i = 0; i < notifications.length; i++) {
        if (notifications[i].tag.indexOf('stkNotification_') === 0) {
          notifications[i].close();
        }
      }
    });
  },

  getIccInfo: function icc_getIccInfo() {
    var self = this;
    var url = '/resources/icc.json';
    LazyLoader.getJSON(url).then(function(json) {
      self._defaultURL = json.defaultURL;
      DUMP('ICC default URL: ', self._defaultURL);
    }, function(error) {
      DUMP('Failed to fetch file: ' + url + ',' + error);
    });
  },

  getIcc: function icc_getIcc(iccId) {
    DUMP('ICC Getting ICC for ' + iccId);
    return this._iccManager.getIccById(iccId);
  },

  getConnection: function icc_getConnection(iccId) {
    DUMP('ICC Getting Connection for ' + iccId);
    for (var i = 0; i < window.navigator.mozMobileConnections.length; i++) {
      if (window.navigator.mozMobileConnections[i].iccId === iccId) {
        DUMP('ICC Connection ' + i + ' found for ' + iccId);
        return window.navigator.mozMobileConnections[i];
      }
    }
    return null;
  },

  getSIMNumber: function icc_getSIMNumber(iccId) {
    DUMP('ICC Getting SIM Number for ' + iccId);
    for (var i = 0; i < window.navigator.mozMobileConnections.length; i++) {
      if (window.navigator.mozMobileConnections[i].iccId === iccId) {
        return i + 1;
      }
    }
    return '';
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

  handleSTKCommand: function icc_handleSTKCommand(message) {
    // Protection to bad formed messages
    if (!message || !message.iccId || !message.command ||
        !message.command.typeOfCommand || !message.command.options) {
      return DUMP('STK Proactive Command bad formed: ', message);
    }

    DUMP('STK Proactive Command for SIM ' + message.iccId + ': ',
      message.command);
    if (FtuLauncher.isFtuRunning()) {
      // Delay the stk command until FTU is done
      var self = this;
      window.addEventListener('ftudone', function ftudone() {
        DUMP('FTU is done!... processing STK message:', message);
        self.handleSTKCommand(message);
      });
      return DUMP('FTU is running, delaying STK...');
    }

    /* TODO: cleanup branching after bug 819831 landed */
    var cmdId;
    if (typeof message.command.typeOfCommand === 'string') {
      cmdId = message.command.typeOfCommand;
    } else {
      cmdId = '0x' + message.command.typeOfCommand.toString(16);
    }
    if (icc_worker[cmdId]) {
      this.resize();
      return icc_worker[cmdId](message);
    }

    DUMP('STK Command not recognized ! - ', message);
  },

  handleEvent: function icc_handleEvent(evt) {
    switch (evt.type) {
      case 'home':
        if (this.icc_view.classList.contains('visible')) {
          this.hideViews();
        }
        break;
    }
  },

  /**
   * Response ICC Command
   */
  responseSTKCommand: function icc_responseSTKCommand(message, response) {
    DUMP('sendStkResponse to message: ', message);
    DUMP('STK sendStkResponse -- # response = ', response);
    var _icc = icc.getIcc(message.iccId);
    _icc && _icc.sendStkResponse(message.command, response);
    message.response = true;
  },

  /**
   * Common responses
   */
  terminateResponse: function(message) {
    DUMP('STK Sending STK_RESULT_UICC_SESSION_TERM_BY_USER to card ' +
      message.iccId);
    this.responseSTKCommand(message, {
      resultCode: this._iccManager.STK_RESULT_UICC_SESSION_TERM_BY_USER
    });
  },

  backResponse: function(message) {
    DUMP('STK Sending STK_RESULT_BACKWARD_MOVE_BY_USER to card ' +
      message.iccId);
    this.responseSTKCommand(message, {
      resultCode: this._iccManager.STK_RESULT_BACKWARD_MOVE_BY_USER
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
    if (!this.icc_view) {
      return;
    }

    var forms = this.icc_view.getElementsByTagName('form');
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
      case this._iccManager.STK_TIME_UNIT_MINUTE:
        timeout *= 60000;
        break;
      case this._iccManager.STK_TIME_UNIT_SECOND:
        timeout *= 1000;
        break;
      case this._iccManager.STK_TIME_UNIT_TENTH_SECOND:
        timeout *= 100;
        break;
    }
    return timeout;
  },

  hideViews: function icc_hideViews() {
    if (!this.icc_view) {
      this.icc_view = document.getElementById('icc-view');
    }
    this._screen.classList.remove('icc');
    this.icc_view.classList.remove('visible');
    var icc_view_boxes = this.icc_view.children;
    for (var i = 0; i < icc_view_boxes.length; i++) {
      icc_view_boxes[i].classList.remove('visible');
    }
    window.removeEventListener('keyboardchange', this.keyboardChangedEvent);
    window.removeEventListener('keyboardhide', this.keyboardChangedEvent);
    this._currentMessage = null;
  },

  setupView: function icc_setupView(viewId) {
    // If the view has a form, we should be care of the keyboard changes
    if (viewId.getElementsByTagName('form').length > 0) {
      this.keyboardChangedEvent(viewId);
      window.addEventListener('keyboardchange',
        this.keyboardChangedEvent.bind(undefined, viewId, false));
      window.addEventListener('keyboardhide',
        this.keyboardChangedEvent.bind(undefined, viewId, true));
    }
  },

  keyboardChangedEvent: function(viewId, hidden) {
    var keyboardHeight = 0;
    if (!hidden) {
      keyboardHeight = inputWindowManager.getHeight();
    }
    var form = viewId.getElementsByTagName('form');
    var height = (window.innerHeight - keyboardHeight - StatusBar.height);
    height -= softwareButtonManager.height;
    viewId.style.height = height + 'px';
    if (form && viewId.clientHeight > 0) {
      var input = viewId.getElementsByTagName('input')[0];
      var header = viewId.getElementsByTagName('gaia-header')[0];
      var headerSubtitle = viewId.getElementsByTagName('gaia-subheader')[0];
      var menu = viewId.getElementsByTagName('menu')[0];
      var formHeight = viewId.clientHeight;
      formHeight -= (header.clientHeight + headerSubtitle.clientHeight);
      formHeight -= menu.clientHeight;
      formHeight -= softwareButtonManager.height;
      form[0].style.height = formHeight + 'px';
      input.scrollIntoView();
    }
  },

  resize: function() {
    this.icc_view.style.top = StatusBar.height + 'px';
    var height = window.layoutManager.height - StatusBar.height;
    this.icc_view.style.height = height + 'px';
  },

  alert: function icc_alert(stkMessage, message, icons) {
    if (!this.icc_alert) {
      this.icc_alert = document.getElementById('icc-alert');
      this.icc_alert_subtitle = document.getElementById('icc-alert-subtitle');
      this.icc_alert_icons = document.getElementById('icc-alert-icons');
      this.icc_alert_msg = document.getElementById('icc-alert-msg');
      this.icc_alert_btn = document.getElementById('icc-alert-btn');
      this.setupView(this.icc_alert);
    }

    // Clear previous icons
    this.icc_alert_icons.innerHTML = '';

    navigator.mozL10n.setAttributes(
      this.icc_alert_subtitle,
      'icc-message-subtitle',
      { 'id': this.getSIMNumber(stkMessage.iccId) }
    );

    var self = this;
    this.icc_alert_btn.onclick = function closeICCalert() {
      self.hideViews();
    };

    if (icons && icons.length > 0) {
      this.icc_alert.dataset.icons = true;
      this.drawMessageIcons(this.icc_alert_icons, icons);
    } else {
      delete this.icc_alert.dataset.icons;
    }

    this.icc_alert_msg.textContent = message;
    this._screen.classList.add('icc');
    this.icc_alert.classList.add('visible');
    this.icc_view.classList.add('visible');
  },

  /**
   * callback responds with "userCleared"
   */
  confirm: function(stkMessage, message, icons, timeout, callback) {
    if (!this.icc_confirm) {
      this.icc_confirm = document.getElementById('icc-confirm');
      this.icc_confirm_subtitle =
        document.getElementById('icc-confirm-subtitle');
      this.icc_confirm_icons = document.getElementById('icc-confirm-icons');
      this.icc_confirm_msg = document.getElementById('icc-confirm-msg');
      this.icc_confirm_btn = document.getElementById('icc-confirm-btn');
      this.icc_confirm_header =
        document.getElementById('icc-confirm-header');
      this.icc_confirm_btn_close =
        document.getElementById('icc-confirm-btn_close');
      this.setupView(this.icc_confirm);
    }

    // Clear previous icons
    this.icc_confirm_icons.innerHTML = '';

    if (typeof callback != 'function') {
      callback = function() {};
    }

    navigator.mozL10n.setAttributes(
      this.icc_confirm_subtitle,
      'icc-message-subtitle',
      { 'id': this.getSIMNumber(stkMessage.iccId) }
    );

    var self = this;

    // STK Default response (BACK and CLOSE)
    this.icc_confirm_header.addEventListener('action', function() {
      clearTimeout(timeoutId);
      self.hideViews();
      self.backResponse(stkMessage);
      callback(null);
    });
    this.icc_confirm_btn_close.onclick = function() {
      clearTimeout(timeoutId);
      self.hideViews();
      self.terminateResponse(stkMessage);
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

    if (icons && icons.length > 0) {
      this.icc_confirm.dataset.icons = true;
      this.drawMessageIcons(this.icc_confirm_icons, icons);
    } else {
      delete this.icc_confirm.dataset.icons;
    }

    this.icc_confirm_msg.textContent = message;
    this._screen.classList.add('icc');
    this.icc_confirm.classList.add('visible');
    this.icc_view.classList.add('visible');
  },

  asyncConfirm: function(stkMessage, message, icons, callback) {
    if (typeof callback != 'function') {
      callback = function() {};
    }
    if (!this.icc_asyncconfirm) {
      this.icc_asyncconfirm =
        document.getElementById('icc-asyncconfirm');
      this.icc_asyncconfirm_subtitle =
        document.getElementById('icc-asyncconfirm-subtitle');
      this.icc_asyncconfirm_icons =
        document.getElementById('icc-asyncconfirm-icons');
      this.icc_asyncconfirm_msg =
        document.getElementById('icc-asyncconfirm-msg');
      this.icc_asyncconfirm_btn_no =
        document.getElementById('icc-asyncconfirm-btn-no');
      this.icc_asyncconfirm_btn_yes =
        document.getElementById('icc-asyncconfirm-btn-yes');
      this.setupView(this.icc_asyncconfirm);
    }

    // Clear previous icons
    this.icc_asyncconfirm_icons.innerHTML = '';

    navigator.mozL10n.setAttributes(
      this.icc_asyncconfirm_subtitle,
      'icc-message-subtitle',
      { 'id': this.getSIMNumber(stkMessage.iccId) }
    );

    var self = this;

    function stkMenuHiddenHandler(event) {
      window.removeEventListener('stkMenuHidden', stkMenuHiddenHandler);
      self.hideViews();
      callback(false);
    }
    window.addEventListener('stkMenuHidden', stkMenuHiddenHandler);

    this.icc_asyncconfirm_btn_no.onclick = function rejectConfirm() {
      window.removeEventListener('stkMenuHidden', stkMenuHiddenHandler);
      self.hideViews();
      callback(false);
    };
    this.icc_asyncconfirm_btn_yes.onclick = function acceptConfirm() {
      window.removeEventListener('stkMenuHidden', stkMenuHiddenHandler);
      self.hideViews();
      callback(true);
    };

    if (icons && icons.length > 0) {
      this.icc_asyncconfirm.dataset.icons = true;
      this.drawMessageIcons(this.icc_asyncconfirm_icons, icons);
    } else {
      delete this.icc_asyncconfirm.dataset.icons;
    }

    this.icc_asyncconfirm_msg.textContent = message;
    this._screen.classList.add('icc');
    this.icc_asyncconfirm.classList.add('visible');
    this.icc_view.classList.add('visible');
  },

  /**
   * Open URL
   */
  showURL: function(stkMessage, url, icons, confirmMessage) {
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
      if (icons || confirmMessage) {
        this.asyncConfirm(stkMessage, confirmMessage, icons, function(res) {
          if (res) {
            openURL(url);
          }
        });
      } else {
        openURL(url);
      }
    }
  },

  input: function(stkMessage, message, icons, timeout, options, callback) {
    var self = this;
    var timeoutId = null;
    /**
     * Check if the length of the input is valid.
     *
     * @param {Integer} inputLen    The length of the input.
     * @param {Integer} minLen      Minimum length required of the input.
     * @param {Integer} maxLen      Maximum length required of the input.
     */
    function checkInputLengthValid(inputLen, minLen, maxLen) {
      // Update input counter
      var charactersLeft = maxLen - inputLen;
      navigator.mozL10n.setAttributes(
        self.icc_input_btn,
        'okCharsLeft',
        { n: charactersLeft }
      );
      // Input box full feedback
      if (charactersLeft === 0) {
        self.icc_input_box.classList.add('full');
        navigator.vibrate([500]);
      } else {
        self.icc_input_box.classList.remove('full');
      }

      return (inputLen >= minLen) && (inputLen <= maxLen);
    }
    function clearInputTimeout() {
      if (timeoutId) {
        DUMP('clearing previous STK INPUT timeout');
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
    function stkMenuHiddenHandler(event) {
      window.removeEventListener('stkMenuHidden', stkMenuHiddenHandler);
      clearInputTimeout();
      self.hideViews();
      self.terminateResponse(stkMessage);
      callback(null);
    }
    function setInputTimeout() {
      DUMP('setting new STK INPUT timeout to - ', timeout);
      if (timeout) {
        clearInputTimeout();
        timeoutId = setTimeout(function() {
          window.removeEventListener('stkMenuHidden', stkMenuHiddenHandler);
          self.hideViews();
          callback(false);
          self.icc_input_header.removeEventListener('action', actionHandler);
        }, timeout);
      }
    }

    if (!this.icc_input) {
      this.icc_input = document.getElementById('icc-input');
      this.icc_input_maintitle = document.getElementById('icc-input-maintitle');
      this.icc_input_subtitle = document.getElementById('icc-input-subtitle');
      this.icc_input_icons = document.getElementById('icc-input-icons');
      this.icc_input_msg = document.getElementById('icc-input-msg');
      this.icc_input_box = document.getElementById('icc-input-box');
      this.icc_input_btn = document.getElementById('icc-input-btn');
      this.icc_input_btn_yes = document.getElementById('icc-input-btn_yes');
      this.icc_input_btn_no = document.getElementById('icc-input-btn_no');
      this.icc_input_header = document.getElementById('icc-input-header');
      this.icc_input_btn_close = document.getElementById('icc-input-btn_close');
      this.icc_input_btn_help = document.getElementById('icc-input-btn_help');
      this.setupView(this.icc_input);
    }

    // Clear previous icons
    this.icc_input_icons.innerHTML = '';

    if (typeof callback != 'function') {
      callback = function() {};
    }
    setInputTimeout();

    this.icc_input_maintitle.setAttribute('data-l10n-id',
      'icc-message-maintitle');
    navigator.mozL10n.setAttributes(
      this.icc_input_subtitle,
      'icc-message-subtitle',
      { 'id': this.getSIMNumber(stkMessage.iccId) }
    );

    // Help
    this.icc_input_btn_help.disabled = !options.isHelpAvailable;

    if (!options.isYesNoRequested) {
      this.icc_input.classList.remove('yesnomode');

      // Workaround. See bug #818270. Followup: #895314
      setTimeout(function workaround_bug818270() {
        self.icc_input_box.maxLength = options.maxLength;
        self.icc_input_box.value = options.defaultText || '';
        self.icc_input_btn.disabled = !checkInputLengthValid(
          self.icc_input_box.value.length, options.minLength,
          options.maxLength);
      }, 500);
      this.icc_input_box.placeholder = message;
      this.icc_input_box.type = options.isAlphabet ? 'text' : 'tel';
      if (options.hideInput) {
        this.icc_input_box.type = 'password';
      }
      if (options.hidden) {
        this.icc_input_box.type = 'hidden';
      }
      this.icc_input_btn.disabled = !checkInputLengthValid(
        this.icc_input_box.value.length, options.minLength, options.maxLength);
      this.icc_input_box.onkeyup = function(event) {
        setInputTimeout();
        if (self.icc_input_box.type === 'tel') {
          // Removing unauthorized characters
          self.icc_input_box.value =
            self.icc_input_box.value.replace(/[()-]/g, '');
        }
        self.icc_input_btn.disabled = !checkInputLengthValid(
          self.icc_input_box.value.length, options.minLength,
          options.maxLength);
      };
      this.icc_input_btn.onclick = function() {
        window.removeEventListener('stkMenuHidden', stkMenuHiddenHandler);
        clearInputTimeout();
        self.hideViews();
        callback(true, self.icc_input_box.value);
        self.icc_input_header.removeEventListener('action', actionHandler);
      };
      this.icc_input_box.focus();
    } else {
      this.icc_input.classList.add('yesnomode');
      this.icc_input_box.type = 'hidden';
      this.icc_input_btn_yes.onclick = function(event) {
        window.removeEventListener('stkMenuHidden', stkMenuHiddenHandler);
        clearInputTimeout();
        self.hideViews();
        callback(true, true);
        self.icc_input_header.removeEventListener('action', actionHandler);
      };
      this.icc_input_btn_no.onclick = function(event) {
        window.removeEventListener('stkMenuHidden', stkMenuHiddenHandler);
        clearInputTimeout();
        self.hideViews();
        callback(true, false);
        self.icc_input_header.removeEventListener('action', actionHandler);
      };
    }

    if (icons && icons.length > 0) {
      this.icc_input.dataset.icons = true;
      this.drawMessageIcons(this.icc_input_icons, icons);
    } else {
      delete this.icc_input.dataset.icons;
    }

    this.icc_input_box.value = '';

    this.icc_input_msg.classList.toggle('stk-no-text', !message);
    this.icc_input_msg.textContent = message;
    this._screen.classList.add('icc');
    this.icc_input.classList.add('visible');
    this.icc_view.classList.add('visible');

    var actionHandler = function() {
      clearInputTimeout();
      self.hideViews();
      self.backResponse(stkMessage);
      callback(null);
      self.icc_input_header.removeEventListener('action', actionHandler);
      window.removeEventListener('stkMenuHidden', stkMenuHiddenHandler);
    };

    window.addEventListener('stkMenuHidden', stkMenuHiddenHandler);

    // STK Default response (BACK, CLOSE and HELP)
    this.icc_input_header.addEventListener('action', actionHandler);

    this.icc_input_btn_close.onclick = function() {
      window.removeEventListener('stkMenuHidden', stkMenuHiddenHandler);
      clearInputTimeout();
      self.hideViews();
      self.terminateResponse(stkMessage);
      callback(null);
      self.icc_input_header.removeEventListener('action', actionHandler);
    };
    this.icc_input_btn_help.onclick = function() {
      window.removeEventListener('stkMenuHidden', stkMenuHiddenHandler);
      clearInputTimeout();
      self.hideViews();
      self.responseSTKCommand(stkMessage, {
        resultCode: self._iccManager.STK_RESULT_HELP_INFO_REQUIRED
      });
      callback(null);
      self.icc_input_header.removeEventListener('action', actionHandler);
    };
  },

  discardCurrentMessageIfNeeded: function(new_message) {
    var _currentMessage = this._currentMessage;
    if (_currentMessage && _currentMessage !== new_message) {
      this.hideViews();
      if (!_currentMessage.response) {
        DUMP('New message received, discarding previous message...');
        this.responseSTKCommand(_currentMessage, {
          resultCode:
            icc._iccManager.STK_RESULT_TERMINAL_CRNTLY_UNABLE_TO_PROCESS
        });
      }
    }

    this._currentMessage = new_message;
  },

  drawMessageIcons: function(container, icons) {
    for (var i = 0; i < icons.length; i++) {
      container.appendChild(STKHelper.getIconCanvas(icons[i]));
    }
  }
};

// Initialize icc management
icc.init();
