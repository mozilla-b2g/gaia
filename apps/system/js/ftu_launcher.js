'use strict';
/* globals applications, VersionHelper, dump, FtuPing, BaseModule,
           LazyLoader, SettingsMigrator */
/* This module deals with FTU stuff.
   FTU is known as First Time Usage,
   which is the first app the users would use, to configure their phone. */

(function() {
  var FtuLauncher = function() {};
  FtuLauncher.EVENTS = [
    'iac-ftucomms',
    'appterminated',
    'lockscreen-appopened',
    'appopened'
  ];
  FtuLauncher.IMPORTS = [
    'shared/js/uuid.js',
    'js/ftu_ping.js'
  ];
  FtuLauncher.STATES = [
    'isFtuUpgrading',
    'isFtuRunning',
    'getFtuOrigin'
  ];
  FtuLauncher.SERVICES = [
    'stepReady'
  ];
  FtuLauncher.SUB_MODULES = [
    'NewsletterManager'
  ];
  BaseModule.create(FtuLauncher, {
    name: 'FtuLauncher',
    DEBUG: true,
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

    _isUpgrading: false,

    _bypassHomeEvent: false,

    _start: function() {
      this._stepsList = [];
      this._storedStepRequest = [];
      this.retrieve();
    },

    isFtuRunning: function fl_isFtuRunning() {
      return this._isRunningFirstTime;
    },

    isFtuUpgrading: function fl_isFtuUpgrading() {
      return this._isUpgrading;
    },

    getFtuOrigin: function fl_getFtuOrigin() {
      return this._ftuOrigin;
    },

    getFtuPing: function fl_getFtuPing() {
      return this._ftuPing;
    },

    setBypassHome: function fl_setBypassHome(value) {
      this._bypassHomeEvent = value;
    },

    updateStep: function(step) {
      if (this._stepsList.indexOf(step) < 0) {
        this._stepsList.push(step);
      }

      var remainingRequest = [];
      this._storedStepRequest.forEach(function(request, index) {
        if (this._skipped || this._stepsList.indexOf(request.step) >= 0) {
          request.resolve();
        } else {
          remainingRequest.push(request);
        }
      }, this);
      this._storedStepRequest = remainingRequest;
    },

    _handle_home: function() {
      if (this._isRunningFirstTime) {
        // Because tiny devices have its own exit button,
        // this check is for large devices
        if (!this._bypassHomeEvent) {
          return false;
        } else {
          this.publish('killapp', { origin: this._ftuOrigin }, true);
        }
      }
      return true;
    },

    _handle_holdhome: function() {
      if (this._isRunningFirstTime) {
        return false;
      }
      return true;
    },

    respondToHierarchyEvent: function(evt) {
      if (this['_handle_' + evt.type]) {
        return this['_handle_' + evt.type](evt);
      }
      return true;
    },

    stepReady: function(step) {
      return new Promise(function(resolve) {
        if (this._stepsList.indexOf(step) >= 0 || this._skipped) {
          resolve();
        } else {
          this._storedStepRequest.push({
            resolve: resolve,
            step: step
          });
        }
      }.bind(this));
    },

    _handle_appopened: function(evt) {
      if (evt.detail.origin == this._ftuOrigin && this._isRunningFirstTime) {
        this.publish('open');
      }
    },

    '_handle_iac-ftucomms': function(evt) {
      var message = evt.detail;
      if (message === 'done') {
        this.setBypassHome(true);
      } else if (evt.detail.type === 'step') {
        this.updateStep(evt.detail.hash);
      }
    },

    _handle_appterminated: function(evt) {
      if (evt.detail.origin == this._ftuOrigin) {
        this.close();
      }
    },

    close: function fl_close() {
      this._isRunningFirstTime = false;
      this._isUpgrading = false;
      window.asyncStorage.setItem('ftu.enabled', false);
      // update the previous_os setting (asyn)
      // so we dont try and handle upgrade again
      VersionHelper.updatePrevious();
      this.updateStep('done');
      this.publish('done');
      this.finish();
    },

    launch: function fl_launch() {
      var self = this;
      this.readSetting('ftu.manifestURL').then(function(value) {
        var manifestURL = value;

        self._ftuManifestURL = manifestURL;
        if (!manifestURL) {
          dump('FTU manifest cannot be found, skipping.\n');
          self.skip();
          return;
        }

        var ftu = self._ftu = applications.getByManifestURL(manifestURL);
        if (!ftu) {
          dump('Opps, bogus FTU manifest.\n');
          self.skip();
          return;
        }

        self._isRunningFirstTime = true;
        self._ftuOrigin = ftu.origin;
        // Open FTU
        ftu.launch();
      });
    },

    skip: function fl_skip() {
      this._isRunningFirstTime = false;
      this._isUpgrading = false;
      this._skipped = true;
      this.updateStep('done');
      this.publish('skip');
      this.finish();
    },

    finish: function() {
      this.writeSetting({'gaia.system.checkForUpdates': true});
      // XXX: remove after bug 1109451 is fixed
      LazyLoader.load(['js/migrators/settings_migrator.js']).then(function() {
        var settingsMigrator = new SettingsMigrator();
        settingsMigrator.start();
      });
    },

    // Check if the FTU was executed or not, if not, get a
    // reference to the app and launch it.
    retrieve: function fl_retrieve() {
      var self = this;
      if (!this._ftuPing) {
        this._ftuPing = new FtuPing();
      }

      this._ftuPing.ensurePing();

      // launch FTU when a version upgrade is detected
      VersionHelper.getVersionInfo().then(function(versionInfo) {
        if (versionInfo.isUpgrade()) {
          self._isUpgrading = true;
          self.launch();
        } else {
          window.asyncStorage.getItem('ftu.enabled', function(shouldFTU) {
            self._isUpgrading = false;
            // launch full FTU when enabled
            if (shouldFTU !== false) {
              self.launch();
            } else {
              self.skip();
            }
          });
        }
      }, function(err) {
        dump('VersionHelper failed to lookup version settings, skipping.\n');
        self.skip();
      });
    }
  });
}());
