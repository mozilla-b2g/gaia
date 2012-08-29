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
    console.log("STK Proactive Command:", JSON.stringify(command));
    switch (command.typeOfCommand) {
      case icc.STK_CMD_SET_UP_MENU:
        stkMainAppMenu = command.options;
        icc.sendStkResponse(command, { resultCode: icc.STK_RESULT_OK });
        break;
      case icc.STK_CMD_SELECT_ITEM:
        updateSelection(command);
        break;
    }
  }

  function updateMainAppMenu() {
    console.log("Showing STK main app menu");
    while (iccStkAppsList.hasChildNodes()) {
      iccStkAppsList.removeChild(iccStkAppsList.lastChild);
    }

    if (!stkMainAppMenu) {
      console.log("STK Main App Menu not available.");
      var li = document.createElement("li");
      li.textContent = _("stkAppsNotAvailable");
      iccStkAppsList.appendChild(li);
      return;
    }
    console.log("STK Main App Menu title:", stkMainAppMenu.title);
    console.log("STK Main App Menu default item:", stkMainAppMenu.defaultItem);
    stkMainAppMenu.items.forEach(function (menuItem) {
      console.log("STK Main App Menu item:", menuItem.text, menuItem.identifer);
      var li = document.createElement("li");
      li.id = "stk-menuitem-" + menuItem.identifier;
      li.setAttribute("stk-menuitem-identifier", menuItem.identifier);
      li.textContent = menuItem.text;
      li.onclick = onMenuItemClick;
      iccStkAppsList.appendChild(li);
    });
  }

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

  function onMenuItemClick(event) {
    var identifier = event.target.getAttribute("stk-menuitem-identifier");
    icc.sendStkMenuSelection(identifier, false);
  }

  function onSelectOptionClick(command, event) {
    var identifier = event.target.getAttribute("stk-selectoption-identifier");
    icc.sendStkRepsonse(command, {resultCode: icc.STK_RESULT_OK,
                                  itemIdentifier: identifier});
  }

  iccMenuItem.onclick = function onclick() {
    updateMainAppMenu();
  };

})();
