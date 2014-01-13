'use strict';

var CellBroadcastSystem = {

  _settingsDisabled: null,
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

    settings.addObserver(this._settingsKey,
                         this.settingsChangedHandler.bind(this));
  },

  settingsChangedHandler: function cbs_settingsChangedHandler(event) {
    this._settingsDisabled = event.settingValue;

    if (this._settingsDisabled) {
      var evt = new CustomEvent('cellbroadcastmsgchanged', { detail: null });
      window.dispatchEvent(evt);
    }
  },

  show: function cbs_show(event) {

    // XXX: check bug-926169
    // this is used to keep all tests passing while introducing multi-sim APIs
    var conn = window.navigator.mozMobileConnection ||
      window.navigator.mozMobileConnections &&
        window.navigator.mozMobileConnections[0];

    var msg = event.message;

    if (this._settingsDisabled) {
      return;
    }

    if (conn &&
        conn.voice.network.mcc === MobileOperator.BRAZIL_MCC &&
        msg.messageId === MobileOperator.BRAZIL_CELLBROADCAST_CHANNEL) {
      var evt = new CustomEvent('cellbroadcastmsgchanged',
        { detail: msg.body });
      window.dispatchEvent(evt);
      return;
    }

    CarrierInfoNotifier.show(msg.body,
      navigator.mozL10n.get('cb-channel', { channel: msg.messageId }));
  }
};

CellBroadcastSystem.init();
