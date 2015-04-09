/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

define(function(require) {
  'use strict';

  var AdapterManager = require('modules/bluetooth/bluetooth_adapter_manager');
  var BtContext = require('modules/bluetooth/bluetooth_context');
  var PairExpiredDialog = require('views/pair_expired_dialog');

  var _ = window.navigator.mozL10n.get;
  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function btam_debug(msg) {
      console.log('--> [PairManager]: ' + msg);
    };
  }

  /*
   * PairManager is responsible for:
   *   1. Handling system message 'bluetooth-pairing-request' while there is an
   *      incoming/outgoing pairing request.
   *   2. Handling dom event from BluetoothPairingListener while there is an
   *      incoming/outgoing pairing request.
   *   3. Handling dom event 'ondeviceunpaired' while some remote devices
   *      request for canceling an overdue pairing request. The reason could be
   *      authentication fails, remote device down, and internal error happens.
   */
  var PairManager = {
    /**
     * Default adapter of Bluetooth.
     *
     * @access private
     * @memberOf PairManger
     * @type {BluetoothAdapter}
     */
    _defaultAdapter: null,

    init: function() {
      // Observe 'defaultAdapter' property for reaching default adapter.
      AdapterManager.observe('defaultAdapter',
        this._onDefaultAdapterChanged.bind(this));
      this._onDefaultAdapterChanged(AdapterManager.defaultAdapter);

      // Watch pairing events.
      this._watchOndisplaypasskeyreq();
      this._watchOnenterpincodereq();
      this._watchOnpairingconfirmationreq();
      this._watchOnpairingconsentreq();
      this._watchOnpairingaborted();

      navigator.mozSetMessageHandler('bluetooth-pairing-request',
        this._onRequestPairingFromSystemMessage.bind(this)
      );

      // Observe screen lockscreen locked/unlocked state for show pending
      // pairing request immediately.
      navigator.mozSettings.addObserver('lockscreen.locked',
        function gotScreenLockedChanged(event) {
          this.showPendingPairing(event.settingValue);
      }.bind(this));

      // Observe Bluetooth 'enabled' property from hardware side.
      // Then, close pairing dialog immediately.
      BtContext.observe('enabled', (enabled) => {
        if (!enabled) {
          this.onBluetoothDisabled();
        }
      });
    },

    /**
     * 'defaultAdapter' change event handler from adapter manager for
     * updating it immediately.
     *
     * @access private
     * @memberOf PairManager
     * @param {Object} BluetoothAdapter newAdapter
     */
    _onDefaultAdapterChanged: function(newAdapter) {
      // save default adapter
      this._defaultAdapter = newAdapter;
    },

    /**
     * Watch 'ondisplaypasskeyreq' dom event for pairing.
     * A handler to trigger when a remote bluetooth device requests to display 
     * passkey on the screen during pairing process.
     *
     * @access private
     * @memberOf PairManager
     */
    _watchOndisplaypasskeyreq: function() {
      if (!this._defaultAdapter || !this._defaultAdapter.pairingReqs) {
        return;
      }

      this._defaultAdapter.pairingReqs.ondisplaypasskeyreq = 
        this._onDisplayPasskeyReq.bind(this);
    },

    /**
     * A handler to handle 'ondisplaypasskeyreq' event while it's coming.
     *
     * @access private
     * @memberOf PairManager
     */
    _onDisplayPasskeyReq: function(evt) {
      Debug('ondisplaypasskeyreq(): Pairing request from ' + 
            evt.deviceName + ': display passkey = ' + evt.handle.passkey);
      // TODO: Display passkey to user if user story is required.
      throw new Error('Received pairing method "ondisplaypasskeyreq". ' + 
                      'It would need to implement if user story is required!!');
    },

    /**
     * Watch 'onenterpincodereq' dom event for pairing.
     * A handler to trigger when a remote bluetooth device requests user enter 
     * PIN code during pairing process.
     *
     * @access private
     * @memberOf PairManager
     */
    _watchOnenterpincodereq: function() {
      if (!this._defaultAdapter || !this._defaultAdapter.pairingReqs) {
        return;
      }

      this._defaultAdapter.pairingReqs.onenterpincodereq =
        this._onEnterPinCodeReq.bind(this);
    },

    /**
     * A handler to handle 'onenterpincodereq' event while it's coming.
     *
     * @access private
     * @memberOf PairManager
     */
    _onEnterPinCodeReq: function(evt) {
      Debug('onenterpincodereq(): Pairing request from ' + 
            evt.deviceName + ': enter pin code..');
      
      // inform user to enter pin code
      var pairingInfo = {
        method: 'pincode',
        evt: evt
      };
      this._onRequestPairing(pairingInfo);
    },

    /**
     * Watch 'onpairingconfirmationreq' dom event for pairing.
     * A handler to trigger when a remote bluetooth device requests user 
     * confirm passkey during pairing process. Applications may prompt passkey 
     * to user for confirmation, or confirm the passkey for user proactively.
     *
     * @access private
     * @memberOf PairManager
     */
    _watchOnpairingconfirmationreq: function() {
      if (!this._defaultAdapter || !this._defaultAdapter.pairingReqs) {
        return;
      }

      this._defaultAdapter.pairingReqs.onpairingconfirmationreq =
        this._onPairingConfirmationReq.bind(this);
    },

    /**
     * A handler to handle 'onpairingconfirmationreq' event while it's coming.
     *
     * @access private
     * @memberOf PairManager
     */
    _onPairingConfirmationReq: function(evt) {
      // display passkey for user confirm
      var pairingInfo = {
        method: 'confirmation',
        evt: evt
      };
      this._onRequestPairing(pairingInfo);
    },

    /**
     * Watch 'onpairingconsentreq' dom event for pairing.
     * A handler to trigger when a remote bluetooth device requests user 
     * confirm pairing during pairing process. Applications may prompt user 
     * for confirmation or confirm for user proactively.
     *
     * @access private
     * @memberOf PairManager
     */
    _watchOnpairingconsentreq: function() {
      if (!this._defaultAdapter || !this._defaultAdapter.pairingReqs) {
        return;
      }

      this._defaultAdapter.pairingReqs.onpairingconsentreq = 
        this._onPairingConsentReq.bind(this);
    },

    /**
     * A handler to handle 'onpairingconsentreq' event while it's coming.
     *
     * @access private
     * @memberOf PairManager
     */
    _onPairingConsentReq: function(evt) {
      Debug('onpairingconsentreq(): Pairing request from ' + 
            evt.deviceName + ': pairing consent');
      // TODO: Notify user of just-work pairing if user story is required.
      throw new Error('Received pairing method "onpairingconsentreq". ' + 
                      'It would need to implement if user story is required!!');
    },

    /**
     * Watch 'onpairingaborted' dom event for pairing aborted.
     * A handler to trigger when pairing fails due to one of 
     * following conditions:
     * - authentication fails
     * - remote device down (bluetooth ACL becomes disconnected)
     * - internal error happens
     *
     * @access private
     * @memberOf PairManager
     */
    _watchOnpairingaborted: function() {
      if (!this._defaultAdapter) {
        return;
      }
      
      this._defaultAdapter.addEventListener('pairingaborted',
        this._onPairingAborted.bind(this));
    },

    /**
     * A handler to handle 'onpairingaborted' event while it's coming.
     *
     * @access private
     * @memberOf PairManager
     */
    _onPairingAborted: function(evt) {
      Debug('_onPairingAborted(): evt = ' + JSON.stringify(evt));
      // if the attention screen still open, close it
      if (this.childWindow) {
        this.childWindow.Pairview.closeInput();
        this.childWindow.close();
      }

      // If "onpairingaborted" event is coming, and there is a pending pairing
      // request, we have reset the object. Because the callback is useless
      // since the older pairing request is expired.
      // The moment is fit to notify user that the later pairing request
      // is timeout or canceled. According to user story, do nothing here.
      // Clear up the pending pairing request only.
      if (this.pendingPairing) {
        this.pendingPairing = null;
      }

      // Close pairing expired dialog if it is showing.
      if (PairExpiredDialog.isVisible) {
        PairExpiredDialog.close();
        // Have to close Bluetooth app after the dialog is closed.
        window.close();
      }
    },

    /**
     * Receive the system message event for launch Bluetooth app here.
     *
     * @access private
     * @memberOf PairManager
     */
    _onRequestPairingFromSystemMessage: function() {
      Debug('onRequestPairingFromSystemMessage():');
    },

    /**
     * It is used to handle each pairing request from different pairing methods.
     *
     * @memberOf PairManager
     * @access private
     * @param {Object} pairingInfo
     * @param {Object} pairingInfo.method - method of this pairing request
     * @param {Object} pairingInfo.evt - DOM evt of this pairing request
     */
    _onRequestPairing: function(pairingInfo) {
      Debug('_onRequestPairing():' + 
            ' pairingInfo.method = ' + pairingInfo.method + 
            ' pairingInfo.evt = ' + pairingInfo.evt);

      var req = navigator.mozSettings.createLock().get('lockscreen.locked');
      var self = this;
      req.onsuccess = function bt_onGetLocksuccess() {
        if (req.result['lockscreen.locked']) {
          // notify user that we are receiving pairing request
          self.fireNotification(pairingInfo);
        } else {
          // We have clear up pending one before show the new pairing requst.
          // Becasue the pending pairing request is no longer usefull.
          self.cleanPendingPairing();

          // show pair view directly while lock screen is unlocked
          self.showPairview(pairingInfo);
        }
      };
      req.onerror = function bt_onGetLockError() {
        // We have clear up pending one before show the new pairing requst.
        // Becasue the pending pairing request is no longer usefull.
        self.cleanPendingPairing();

        // fallback to default value 'unlocked'
        self.showPairview(pairingInfo);
      };
    },

    fireNotification: function(pairingInfo) {
      // Once we received a pairing request in screen locked mode,
      // overwrite the object with the latest pairing request. Because the
      // later pairing request might be timeout and useless now.
      this.pendingPairing = {
        showPairviewCallback: this.showPairview.bind(this, pairingInfo)
      };
      // Prepare notification toast.
      var title = _('bluetooth-pairing-request-now-title');
      var body = pairingInfo.evt.deviceName || _('unnamed-device');
      var iconUrl =
        'app://bluetooth.gaiamobile.org/style/images/icon_bluetooth.png';
      // We always use tag "pairing-request" to manage these notifications.
      var notificationId = 'pairing-request';
      var notification = new Notification(title, {
        body: body,
        icon: iconUrl,
        tag: notificationId
      });

      // set onclick handler for the notification
      notification.onclick =
        this.pairingRequestExpiredNotificationHandler.bind(this, notification);
    },

    // According to user story, it won't notify user again
    // while the pending pairing request is just timeout or canceled.
    // So we have to set onclick handler in this moment.
    // The handler will pop out a pairing request expired prompt only.
    pairingRequestExpiredNotificationHandler: function(notification) {
      var req = navigator.mozSettings.createLock().get('lockscreen.locked');
      req.onsuccess = function bt_onGetLocksuccess() {
        // Avoid to do nothting while the notification toast is showing
        // and a user is able to trigger onclick event. Make sure screen
        // is unlocked, then show the prompt in bluetooth app.
        if (!req.result['lockscreen.locked']) {
          // Clean the pairing request notficiation which is expired.
          notification.close();

          navigator.mozApps.getSelf().onsuccess = function(evt) {
            var app = evt.target.result;

            // launch bluetooth app to foreground for showing the prompt
            app.launch();

            // show an alert with the overdue message
            if (!PairExpiredDialog.isVisible) {
              PairExpiredDialog.showConfirm(function() {
                // Have to close Bluetooth app after the dialog is closed.
                window.close();
              });
            }
          };
        }
      };
    },

    // If there is a pending pairing request while a user just unlocks screen,
    // we will show pair view immediately. Then, we clear up the notification.
    showPendingPairing: function(screenLocked) {
      if (!screenLocked && this.pendingPairing) {
        // show pair view from the callback function
        if (this.pendingPairing.showPairviewCallback) {
          this.pendingPairing.showPairviewCallback();
        }

        this.cleanPendingPairing();
      }
    },

    cleanPendingPairing: function() {
      Debug('cleanPendingPairing(): has pendingPairing = ' +
                 (this.pendingPairing));

      // Clear up the pending pairing request
      if (this.pendingPairing) {
        this.pendingPairing = null;
      }

      // Clear up the pairing request from notification.
      this.cleanNotifications();
    },

    // Clean all notifications which are fired with tag 'pairing-request'.
    cleanNotifications: function() {
      Notification.get().then(function(notifications) {
        if (notifications) {
          notifications.forEach(function(notification) {
            // Compare tags, as the tag is based on the "pairing-request" and
            // we only have one notification for the request. Plus, there
            // is no "id" field on the notification.
            if (notification.tag === 'pairing-request' &&
                notification.close) {
                notification.close();
            }
          });
        }
      });
    },

    showPairview: function(pairingInfo) {
      Debug('showPairview(): pairingInfo = ' + pairingInfo);
      var protocol = window.location.protocol;
      var host = window.location.host;
      this.childWindow = window.open(protocol + '//' + host + '/onpair.html',
                  'pair_screen', 'attention');
      var self = this;
      this.childWindow.onload = function childWindowLoaded() {
        self.childWindow.Pairview.init(pairingInfo.method, pairingInfo.evt);
      };
    },

    onBluetoothDisabled: function() {
      Debug('onBluetoothDisabled():');

      // if the attention screen still open, close it
      if (this.childWindow) {
        this.childWindow.Pairview.closeInput();
        this.childWindow.close();
      }

      // Since Bluetooth is off, close itself.
      window.close();
    }
  };

  return PairManager;
});
