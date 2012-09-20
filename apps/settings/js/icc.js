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
        //updateSelection(command);
        updateSelection(command);
        break;
    }
  }

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
      li.id = "stk-menuitem-" + menuItem.identifier;
      li.setAttribute("stk-menuitem-identifier", menuItem.identifier);
      li.textContent = menuItem.text;
      li.onclick = onMainMenuItemClick;
      iccStkAppsList.appendChild(li);
    });
  }

  function updateSelection(command) {
    var menu = command.options;

    console.log("Showing STK menu");
    while (iccStkAppsList.hasChildNodes()) {
      iccStkAppsList.removeChild(iccStkAppsList.lastChild);
    }

    console.log("STK App Menu title:", menu.title);
    console.log("STK App Menu default item:", menu.defaultItem);
    menu.items.forEach(function (menuItem) {
      console.log("STK App Menu item:", menuItem.text, menuItem.identifer);
      var li = document.createElement("li");
      li.id = "stk-menuitem-" + menuItem.identifier;
      li.setAttribute("stk-menuitem-identifier", menuItem.identifier);
      li.textContent = menuItem.text;
      li.onclick = onMenuItemClick.bind(null, command);
      iccStkAppsList.appendChild(li);
    });
  }
/*
  function updateSelection(command) {
    console.log("Showing selection.");
    iccStkSelectionHeader.textContent = command.options.title;
    while (iccStkSelection.hasChildNodes()) {
      iccStkSelection.removeChild(iccStkSelection.lastChild);
    }
    command.options.items.forEach(function (selectionItem) {
      var option = document.createElement("select");
      option.id = "stk-selectoption-" + selectionItem.identifier;
      option.setAttribute("stk-selectoption-identifier", selectionItem.identifier);
      option.textContent = selectionItem.text;
      option.onclick = onSelectOptionClick.bind(null, command);
      iccStkSelection.appendChild(option);
    });

    Settings.openDialog('icc-stk-selection');
  }
*/
  function onMainMenuItemClick(event) {
    var identifier = event.target.getAttribute("stk-menuitem-identifier");
    console.log("sendStkMenuSelection: " + JSON.stringify(identifier));
    icc.sendStkMenuSelection(identifier, false);
  }

  function onMenuItemClick(command, event) {
    var identifier = event.target.getAttribute("stk-menuitem-identifier");
    console.log("sendStkResponse: " + JSON.stringify(identifier) + " # " + JSON.stringify(command));
    icc.sendStkResponse(command, {resultCode: icc.STK_RESULT_OK,
                                  itemIdentifier: identifier});
  }

  function onSelectOptionClick(command, event) {
    var identifier = event.target.getAttribute("stk-selectoption-identifier");
    icc.sendStkRepsonse(command, {resultCode: icc.STK_RESULT_OK,
                                  itemIdentifier: identifier});
  }

  iccMenuItem.onclick = function onclick() {
    updateMenu();
  };

})();
