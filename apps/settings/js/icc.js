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
      li.textContent = _("stkAppsNotAvailable");
      iccStkAppsList.appendChild(li);
      return;
    }

    if (!menu) {
      console.log("STK Main App Menu not available.");
      var li = document.createElement("li");
      li.textContent = _("stkAppsNotAvailable");
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
      li.id = "stk-menuitem-" + menuItem.identifier;
      li.setAttribute("stk-selectoption-identifier", menuItem.identifier);
      li.textContent = menuItem.text;
      li.onclick = onSelectOptionClick.bind(null, command);
      iccStkSelection.appendChild(li);
    });
    Settings.openDialog('icc-stk-app');
  }

  function onMainMenuItemClick(event) {
    var identifier = event.target.getAttribute("stk-menuitem-identifier");
    console.log("sendStkMenuSelection: " + JSON.stringify(identifier));
    icc.sendStkMenuSelection(identifier, false);
  }

  function onSelectOptionClick(command, event) {
    var identifier = event.target.getAttribute("stk-selectoption-identifier");
    console.log("sendStkResponse: " + JSON.stringify(identifier) + " # " + JSON.stringify(command));
    icc.sendStkResponse(command, {resultCode: icc.STK_RESULT_OK,
                                  itemIdentifier: identifier});
  }

  iccMenuItem.onclick = function onclick() {
    updateMenu();
  };

})();
