/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(){
  var icc;
  if (navigator.mozMobileConnection) {
    icc = navigator.mozMobileConnection.icc;
    icc.onstksessionend = handleSTKSessionEnd;
    navigator.mozSetMessageHandler('icc-stkcommand', handleSTKCommand);
  }

  var iccMenuItem = document.getElementById('iccMenuItem');
  var iccStkAppsList = document.getElementById('icc-stk-apps');
  var iccStkSelection = document.getElementById('icc-stk-selection');
  var iccLastCommand = null;

  function handleSTKCommand(command) {
    console.log('STK Proactive Command:', JSON.stringify(command));
    switch (command.typeOfCommand) {
      case icc.STK_CMD_SET_UP_MENU:
        window.asyncStorage.setItem('stkMainAppMenu', command.options);
        updateMenu();
        icc.sendStkResponse(command, { resultCode: icc.STK_RESULT_OK });
        break;
      case icc.STK_CMD_SELECT_ITEM:
        updateSelection(command);
        break;
      case icc.STK_CMD_GET_INKEY:
      case icc.STK_CMD_GET_INPUT:
        updateInput(command);
        break;
      case icc.STK_CMD_DISPLAY_TEXT:
        console.log(' STK:Show message: ' + JSON.stringify(command));
        icc.sendStkResponse(command, { resultCode: icc.STK_RESULT_OK });
        alert(command.options.text);
        break;
      case icc.STK_CMD_SEND_SMS:
      case icc.STK_CMD_SEND_SS:
      case icc.STK_CMD_SEND_USSD:
        console.log(' STK:Send message: ' + JSON.stringify(command));
        icc.sendStkResponse(command, { resultCode: icc.STK_RESULT_OK });
        // TODO: Show a spinner instead the message (UX decission). Stop it on any other command
        break;
      case icc.STK_CMD_SET_UP_CALL:
        console.log(' STK:Setup Phone Call. Number: ' + command.options.address);
        if (confirm(command.options.confirmMessage)) {
          icc.sendStkResponse(command, { hasConfirmed: true, resultCode: icc.STK_RESULT_OK });
        } else {
          icc.sendStkResponse(command, { hasConfirmed: false, resultCode: icc.STK_RESULT_OK });
        }
        break;
      case icc.STK_CMD_LAUNCH_BROWSER:
        console.log(' STK:Setup Launch Browser. URL: ' + command.options.url);
        icc.sendStkResponse(command, { resultCode: icc.STK_RESULT_OK });
        if (confirm(command.options.confirmMessage)) {
          var options = {
            name: 'view',
            data: {
              type: 'url',
              url: command.options.url
            }
          };

          try {
            var activity = new MozActivity(options);
          } catch (e) {
            console.log('WebActivities unavailable? : ' + e);
          }
        }
        break;
      default:
        console.log('STK Message not managed ... response OK');
        icc.sendStkResponse(command, { resultCode: icc.STK_RESULT_OK });
        alert('[DEBUG] TODO: ' + JSON.stringify(command));
    }
  }

  /**
   * Handle session end
   */
  function handleSTKSessionEnd(event) {
    updateMenu();
  }

  /**
   * Navigate through all available STK applications
   */
  function updateMenu() {
    console.log('Showing STK main menu');
    window.asyncStorage.getItem('stkMainAppMenu', function(menu) {
      while (iccStkAppsList.hasChildNodes()) {
        iccStkAppsList.removeChild(iccStkAppsList.lastChild);
      }

      if (!menu) {
        console.log('STK Main App Menu not available.');
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.textContent = _('stkAppsNotAvailable');
        li.appendChild(a);
        iccStkAppsList.appendChild(li);
        return;
      }

      console.log('STK Main App Menu title:', menu.title);
      console.log('STK Main App Menu default item:', menu.defaultItem);

      document.getElementById('iccMenuItem').textContent = menu.title;
      document.getElementById('icc-stk-operator-header').textContent = menu.title;
      menu.items.forEach(function (menuItem) {
        console.log('STK Main App Menu item:', menuItem.text, menuItem.identifer);
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.id = 'stk-menuitem-' + menuItem.identifier;
        a.setAttribute('stk-menuitem-identifier', menuItem.identifier);
        a.textContent = menuItem.text;
        a.onclick = onMainMenuItemClick;
        li.appendChild(a);
        iccStkAppsList.appendChild(li);
      });
    });
  }

  function onMainMenuItemClick(event) {
    var identifier = event.target.getAttribute('stk-menuitem-identifier');
    var appName = event.target.textContent;
    console.log('sendStkMenuSelection: ' + JSON.stringify(identifier));
    document.getElementById('icc-stk-selection-header').textContent = appName;
    icc.sendStkMenuSelection(identifier, false);

    openDialog('icc-stk-app', function submit() {
      icc.sendStkResponse(iccLastCommand, { resultCode: icc.STK_RESULT_OK });
      iccLastCommand = null;
      updateMenu();
    });
  }

  /**
   * Navigate through the STK application options
   */
  function updateSelection(command) {
    var menu = command.options;
    iccLastCommand = command;

    console.log('Showing STK menu');
    while (iccStkSelection.hasChildNodes()) {
      iccStkSelection.removeChild(iccStkSelection.lastChild);
    }

    console.log('STK App Menu title:', menu.title);
    console.log('STK App Menu default item:', menu.defaultItem);
    menu.items.forEach(function (menuItem) {
      console.log('STK App Menu item:', menuItem.text, menuItem.identifer);
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.id = 'stk-menuitem-' + menuItem.identifier;
      a.setAttribute('stk-selectoption-identifier', menuItem.identifier);
      a.textContent = menuItem.text;
      a.onclick = onSelectOptionClick.bind(null, command);
      li.appendChild(a);
      iccStkSelection.appendChild(li);
    });
  }

  function onSelectOptionClick(command, event) {
    var identifier = event.target.getAttribute('stk-selectoption-identifier');
    console.log('sendStkResponse: ' + JSON.stringify(identifier) + ' # ' + JSON.stringify(command));
    icc.sendStkResponse(command, {resultCode: icc.STK_RESULT_OK,
                                  itemIdentifier: identifier});
  }

  /**
   * Show an INPUT box requiring data
   * Command options like:
   * { 'options': {
   *   'text':'Caption String','minLength':3,'maxLength':15,'isAlphabet':true}}
   */
  function updateInput(command) {
    iccLastCommand = command;

    console.log('Showing STK input box');
    while (iccStkSelection.hasChildNodes()) {
      iccStkSelection.removeChild(iccStkSelection.lastChild);
    }

    console.log('STK Input title:', command.options.text);

    var li = document.createElement('li');
    var p = document.createElement('p');
    p.id = 'stk-item-' + 'title';
    p.textContent = command.options.text;
    li.appendChild(p);

    var input = document.createElement('input');
    input.id = 'stk-item-input';
    input.maxLength = command.options.maxLength;
    input.placeholder = command.options.text;
    if (command.options.isAlphabet)
      input.type = 'text';
    else
      input.type = 'number';
    if (command.options.defaultText)
      input.value = command.options.defaultText;
    if (command.options.isYesNoRequired)
      input.type = 'checkbox';
    if (command.options.hidden)
      input.type = 'hidden';
    li.appendChild(input);
    iccStkSelection.appendChild(li);

    li = document.createElement('li');
    var label = document.createElement('label');
    var button = document.createElement('button');
    button.id = 'stk-item-' + 'ok';
    button.textContent = 'Ok';
    button.onclick = function(event) {
      var value = document.getElementById('stk-item-input').value;
      icc.sendStkResponse(command, {resultCode: icc.STK_RESULT_OK,
                                    input: value});
    };
    label.appendChild(button);
    li.appendChild(label);
    iccStkSelection.appendChild(li);
  }

  /**
   * Open STK applications
   */
  iccMenuItem.onclick = function onclick() {
    updateMenu();
  };

})();
