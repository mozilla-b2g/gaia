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
  var inputTimeout = 40000;
  var goBackTimer = {
    timer: null,
    timeout: 1000
  };
  var icc;

  init();

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
    // Update inputTimeout with settings parameter
    var reqInputTimeout = lock.get('icc.inputTextTimeout');
    reqInputTimeout.onsuccess = function icc_getInputTimeout() {
      inputTimeout = reqInputTimeout.result['icc.inputTextTimeout'];
    };
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
      Settings.currentPanel = '#root';
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

      default:
        debug('STK Message not managed... response OK');
        iccLastCommandProcessed = true;
        responseSTKCommand({
          resultCode: icc.STK_RESULT_OK
        });
    }
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
    if (options.hideInput) {
      input.type = 'password';
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
      if (input.type === 'tel') {
        // Removing unauthorized characters
        console.log('TEL keypad. Remove unauthorized characters: ' +
          input.value);
        input.value = input.value.replace(/[()-]/g,'');
        console.log('TEL keypad. Final entry: ' + input.value);
      }
      button.disabled = !checkInputLengthValid(input.value.length,
                                              options.minLength,
                                              options.maxLength);
    };

    label.appendChild(button);
    li.appendChild(label);
    iccStkList.appendChild(li);
    input.focus();

    // Help
    if (options.isHelpAvailable) {
      li = document.createElement('li');
      label = document.createElement('label');
      var buttonHelp = document.createElement('button');
      buttonHelp.id = 'stk-item-help';
      buttonHelp.textContent = _('operatorServices-help');
      buttonHelp.dataset.l10nId = 'operatorServices-help';
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
    Settings.currentPanel = '#icc';
    window.navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
      var app = evt.target.result;
      app.launch('settings');
    };
  };
})();
