/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  var iccManager = window.navigator.mozIccManager;
  function getIcc(iccId) {
    DUMP('ICC Getting ICC for ' + iccId);
    return iccManager.getIccById(iccId);
  }

  var _ = navigator.mozL10n.get;

  // Consts
  const STK_SCREEN_DEFAULT = 0x00;
  const STK_SCREEN_MAINMENU = 0x01;
  const STK_SCREEN_HELP = 0x02;

  /**
   * Init
   */
  var iccStkList = document.getElementById('icc-stk-list');
  var iccStkHeader = document.getElementById('icc-stk-header');
  var iccStkSubheader = document.getElementById('icc-stk-subheader');
  var exitHelp = document.getElementById('icc-stk-help-exit');
  var backButton = document.getElementById('icc-stk-app-back');
  var exitButton = document.getElementById('icc-stk-exit');
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
  init();

  /**
   * Init STK UI
   */
  function init() {
    window.addEventListener('stkasynccommand',
      function do_handleAsyncSTKCmd(event) {
        handleSTKMessage(event.detail.message);
      });

    window.addEventListener('stkmenuselection',
      function do_handleAsyncSTKCmd(event) {
        updateMenu(event.detail.menu);
      });
  }

  function addCloseNotificationsEvents(message) {
    document.addEventListener('visibilitychange', function() {
      if (document.hidden && Settings.currentPanel == '#icc') {
        stkResTerminate(message);
      }
    }, false);
    window.onbeforeunload = function() {
      responseSTKCommand(message, {
        resultCode: iccManager.STK_RESULT_NO_RESPONSE_FROM_USER
      }, true);
    };
  }

  function stkResTerminate(message) {
    Settings.currentPanel = '#root';
    responseSTKCommand(message, {
      resultCode: iccManager.STK_RESULT_UICC_SESSION_TERM_BY_USER
    }, true);
  }

  function stkResGoBack(message) {
    responseSTKCommand(message, {
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

  function stkResNoResponse(message) {
    var reqTimerSelect =
      window.navigator.mozSettings.createLock().get('icc.selectTimeout');
    reqTimerSelect.onsuccess = function icc_getTimerSelectSuccess() {
      selectTimer.timeout = reqTimerSelect.result['icc.selectTimeout'];
      selectTimer.timer = setTimeout(function() {
        responseSTKCommand(message, {
         resultCode: iccManager.STK_RESULT_NO_RESPONSE_FROM_USER
        }, true);
        stkResGoBack(message);
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
    switch (type) {
      case STK_SCREEN_MAINMENU:
        exitButton.classList.remove('hidden');
        backButton.classList.add('hidden');
        exitHelp.classList.add('hidden');
        break;

      case STK_SCREEN_HELP:
        exitButton.classList.add('hidden');
        backButton.classList.add('hidden');
        exitHelp.classList.remove('hidden');
        break;

      default:  // STK_SCREEN_DEFAULT
        exitButton.classList.add('hidden');
        backButton.classList.remove('hidden');
        exitHelp.classList.add('hidden');
    }
  }

  /**
   * Response ICC Command
   */
  function responseSTKCommand(message, response) {
    DUMP('sendStkResponse to message: ', message);
    DUMP('sendStkResponse -- # response = ', response);

    getIcc(message.iccId).sendStkResponse(message.command, response);
  }

  /**
   * Handle ICC Messages
   */
  function handleSTKMessage(message) {
    DUMP('STK Proactive Message:', message);

    stkCancelGoBack();

    // By default a generic screen
    setSTKScreenType(STK_SCREEN_DEFAULT);

    reopenSettings();

    switch (message.command.typeOfCommand) {
      case iccManager.STK_CMD_SELECT_ITEM:
        addCloseNotificationsEvents(message);
        updateSelection(message);
        Settings.currentPanel = '#icc';
        backButton.onclick = function _back() {
          stkResGoBack(message);
        };
        break;

      default:
        DUMP('STK Message not managed... response OK');
        responseSTKCommand(message, {
          resultCode: iccManager.STK_RESULT_OK
        });
    }
  }

  /**
   * Navigate through all available STK applications
   */
  function updateMenu(menu) {
    DUMP('Showing STK main menu: ', menu);
    stkOpenAppName = null;

    stkCancelGoBack();

    clearList();
    setSTKScreenType(STK_SCREEN_MAINMENU);

    if (!menu || !menu.entries || !menu.entries.items ||
      (menu.entries.items.length == 1 && menu.entries.items[0] === null)) {
      return;
    }

    DUMP('STK Main App Menu title: ' + menu.entries.title);
    DUMP('STK Main App Menu default item: ' + menu.entries.defaultItem);

    showTitle(menu.entries.title);
    menu.entries.items.forEach(function(menuItem) {
      DUMP('STK Main App Menu item: ' + menuItem.text + ' # ' +
            menuItem.identifier);
      iccStkList.appendChild(buildMenuEntry({
        id: 'stk-menuitem-' + menuItem.identifier,
        text: menuItem.text,
        nai: _(menuItem.nai),
        onclick: onMainMenuItemClick,
        attributes: [
          ['stk-menu-item-identifier', menuItem.identifier],
          ['stk-menu-item-iccId', menu.iccId]
        ]
      }));
    });

    // Optional Help menu
    if (menu.entries.isHelpAvailable) {
      iccStkList.appendChild(buildMenuEntry({
        id: 'stk-helpmenuitem',
        text: _('operatorServices-helpmenu'),
        onclick: function __onHelpClick__(event) {
          showHelpMenu(menu, event);
        },
        attributes: []
      }));
    }

    getIcc(menu.iccId).onstksessionend = function handleSTKSessionEnd(event) {
      updateMenu(menu);
      Settings.currentPanel = '#icc';
    };
  }

  function onMainMenuItemClick(event) {
    var iccId = event.target.getAttribute('stk-menu-item-iccId');
    var identifier = event.target.getAttribute('stk-menu-item-identifier');
    DUMP('sendStkMenuSelection: ', identifier);

    getIcc(iccId).sendStkMenuSelection(identifier, false);
    stkLastSelectedTest = event.target.textContent;
    stkOpenAppName = stkLastSelectedTest;
  }

  function showHelpMenu(menu, event) {
    DUMP('Showing STK help menu');
    stkOpenAppName = null;

    clearList();

    setSTKScreenType(STK_SCREEN_HELP);

    showTitle(_('operatorServices-helpmenu'));
    menu.entries.items.forEach(function(menuItem) {
      DUMP('STK Main App Help item: ' + menuItem.text + ' # ' +
            menuItem.identifier);
      iccStkList.appendChild(buildMenuEntry({
        id: 'stk-helpitem-' + menuItem.identifier,
        text: menuItem.text,
        onclick: onMainMenuHelpItemClick,
        attributes: [
          ['stk-help-item-identifier', menuItem.identifier],
          ['stk-menu-item-iccId', menu.iccId]
        ]
      }));
    });

    exitHelp.onclick = function _closeHelp() {
      updateMenu(menu);
    };
  }

  function onMainMenuHelpItemClick(event) {
    var iccId = event.target.getAttribute('stk-menu-item-iccId');
    var identifier = event.target.getAttribute('stk-help-item-identifier');
    DUMP('sendStkHelpMenuSelection: ', identifier);

    getIcc(iccId).sendStkMenuSelection(identifier, true);
    stkLastSelectedTest = event.target.textContent;
    stkOpenAppName = stkLastSelectedTest;
  }

  /**
   * Navigate through the STK application options
   */
  function updateSelection(message) {
    var menu = message.command.options;

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
        onclick: function onSelectOptionClick(event) {
          onSelectOption(message, event);
        },
        attributes: [['stk-select-option-identifier', menuItem.identifier]]
      }));
    });

    stkResNoResponse(message);
  }

  function onSelectOption(message, event) {
    var identifier = event.target.getAttribute('stk-select-option-identifier');
    responseSTKCommand(message, {
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
})();

window.dispatchEvent(new CustomEvent('iccPageLoaded', {
  detail: {}
}));
