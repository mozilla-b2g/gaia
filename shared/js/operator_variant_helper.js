/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * An OperatorVariantHelper object can be used to trigger customizations
 * in an application at startup.
 *
 * The object will call the listener passed to it during construction
 * if the MCC/MNC pair present on the SIM card differs from the previously
 * seen pair. The listener will also be called during first boot up of the
 * device.
 *
 * Optionally, one can also use an OperatorVariantListener object to listen
 * to SIM card changes during runtime, using the 'listen' method. This can
 * enable applications to support multi-SIM devices if appropriate for the
 * functionality it provides.
 *
 * @param {Function} listener - A listener function that will be called when
 *                              a check occurs and the SIM information has
 *                              changed. The function signature should match
 *                              the following: function(mcc, mnc).
 * @param {String} persistKey - The settings key which will be used to persist
 *                              if the customizations have been applied. We
 *                              recommend using the application package name
 *                              as the root for your key along with
 *                              'customization'. The persisted setting is a
 *                              boolean value, where true means the
 *                              customizations have been applied.
 * @param {Boolean} checkNow - Perform a check for SIM card change immediately.
 *                             Defaults to true.
 *
 * @constructor
 */
function OperatorVariantHelper(listener, persistKey, checkNow) {
  // OperatorVariantHelper requires mozMobileConnection to be present.
  var mobileConnection = window.navigator.mozMobileConnection;
  if (!mobileConnection) {
    let errMsg = 'Expected mozMobileConnection to be present.';
    console.error(errMsg);
    throw new Error(errMsg);
  }

  // The IccHelper should be enabled as well.
  if (!IccHelper.enabled) {
    let errMsg = 'Expected IccHelper to be enabled.';
    console.error(errMsg);
    throw new Error(errMsg);
  }

  // And mozSettings must be present.
  var settings = window.navigator.mozSettings;
  if (!settings) {
    let errMsg = 'Expected mozSettings to be present.';
    console.error(errMsg);
    throw new Error(errMsg);
  }

  if (listener === undefined || typeof listener !== 'function') {
    throw new Error('listener argument must be a function!');
  }

  this._listener = listener;

  if (persistKey === undefined || typeof persistKey !== 'string') {
    throw new Error('persistKey argument must be a string!');
  }

  this._persistKey = persistKey;

  if (!!checkNow) {
    this.customize();
  }
}

OperatorVariantHelper.prototype = {
  // The listener to call when the SIM card is new or has changed.
  _listener: null,
  // The actual registered listener (since we use bind we need this).
  _addedListener: null,
  // Cached ICC information for hot swapping SIM cards in multi-SIM devices.
  _iccSettings: { mcc: '-1', mnc: '-1' },
  // Settings persistence key.
  _persistKey: null,
  // Are operator variant customizations disabled?
  _disableAll: false,

  // The mozSettings key for the saved MCC.
  get MCC_SETTINGS_KEY() {
    return 'operatorvariant.mcc';
  },

  // The mozSettings key for the saved MNC.
  get MNC_SETTINGS_KEY() {
    return 'operatorvariant.mnc';
  },

  // The prefs key for disabling all customizations.
  get OPERATOR_VARIANT_DISABLE_ALL_KEY() {
    return 'operatorvariant.disableAll';
  },

  // Getter for global objects we use frequently.
  get settings() {
    return window.navigator.mozSettings;
  },

  get mobileConnection() {
    return window.navigator.mozMobileConnection;
  },

  /**
   * Get the saved ICC Settings (MCC/MNC).
   */
  getICCSettings: function() {
    var transaction = this.settings.createLock();

    var mccRequest = transaction.get(this.MCC_SETTINGS_KEY);

    mccRequest.onsuccess = (function() {
      this._iccSettings.mcc = mccRequest.result[this.MCC_SETTINGS_KEY] || '0';

      var mncRequest = transaction.get(this.MNC_SETTINGS_KEY);
      mncRequest.onsuccess = (function() {
        this._iccSettings.mnc = mncRequest.result[this.MNC_SETTINGS_KEY] || '0';
        this.checkICCInfo();
      }).bind(this);

    }).bind(this);
  },

  /**
   * Verify the saved ICC Settings vs what the SIM card is reporting. If they
   * differ we will call the listener that was registered during construction
   * to enable customization.
   */
  checkICCInfo: function() {
    if (!this.mobileConnection.iccInfo || IccHelper.cardState !== 'ready')
      return;

    // ensure that the iccSettings have been retrieved
    if ((this._iccSettings.mcc < 0) || (this._iccSettings.mnc < 0))
      return;

    // XXX sometimes we get 0/0 for mcc/mnc, even when cardState === 'ready'...
    var mcc = this.mobileConnection.iccInfo.mcc || '0';
    var mnc = this.mobileConnection.iccInfo.mnc || '0';
    if (mcc === '0')
      return;

    // same SIM card => do nothing
    if ((mcc == this._iccSettings.mcc) && (mnc == this._iccSettings.mnc))
      return;

    // new SIM card => cache iccInfo, load and apply new APN settings
    this._iccSettings.mcc = mcc;
    this._iccSettings.mnc = mnc;

    try {
      this._listener(mcc, mnc);
    }
    catch (e) {
      console.error('Listener threw an error!', e);
    }
  },

  /**
   * Persist that the customizations have been applied. Uses the 'persistKey'
   * passed in during construction of the object.
   */
  applied: function() {
    var transaction = this.settings.createLock();

    // Persist the fact that we ran customizations.
    var opVariantReq = transaction.set(this._persistKey, true);

    // We're running in test mode, just return.
    if (opVariantReq === undefined) {
      return;
    }

    // If we error we could end up running the customizations again! Ensure
    // we surface this to developers.
    opVariantReq.onerror = (function(event) {
      console.error('Failed to set',
                    this._persistKey,
                    'to true.',
                    'Customizations may run again!');
    }).bind(this);
  },

  /**
   *
   */
  revert: function() {
    var transaction = this.settings.createLock();

    var opVariantReq = transaction.set(this._persistKey, false);

    // We're running in test mode, just return.
    if (opVariantReq === undefined) {
      return;
    }

    opVariantReq.onerror = (function(event) {
      console.error('Failed to set',
                    this._persistKey,
                    'to false.',
                    'Customizations will not be able to be applied again.');
    }).bind(this);
  },

  /**
   * Check to see if we should customize. If customizations were already
   * completed we will omit calling the listener registered during
   * construction.
   */
  customize: function() {
    // Check to see if we ran customizations already.
    var transaction = this.settings.createLock();
    var opVariantReq = transaction.get(this._persistKey);
    opVariantReq.onsuccess = (function() {
      // Looks like we didn't run customizations, go ahead and check the ICC
      // settings vs what the SIM card is reporting.
      if (!opVariantReq.result[this._persistKey]) {
        this.getICCSettings();
      }
    }).bind(this);
  },

  /**
   * Listen for further changes in MCC/MNC values, will trigger customization
   * even if customizations have already run. Be careful when using this, it's
   * meant for settings that *should* change at runtime.
   *
   * @param {Boolean} listenForChange - Listen for changes in MCC/MNC values
   *                                    during runtime. For multi-sim support.
   *                                    Defaults to true. Call this method
   *                                    with 'false' to stop listening.
   */
  listen: function(listenForChange) {
    // Defaults to true so we need to make sure it's set.
    if (listenForChange === undefined) {
      listenForChange = true;
    }

    // Register listener if we're listening for changes.
    if (listenForChange) {
      // We need to keep a reference to the added listener for removal later.
      this._addedListener = this.customize.bind(this);

      // Add the actual bound listener.
      this.mobileConnection.addEventListener(
        'iccinfochange',
        this._addedListener
      );

      return;
    }

    if (this._addedListener) {
      // Otherwise, unregister.
      this.mobileConnection.removeEventListener(
        'iccinfochange',
        this._addedListener
      );
      // Clear our reference to the bound listener.
      this._addedListener = null;
    }
  }
};
