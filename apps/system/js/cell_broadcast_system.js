'use strict';
/* global CarrierInfoNotifier */
/* global MobileOperator */

(function(exports) {

  /**
   * CellBroadcastSystem
   * @class CellBroadcastSystem
   * @requires CarrierInfoNotifier
   * @requires MobileOperator
   */
  function CellBroadcastSystem() {}

  CellBroadcastSystem.prototype = {

    /**
     * Whether or not the cellbroadcast setting is enabled or disabled.
     * @memberof CellBroadcastSystem.prototype
     * @type {Boolean}
     */
    _settingsDisabled: null,

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

      settings.addObserver(this._settingsKey,
                           this.settingsChangedHandler.bind(this));
    },

    /**
     * Called when the cellbroadcast setting is changed.
     * @memberof CellBroadcastSystem.prototype
     */
    settingsChangedHandler: function cbs_settingsChangedHandler(event) {
      this._settingsDisabled = event.settingValue;

      if (this._settingsDisabled) {
        var evt = new CustomEvent('cellbroadcastmsgchanged', { detail: null });
        window.dispatchEvent(evt);
      }
    },

    /**
     * Shows the cell broadcast notification.
     * @memberof CellBroadcastSystem.prototype
     */
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

      var body = msg.body;

      // XXX: 'undefined' test until bug-1021177 lands
      if (msg.etws && (!body || (body == 'undefined'))) {
        body = navigator.mozL10n.get('cb-etws-warningType-' +
          (msg.etws.warningType ? msg.etws.warningType : 'other'));
      }

      CarrierInfoNotifier.show(body,
        navigator.mozL10n.get('cb-channel', { channel: msg.messageId }));
    }
  };

  exports.CellBroadcastSystem = CellBroadcastSystem;

}(window));
