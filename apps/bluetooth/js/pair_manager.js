/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global BluetoothHelper, PairManager, PairExpiredDialog, Notification */

'use strict';

(function(exports) {

  var _ = window.navigator.mozL10n.get;
  var _debug = false;

  /*
   * PairManager is responsible for:
   *   1. Handling system message 'bluetooth-pairing-request' while there is an
   *      incoming/outgoing pairing request.
   *   2. handling system message 'bluetooth-cancel' while some remote devices
   *      request for canceling an overdue pairing request. The reason could be
   *      cancel from remote devices, timeout, or other..w
   */
  var PairManager = {
    init: function() {
      // require mozBluetooth from BluetoothHelper
      this.bluetoothHelper = BluetoothHelper();

      navigator.mozSetMessageHandler('bluetooth-pairing-request',
        this.onRequestPairing.bind(this)
      );

      navigator.mozSetMessageHandler('bluetooth-cancel',
        this.onBluetoothCancel.bind(this)
      );

      // Observe screen lockscreen locked/unlocked state for show pending
      // pairing request immediately.
      navigator.mozSettings.addObserver('lockscreen.locked',
        function gotScreenLockedChanged(event) {
          this.manageHasnotCompletedPairing(event.settingValue);
      }.bind(this));

      // Observe Bluetooth ondisabled event from hardware side.
      // Then, close pairing dialog immediately.
      navigator.mozBluetooth.ondisabled = this.onBluetoothDisabled.bind(this);

      // Observe Bluetooth enabled state for close pairing dialog immediately.
      navigator.mozSettings.addObserver('bluetooth.enabled',
        function gotBluetoothEnabledChanged(event) {
          if (!event.settingValue) {
            this.onBluetoothDisabled();
          }
      }.bind(this));
    },

    onRequestPairing: function(pairingInfo) {
      this.debug('onRequestPairing(): pairingInfo = ' + pairingInfo);

      // reset the flag since new pairing request is coming
      this.cleanUncompletedPairing();

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
      var body = pairingInfo.name || _('unnamed-device');
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

    // The function is a management for uncompleted pairing procedure, pending
    // pairing request in screen locked/unlocked mode.
    manageHasnotCompletedPairing: function(screenLocked) {
      if (screenLocked) {
        // If attention screen is still showing, it means that the pairing
        // procedure not completed yet. Close attention screen, then save the
        // status via flag 'uncompletedPairing'. The uncompleted pairing will be
        // resumed while screen is just unlocked.
        if (this.childWindow) {
          this.closePairview();

          // set the flag to be true for resuming pairing request
          this.uncompletedPairing = true;
        }
      } else {
        // Resume uncompleted pairing procedure while screen just be unlocked.
        this.resumeUncompletedPairing();

        // Show pending pairing procedure while screen just be unlocked.
        this.showPendingPairing();
      }
    },

    // If there is a uncompleted pairing procedure while a user just unlocks
    // screen, we will resume pair view immediately.
    resumeUncompletedPairing: function() {
      if (this.uncompletedPairing) {
        this.showPairview(this.pairingInfo);

        // clean the flag of uncompleted pairing since it's resumed
        this.cleanUncompletedPairing();
      }
    },

    // If there is a pending pairing request while a user just unlocks screen,
    // we will show pair view immediately. Then, we clear up the notification.
    showPendingPairing: function() {
      if (this.pendingPairing) {
        // show pair view from the callback function
        if (this.pendingPairing.showPairviewCallback) {
          this.pendingPairing.showPairviewCallback();
        }

        this.cleanPendingPairing();
      }
    },

    cleanPendingPairing: function() {
      this.debug('cleanPendingPairing(): has pendingPairing = ' +
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

    cleanUncompletedPairing: function() {
      this.debug('cleanUncompletedPairing(): has uncompletedPairing = ' +
                 (this.uncompletedPairing));

      if (this.uncompletedPairing) {
        // Clear up the uncompleted pairing procedure
        this.uncompletedPairing = false;
      }
    },

    showPairview: function(pairingInfo) {
      this.debug('showPairview(): pairingInfo = ' + pairingInfo);

      // Pre-store the pairing info for the new request. It's prepairing for
      // uncompleted pairing request since we will close attention screen in
      // screen locked mode.
      this.pairingInfo = pairingInfo;

      var evt = pairingInfo;
      var device = {
        address: evt.address,
        name: evt.name || _('unnamed-device'),
        icon: evt.icon || 'bluetooth-default'
      };

      // Since pairing process is migrated from Settings app to Bluetooth app,
      // there is no way to identify the pairing request in active/passive mode.
      // In order to let the pairing messsage consistency,
      // given the pairing mode to be passive.
      var pairingMode = 'passive';

      var passkey = evt.passkey || null;
      var method = evt.method;
      var protocol = window.location.protocol;
      var host = window.location.host;
      this.childWindow = window.open(protocol + '//' + host + '/onpair.html',
                  'pair_screen', 'attention');
      var self = this;
      this.childWindow.onload = function childWindowLoaded() {
        self.childWindow.Pairview.init(pairingMode, method, device, passkey);
      };
    },

    closePairview: function() {
      if (this.childWindow) {
        this.childWindow.Pairview.closeInput();
        this.childWindow.close();
        this.childWindow = null;
      }
    },

    onBluetoothCancel: function(message) {
      this.debug('onBluetoothCancel(): event message = ' + message);

      // if the attention screen still open, close it
      this.closePairview();

      // If "bluetooth-cancel" system message is coming, and there is an
      // uncompleted pairing request, we have to clean up it. Because the
      // request is canceled by the requester.
      this.cleanUncompletedPairing();

      // If "bluetooth-cancel" system message is coming, and there is a
      // pending pairing request, we have reset the object. Because the callback
      // is useless since the older pairing request is expired.
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

    onBluetoothDisabled: function() {
      this.debug('onBluetoothDisabled():');

      // if the attention screen still open, close it
      this.closePairview();

      // Since Bluetooth is off, close itself.
      window.close();
    },

    setConfirmation: function(address, confirmed) {
      this.bluetoothHelper.setPairingConfirmation(address, confirmed);
      window.close();
    },

    setPinCode: function(address, pincode) {
      this.bluetoothHelper.setPinCode(address, pincode);
      window.close();
    },

    setPasskey: function(address, passkey) {
      var key = parseInt(passkey, 10);
      this.bluetoothHelper.setPasskey(address, key);
      window.close();
    },

    debug: function(msg) {
      if (_debug) {
        console.log('PairManager(): ' + msg);
      }
    }
  };

  exports.PairManager = PairManager;

})(window);

navigator.mozL10n.once(PairManager.init.bind(PairManager));
