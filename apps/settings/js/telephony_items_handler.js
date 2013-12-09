/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Singleton object that helps to enable/disable and to show card state
 * information for telephony-related items from the root in the setting app.
 */
var TelephonyItemsHandler = (function(window, document, undefined) {
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

  var CARD_STATE_MAPPING = {
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

  var _iccManager;
  var _mobileConnections;
  var _;

  /**
   * Init function.
   */
  function tih_init() {
    _iccManager = window.navigator.mozIccManager;
    _mobileConnections = window.navigator.mozMobileConnections;
    _ = window.navigator.mozL10n.get;
    if (!_mobileConnections || !_iccManager) {
      return;
    }
  }

  /**
   * Enable or disable the items according the state of the ICC card and the
   * airplane mode status. It also show a short description about the ICC card
   * status and the carrier name and the data connection type.
   */
  function tih_handleItems() {
    var itemIds = [
      'simCardManager-settings',
      'call-settings',
      'messaging-settings',
      'data-connectivity',
      'simSecurity-settings'
    ];

    if (AirplaneModeHelper.getStatus() === 'disabled') {
      tih_disableItems(false, itemIds);
    } else {
      // Airplane is enabled. Well, radioState property could be changing
      // but let's disable the items during the transitions also.
      tih_disableItems(true, itemIds);
      tih_showICCCardDetails(CARD_STATE_MAPPING['null']);
      return;
    }

    if (_mobileConnections.length === 1) {
      // Single ICC card device.
      itemIds = [
        'call-settings',
        'messaging-settings',
        'data-connectivity',
        'simSecurity-settings'
      ];
      if (!_mobileConnections[0].iccId) {
        // There is no ICC card.
        tih_disableItems(true, itemIds);
        tih_showICCCardDetails(CARD_STATE_MAPPING['absent']);
        return;
      } else {
        // There is ICC card.
        tih_disableItems(false, itemIds);
      }

      var iccCard = _iccManager.getIccById(_mobileConnections[0].iccId);
      if (!iccCard) {
        tih_disableItems(true, itemIds);
        tih_showICCCardDetails('');
        return;
      }
      itemIds = [
        'call-settings',
        'messaging-settings',
        'data-connectivity'
      ];

      var cardState = iccCard.cardState;
      if (cardState === 'ready') {
        tih_disableItems(false, itemIds);
        tih_showICCCardDetails('');

        // Card state is ready let's show carrier name and connection data type
        // for data calls for the 'Cellular & Data' menu item.
        var dataDesc = document.getElementById('data-desc');
        dataDesc.style.fontStyle = 'normal';

        var network = _mobileConnections[0].voice.network;
        var iccInfo = iccCard.iccInfo;
        var carrier = network ? (network.shortName || network.longName) : null;

        if (carrier && iccInfo && iccInfo.isDisplaySpnRequired && iccInfo.spn) {
          if (iccInfo.isDisplayNetworkNameRequired && carrier !== iccInfo.spn) {
            carrier = carrier + ' ' + iccInfo.spn;
          } else {
            carrier = iccInfo.spn;
          }
        }
        dataDesc.textContent = carrier;
        var dataType = (_mobileConnections[0].data.connected &&
                        _mobileConnections[0].data.type) ?
                        DATA_TYPE_MAPPING[_mobileConnections[0].data.type] :
                        '';
        if (dataType) {
          dataDesc.textContent += ' - ' + dataType;
        }
      } else {
        tih_disableItems(true, itemIds);
        tih_showICCCardDetails(CARD_STATE_MAPPING[cardState]);
      }

      itemIds = [
        'simSecurity-settings'
      ];
      // TODO: Figure out for what locks we should enable the SIM security
      // item.
      if ((cardState === 'ready') ||
          (cardState === 'pinRequired') ||
          (cardState === 'pukRequired')) {
        tih_disableItems(false, itemIds);
      } else {
        tih_disableItems(true, itemIds);
      }
    } else {
      // Multi ICC card device.
      itemIds = [
        'simCardManager-settings',
        'call-settings',
        'messaging-settings',
        'data-connectivity'
      ];
      if (!_mobileConnections[0].iccId &&
          !_mobileConnections[1].iccId) {
        // There is no ICC cards.
        tih_disableItems(true, itemIds);
        tih_showICCCardDetails(CARD_STATE_MAPPING['absent']);
      } else {
        // There is ICC card.
        tih_disableItems(false, itemIds);
        tih_showICCCardDetails('');
      }
    }
  }

  /**
   * Show some details (card state) of the ICC card.
   *
   * @param {String} details What to show as ICC card details.
   */
  function tih_showICCCardDetails(details) {
    var itemIds = [
      'simmanager-desc',
      'call-desc',
      'messaging-desc',
      'data-desc'
    ];
    for (var id = 0; id < itemIds.length; id++) {
      var desc = document.getElementById(itemIds[id]);
      if (!desc) {
        continue;
      }
      desc.style.fontStyle = 'italic';
      localize(desc, details);
    }
  }

  /**
   * Disable or enable a set of menu items.
   *
   * @param {Boolean} disable Flag about what to do.
   * @param {Array} itemIds Menu items id to enable/disable.
   */
  function tih_disableItems(disable, itemIds) {
    for (var id = 0; id < itemIds.length; id++) {
      var item = document.getElementById(itemIds[id]);
      if (!item) {
        continue;
      }
      if (disable) {
        item.setAttribute('aria-disabled', true);
      } else {
        item.removeAttribute('aria-disabled');
      }
    }
  }

  // Public API.
  return {
    init: tih_init,
    handleItems: tih_handleItems
  };
})(this, document);
