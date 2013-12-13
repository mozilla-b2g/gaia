/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Singleton object that helps to populate and manage the 'Select a SIM card'
 * panel in the cell and data settings panel.
 */
var IccHandlerForCarrierSettings = (function(window, document, undefined) {
  /** Card state mapping const. */
  var CARDSTATE_MAPPING = {
   'pinRequired' : 'simCardLockedMsg',
   'pukRequired' : 'simCardLockedMsg',
   'networkLocked' : 'simLockedPhone',
   'serviceProviderLocked' : 'simLockedPhone',
   'corporateLocked' : 'simLockedPhone',
   'unknown' : 'unknownSimCardState',
   'illegal' : 'simCardIllegal',
   'absent' : 'noSimCard',
   'null' : 'simCardNotReady',
   'ready': ''
  };

  var DATA_TYPE_MAPPING = {
    'lte' : '4G LTE',
    'ehrpd': '4G CDMA',
    'hspa+': '3.5G HSPA+',
    'hsdpa': '3.5G HSDPA',
    'hsupa': '3.5G HSDPA',
    'hspa' : '3.5G HSDPA',
    'evdo0': '3G CDMA',
    'evdoa': '3G CDMA',
    'evdob': '3G CDMA',
    '1xrtt': '2G CDMA',
    'umts' : '3G UMTS',
    'edge' : '2G EDGE',
    'is95a': '2G CDMA',
    'is95b': '2G CDMA',
    'gprs' : '2G GPRS'
  };

  var _ = navigator.mozL10n.get;
  var _settings = window.navigator.mozSettings;
  var _iccManager = window.navigator.mozIccManager;
  var _mobileConnections = null;


  /** Array of menu item ids. */
  var _menuItemIds = ['menuItem-carrier-sim1', 'menuItem-carrier-sim2'];

  /** Array of menu item descriptions. */
  var _menuItemDescriptions = [];

  /**
   * Init function.
   */
  function ihfcs_init() {
    _mobileConnections = window.navigator.mozMobileConnections;
    if (!_settings || !_mobileConnections || !_iccManager) {
      return;
    }
    if (DsdsSettings.getNumberOfIccSlots() === 1) {
      return;
    }

    function addListeners(iccId) {
      var eventHandler = ihfcs_showICCCardDetails.bind(null, iccId);
      var iccCard = _iccManager.getIccById(iccId);
      if (!iccCard) {
        return;
      }
      iccCard.addEventListener('cardstatechange', eventHandler);
      var mobileConnection = ihfcs_getMobileConnectionFromIccId(iccId);
      if (!mobileConnection) {
        return;
      }
      mobileConnection.addEventListener('datachange', eventHandler);
      mobileConnection.addEventListener('radiostatechange', eventHandler);
    }

    _menuItemIds.forEach(function forEachFunction(id) {
      var selector = document.getElementById(id);
      _menuItemDescriptions[_menuItemIds.indexOf(id)] =
        selector.querySelector('small');
    });

    _menuItemIds.forEach(function forEachFunction(id) {
      var selector = document.getElementById(id);
      var element = selector.querySelector('a');
      element.addEventListener('click', function eventListenerHandler() {
        DsdsSettings.setIccCardIndexForCellAndDataSettings(
          _menuItemIds.indexOf(id)
        );
      });
    });

    var numberOfIccCards = _mobileConnections.length;
    for (var i = 0; i < numberOfIccCards; i++) {
      var mobileConnection = _mobileConnections[i];
      if (!mobileConnection.iccId) {
        // TODO: this could mean there is no ICC card or the ICC card is
        // locked. If locked we would need to figure out how to check the
        // current card state.
        ihfcs_disableItems(_menuItemIds[i], true);
        continue;
      }
      ihfcs_showICCCardDetails(mobileConnection.iccId);
      addListeners(mobileConnection.iccId);
    }

    _iccManager.addEventListener('iccdetected',
      function iccDetectedHandler(evt) {
        var iccId = evt.iccId;
        ihfcs_showICCCardDetails(iccId);
        addListeners(iccId);
    });

    _iccManager.addEventListener('iccundetected',
      function iccUndetectedHandler(evt) {
        var iccId = evt.iccId;
        var eventHandler = ihfcs_showICCCardDetails.bind(null, iccId);
        var mobileConnection = ihfcs_getMobileConnectionFromIccId(iccId);
        if (!mobileConnection) {
          return;
        }
        mobileConnection.removeEventListener('datachange', eventHandler);
        mobileConnection.removeEventListener('radiostatechange', eventHandler);
    });
  }

  /**
   * Show some details (card state or carrier) of the ICC card.
   *
   * @param {String} iccId ICC id.
   */
  function ihfcs_showICCCardDetails(iccId) {
    var iccCardIndex = ihfcs_getIccCardIndex(iccId);
    var desc = _menuItemDescriptions[iccCardIndex];

    desc.style.fontStyle = 'italic';

    var mobileConnection = ihfcs_getMobileConnectionFromIccId(iccId);
    if (!mobileConnection) {
      localize(desc, '');
      ihfcs_disableItems(_menuItemIds[iccCardIndex], true);
      return;
    }

    if (mobileConnection.radioState !== 'enabled') {
      // Airplane is enabled. Well, radioState property could be changing but
      // let's disable the items during the transitions also.
      localize(desc, CARDSTATE_MAPPING['null']);
      ihfcs_disableItems(_menuItemIds[iccCardIndex], true);
      return;
    }
    if (mobileConnection.radioState === 'enabled') {
      localize(desc, '');
      ihfcs_disableItems(_menuItemIds[iccCardIndex], false);
    }

    var iccCard = _iccManager.getIccById(iccId);
    if (!iccCard) {
      localize(desc, '');
      ihfcs_disableItems(_menuItemIds[iccCardIndex], true);
      return;
    }

    var cardState = iccCard.cardState;
    if (cardState !== 'ready') {
      localize(desc, CARDSTATE_MAPPING[cardState || 'null']);
      ihfcs_disableItems(_menuItemIds[iccCardIndex], true);
      return;
    }

    desc.style.fontStyle = 'normal';

    var network = mobileConnection.voice.network;
    var iccInfo = iccCard.iccInfo;
    var carrier = network ? (network.shortName || network.longName) : null;

    if (carrier && iccInfo && iccInfo.isDisplaySpnRequired && iccInfo.spn) {
      if (iccInfo.isDisplayNetworkNameRequired && carrier !== iccInfo.spn) {
        carrier = carrier + ' ' + iccInfo.spn;
      } else {
        carrier = iccInfo.spn;
      }
    }
    desc.textContent = carrier;

    var dataType = (mobileConnection.data.connected &&
                    mobileConnection.data.type) ?
                    DATA_TYPE_MAPPING[mobileConnection.data.type] :
                    '';
    if (dataType) {
      desc.textContent += ' - ' + dataType;
    }

    ihfcs_disableItems(_menuItemIds[iccCardIndex], false);
  }

  /**
   * Disable the items listed in the panel in order to avoid user interaction.
   *
   * @param {String} id Element id from the element to disable.
   * @param {Boolean} disable This flag tells the function what to do.
   */
  function ihfcs_disableItems(id, disable) {
    var element = document.getElementById(id);
    if (disable) {
      element.setAttribute('aria-disabled', true);
    } else {
      element.removeAttribute('aria-disabled');
    }
  }

  /**
   * Helper function. Return the index of the ICC card given the ICC code in the
   * ICC card.
   *
   * @param {String} iccId The iccId code form the ICC card.
   *
   * @return {Numeric} The index.
   */
  function ihfcs_getIccCardIndex(iccId) {
    for (var i = 0; i < _mobileConnections.length; i++) {
      if (_mobileConnections[i].iccId === iccId) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Helper function. Return the mozMobileConnection for the ICC card given the
   * ICC code in the ICC card.
   *
   * @param {String} iccId The iccId code form the ICC card.
   *
   * @return {mozMobileConnection} mozMobileConnection object.
   */
  function ihfcs_getMobileConnectionFromIccId(iccId) {
    for (var i = 0; i < _mobileConnections.length; i++) {
      if (_mobileConnections[i].iccId === iccId) {
        return _mobileConnections[i];
      }
    }
    return null;
  }

  return {
    init: ihfcs_init
  };
})(this, document);

/**
 * Startup.
 */
navigator.mozL10n.ready(function loadWhenIdle() {
  var idleObserver = {
    time: 3,
    onidle: function() {
      IccHandlerForCarrierSettings.init();
      navigator.removeIdleObserver(idleObserver);
    }
  };
  navigator.addIdleObserver(idleObserver);
});
