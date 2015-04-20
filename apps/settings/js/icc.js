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
  // 3GPP spec: TS 11.14
  // 13.4 Type of Command and Next Action Indicator
  const STK_NEXT_ACTION_INDICATOR = {
    16: 'stkItemsNaiSetUpCall',
    17: 'stkItemsNaiSendSs',
    18: 'stkItemsNaiSendUssd',
    19: 'stkItemsNaiSendSms',
    32: 'stkItemsNaiPlayTone',
    33: 'stkItemsNaiDisplayText',
    34: 'stkItemsNaiGetInkey',
    35: 'stkItemsNaiGetInput',
    36: 'stkItemsNaiSelectItem',
    37: 'stkItemsNaiSetUpMenu',
    40: 'stkItemsNaiSetIdleModeText',
    48: 'stkItemsNaiPerformCardApdu',  // class "a"
    49: 'stkItemsNaiPowerOnCard',      // class "a"
    50: 'stkItemsNaiPowerOffCard',     // class "a"
    51: 'stkItemsNaiGetReaderStatus',  // class "a"
    64: 'stkItemsNaiOpenChannel',      // class "e"
    65: 'stkItemsNaiCloseChannel',     // class "e"
    66: 'stkItemsNaiReceiveData',      // class "e"
    67: 'stkItemsNaiSendData',         // class "e"
    68: 'stkItemsNaiGetChannelStatus', // class "e"
    96: 'Reserved',                    // for TIA/EIA-136
    129: 'stkItemsNaiEndOfTheProactiveSession'
  };

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
  var stkLastSelectedText = null;
  var goBackTimer = {
    timer: null,
    timeout: 0
  };
  var selectTimer = {
    timer: null,
    timeout: 0
  };
  var _visibilityChangeHandler = null;
  init();

  function sendVisibilityChangeEvent() {
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      app.connect('settingsstk').then(function onConnAccepted(ports) {
        DUMP('STK_Settings IAC: ' + ports);
        ports.forEach(function(port) {
          DUMP('STK_Settings IAC: ' + port);
          port.postMessage('StkMenuHidden');
        });
      }, function onConnRejected(reason) {
        DUMP('STK_Settings IAC is rejected');
        DUMP(reason);
      });
    };
  }

  function getNextActionString(nextActionList, index) {
    DUMP('STK NAL: ' + nextActionList);

    var nextActionString;
    if (nextActionList &&
        nextActionList[index] !== null &&
        nextActionList[index] !== 96 &&
        STK_NEXT_ACTION_INDICATOR[nextActionList[index]]) {
      nextActionString = STK_NEXT_ACTION_INDICATOR[nextActionList[index]];
    } else {
      nextActionString = null;
    }
    return nextActionString;
  }

  function visibilityChangeHandler() {
    if (document.hidden && Settings && Settings.currentPanel == '#icc') {
      DUMP('STK_Settings visibilityChangeHandler');
      sendVisibilityChangeEvent();
    }
  }

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

    document.addEventListener('visibilitychange',
      visibilityChangeHandler, false);
  }

  function addCloseNotificationsEvents(message) {
    function onVisibilityChange() {
      if (document.hidden && Settings && Settings.currentPanel == '#icc') {
        document.removeEventListener('visibilitychange',
          _visibilityChangeHandler, false);
        stkResTerminate(message);
      }
    }
    document.removeEventListener('visibilitychange',
      _visibilityChangeHandler, false);
    _visibilityChangeHandler = onVisibilityChange;
    document.addEventListener('visibilitychange',
      _visibilityChangeHandler, false);
    window.onbeforeunload = function() {
      responseSTKCommand(message, {
        resultCode: iccManager.STK_RESULT_NO_RESPONSE_FROM_USER
      }, true);
    };
  }

  function returnToSettingsMainMenu() {
    if (Settings) {
      Settings.currentPanel = '#root';
    }
  }

  function stkResTerminate(message) {
    returnToSettingsMainMenu();
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
        returnToSettingsMainMenu();
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
        returnToSettingsMainMenu();
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
    menu.entries.items.forEach(function(menuItem, index) {
      DUMP('STK Main App Menu item: ' + menuItem.text + ' # ' +
            menuItem.identifier);
      var nextActionString = getNextActionString(menu.entries.nextActionList,
        index);
      DUMP('STK NEXTACTION: ' + nextActionString);
      iccStkList.appendChild(buildMenuEntry({
        id: 'stk-menuitem-' + menuItem.identifier,
        text: menuItem.text,
        nai: _(nextActionString),
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
    stkLastSelectedText = event.target.textContent;
    stkOpenAppName = stkLastSelectedText;
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
    stkLastSelectedText = event.target.textContent;
    stkOpenAppName = stkLastSelectedText;
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
    menu.items.forEach(function(menuItem, index) {
      DUMP('STK App Menu item: ' + menuItem.text + ' # ' +
        menuItem.identifier);
      var nextActionString = getNextActionString(menu.nextActionList, index);
      DUMP('STK NEXTACTION: ' + nextActionString);
      iccStkList.appendChild(buildMenuEntry({
        id: 'stk-menuitem-' + menuItem.identifier,
        text: menuItem.text,
        nai: _(nextActionString),
        onclick: function onSelectOptionClick(event) {
          document.removeEventListener('visibilitychange',
            _visibilityChangeHandler, false);
          onSelectOption(message, event);
        },
        attributes: [['stk-select-option-identifier', menuItem.identifier]]
      }));
    });

    // Optional Help menu
    if (menu.isHelpAvailable) {
      iccStkList.appendChild(buildMenuEntry({
        id: 'stk-helpmenuitem',
        text: _('operatorServices-helpmenu'),
        onclick: function __onHelpClick__(event) {
          showHelpSelection(message, event);
        },
        attributes: []
      }));
    }

    stkResNoResponse(message);
  }

  function onSelectOption(message, event) {
    var identifier = event.target.getAttribute('stk-select-option-identifier');
    var options = message.command.options;
    var hasIcon = options.items && options.items.some(function(item) {
      return item.icons || item.iconSelfExplanatory;
    });
    responseSTKCommand(message, {
      resultCode: ((options.iconSelfExplanatory || options.icons || hasIcon) ?
        iccManager.STK_RESULT_PRFRMD_ICON_NOT_DISPLAYED :
        iccManager.STK_RESULT_OK),
      itemIdentifier: identifier
    });
    stkLastSelectedText = event.target.textContent;
  }

  function showHelpSelection(message, event) {
    var menu = message.command.options;

    DUMP('Showing STK help menu');
    stkOpenAppName = null;

    clearList();

    setSTKScreenType(STK_SCREEN_HELP);

    showTitle(_('operatorServices-helpmenu'));
    menu.items.forEach(function(menuItem) {
      DUMP('STK Main App Help item: ' + menuItem.text + ' # ' +
            menuItem.identifier);
      iccStkList.appendChild(buildMenuEntry({
        id: 'stk-helpitem-' + menuItem.identifier,
        text: menuItem.text,
        onclick: function onSelectOptionClick(event) {
          onSelectionHelpItemClick(message, event);
        },
        attributes: [
          ['stk-help-item-identifier', menuItem.identifier],
          ['stk-menu-item-iccId', menu.iccId]
        ]
      }));
    });

    exitHelp.onclick = function _closeHelp() {
      updateSelection(message);
    };
  }

  function onSelectionHelpItemClick(message, event) {
    var iccId = event.target.getAttribute('stk-menu-item-iccId');
    var identifier = event.target.getAttribute('stk-help-item-identifier');
    DUMP('sendStkHelpMenuSelection: ', identifier);

    responseSTKCommand(message, {
      resultCode: iccManager.STK_RESULT_HELP_INFO_REQUIRED,
      itemIdentifier: identifier
    });
    stkLastSelectedText = event.target.textContent;
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
    a.href = '#icc';
    li.appendChild(a);
    return li;
  }
})();

window.dispatchEvent(new CustomEvent('iccPageLoaded', {
  detail: {}
}));
