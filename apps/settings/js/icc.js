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
  var iccLastCommand = null;
  var iccLastCommandProcessed = false;
  var stkOpenAppName = null;
  var stkLastSelectedTest = null;
  var goBackTimer = {
    timer: null,
    timeout: 0
  };
  var selectTimer = {
    timer: null,
    timeout: 0
  };
  var icc;
  var iccManager;

  init();

  /**
   * Init STK UI
   */
  function init() {
    // See bug 932134
    // To keep all tests passed while introducing multi-sim APIs, in bug 928325
    // we use IccHelper. Stop using IccHelper after the APIs land.
    icc = IccHelper;
    iccManager = window.navigator.mozIccManager;

    icc.onstksessionend = function handleSTKSessionEnd(event) {
      updateMenu();
      Settings.currentPanel = '#icc';
    };

    document.getElementById('icc-stk-app-back').onclick = stkResGoBack;
    document.getElementById('icc-stk-help-exit').onclick = updateMenu;

    document.addEventListener('visibilitychange', function() {
      if (document.hidden && Settings.currentPanel == '#icc') {
        stkResTerminate();
      }
    }, false);
    window.onbeforeunload = function() {
      responseSTKCommand({
        resultCode: iccManager.STK_RESULT_NO_RESPONSE_FROM_USER
      }, true);
    };

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
  }

  function stkResTerminate() {
    Settings.currentPanel = '#root';
    iccLastCommandProcessed = true;
    responseSTKCommand({
      resultCode: iccManager.STK_RESULT_UICC_SESSION_TERM_BY_USER
    }, true);
  }

  function stkResGoBack() {
    iccLastCommandProcessed = true;
    responseSTKCommand({
      resultCode: iccManager.STK_RESULT_BACKWARD_MOVE_BY_USER
    });
    // We'll return to settings if no STK response received in a grace period
    var reqTimerGoBack =
      window.navigator.mozSettings.createLock().get('icc.goBackTimeout');
    reqTimerGoBack.onsuccess = function icc_getTimerGoBackSuccess() {
      goBackTimer.timeout = reqTimerGoBack.result['icc.goBackTimeout'];
      goBackTimer.timer = setTimeout(function() {
        Settings.currentPanel = '#root';
      }, goBackTimer.timeout);
    };
  };

  function stkResNoResponse() {
    var reqTimerSelect =
      window.navigator.mozSettings.createLock().get('icc.selectTimeout');
    reqTimerSelect.onsuccess = function icc_getTimerSelectSuccess() {
      selectTimer.timeout = reqTimerSelect.result['icc.selectTimeout'];
      selectTimer.timer = setTimeout(function() {
        iccLastCommandProcessed = true;
        responseSTKCommand({
         resultCode: iccManager.STK_RESULT_NO_RESPONSE_FROM_USER
        }, true);
        stkResGoBack();
      }, selectTimer.timeout);
    };
  };

  function stkCancelGoBack() {
    if (goBackTimer.timer) {
      window.clearTimeout(goBackTimer.timer);
      goBackTimer.timer = null;
    }
    if (selectTimer.timer) {
      window.clearTimeout(selectTimer.timer);
      selectTimer.timer = null;
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
   * Response ICC Command
   */
  function responseSTKCommand(response, force) {
    if (!force && (!iccLastCommand || !iccLastCommandProcessed)) {
      DUMP('sendStkResponse NO COMMAND TO RESPONSE. Ignoring');
      return;
    }

    DUMP('sendStkResponse to command: ', iccLastCommand);
    DUMP('sendStkResponse -- # response = ', response);

    icc.sendStkResponse(iccLastCommand, response);
    iccLastCommand = null;
    iccLastCommandProcessed = false;
  }

  /**
   * Handle ICC Commands
   */
  function handleSTKCommand(command) {
    DUMP('STK Proactive Command:', command);
    iccLastCommand = command;
    var options = command.options;

    stkCancelGoBack();

    // By default a generic screen
    setSTKScreenType(STK_SCREEN_DEFAULT);

    reopenSettings();

    switch (command.typeOfCommand) {
      case iccManager.STK_CMD_SELECT_ITEM:
        updateSelection(command);
        openSTKApplication();
        iccLastCommandProcessed = true;
        break;

      default:
        DUMP('STK Message not managed... response OK');
        iccLastCommandProcessed = true;
        responseSTKCommand({
          resultCode: iccManager.STK_RESULT_OK
        });
    }
  }

  /**
   * Navigate through all available STK applications
   */
  function updateMenu() {
    DUMP('Showing STK main menu');
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
        DUMP('No STK available - hide & exit');
        document.getElementById('icc-mainheader').hidden = true;
        document.getElementById('icc-mainentry').hidden = true;
        return;
      }

      DUMP('STK Main App Menu title: ' + menu.title);
      DUMP('STK Main App Menu default item: ' + menu.defaultItem);

      iccMenuItem.textContent = menu.title;
      showTitle(menu.title);
      menu.items.forEach(function(menuItem) {
        DUMP('STK Main App Menu item: ' + menuItem.text + ' # ' +
              menuItem.identifier);
        iccStkList.appendChild(buildMenuEntry({
          id: 'stk-menuitem-' + menuItem.identifier,
          text: menuItem.text,
          nai: _(menuItem.nai),
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

    stkResNoResponse();
  }

  function onMainMenuItemClick(event) {
    var identifier = event.target.getAttribute('stk-menu-item-identifier');
    DUMP('sendStkMenuSelection: ', identifier);
    icc.sendStkMenuSelection(identifier, false);
    stkLastSelectedTest = event.target.textContent;
    stkOpenAppName = stkLastSelectedTest;
  }

  function showHelpMenu(event) {
    DUMP('Showing STK help menu');
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
        DUMP('STK Main App Help item: ' + menuItem.text + ' # ' +
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
    DUMP('sendStkHelpMenuSelection: ', identifier);
    icc.sendStkMenuSelection(identifier, true);
    stkLastSelectedTest = event.target.textContent;
    stkOpenAppName = stkLastSelectedTest;
  }

  /**
   * Navigate through the STK application options
   */
  function updateSelection(command) {
    var menu = command.options;

    DUMP('Showing STK menu');
    clearList();

    DUMP('STK App Menu title: ' + menu.title);
    DUMP('STK App Menu default item: ' + menu.defaultItem);

    showTitle(menu.title);
    menu.items.forEach(function(menuItem) {
      DUMP('STK App Menu item: ' + menuItem.text + ' # ' +
        menuItem.identifier);
      iccStkList.appendChild(buildMenuEntry({
        id: 'stk-menuitem-' + menuItem.identifier,
        text: menuItem.text,
        nai: _(menuItem.nai),
        onclick: onSelectOptionClick.bind(null, command),
        attributes: [['stk-select-option-identifier', menuItem.identifier]]
      }));
    });

    stkResNoResponse();
  }

  function onSelectOptionClick(command, event) {
    var identifier = event.target.getAttribute('stk-select-option-identifier');
    responseSTKCommand({
      resultCode: iccManager.STK_RESULT_OK,
      itemIdentifier: identifier
    });
    stkLastSelectedTest = event.target.textContent;
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
      iccStkSubheader.classList.remove('hidden');
    } else {
      iccStkSubheader.textContent = '';
      iccStkSubheader.parentNode.classList.add('hiddenheader');
      iccStkSubheader.classList.add('hidden');
    }
  }

  function clearList() {
    while (iccStkList.hasChildNodes()) {
      iccStkList.removeChild(iccStkList.lastChild);
    }
  }

  function buildMenuEntry(entry) {
    var li = document.createElement('li');

    if (entry.nai) {
      var small = document.createElement('small');
      small.textContent = entry.nai;
      li.appendChild(small);
    }

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
