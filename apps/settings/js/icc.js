/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(){
  /**
   * Debug method
   */
  var DEBUG = false;
  function debug(msg) {
    if (DEBUG) {
      console.log("[DEBUG] STKUI: " + msg);
    }
  }

  /**
   * Init
   */
  var iccMenuItem = document.getElementById('iccMenuItem');
  var iccStkHeader = document.getElementById('icc-stk-header');
  var iccStkSubheader = document.getElementById('icc-stk-subheader');
  var iccStkList = document.getElementById('icc-stk-list');
  var iccLastCommand = null;
  var stkOpenAppName = null;
  var stkLastSelectedTest = null;
  var icc;
  if (navigator.mozMobileConnection) {
    icc = navigator.mozMobileConnection.icc;

    icc.onstksessionend = function handleSTKSessionEnd(event) {
      updateMenu();
    };

    navigator.mozSetMessageHandler('icc-stkcommand', handleSTKCommand);

    document.getElementById('icc-stk-app-back').onclick = function goBack() {
      responseSTKCommand({ resultCode: icc.STK_RESULT_BACKWARD_MOVE_BY_USER });
    };

    window.onunload = function() {
      responseSTKCommand({ resultCode: icc.STK_RESULT_NO_RESPONSE_FROM_USER });
    };
  }

  /**
   * Open STK applications
   */
  iccMenuItem.onclick = function onclick() {
    updateMenu();
  };

  /**
   * Response ICC Command
   */
  function responseSTKCommand(response) {
    debug("sendStkResponse to command: " +
      JSON.stringify(iccLastCommand) +
      " # response = " + JSON.stringify(response));
    icc.sendStkResponse(iccLastCommand, response);
    iccLastCommand = null;
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
        responseSTKCommand({ resultCode: icc.STK_RESULT_OK });
        break;

      case icc.STK_CMD_SELECT_ITEM:
        updateSelection(command);
        break;

      case icc.STK_CMD_GET_INKEY:
      case icc.STK_CMD_GET_INPUT:
        updateInput(command);
        break;

      case icc.STK_CMD_DISPLAY_TEXT:
        debug(' STK:Show message: ' + JSON.stringify(command));
        responseSTKCommand({ resultCode: icc.STK_RESULT_OK });
        alert(options.text);
        break;

      case icc.STK_CMD_SEND_SMS:
      case icc.STK_CMD_SEND_SS:
      case icc.STK_CMD_SEND_USSD:
        debug(' STK:Send message: ' + JSON.stringify(command));
        responseSTKCommand({ resultCode: icc.STK_RESULT_OK });
        // TODO: Show a spinner instead the message (UX decission).
        // Stop it on any other command
        break;

      case icc.STK_CMD_SET_UP_CALL:
        debug(' STK:Setup Phone Call. Number: ' + options.address);
        var confirmed = confirm(options.confirmMessage);
        responseSTKCommand({ hasConfirmed: confirmed,
                             resultCode: icc.STK_RESULT_OK });
        break;

      case icc.STK_CMD_LAUNCH_BROWSER:
        debug(' STK:Setup Launch Browser. URL: ' + options.url);
        responseSTKCommand({ resultCode: icc.STK_RESULT_OK });
        if (confirm(options.confirmMessage)) {
          var options = {
            name: 'view',
            data: {
              type: 'url',
              url: options.url
            }
          };

          try {
            var activity = new MozActivity(options);
          } catch (e) {
            debug('WebActivities unavailable? : ' + e);
          }
        }
        break;

      default:
        debug('STK Message not managed ... response OK');
        responseSTKCommand({ resultCode: icc.STK_RESULT_OK });
        alert('[DEBUG] TODO: ' + JSON.stringify(command));
    }
  }

  /**
   * Navigate through all available STK applications
   */
  function updateMenu() {
    debug('Showing STK main menu');
    stkOpenAppName = null;

    window.asyncStorage.getItem('stkMainAppMenu', function(menu) {
      clearDOMList();

      document.getElementById('icc-stk-exit').style.display = 'block';
      document.getElementById('icc-stk-app-back').style.display = 'none';

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
      menu.items.forEach(function (menuItem) {
        debug('STK Main App Menu item:' + menuItem.text + ' # ' +
              menuItem.identifier);
        iccStkList.appendChild(getDOMMenuEntry({
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
    clearDOMList();

    document.getElementById('icc-stk-exit').style.display = 'none';
    document.getElementById('icc-stk-app-back').style.display = 'block';

    debug('STK App Menu title: ' + menu.title);
    debug('STK App Menu default item: ' + menu.defaultItem);

    showTitle(menu.title);
    menu.items.forEach(function (menuItem) {
      debug('STK App Menu item: ' + menuItem.text + ' # ' + menuItem.identifier);
      iccStkList.appendChild(getDOMMenuEntry({
        id: 'stk-menuitem-' + menuItem.identifier,
        text: menuItem.text,
        onclick: onSelectOptionClick.bind(null, command),
        attributes: [['stk-select-option-identifier', menuItem.identifier]]
      }));
    });
  }

  function onSelectOptionClick(command, event) {
    var identifier = event.target.getAttribute('stk-select-option-identifier');
    responseSTKCommand({resultCode: icc.STK_RESULT_OK,
                        itemIdentifier: identifier});
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
    clearDOMList();
    showTitle(stkLastSelectedTest);

    debug('STK Input title: ' + options.text);

    var li = document.createElement('li');
    var p = document.createElement('p');
    p.id = 'stk-item-' + 'title';
    p.textContent = options.text;
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
    button.onclick = function(event) {
      var value = document.getElementById('stk-item-input').value;
      responseSTKCommand({resultCode: icc.STK_RESULT_OK,
                          input: value});
    };
    label.appendChild(button);
    li.appendChild(label);
    iccStkList.appendChild(li);
  }

  /**
   * Auxiliar methods
   */
  function showTitle(title) {
    // If the application is automatically opened (no come from main menu)
    if(!stkOpenAppName) {
      stkOpenAppName = title;
    }
    iccStkHeader.textContent = stkOpenAppName;

    // Show section
    if(stkOpenAppName != title) {
      iccStkSubheader.textContent = title;
//      iccStkSubheader.parentNode.style.display = 'block';
    } else {
      iccStkSubheader.textContent = '';
//      iccStkSubheader.parentNode.style.display = 'none';
    }
  }

  function clearDOMList() {
    while (iccStkList.hasChildNodes()) {
      iccStkList.removeChild(iccStkList.lastChild);
    }
  }

  function getDOMMenuEntry(entry) {
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
})();
