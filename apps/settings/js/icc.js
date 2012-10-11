/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  /**
   * Constants. Set in config.json file
   */
  var displayTextTimeout;
  var DEBUG;

  /**
   * Debug method
   */
  function debug(msg) {
    if (DEBUG) {
      console.log('[DEBUG] STKUI: ' + msg);
    }
  }

  /**
   * Init
   */
  var iccMenuItem = document.getElementById('iccMenuItem');
  var iccStkList = document.getElementById('icc-stk-list');
  var iccStkHeader = document.getElementById('icc-stk-header');
  var iccStkSubheader = document.getElementById('icc-stk-subheader');
  var alertbox = document.getElementById('icc-stk-alert');
  var alertbox_btn = document.getElementById('icc-stk-alert-btn');
  var alertbox_msg = document.getElementById('icc-stk-alert-msg');
  var iccLastCommand = null;
  var iccLastCommandProcessed = false;
  var stkOpenAppName = null;
  var stkLastSelectedTest = null;
  var icc;

  /**
   * Load configuration data or use default values
   */
  var req = utilities.config.load('/config.json');
  req.onload = function(configData) {
    DEBUG = configData.iccDebugEnabled;
    displayTextTimeout = configData.iccDisplayTextTimeout;
    init();
  }
  req.onerror = function(code) {
    window.console.error('STK: Error while loading config file:', code);
    DEBUG = false;
    displayTextTimeout = 10000;
    init();
  }

  /**
   * Init STK UI
   */
  function init() {
    if (navigator.mozMobileConnection) {
      icc = navigator.mozMobileConnection.icc;

      icc.onstksessionend = function handleSTKSessionEnd(event) {
        updateMenu();
      };

      document.getElementById('icc-stk-app-back').onclick = function goBack() {
        responseSTKCommand({
          resultCode: icc.STK_RESULT_BACKWARD_MOVE_BY_USER
        });
      };

      window.onunload = function() {
        responseSTKCommand({
          resultCode: icc.STK_RESULT_NO_RESPONSE_FROM_USER
        }, true);
      };

      navigator.mozSetMessageHandler('icc-stkcommand', handleSTKCommand);
    }

    /**
     * Open STK main application
     */
    iccMenuItem.onclick = function onclick() {
      updateMenu();
    };
  }

  /**
   * Response ICC Command
   */
  function responseSTKCommand(response, force) {
    if (!force && (!iccLastCommand || !iccLastCommandProcessed)) {
      return debug('sendStkResponse NO COMMAND TO RESPONSE. Ignoring');
    }

    debug('sendStkResponse to command: ' +
      JSON.stringify(iccLastCommand) +
      ' # response = ' + JSON.stringify(response));
    icc.sendStkResponse(iccLastCommand, response);
    iccLastCommand = null;
    iccLastCommandProcessed = false;
  }

  /**
   * Handle ICC Commands
   */
  function handleSTKCommand(command) {
    debug('STK Proactive Command:' + JSON.stringify(command));
    iccLastCommand = command;
    var options = command.options;

    switch (command.typeOfCommand) {
      case icc.STK_CMD_SET_UP_MENU:
        window.asyncStorage.setItem('stkMainAppMenu', options);
        updateMenu();
        iccLastCommandProcessed = true;
        responseSTKCommand({
          resultCode: icc.STK_RESULT_OK
        });
        break;

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
        debug(' STK:Show message: ' + JSON.stringify(command));
        if (options.responseNeeded) {
          iccLastCommandProcessed = true;
          responseSTKCommand({
            resultCode: icc.STK_RESULT_OK
          });
          displayText(command, null);
        } else {
          displayText(command, function(userCleared) {
            debug('Display Text, cb: ' + JSON.stringify(command));
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

      case icc.STK_CMD_SEND_SMS:
      case icc.STK_CMD_SEND_SS:
      case icc.STK_CMD_SEND_USSD:
        debug(' STK:Send message: ' + JSON.stringify(command));
        iccLastCommandProcessed = true;
        responseSTKCommand({
          resultCode: icc.STK_RESULT_OK
        });
        // TODO: Show a spinner instead the message (UX decission).
        // Stop it on any other command
        break;

      case icc.STK_CMD_SET_UP_CALL:
        debug(' STK:Setup Phone Call. Number: ' + options.address);
        var msg = '';
        if (options.confirmMessage) {
          msg += options.confirmMessage;
        }
        var confirmed = confirm(msg + ' ' + options.address);
        iccLastCommandProcessed = true;
        responseSTKCommand({
          hasConfirmed: confirmed,
          resultCode: icc.STK_RESULT_OK
        });
        break;

      case icc.STK_CMD_LAUNCH_BROWSER:
        debug(' STK:Setup Launch Browser. URL: ' + options.url);
        iccLastCommandProcessed = true;
        responseSTKCommand({
          resultCode: icc.STK_RESULT_OK
        });
        if (confirm(options.confirmMessage)) {
          openURL(options.url);
        }
        break;

      default:
        debug('STK Message not managed ... response OK');
        alert('[DEBUG] TODO: ' + JSON.stringify(command));
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

    window.asyncStorage.getItem('stkMainAppMenu', function(menu) {
      clearList();

      document.getElementById('icc-stk-exit').classList.remove('hidden');
      document.getElementById('icc-stk-app-back').classList.add('hidden');

      if (!menu) {
        var _ = window.navigator.mozL10n.get;
        debug('STK Main App Menu not available.');
        var li = document.createElement('li');
        var p = document.createElement('p');
        p.textContent = _('stkAppsNotAvailable');
        p.className = 'description';
        li.appendChild(p);
        iccStkList.appendChild(li);
        return;
      }

      debug('STK Main App Menu title:', menu.title);
      debug('STK Main App Menu default item:', menu.defaultItem);

      iccMenuItem.textContent = menu.title;
      showTitle(menu.title);
      menu.items.forEach(function(menuItem) {
        debug('STK Main App Menu item:' + menuItem.text + ' # ' +
              menuItem.identifier);
        iccStkList.appendChild(buildMenuEntry({
          id: 'stk-menuitem-' + menuItem.identifier,
          text: menuItem.text,
          onclick: onMainMenuItemClick,
          attributes: [['stk-menu-item-identifier', menuItem.identifier]]
        }));
      });
    });
  }

  function onMainMenuItemClick(event) {
    var identifier = event.target.getAttribute('stk-menu-item-identifier');
    debug('sendStkMenuSelection: ' + JSON.stringify(identifier));
    icc.sendStkMenuSelection(identifier, false);
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

    document.getElementById('icc-stk-exit').classList.add('hidden');
    document.getElementById('icc-stk-app-back').classList.remove('hidden');

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

    var li = document.createElement('li');
    var p = document.createElement('p');
    p.id = 'stk-item-' + 'title';
    p.textContent = options.text;
    if (options.minLength && options.maxLength) {
      p.textContent += ' [' + options.minLength + '-' + options.maxLength + ']';
    }
    li.appendChild(p);

    var input = document.createElement('input');
    input.id = 'stk-item-input';
    input.maxLength = options.maxLength;
    input.placeholder = options.text;
    if (options.isAlphabet) {
      input.type = 'text';
    } else {
      input.type = 'number';
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

    li = document.createElement('li');
    var label = document.createElement('label');
    var button = document.createElement('button');
    button.id = 'stk-item-' + 'ok';
    button.textContent = 'Ok';
    if (options.minLength) {
      button.disabled = true;
    }
    button.onclick = function(event) {
      var value = document.getElementById('stk-item-input').value;
      responseSTKCommand({
        resultCode: icc.STK_RESULT_OK,
        input: value
      });
    };

    input.onkeyup = function(event) {
      button.disabled = (input.value.length < options.minLength) ||
                        (input.value.length > options.maxLength);
    };

    label.appendChild(button);
    li.appendChild(label);
    iccStkList.appendChild(li);
  }

  /**
   * Display text to the user
   */
  function displayText(command, cb) {
    var options = command.options;
    if (!options.userClear) {
    var timeoutId = setTimeout(function() {
        alertbox.classList.add('hidden');
        if (cb) {
          cb(false);
        }
      },
      displayTextTimeout);
    }

    alertbox_btn.onclick = function() {
      clearTimeout(timeoutId);
      alertbox.classList.add('hidden');
      if (cb) {
        cb(true);
      }
    };

    alertbox_msg.textContent = options.text;
    alertbox.classList.remove('hidden');
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
    navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
      var app = evt.target.result;
      app.launch('settings');
    };
  };

})();
