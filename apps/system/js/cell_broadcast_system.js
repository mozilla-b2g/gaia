'use strict';
/* global CarrierInfoNotifier */
/* global MobileOperator */
/* global Service */

(function(exports) {

  /**
   * CellBroadcastSystem
   * @class CellBroadcastSystem
   * @requires CarrierInfoNotifier
   * @requires MobileOperator
   */
  function CellBroadcastSystem() {}

  CellBroadcastSystem.prototype = {
    name: 'CellBroadcastSystem',

    /**
     * Whether or not the cellbroadcast setting is enabled or disabled.
     * @memberof CellBroadcastSystem.prototype
     * @type {Array}
     */
    _settingsDisabled: [],

    /**
     * The cell broadcast settings key.
     * @memberof CellBroadcastSystem.prototype
     * @type {String}
     */
    _settingsKey: 'ril.cellbroadcast.disabled',

    /**
     * Starts listening for events and settings changes.
     * @memberof CellBroadcastSystem.prototype
     */
    start: function cbs_start() {
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
      Service.register('show', this);
    },

    /**
     * Called when the cellbroadcast setting is changed.
     * @memberof CellBroadcastSystem.prototype
     */
    settingsChangedHandler: function cbs_settingsChangedHandler(event) {
      this._settingsDisabled = event.settingValue;

      if (this._hasCBSDisabled()) {
        var evt = new CustomEvent('cellbroadcastmsgchanged', { detail: null });
        window.dispatchEvent(evt);
      }
    },

    /**
     * Shows the cell broadcast notification.
     * @memberof CellBroadcastSystem.prototype
     */
    show: function cbs_show(event) {
      var msg = event.message;
      var serviceId = msg.serviceId || 0;
      var conn = window.navigator.mozMobileConnections[serviceId];
      var id = msg.messageId;

      // Early return CMAS messsage and let network alert app handle it. Please
      // ref http://www.etsi.org/deliver/etsi_ts/123000_123099/123041/
      // 11.06.00_60/ts_123041v110600p.pdf, chapter 9.4.1.2.2 Message identifier
      // Message id from range 4370 to 4399(1112 hex to 112f hex) should be CMAS
      // message and network alert will display detail information.
      if (id >= 4370 && id < 4400) {
        return;
      }

      if (conn && conn.voice && conn.voice.network &&
          conn.voice.network.mcc === MobileOperator.BRAZIL_MCC &&
          id === MobileOperator.BRAZIL_CELLBROADCAST_CHANNEL) {
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
        navigator.mozL10n.get('cb-channel', { channel: id }));
    },

    /**
     * To make sure there is any CBS pref is disabled
     * @memberof CellBroadcastSystem.prototype
     */
    _hasCBSDisabled: function cbs__getDisabledCBSIndex() {
      var index =
        this._settingsDisabled.findIndex(disabled => (disabled === true));
      return (index >= 0);
    }
  };

  exports.CellBroadcastSystem = CellBroadcastSystem;

}(window));
