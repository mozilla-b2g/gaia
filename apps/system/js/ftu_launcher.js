/* global BaseModule, FtuPing, VersionHelper */
'use strict';

(function(exports) {
  /**
   * This module deals with FTU stuff.
   * FTU is known as First Time Usage,
   * which is the first app the users would use, to configure their phone.
   */
  var FtuLauncher = function() {};
  FtuLauncher.SUB_MODULES = ['FtuPing'];
  FtuLauncher.EVENTS =
    ['home', 'holdhome', 'iac-ftucomms', 'appterminated',
      'lockscreen-appopened', 'appopened'];
  FtuLauncher.prototype = Object.create(BaseModule.prototype);
  FtuLauncher.prototype.constructor = FtuLauncher;
  FtuLauncher.IMPORTS = ['shared/js/version_helper.js'];
  var mixin = {
    name: 'FtuLauncher',

    EVENT_PREFIX: 'ftu',
    /* The application object of ftu got from Application module */
    _ftu: null,

    /* The manifest URL of FTU */
    _ftuManifestURL: '',

    /* The origin of FTU */
    _ftuOrigin: '',

    /* The FTU ping service instance */
    _ftuPing: null,

    /* Store that if FTU is currently running */
    _isRunningFirstTime: false,

    _bypassHomeEvent: false,

    isFtuRunning: function fl_isFtuRunning() {
      return this._isRunningFirstTime;
    },

    getFtuOrigin: function fl_getFtuOrigin() {
      return this._ftuOrigin;
    },

    getFtuPing: function fl_getFtuPing() {
      return this.ftuPing;
    },

    setBypassHome: function fl_setBypassHome(value) {
      this._bypassHomeEvent = value;
    },

    _start: function() {
      if (System && System.applicationReady) {
        this.retrieve();
      } else {
        window.addEventListener('applicationready', this);
      }
    },

    _stop: function() {
      window.removeEventListener('applicationready', this);
    },

    _handle_applicationready: function() {
      this.retrieve();
    },

    _handle_appopened: function(evt) {
      if (evt.detail.origin == this._ftuOrigin && this._isRunningFirstTime) {
        this.publish('open');
      }
    },

    _handle_home: function(evt) {
      if (this._isRunningFirstTime) {
        // Because tiny devices have its own exit button,
        // this check is for large devices
        if (!this._bypassHomeEvent) {
          evt.stopImmediatePropagation();
        } else {
          // XXX: This should not happen.
          // Use FtuWindow.kill() in the future,
          // or tell Ftu app to do so.
          var killEvent = document.createEvent('CustomEvent');
          killEvent.initCustomEvent('killapp',
            /* canBubble */ true, /* cancelable */ false, {
            origin: this._ftuOrigin
          });
          window.dispatchEvent(killEvent);
        }
      }
    },

    '_handle_iac-ftucomms': function(evt) {
      var message = evt.detail;
      if (message === 'done') {
        this.setBypassHome(true);
      }
    },

    _handle_holdhome: function(evt) {
      if (this._isRunningFirstTime) {
        evt.stopImmediatePropagation();
      }
    },

    _handle_appterminated: function(evt) {
      if (evt.detail.origin == this._ftuOrigin) {
        this.close();
      }
    },

    '_handle_lockscreen-appopened': function(evt) {
      if (this._isRunningFirstTime) {
        this.publish('request-unlock');
      }
    },

    close: function fl_close() {
      this._isRunningFirstTime = false;
      window.asyncStorage.setItem('ftu.enabled', false);
      // update the previous_os setting (asyn)
      // so we dont try and handle upgrade again
      VersionHelper.updatePrevious();
      // Done with FTU, letting everyone know
      this.publish('done');
      this.stop();
    },

    launch: function fl_launch() {
      var self = this;
      this.debug('Try launching FTU, getting manifestURL');
      var req = navigator.mozSettings.createLock().get('ftu.manifestURL');
      req.onsuccess = function() {
        var manifestURL = req.result['ftu.manifestURL'];

        self._ftuManifestURL = manifestURL;
        if (!manifestURL) {
          self.debug('FTU manifest cannot be found, skipping.\n');
          self.skip();
          return;
        }

        var ftu = self._ftu = applications.getByManifestURL(manifestURL);
        if (!ftu) {
          self.debug('Opps, bogus FTU manifest.\n');
          self.skip();
          return;
        }

        self._isRunningFirstTime = true;
        self._ftuOrigin = ftu.origin;
        // Open FTU
        ftu.launch();
      };
      req.onerror = function() {
        self.debug('Couldn\'t get the ftu manifestURL.\n');
        self.skip();
      };
    },

    skip: function fl_skip() {
      this.debug('skipping FTU..');
      this._isRunningFirstTime = false;
      this.publish('skip');
      this.stop();
    },

    // Check if the FTU was executed or not, if not, get a
    // reference to the app and launch it.
    // Used by Bootstrap module.
    retrieve: function fl_retrieve() {
      var self = this;

      // launch FTU when a version upgrade is detected
      VersionHelper.getVersionInfo().then(function(versionInfo) {
        if (versionInfo.isUpgrade()) {
          self.debug('upgrading, launching FTU..');
          self.launch();
        } else {
          window.asyncStorage.getItem('ftu.enabled',
            function getItem(shouldFTU) {
              // launch full FTU when enabled
              if (shouldFTU !== false) {
                self.debug('never launched..');
                self.launch();
              } else {
                self.debug('already launched..');
                self.skip();
              }
            });
        }
      }, function(err) {
        self.debug(
          'VersionHelper failed to lookup version settings, skipping.\n');
        self.skip();
      });
    }
  };
  BaseModule.mixin(FtuLauncher.prototype, mixin);

  exports.FtuLauncher = FtuLauncher;
}(window));
