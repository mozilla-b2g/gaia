/* global AirplaneModeHelper */
'use strict';

/**
 * Singleton object that helps to enable/disable and to show card state
 * information for telephony-related items from the root in the setting app.
 */
window.TelephonyItemsHandler = (function() {
  var DATA_TYPE_SETTING = 'operatorResources.data.icon';

  var dataTypeMapping = {
    'lte' : '4G LTE',
    'ehrpd': '4G CDMA',
    'hspa+': '3.5G HSPA+',
    'hsdpa': '3.5G HSDPA',
    'hsupa': '3.5G HSDPA',
    'hspa' : '3.5G HSDPA',
    'evdo0': 'EVDO',
    'evdoa': 'EVDO',
    'evdob': 'EVDO',
    '1xrtt': '1xRTT',
    'umts' : '3G UMTS',
    'edge' : '2G EDGE',
    'is95a': '1xRTT',
    'is95b': '1xRTT',
    'gprs' : '2G GPRS'
  };

  var CARD_STATE_MAPPING = {
    'pinRequired' : 'simCardLockedMsg',
    'pukRequired' : 'simCardLockedMsg',
    'permanentBlocked': 'simCardBlockedMsg',
    'networkLocked' : 'simLockedPhone',
    'serviceProviderLocked' : 'simLockedPhone',
    'corporateLocked' : 'simLockedPhone',
    'network1Locked' : 'simLockedPhone',
    'network2Locked' : 'simLockedPhone',
    'hrpdNetworkLocked' : 'simLockedPhone',
    'ruimCorporateLocked' : 'simLockedPhone',
    'ruimServiceProviderLocked' : 'simLockedPhone',
    'unknown' : 'unknownSimCardState',
    'illegal' : 'simCardIllegal',
    'absent' : 'noSimCard',
    'null' : 'simCardNotReady',
    'ready': ''
  };

  function tih_updateDataTypeMapping() {
    var req;
    try {
      req = navigator.mozSettings.createLock().get(DATA_TYPE_SETTING) || {};
      req.onsuccess = function() {
        var dataTypeValues = req.result[DATA_TYPE_SETTING] || {};
        for (var key in dataTypeValues) {
          if (dataTypeMapping[key]) {
            dataTypeMapping[key] = dataTypeValues[key];
          }
        }
      };
      req.onerror = function() {
        console.error('Error loading ' + DATA_TYPE_SETTING + ' settings. ' +
                      req.error && req.error.name);
      };
    } catch (e) {
      console.error('Error loading ' + DATA_TYPE_SETTING + ' settings. ' + e);
    }
  }

  var _iccManager;
  var _mobileConnections;

  /**
   * Init function.
   */
  function tih_init() {
    tih_updateDataTypeMapping();
    _iccManager = window.navigator.mozIccManager;
    _mobileConnections = window.navigator.mozMobileConnections;
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

    if (AirplaneModeHelper.getStatus() !== 'disabled') {
      tih_showICCCardDetails(CARD_STATE_MAPPING.null);
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
        tih_showICCCardDetails(CARD_STATE_MAPPING.absent);
        return;
      }

      var iccCard = _iccManager.getIccById(_mobileConnections[0].iccId);
      if (!iccCard) {
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
                        dataTypeMapping[_mobileConnections[0].data.type] :
                        '';
        if (dataType) {
          dataDesc.textContent += ' - ' + dataType;
        }
      } else {
        tih_showICCCardDetails(CARD_STATE_MAPPING[cardState]);
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
        tih_showICCCardDetails(CARD_STATE_MAPPING.absent);
      } else {
        // There is ICC card.
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

      if (details !== '') {
        desc.setAttribute('data-l10n-id', details);
      } else {
        desc.removeAttribute('data-l10n-id');
        desc.textContent = '';
      }
    }
  }

  // Public API.
  return {
    init: tih_init,
    handleItems: function() {
      AirplaneModeHelper.ready(function() {
        tih_handleItems();
      });
    }
  };
})();
