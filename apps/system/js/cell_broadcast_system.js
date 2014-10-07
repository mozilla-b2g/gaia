'use strict';
/* global CarrierInfoNotifier */
/* global MobileOperator */

var CellBroadcastSystem = {

  _settingsDisabled: [],
  _settingsKey: 'ril.cellbroadcast.disabled',

  init: function cbs_init() {
    var self = this;
    if (navigator && navigator.mozCellBroadcast) {
      navigator.mozCellBroadcast.onreceived = this.show.bind(this);
    }

    var settings = window.navigator.mozSettings;
    var req = settings.createLock().get(this._settingsKey);
    req.onsuccess = function() {
      self._settingsDisabled = req.result[self._settingsKey];
    };

    settings.addObserver(
      this._settingsKey, this.settingsChangedHandler.bind(this));
  },

  settingsChangedHandler: function cbs_settingsChangedHandler(event) {
    this._settingsDisabled = event.settingValue;

    if (this._hasCBSDisabled()) {
      var evt = new CustomEvent('cellbroadcastmsgchanged', { detail: null });
      window.dispatchEvent(evt);
    }
  },

  show: function cbs_show(event) {
    // XXX: check bug-926169
    // this is used to keep all tests passing while introducing multi-sim APIs
    var msg = event.message;
    var serviceId = event.serviceId || 0;
    var conn = window.navigator.mozMobileConnections[serviceId];

    if (conn &&
        conn.voice.network.mcc === MobileOperator.BRAZIL_MCC &&
        msg.messageId === MobileOperator.BRAZIL_CELLBROADCAST_CHANNEL) {
      var evt = new CustomEvent('cellbroadcastmsgchanged',
        { detail: msg.body });
      window.dispatchEvent(evt);
      return;
    }

    var body = msg.body;

    // XXX: 'undefined' test until bug-1021177 lands
    if (msg.etws && (!body || (body == 'undefined'))) {
      body = navigator.mozL10n.get('cb-etws-warningType-' +
        (msg.etws.warningType ? msg.etws.warningType : 'other'));
    }

    CarrierInfoNotifier.show(body,
      navigator.mozL10n.get('cb-channel', { channel: msg.messageId }));
  },

  _hasCBSDisabled: function cbs__hasCBSDisabled() {
    var index =
      this._settingsDisabled.findIndex(disabled => (disabled === true));
    return (index >= 0);
  }
};

CellBroadcastSystem.init();
