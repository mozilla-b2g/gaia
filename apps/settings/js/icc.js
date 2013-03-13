/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  var _ = navigator.mozL10n.get;

  // Consts
  const STK_SCREEN_DEFAULT = 0x00;
  const STK_SCREEN_MAINMENU = 0x01;
  const STK_SCREEN_HELP = 0x02;

  /**
   * Init
   */
  var iccMenuItem = document.getElementById('menuItem-icc');
  var iccStkList = document.getElementById('icc-stk-list');
  var iccStkHeader = document.getElementById('icc-stk-header');
  var iccStkSubheader = document.getElementById('icc-stk-subheader');
  var alertbox = document.getElementById('icc-stk-alert');
  var alertbox_btn = document.getElementById('icc-stk-alert-btn');
  var alertbox_btnback = document.getElementById('icc-stk-alert-btn_back');
  var alertbox_btnclose = document.getElementById('icc-stk-alert-btn_close');
  var alertbox_msg = document.getElementById('icc-stk-alert-msg');
  var iccLastCommand = null;
  var iccLastCommandProcessed = false;
  var stkOpenAppName = null;
  var stkLastSelectedTest = null;
  var displayTextTimeout = 40000;
  var inputTimeout = 40000;
  var defaultURL = null;
  var goBackTimer = {
    timer: null,
    timeout: 1000
  };
  var icc;

  init();

  /**
   * Recover application data
   */
  function getIccInfo() {
    var SUPPORT_INFO = 'resources/icc.json';
    var xhr = new XMLHttpRequest();
    xhr.onerror = function() {
      debug('Failed to fetch icc.json: ', xhr.statusText);
    };
    xhr.onload = function loadIccInfo() {
      if (xhr.status === 0 || xhr.status === 200) {
        defaultURL = xhr.response.defaultURL;
        debug('default URL: ', defaultURL);
      }
    };
    xhr.open('GET', SUPPORT_INFO, true); // async
    xhr.responseType = 'json';
    xhr.send();
  }

  /**
   * Init STK UI
   */
  function init() {
    if (!window.navigator.mozMobileConnection) {
      return;
    }

    icc = window.navigator.mozMobileConnection.icc;

    icc.onstksessionend = function handleSTKSessionEnd(event) {
      updateMenu();
    };

    document.getElementById('icc-stk-app-back').onclick = stkResGoBack;
    document.getElementById('icc-stk-help-exit').onclick = updateMenu;

    window.onunload = function() {
      responseSTKCommand({
        resultCode: icc.STK_RESULT_NO_RESPONSE_FROM_USER
      }, true);
    };

    icc.addEventListener('stkcommand', function do_handleSTKCmd(event) {
      handleSTKCommand(event.command);
    });
    window.addEventListener('stkasynccommand',
      function do_handleAsyncSTKCmd(event) {
        handleSTKCommand(event.detail.command);
      });

    /**
     * Open STK main application
     */
    iccMenuItem.onclick = function onclick() {
      updateMenu();
    };

    // Load STK apps
    updateMenu();

    // XXX https://bugzilla.mozilla.org/show_bug.cgi?id=844727
    // We should use Settings.settingsCache first
    var settings = Settings.mozSettings;
    var lock = settings.createLock();
    // Update displayTextTimeout with settings parameter
    var reqDisplayTimeout = lock.get('icc.displayTextTimeout');
    reqDisplayTimeout.onsuccess = function icc_getDisplayTimeout() {
      displayTextTimeout = reqDisplayTimeout.result['icc.displayTextTimeout'];
    };

    // Update inputTimeout with settings parameter
    var reqInputTimeout = lock.get('icc.inputTextTimeout');
    reqInputTimeout.onsuccess = function icc_getInputTimeout() {
      inputTimeout = reqInputTimeout.result['icc.inputTextTimeout'];
    };

    getIccInfo();
  }

  function stkResTerminate() {
    iccLastCommandProcessed = true;
    responseSTKCommand({
      resultCode: icc.STK_RESULT_UICC_SESSION_TERM_BY_USER
    });
  }

  function stkResGoBack() {
    iccLastCommandProcessed = true;
    responseSTKCommand({
      resultCode: icc.STK_RESULT_BACKWARD_MOVE_BY_USER
    });
    // We'll return to settings if no STK response received in a grace period
    goBackTimer.timer = setTimeout(function() {
      var page = document.location.protocol + '//' +
        document.location.host + '/index.html#root';
      debug('page: ', page);
      window.location.replace(page);
    }, goBackTimer.timeout);
  };

  function stkCancelGoBack() {
    if (goBackTimer.timer) {
      window.clearTimeout(goBackTimer.timer);
      goBackTimer.timer = null;
    }
  }

  /**
   * Updates the STK header buttons
   */
  function setSTKScreenType(type) {
    var exit = document.getElementById('icc-stk-exit');
    var back = document.getElementById('icc-stk-app-back');
    var helpExit = document.getElementById('icc-stk-help-exit');

    switch (type) {
      case STK_SCREEN_MAINMENU:
        exit.classList.remove('hidden');
        back.classList.add('hidden');
        helpExit.classList.add('hidden');
        break;

      case STK_SCREEN_HELP:
        exit.classList.add('hidden');
        back.classList.add('hidden');
        helpExit.classList.remove('hidden');
        break;

      default:  // STK_SCREEN_DEFAULT
        exit.classList.add('hidden');
        back.classList.remove('hidden');
        helpExit.classList.add('hidden');
    }
  }

  /**
   * Send Terminal Response : UICC SESSION TERMINATED BY USER
   */
  function sendSessionEndTROnFocusLose() {
    if (document.mozHidden)
      responseSTKCommand({
        resultCode: icc.STK_RESULT_UICC_SESSION_TERM_BY_USER
      });
  }

  /**
   * Response ICC Command
   */
  function responseSTKCommand(response, force) {
    if (!force && (!iccLastCommand || !iccLastCommandProcessed)) {
      debug('sendStkResponse NO COMMAND TO RESPONSE. Ignoring');
      return;
    }

    debug('sendStkResponse to command: ', iccLastCommand);
    debug('sendStkResponse -- # response = ', response);

    icc.sendStkResponse(iccLastCommand, response);
    iccLastCommand = null;
    iccLastCommandProcessed = false;
  }

  /**
   * Handle ICC Commands
   */
  function handleSTKCommand(command) {
    debug('STK Proactive Command:', command);
    iccLastCommand = command;
    var options = command.options;

    stkCancelGoBack();

    // By default a generic screen
    setSTKScreenType(STK_SCREEN_DEFAULT);

    reopenSettings();

    switch (command.typeOfCommand) {
      case icc.STK_CMD_SELECT_ITEM:
        updateSelection(command);
        openSTKApplication();
        iccLastCommandProcessed = true;
        break;

      case icc.STK_CMD_GET_INKEY:
      case icc.STK_CMD_GET_INPUT:
        updateInput(command);
        iccLastCommandProcessed = true;
        break;

      case icc.STK_CMD_DISPLAY_TEXT:
        debug(' STK:Show message: ', command);
        if (options.responseNeeded) {
          iccLastCommandProcessed = true;
          responseSTKCommand({
            resultCode: icc.STK_RESULT_OK
          });
          displayText(command, null);
        } else {
          displayText(command, function(userCleared) {
            debug('Display Text, cb: ', command);
            iccLastCommandProcessed = true;
            if (command.options.userClear && !userCleared) {
              debug('No response from user (Timeout)');
              responseSTKCommand({
                resultCode: icc.STK_RESULT_NO_RESPONSE_FROM_USER
              });
            } else {
              debug('User closed the alert');
              responseSTKCommand({
                resultCode: icc.STK_RESULT_OK
              });
            }
          });
        }
        break;

      case icc.STK_CMD_SET_UP_IDLE_MODE_TEXT:
        iccLastCommandProcessed = true;
        responseSTKCommand({
          resultCode: icc.STK_RESULT_OK
        });
        displayNotification(command);
        break;

      case icc.STK_CMD_REFRESH:
        iccLastCommandProcessed = true;
        responseSTKCommand({
          resultCode: icc.STK_RESULT_OK
        });
        clearNotification();
        break;

      case icc.STK_CMD_SEND_SMS:
      case icc.STK_CMD_SEND_SS:
      case icc.STK_CMD_SEND_USSD:
      case icc.STK_CMD_SEND_DTMF:
        debug(' STK:Send message: ', command);
        iccLastCommandProcessed = true;
        responseSTKCommand({
          resultCode: icc.STK_RESULT_OK
        });
        if (options.text) {
          debug('display text' + options.text);
          command.options.userClear = true;
          displayText(command);
        }
        break;

      case icc.STK_CMD_SET_UP_CALL:
        debug(' STK:Setup Phone Call. Number: ' + options.address);
        var confirmed = true;
        if (options.confirmMessage) {
          confirmed = confirm(options.confirmMessage);
        }
        iccLastCommandProcessed = true;
        responseSTKCommand({
          hasConfirmed: confirmed,
          resultCode: icc.STK_RESULT_OK
        });
        if (options.callMessage) {
          alert(options.callMessage);
        }
        break;

      case icc.STK_CMD_LAUNCH_BROWSER:
        debug(' STK:Setup Launch Browser. URL: ' + options.url);
        iccLastCommandProcessed = true;
        responseSTKCommand({
          resultCode: icc.STK_RESULT_OK
        });
        showURL(options);
        break;

      case icc.STK_CMD_SET_UP_EVENT_LIST:
        debug(' STK:SetUp Event List. Events list: ' + options.eventList);
        processSTKEvents(options.eventList);
        iccLastCommandProcessed = true;
        responseSTKCommand({ resultCode: icc.STK_RESULT_OK });
        break;

      case icc.STK_CMD_PLAY_TONE:
        debug(' STK:Play Tone: ', options);
        playTone(options);
        break;

      default:
        debug('STK Message not managed... response OK');
        iccLastCommandProcessed = true;
        responseSTKCommand({
          resultCode: icc.STK_RESULT_OK
        });
    }
  }

  /**
   * Process STK Events
   */
  function processSTKEvents(eventList) {
    for (var evt in eventList) {
      debug(' STK Registering event: ' + JSON.stringify(eventList[evt]));
      switch (eventList[evt]) {
      case icc.STK_EVENT_TYPE_MT_CALL:
      case icc.STK_EVENT_TYPE_CALL_CONNECTED:
      case icc.STK_EVENT_TYPE_CALL_DISCONNECTED:
        debug(' STK: Registering to communications changes event');
        var comm = window.navigator.mozTelephony;
        comm.addEventListener('callschanged', handleCallsChangedEvent);
        break;
      case icc.STK_EVENT_TYPE_LOCATION_STATUS:
        debug(' STK: Registering to location changes event');
        var conn = window.navigator.mozMobileConnection;
        conn.addEventListener('voicechange', handleLocationStatusEvent);
        conn.addEventListener('datachange', handleLocationStatusEvent);
        break;
      case icc.STK_EVENT_TYPE_USER_ACTIVITY:
      case icc.STK_EVENT_TYPE_IDLE_SCREEN_AVAILABLE:
      case icc.STK_EVENT_TYPE_CARD_READER_STATUS:
      case icc.STK_EVENT_TYPE_LANGUAGE_SELECTION:
      case icc.STK_EVENT_TYPE_BROWSER_TERMINATION:
      case icc.STK_EVENT_TYPE_DATA_AVAILABLE:
      case icc.STK_EVENT_TYPE_CHANNEL_STATUS:
      case icc.STK_EVENT_TYPE_SINGLE_ACCESS_TECHNOLOGY_CHANGED:
      case icc.STK_EVENT_TYPE_DISPLAY_PARAMETER_CHANGED:
      case icc.STK_EVENT_TYPE_LOCAL_CONNECTION:
      case icc.STK_EVENT_TYPE_NETWORK_SEARCH_MODE_CHANGED:
      case icc.STK_EVENT_TYPE_BROWSING_STATUS:
      case icc.STK_EVENT_TYPE_FRAMES_INFORMATION_CHANGED:
        debug(' [DEBUG] STK TODO event: ', eventList[evt]);
        break;
      }
    }
  }

  /**
   * Handle Location change Events
   */
  function handleLocationStatusEvent(evt) {
    if (evt.type != 'voicechange') {
      return;
    }
    var conn = window.navigator.mozMobileConnection;
    debug(' STK Location changed to MCC=' + conn.iccInfo.mcc +
      ' MNC=' + conn.iccInfo.mnc +
      ' LAC=' + conn.voice.cell.gsmLocationAreaCode +
      ' CellId=' + conn.voice.cell.gsmCellId +
      ' Status/Connected=' + conn.voice.connected +
      ' Status/Emergency=' + conn.voice.emergencyCallsOnly);
    var status = icc.STK_SERVICE_STATE_UNAVAILABLE;
    if (conn.voice.connected) {
      status = icc.STK_SERVICE_STATE_NORMAL;
    } else if (conn.voice.emergencyCallsOnly) {
      status = icc.STK_SERVICE_STATE_LIMITED;
    }
    // MozStkLocationEvent
    icc.sendStkEventDownload({
      eventType: STK_EVENT_TYPE_LOCATION_STATUS,
      locationStatus: status,
      locationInfo: {
        mcc: conn.iccInfo.mcc,
        mnc: conn.iccInfo.mnc,
        gsmLocationAreaCode: conn.voice.cell.gsmLocationAreaCode,
        gsmCellId: conn.voice.cell.gsmCellId
      }
    });
  }

  /**
   * Handle Call Events
   */
  function handleCallsChangedEvent(evt) {
    if (evt.type != 'callschanged') {
      return;
    }
    debug(' STK Communication changed - ' + evt.type);
    window.navigator.mozTelephony.calls.forEach(function callIterator(call) {
      debug(' STK:CALLS State change: ' + call.state);
      var outgoing = call.state == 'incoming';
      if (call.state == 'incoming') {
        // MozStkCallEvent
        icc.sendStkEventDownload({
          eventType: icc.STK_EVENT_TYPE_MT_CALL,
          number: call.number,
          isIssuedByRemote: outgoing,
          error: null
        });
      }
      call.addEventListener('error', function callError(err) {
        // MozStkCallEvent
        icc.sendStkEventDownload({
          eventType: icc.STK_EVENT_TYPE_CALL_DISCONNECTED,
          number: call.number,
          error: err
        });
      });
      call.addEventListener('statechange', function callStateChange() {
        debug(' STK:CALL State Change: ' + call.state);
        switch (call.state) {
          case 'connected':
            // MozStkCallEvent
            icc.sendStkEventDownload({
              eventType: icc.STK_EVENT_TYPE_CALL_CONNECTED,
              number: call.number,
              isIssuedByRemote: outgoing
            });
            break;
          case 'disconnected':
            call.removeEventListener('statechange', callStateChange);
            // MozStkCallEvent
            icc.sendStkEventDownload({
              eventType: icc.STK_EVENT_TYPE_CALL_DISCONNECTED,
              number: call.number,
              isIssuedByRemote: outgoing,
              error: null
            });
            break;
        }
      });
    });
  }

  /**
   * Navigate through all available STK applications
   */
  function updateMenu() {
    debug('Showing STK main menu');
    stkOpenAppName = null;

    stkCancelGoBack();

    var reqApplications =
      window.navigator.mozSettings.createLock().get('icc.applications');
    reqApplications.onsuccess = function icc_getApplications() {
      var json = reqApplications.result['icc.applications'];
      var menu = json && JSON.parse(json);
      clearList();

      setSTKScreenType(STK_SCREEN_MAINMENU);

      if (!menu || !menu.items ||
        (menu.items.length == 1 && menu.items[0] === null)) {
        debug('No STK available - hide & exit');
        document.getElementById('icc-mainheader').hidden = true;
        document.getElementById('icc-mainentry').hidden = true;
        return;
      }

      debug('STK Main App Menu title: ' + menu.title);
      debug('STK Main App Menu default item: ' + menu.defaultItem);

      iccMenuItem.textContent = menu.title;
      showTitle(menu.title);
      menu.items.forEach(function(menuItem) {
        debug('STK Main App Menu item: ' + menuItem.text + ' # ' +
              menuItem.identifier);
        iccStkList.appendChild(buildMenuEntry({
          id: 'stk-menuitem-' + menuItem.identifier,
          text: menuItem.text,
          onclick: onMainMenuItemClick,
          attributes: [['stk-menu-item-identifier', menuItem.identifier]]
        }));
      });

      // Optional Help menu
      if (menu.isHelpAvailable) {
        iccStkList.appendChild(buildMenuEntry({
          id: 'stk-helpmenuitem',
          text: _('operatorServices-helpmenu'),
          onclick: showHelpMenu,
          attributes: []
        }));
      }
    };
  }

  function onMainMenuItemClick(event) {
    var identifier = event.target.getAttribute('stk-menu-item-identifier');
    debug('sendStkMenuSelection: ', identifier);
    icc.sendStkMenuSelection(identifier, false);
    stkLastSelectedTest = event.target.textContent;
    stkOpenAppName = stkLastSelectedTest;
  }

  function showHelpMenu(event) {
    debug('Showing STK help menu');
    stkOpenAppName = null;

    var reqApplications =
      window.navigator.mozSettings.createLock().get('icc.applications');
    reqApplications.onsuccess = function icc_getApplications() {
      var menu = JSON.parse(reqApplications.result['icc.applications']);
      clearList();

      setSTKScreenType(STK_SCREEN_HELP);

      iccMenuItem.textContent = menu.title;
      showTitle(_('operatorServices-helpmenu'));
      menu.items.forEach(function(menuItem) {
        debug('STK Main App Help item: ' + menuItem.text + ' # ' +
              menuItem.identifier);
        iccStkList.appendChild(buildMenuEntry({
          id: 'stk-helpitem-' + menuItem.identifier,
          text: menuItem.text,
          onclick: onMainMenuHelpItemClick,
          attributes: [['stk-help-item-identifier', menuItem.identifier]]
        }));
      });
    };
  }

  function onMainMenuHelpItemClick(event) {
    var identifier = event.target.getAttribute('stk-help-item-identifier');
    debug('sendStkHelpMenuSelection: ', identifier);
    icc.sendStkMenuSelection(identifier, true);
    stkLastSelectedTest = event.target.textContent;
    stkOpenAppName = stkLastSelectedTest;
  }

  /**
   * Navigate through the STK application options
   */
  function updateSelection(command) {
    var menu = command.options;

    debug('Showing STK menu');
    clearList();

    debug('STK App Menu title: ' + menu.title);
    debug('STK App Menu default item: ' + menu.defaultItem);

    showTitle(menu.title);
    menu.items.forEach(function(menuItem) {
      debug('STK App Menu item: ' + menuItem.text + ' # ' +
        menuItem.identifier);
      iccStkList.appendChild(buildMenuEntry({
        id: 'stk-menuitem-' + menuItem.identifier,
        text: menuItem.text,
        onclick: onSelectOptionClick.bind(null, command),
        attributes: [['stk-select-option-identifier', menuItem.identifier]]
      }));
    });
  }

  function onSelectOptionClick(command, event) {
    var identifier = event.target.getAttribute('stk-select-option-identifier');
    responseSTKCommand({
      resultCode: icc.STK_RESULT_OK,
      itemIdentifier: identifier
    });
    stkLastSelectedTest = event.target.textContent;
  }

  function calculateDurationInMS(timeUnit, timeInterval) {
    var timeout = timeInterval;
    switch (timeUnit) {
      case icc.STK_TIME_UNIT_MINUTE:
        timeout *= 3600000;
        break;
      case icc.STK_TIME_UNIT_SECOND:
        timeout *= 1000;
        break;
      case icc.STK_TIME_UNIT_TENTH_SECOND:
        timeout *= 100;
        break;
    }
    return timeout;
  }

  /**
   * Show an INPUT box requiring data
   * Command options like:
   * { 'options': {
   *   'text':'Caption String','minLength':3,'maxLength':15,'isAlphabet':true}}
   */
  function updateInput(command) {
    var options = command.options;

    debug('Showing STK input box');
    clearList();
    showTitle(stkLastSelectedTest);

    debug('STK Input title: ' + options.text);

    document.addEventListener('mozvisibilitychange',
        sendSessionEndTROnFocusLose, true);
    var li = document.createElement('li');
    var p = document.createElement('p');
    p.id = 'stk-item-title';
    p.classList.add('multiline_title');
    p.textContent = options.text;
    li.appendChild(p);

    var input = document.createElement('input');
    input.id = 'stk-item-input';
    input.maxLength = options.maxLength;
    input.placeholder = options.text;
    if (options.isAlphabet) {
      input.type = 'text';
    } else {
      input.type = 'tel';
    }
    if (options.defaultText) {
      input.value = options.defaultText;
    }
    if (options.isYesNoRequired) {
      input.type = 'checkbox';
    }
    if (options.hidden) {
      input.type = 'hidden';
    }
    li.appendChild(input);
    iccStkList.appendChild(li);

    var timeoutInUse = options.duration;
    var inputTimeOutID = setTimeout(function() {
      debug('No response from user (Timeout)');
      responseSTKCommand({
        resultCode: icc.STK_RESULT_NO_RESPONSE_FROM_USER
      });
    }, timeoutInUse ? calculateDurationInMS(options.duration) : inputTimeout);

    li = document.createElement('li');
    var label = document.createElement('label');
    var button = document.createElement('button');
    button.id = 'stk-item-ok';
    button.textContent = 'Ok';
    button.disabled = !checkInputLengthValid(input.value.length,
                                              options.minLength,
                                              options.maxLength);
    button.onclick = function(event) {
      if (inputTimeOutID) {
        clearTimeout(inputTimeOutID);
        inputTimeOutID = null;
      }
      var value = document.getElementById('stk-item-input').value;
      responseSTKCommand({
        resultCode: icc.STK_RESULT_OK,
        input: value
      });
    };

    input.onkeyup = function(event) {
      if (inputTimeOutID) {
        clearTimeout(inputTimeOutID);
        inputTimeOutID = null;
      }
      button.disabled = !checkInputLengthValid(input.value.length,
                                              options.minLength,
                                              options.maxLength);
    };

    label.appendChild(button);
    li.appendChild(label);
    iccStkList.appendChild(li);

    // Help
    if (options.isHelpAvailable) {
      li = document.createElement('li');
      label = document.createElement('label');
      var buttonHelp = document.createElement('button');
      buttonHelp.id = 'stk-item-help';
      buttonHelp.textContent = _('operatorServices-help');
      buttonHelp.onclick = function(event) {
        responseSTKCommand({
          resultCode: icc.STK_RESULT_HELP_INFO_REQUIRED
        });
      };
      label.appendChild(buttonHelp);
      li.appendChild(label);
      iccStkList.appendChild(li);
    }
  }

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

  /**
   * Display text to the user
   */
  function displayText(command, cb) {
    var options = command.options;
    var timeoutId = setTimeout(function() {
      alertbox.classList.add('hidden');
      if (cb) {
        cb(false);
      }
    }, displayTextTimeout);

    alertbox_btn.onclick = function() {
      clearTimeout(timeoutId);
      alertbox.classList.add('hidden');
      if (cb) {
        cb(true);
      }
    };

    alertbox_btnback.onclick = function() {
      clearTimeout(timeoutId);
      alertbox.classList.add('hidden');
      stkResGoBack();
    };

    alertbox_btnclose.onclick = function() {
      clearTimeout(timeoutId);
      alertbox.classList.add('hidden');
      stkResTerminate();
    };

    alertbox_msg.textContent = options.text;
    alertbox.classList.remove('hidden');
  }

  /**
   * Play tones
   */
  function playTone(options) {
    function closeToneAlert() {
      tonePlayer.pause();
      alertbox.classList.add('hidden');
    }

    debug('playTone: ', options);

    var tonePlayer = new Audio();
    var selectedPhoneSound;
    if (typeof options.tone == 'string') {
      options.tone = options.tone.charCodeAt(0);
    }
    switch (options.tone) {
      case icc.STK_TONE_TYPE_DIAL_TONE:
        selectedPhoneSound = 'resources/dtmf_tones/350Hz+440Hz_200ms.ogg';
        break;
      case icc.STK_TONE_TYPE_CALLED_SUBSCRIBER_BUSY:
        selectedPhoneSound = 'resources/dtmf_tones/480Hz+620Hz_200ms.ogg';
        break;
      case icc.STK_TONE_TYPE_CONGESTION:
        selectedPhoneSound = 'resources/dtmf_tones/425Hz_200ms.ogg';
        break;
      case icc.STK_TONE_TYPE_RADIO_PATH_ACK:
      case icc.STK_TONE_TYPE_RADIO_PATH_NOT_AVAILABLE:
        selectedPhoneSound = 'resources/dtmf_tones/425Hz_200ms.ogg';
        break;
      case icc.STK_TONE_TYPE_ERROR:
        selectedPhoneSound =
            'resources/dtmf_tones/950Hz+1400Hz+1800Hz_200ms.ogg';
        break;
      case icc.STK_TONE_TYPE_CALL_WAITING_TONE:
      case icc.STK_TONE_TYPE_RINGING_TONE:
        selectedPhoneSound = 'resources/dtmf_tones/425Hz_200ms.ogg';
        break;
      case icc.STK_TONE_TYPE_GENERAL_BEEP:
        selectedPhoneSound = 'resources/dtmf_tones/400Hz_200ms.ogg';
        break;
      case icc.STK_TONE_TYPE_POSITIVE_ACK_TONE:
        selectedPhoneSound = 'resources/dtmf_tones/425Hz_200ms.ogg';
        break;
      case icc.STK_TONE_TYPE_NEGATIVE_ACK_TONE:
        selectedPhoneSound = 'resources/dtmf_tones/300Hz+400Hz+500Hz_400ms.ogg';
        break;
    }
    tonePlayer.src = selectedPhoneSound;
    tonePlayer.loop = true;

    var timeout = 0;
    if (options.duration &&
        options.duration.timeUnit != undefined &&
        options.duration.timeInterval != undefined) {
      timeout = calculateDurationInMS(options.duration.timeUnit,
        options.duration.timeInterval);
    } else if (options.timeUnit != undefined &&
        options.timeInterval != undefined) {
      timeout = calculateDurationInMS(options.timUnit, options.timeInterval);
    }
    if (timeout) {
      debug('Tone stop in (ms): ', timeout);
      setTimeout(function() {
        closeToneAlert();
        responseSTKCommand({ resultCode: icc.STK_RESULT_OK });
      }, timeout);
    }

    if (options.isVibrate == true) {
      window.navigator.vibrate([200]);
    }

    if (options.text) {
      alertbox_btn.onclick = function() {
        closeToneAlert();
        iccLastCommandProcessed = true;
        responseSTKCommand({ resultCode: icc.STK_RESULT_OK });
      };
      alertbox_btnback.onclick = function() {
        closeToneAlert();
        stkResGoBack();
      };
      alertbox_btnclose.onclick = function() {
        closeToneAlert();
        stkResTerminate();
      };
      alertbox_msg.textContent = options.text;
      alertbox.classList.remove('hidden');
    } else {
      // If no dialog is showed, we answer the STK command
      iccLastCommandProcessed = true;
      responseSTKCommand({ resultCode: icc.STK_RESULT_OK });
    }

    tonePlayer.play();
  }

  /**
   * Display text on the notifications bar and Idle screen
   */
  function displayNotification(command) {
    var options = command.options;
    NotificationHelper.send('STK', options.text, '', function() {
      alert(options.text);
    });
  }

  /**
   * Remove text on the notifications bar and Idle screen
   */
  function clearNotification() {
    // TO-DO
  }

  /**
   * Open URL
   */
  function showURL(options) {
    var url = options.url;
    if (url == null || url.length == 0) {
      url = defaultURL;
    }
    debug('Final URL to open: ' + url);
    if (url !== null && url.length !== 0) {
      if (!options.confirmMessage || confirm(options.confirmMessage)) {
        // Sanitise url just in case it doesn't start with http or https
        // the web activity won't work, so add by default the http protocol
        if (url.search('^https?://') == -1) {
          // Our url doesn't contains the protocol
          url = 'http://' + url;
        }
        openLink(url);
      }
    } else {
      alert(_('operatorService-invalid-url'));
    }
  }

  /**
   * Auxiliar methods
   */
  function showTitle(title) {
    // If the application is automatically opened (no come from main menu)
    if (!stkOpenAppName) {
      stkOpenAppName = title;
    }
    iccStkHeader.textContent = stkOpenAppName;

    // Show section
    if (stkOpenAppName != title) {
      iccStkSubheader.textContent = title;
      iccStkSubheader.parentNode.classList.remove('hiddenheader');
    } else {
      iccStkSubheader.textContent = '';
      iccStkSubheader.parentNode.classList.add('hiddenheader');
    }
  }

  function clearList() {
    while (iccStkList.hasChildNodes()) {
      iccStkList.removeChild(iccStkList.lastChild);
    }
  }

  function buildMenuEntry(entry) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.id = entry.id;
    entry.attributes.forEach(function attrIterator(attr) {
      a.setAttribute(attr[0], attr[1]);
    });
    a.textContent = entry.text;
    a.onclick = entry.onclick;
    li.appendChild(a);
    return li;
  }

  /**
   * Open settings application with ICC section opened
   */
  function openSTKApplication() {
    document.location.hash = 'icc';
    window.navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
      var app = evt.target.result;
      app.launch('settings');
    };
  };
})();
