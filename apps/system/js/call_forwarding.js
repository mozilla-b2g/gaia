/* global IccHelper, asyncStorage, SettingsHelper */
/* exported CallForwarding */

'use strict';

(function(exports) {

  var rilSettingsHelper;
  var mobileConnection;
  var settings;

  /*
   * CallForwarding mainly handles the icon on the top bar based on the
   * preference in mozSettings.
   *
   * @class CallForwarding
   */
  function CallForwarding() {
    this.init();
  }

  CallForwarding.prototype = {
    /** @lends CallForwarding */

    /*
     * Initialize the icon based on the card state and whether
     * it is in airplane mode or not.
     *
     * @memberof CallForwarding.prototype
     * @type {Boolean}
     */
    _cfIconStateInitialized: false,

    /*
     * A mapping for call forwarding reasons
     * Note: must be in sync with nsIDOMMozMobileCFInfo interface.
     *
     * @memberof CallForwarding.prototype
     * @type {Object}
     */
    _cfReason: {
      CALL_FORWARD_REASON_UNCONDITIONAL: 0,
      CALL_FORWARD_REASON_MOBILE_BUSY: 1,
      CALL_FORWARD_REASON_NO_REPLY: 2,
      CALL_FORWARD_REASON_NOT_REACHABLE: 3
    },

    /*
     * A mapping for call forwarding actions
     *
     * @memberof CallForwarding.prototype
     * @type {Object}
     */
    _cfAction: {
      CALL_FORWARD_ACTION_DISABLE: 0,
      CALL_FORWARD_ACTION_ENABLE: 1,
      CALL_FORWARD_ACTION_QUERY_STATUS: 2,
      CALL_FORWARD_ACTION_REGISTRATION: 3,
      CALL_FORWARD_ACTION_ERASURE: 4
    },

    /*
     * This is used to check needed API do exist
     *
     * @memberof CallForwarding.prototype
     * @type {Function}
     * @return {Boolean}
     */
    hasNeededAPI: function cf_hasNeededAPI() {
      settings = window.navigator.mozSettings;

      // XXX: check bug-926169
      // this is used to keep all tests passing while introducing multi-sim APIs
      mobileConnection = window.navigator.mozMobileConnection ||
        window.navigator.mozMobileConnections &&
          window.navigator.mozMobileConnections[0];

      if (!settings || !mobileConnection || !IccHelper) {
        return false;
      }
      return true;
    },

    /*
     * Initialize all stuffs
     *
     * @memberof CallForwarding.prototype
     */
    init: function cf_init() {
      if (!this.hasNeededAPI()) {
        return;
      }
      rilSettingsHelper = SettingsHelper('ril.cf.enabled', false);
      rilSettingsHelper.set(false);
      this.initCallForwardingIconState();
      this.bindEvents();
    },

    /*
     * Initialize call forwarding icon
     *
     * @memberof CallForwarding.prototype
     */
    initCallForwardingIconState: function cf_initCallForwardingIconState() {
      var cardState = IccHelper.cardState;

      if (this._cfIconStateInitialized || cardState !== 'ready') {
        return;
      }

      if (!IccHelper.iccInfo) {
        return;
      }

      var iccid = IccHelper.iccInfo.iccid;
      if (!iccid) {
        return;
      }

      asyncStorage.getItem('ril.cf.enabled.' + iccid, function(value) {
        if (value === null) {
          value = false;
        }
        rilSettingsHelper.set(value);
        this._cfIconStateInitialized = true;
      }.bind(this));
    },

    /*
     * Bind needed events to reflect call forwarding state
     *
     * @memberof CallForwarding.prototype
     */
    bindEvents: function cf_bindEvents() {
      IccHelper.addEventListener('cardstatechange', function() {
        this.initCallForwardingIconState();
      }.bind(this));

      IccHelper.addEventListener('iccinfochange', function() {
        this.initCallForwardingIconState();
      }.bind(this));

      mobileConnection.addEventListener('cfstatechange', function(event) {
        var cfReason = this._cfReason;
        var cfAction = this._cfAction;
        if (event &&
            event.reason == cfReason.CALL_FORWARD_REASON_UNCONDITIONAL) {
          var enabled = false;
          if (event.success &&
               (event.action == cfAction.CALL_FORWARD_ACTION_REGISTRATION ||
                 event.action == cfAction.CALL_FORWARD_ACTION_ENABLE)) {
            enabled = true;
          }
          rilSettingsHelper.set(enabled);
          asyncStorage.setItem('ril.cf.enabled.' + IccHelper.iccInfo.iccid,
            enabled);
        }
      }.bind(this));

      settings.addObserver('ril.cf.carrier.enabled', function(event) {
        var showIcon = event.settingValue;
        rilSettingsHelper.set(showIcon);
        asyncStorage.setItem('ril.cf.enabled.' + IccHelper.iccInfo.iccid,
          showIcon);
      });
    }
  };

  exports.CallForwarding = CallForwarding;
}(window));
