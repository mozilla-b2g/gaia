(function () {

  var icc;
  if (navigator.mozMobileConnection) {
    icc = navigator.mozMobileConnection.icc;
    icc.addEventListener("stkcommand", handleSTKCommand);
  }

  var _;
  window.addEventListener('localized', function wifiSettings(evt) {
    _ = navigator.mozL10n.get;
  });

  var iccMenuItem = document.getElementById("iccMenuItem");
  var iccStkAppsList = document.getElementById("icc-stk-apps");
  var iccStkSelection = document.getElementById("icc-stk-selection");
  var iccStkSelectionHeader = document.getElementById("icc-stk-selection-header");

  var stkMainAppMenu = null;
  function handleSTKCommand(event) {
    var command = event.command;
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    console.log("STK Proactive Command:", JSON.stringify(command));
    switch (command.typeOfCommand) {
      case icc.STK_CMD_SET_UP_MENU:
        stkMainAppMenu = command.options;
        updateMenu();
        icc.sendStkResponse(command, { resultCode: icc.STK_RESULT_OK });
        break;
      case icc.STK_CMD_SELECT_ITEM:
        updateSelection(command);
        break;
      case icc.STK_CMD_GET_INPUT:
        updateInput(command);
        break;
      case icc.STK_CMD_DISPLAY_TEXT:
        console.log(" *TODO* STK:Show message: " + JSON.stringify(command));
        alert(JSON.stringify(command));
        icc.sendStkResponse(command, { resultCode: icc.STK_RESULT_OK });
        break;
      default:
        console.log("STK Message not managed ... response OK");
        icc.sendStkResponse(command, { resultCode: icc.STK_RESULT_OK });
    }
  }

  /**
   * Navigate through all available STK applications
   */
  function updateMenu() {
    console.log("Showing STK main menu");
    menu=stkMainAppMenu;

    while (iccStkAppsList.hasChildNodes()) {
      iccStkAppsList.removeChild(iccStkAppsList.lastChild);
    }

    if (!menu) {
      console.log("STK Main App Menu not available.");
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.textContent = _("stkAppsNotAvailable");
      li.appendChild(a);
      iccStkAppsList.appendChild(li);
      return;
    }

    console.log("STK Main App Menu title:", menu.title);
    console.log("STK Main App Menu default item:", menu.defaultItem);

    menu.items.forEach(function (menuItem) {
      console.log("STK Main App Menu item:", menuItem.text, menuItem.identifer);
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#icc-stk-app";
      a.id = "stk-menuitem-" + menuItem.identifier;
      a.setAttribute("stk-menuitem-identifier", menuItem.identifier);
      a.textContent = menuItem.text;
      a.onclick = onMainMenuItemClick;
      li.appendChild(a);
      iccStkAppsList.appendChild(li);
    });
  }

  function onMainMenuItemClick(event) {
    var identifier = event.target.getAttribute("stk-menuitem-identifier");
    console.log("sendStkMenuSelection: " + JSON.stringify(identifier));
    icc.sendStkMenuSelection(identifier, false);
  }

  /**
   * Navigate through the STK application options
   */
  function updateSelection(command) {
    var menu = command.options;

    console.log("Showing STK menu");
    while (iccStkSelection.hasChildNodes()) {
      iccStkSelection.removeChild(iccStkSelection.lastChild);
    }
    document.getElementById('exit_iccapp').onclick = function(e) {
      icc.sendStkResponse(command, { resultCode: icc.STK_RESULT_OK })
    };

    console.log("STK App Menu title:", menu.title);
    console.log("STK App Menu default item:", menu.defaultItem);
    menu.items.forEach(function (menuItem) {
      console.log("STK App Menu item:", menuItem.text, menuItem.identifer);
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.id = "stk-menuitem-" + menuItem.identifier;
      a.setAttribute("stk-selectoption-identifier", menuItem.identifier);
      a.textContent = menuItem.text;
      a.onclick = onSelectOptionClick.bind(null, command);
      li.appendChild(a);
      iccStkSelection.appendChild(li);
    });
    Settings.openDialog('icc-stk-app');
  }

  function onSelectOptionClick(command, event) {
    var identifier = event.target.getAttribute("stk-selectoption-identifier");
    console.log("sendStkResponse: " + JSON.stringify(identifier) + " # " + JSON.stringify(command));
    icc.sendStkResponse(command, {resultCode: icc.STK_RESULT_OK,
                                  itemIdentifier: identifier});
  }

  /**
   * Show an INPUT box requiring data
   */
  function updateInput(command) {
    // "options":{"text":"Al Canal","minLength":3,"maxLength":15,"isAlphabet":true}
    console.log("Showing STK input box");
    while (iccStkSelection.hasChildNodes()) {
      iccStkSelection.removeChild(iccStkSelection.lastChild);
    }
    document.getElementById('exit_iccapp').onclick = function(e) {
      icc.sendStkResponse(command, { resultCode: icc.STK_RESULT_OK })
    };

    console.log("STK Input title:", command.options.text);

    var li = document.createElement("li");
    var a = document.createElement("a");
    a.id = "stk-item-" + "title";
    a.textContent = command.options.text;
    li.appendChild(a);
    iccStkSelection.appendChild(li);
    
    li = document.createElement("li");
    var input = document.createElement("input");
    input.id = "stk-item-input";
    input.maxLength = command.options.maxLength;
    if(command.options.isAlphabet)
      input.type = "text";
    else
      input.type = "number";
    input.placeholder = command.options.text;
    li.appendChild(input);
    iccStkSelection.appendChild(li);

    li = document.createElement("li");
    var button = document.createElement("button");
    button.id = "stk-item-" + "ok";
    button.innerHTML = "Ok";
    button.onclick = function(event) {
      value = document.getElementById('stk-item-input').value;
      icc.sendStkResponse(command, {resultCode: icc.STK_RESULT_OK,
                                    input: value});

    };
    li.appendChild(button);
    iccStkSelection.appendChild(li);

    li = document.createElement("li");
    button = document.createElement("button");
    button.id = "stk-item-" + "reset";
    button.innerHTML = "Reset";
    button.onclick = function() {
      document.getElementById('stk-item-input').value = "";
    }
    li.appendChild(button);
    iccStkSelection.appendChild(li);
    
    Settings.openDialog('icc-stk-app');
  }

  /**
   * Open STK applications
   */
  iccMenuItem.onclick = function onclick() {
    updateMenu();
  };

})();
