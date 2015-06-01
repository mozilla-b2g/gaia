'use strict';

/* global MobileIdDialog, applications, LazyLoader */

(function(exports) {
  // Event names.
  const CONTENT_EVENT = 'mozMobileIdContentEvent';
  const CHROME_EVENT = 'mozMobileIdChromeEvent';
  const UNSOLICITED_EVENT = 'mozMobileIdUnsolContentEvent';

  var MobileIdManager = {
    dialog: null,
    // iframe: null,
    start: function() {
      // Add listener to the events from Gecko related with the
      // Mobile ID
      window.addEventListener(
        CHROME_EVENT,
        this.onChromeEvent.bind(this)
      );
    },

    onChromeEvent: function mobileid_onChromeEvent(event) {
      if (!event || !event.detail) {
        console.error('Wrong event');
        return;
      }

      var message = event.detail;
      var params = message.data;

      if (message.id) {
        this.chromeEventId = message.id;
      }

      switch (message.eventName) {
        case 'onpermissionrequest':
          // If the user introduced a wrong phone number we will be receiving
          // an "onerror" notifying about the incorrect input followed by a new
          // "onpermissionrequest" restarting the mobileid flow. If that's the
          // case as we would already have an opened dialog, we just bail out
          // discarding the event.
          if (this.dialog) {
            return;
          }
          this.openDialog(params);
          break;
        default:
          if (!this.dialog) {
            return;
          }
          this.dialog.dispatchEvent(message.eventName, params);
          break;
      }
    },

    cleanup: function mobileid_cleanup() {
      if (this.dialog) {
        this.dialog.reset();
        this.dialog = null;
      }

      if (this.chromeEventId) {
        // There's a pending content requests, so we need to notify about
        // the flow cancelation
        this.sendContentEvent(CONTENT_EVENT, {
          id: this.chromeEventId,
          error: 'DIALOG_CLOSED_BY_USER'
        });
        this.chromeEventId = null;
      }
    },

    cancel: function mobileid_cancel(isVerificationDone) {
      // Once the UI is closed we clean the vars
      this.cleanup();

      // Let the backend close this as an error
      if (!isVerificationDone) {
        this.sendContentEvent(UNSOLICITED_EVENT, {
          eventName: 'cancel'
        });
      }
    },

    close: function mobileid_close(isVerificationDone) {
      if (!this.dialog) {
        return;
      }
      // Close with transition
      this.dialog.close(this.cancel.bind(this, isVerificationDone));
    },

    sendMsisdn: function mobileid_close(msisdnSelected) {
      // Send info retrieved from UI to API
      this.sendContentEvent(CONTENT_EVENT, {
        id: this.chromeEventId || null,
        result: msisdnSelected
      });
    },

    sendVerificationCode: function mobileid_sendVerificationCode(code) {
      this.sendContentEvent(CONTENT_EVENT, {
        id: this.chromeEventId || null,
        result: {
          verificationCode: code || ''
        }
      });
    },

    requestNewCode: function mobileid_askForNewCode() {
      this.sendContentEvent(
        UNSOLICITED_EVENT,
        {
          eventName: 'resendcode'
        }
      );
    },

    sendContentEvent: function mobileid_sendContentEvent(eventName, msg) {
      var event = new CustomEvent(eventName, {
        detail: msg
      });
      window.dispatchEvent(event);
    },

    openDialog: function mobileid_openDialog(params) {
      // Retrieve the info of the app given the manifestURL
      var app = applications.getByManifestURL(params.manifestURL);
      if (!app) {
        this.cancel(false);
        console.error('App is not available when requesting Mobile ID');
        return;
      }


      // Create Dialog
      var dialogOptions = {
        onHide: this.cleanup.bind(this),
        onLoaded: function onLoaded() {
          // Once the iframe is loaded, we send the params to render
          this.dialog.dispatchEvent(
            'init',
            {
              appName: app.manifest.name,
              candidates: params.phoneNumberInfo
            }
          );
        }.bind(this)
      };

      LazyLoader.load(['js/mobileid_dialog.js']).then(() => {
        this.dialog = new MobileIdDialog(dialogOptions);
      }).catch((err) => {
        console.error(err);
      });
    }
  };
  exports.MobileIdManager = MobileIdManager;
}(window));
