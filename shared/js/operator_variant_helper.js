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
 * @param {String} iccId - ICC id from the card.
 * @param {Numeric} iccCardIndex - Index of ICC card.
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
function OperatorVariantHelper(iccId,
                               iccCardIndex,
                               listener,
                               persistKey,
                               checkNow) {
  var errMsg = null;

  // mozIccManager must be present.
  var iccManager = window.navigator.mozIccManager;
  if (!iccManager) {
    errMsg = 'Expected mozIccManager to be present.';
    console.error(errMsg);
    throw new Error(errMsg);
  }

  // And mozSettings must be present.
  var settings = window.navigator.mozSettings;
  if (!settings) {
    errMsg = 'Expected mozSettings to be present.';
    console.error(errMsg);
    throw new Error(errMsg);
  }

  if ((iccId === '0') || (iccCardIndex < 0)) {
    throw new Error('iccId and iccCardIndex arguments must have a value!');
  }
  this._iccId = iccId;
  this._iccCardIndex = iccCardIndex;

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
  //
  _iccCard: null,
  // Cached ICC information.
  _iccSettings: { mcc: '', mnc: '' },
  // Settings persistence key.
  _persistKey: null,
  // Are operator variant customizations disabled?
  _disableAll: false,

  // The mozSettings key for the saved MCCs.
  get MCC_SETTINGS_KEY() {
    return 'operatorvariant.mcc';
  },

  // The mozSettings key for the saved MNCs.
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

  /**
   * Get the saved ICC Settings (MCC/MNC).
   */
  getICCSettings: function() {
    var transaction = this.settings.createLock();

    var mccRequest = transaction.get(this.MCC_SETTINGS_KEY);

    mccRequest.onsuccess = (function() {
      var mccs = mccRequest.result[this.MCC_SETTINGS_KEY];
      if (!mccs) {
        this._iccSettings.mcc = '000';
      } else if (!Array.isArray(mccs)) {
        this._iccSettings.mcc = mccs;
      } else if (!mccs[this._iccCardIndex]) {
        this._iccSettings.mcc = '000';
      } else {
        this._iccSettings.mcc = mccs[this._iccCardIndex];
      }
      var mncRequest = transaction.get(this.MNC_SETTINGS_KEY);
      mncRequest.onsuccess = (function() {
        var mncs = mncRequest.result[this.MNC_SETTINGS_KEY];
        if (!mncs) {
          this._iccSettings.mnc = '00';
        } else if (!Array.isArray(mncs)) {
          this._iccSettings.mnc = mncs;
        } else if (!mncs[this._iccCardIndex]) {
          this._iccSettings.mnc = '00';
        } else {
          this._iccSettings.mnc = mncs[this._iccCardIndex];
        }
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
    var iccManager = window.navigator.mozIccManager;
    this._iccCard = iccManager.getIccById(this._iccId);
    if (!this._iccCard) {
      return;
    }

    if (!this._iccCard.iccInfo || this._iccCard.cardState !== 'ready') {
      return;
    }

    // XXX sometimes we get 000/00 for mcc/mnc, even when cardState === 'ready'
    var mcc = this._iccCard.iccInfo.mcc || '000';
    var mnc = this._iccCard.iccInfo.mnc || '00';
    if (mcc === '000') {
      return;
    }

    // ensure that the iccSettings have been retrieved
    if ((this._iccSettings.mcc === '') || (this._iccSettings.mnc === '')) {
      return;
    }

    if ((mcc !== this._iccSettings.mcc) || (mnc !== this._iccSettings.mnc)) {
      if (this._addedListener) {
        try {
          // apply new settings
          this._listener(mcc, mnc);
        }
        catch (e) {
          console.error('Listener threw an error!', e);
        }
        this.listen(false);
      }

    } else {
      // Check whether we ran customizations already.
      var transaction = this.settings.createLock();
      var persistKeyGetRequest = transaction.get(this._persistKey);
      persistKeyGetRequest.onsuccess = (function persistKeyGetRequestCb() {
        // Looks like we didn't run customizations, apply settings.
        if (!persistKeyGetRequest.result[this._persistKey]) {
          if (this._addedListener) {
            try {
              // apply new APN settings
              this._listener(mcc, mnc, true);
            }
            catch (e) {
              console.error('Listener threw an error!', e);
            }
          }
        }
        this.listen(false);
      }).bind(this);
    }

    // store current mcc/mnc info in the settings
    var transaction = this.settings.createLock();

    var mccRequest = transaction.get(this.MCC_SETTINGS_KEY);
    mccRequest.onsuccess = (function() {
      var mccs = mccRequest.result[this.MCC_SETTINGS_KEY];
      if (!mccs || !Array.isArray(mccs)) {
        mccs = ['000', '000'];
      }
      mccs[this._iccCardIndex] = mcc;
      var mccSettings = {};
      mccSettings[this.MCC_SETTINGS_KEY] = mccs;
      transaction.set(mccSettings);

      var mncRequest = transaction.get(this.MNC_SETTINGS_KEY);
      mncRequest.onsuccess = (function() {
        var mncs = mncRequest.result[this.MNC_SETTINGS_KEY];
        if (!mncs || !Array.isArray(mncs)) {
          mncs = ['00', '00'];
        }
        mncs[this._iccCardIndex] = mnc;
        var mncSettings = {};
        mncSettings[this.MNC_SETTINGS_KEY] = mncs;
        transaction.set(mncSettings);
        this._iccSettings.mcc = mcc;
        this._iccSettings.mnc = mnc;
      }).bind(this);
    }).bind(this);
  },

  /**
   * Persist that the customizations have been applied. Uses the 'persistKey'
   * passed in during construction of the object.
   */
  applied: function() {
    var transaction = this.settings.createLock();

    // Persist the fact that we ran customizations.
    var item = {};
    item[this._persistKey] = true;
    var opVariantReq = transaction.set(item);

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
   * Revert persisted key that tracks if customizations have been applied.
   */
  revert: function() {
    var transaction = this.settings.createLock();

    // Persist the fact that we ran customizations.
    var item = {};
    item[this._persistKey] = false;
    var opVariantReq = transaction.set(item);

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
   * Start the customization process.
   */
  customize: function() {
    this.getICCSettings();
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

      var iccManager = window.navigator.mozIccManager;
      this._iccCard = iccManager.getIccById(this._iccId);
      if (this._iccCard) {
        // Add the actual bound listener.
        this._iccCard.addEventListener(
          'iccinfochange',
          this._addedListener
        );
        this._iccCard.addEventListener(
          'cardstatechange',
          this._addedListener
        );
      } else {
        iccManager.oniccdetected = (function iccDetectedHandler(evt) {
          if (this._iccId !== evt.iccId) {
            return;
          }
          this._iccCard = iccManager.getIccById(this._iccId);
          // Add the actual bound listener.
          this._iccCard.addEventListener(
            'iccinfochange',
            this._addedListener
          );
          this._iccCard.addEventListener(
            'cardstatechange',
            this._addedListener
          );
        }).bind(this);
      }
      return;
    }

    if (this._addedListener) {
      var iccManager = window.navigator.mozIccManager;
      this._iccCard = iccManager.getIccById(this._iccId);
      if (this._iccCard) {
        // Otherwise, unregister.
        this._iccCard.removeEventListener(
          'iccinfochange',
          this._addedListener
        );
        this._iccCard.removeEventListener(
          'cardstatechange',
          this._addedListener
        );
      }
      // Clear our reference to the bound listener.
      this._addedListener = null;
    }
  }
};
