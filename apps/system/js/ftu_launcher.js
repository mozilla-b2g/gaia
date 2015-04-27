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
    'getFtuOrigin',
    'isFinished'
  ];
  FtuLauncher.SERVICES = [
    'stepReady',
    'skip',
    'launch'
  ];
  FtuLauncher.SETTINGS = [
    'ftu.manifestURL'
  ];
  FtuLauncher.SUB_MODULES = [];
  BaseModule.create(FtuLauncher, {
    name: 'FtuLauncher',
    DEBUG: false,
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
      if (!this._ftuPing) {
        LazyLoader.load(['js/ftu_ping.js']).then(function() {
          this._ftuPing = new FtuPing();
          this._ftuPing.ensurePing();
        }.bind(this));
      } else {
        this._ftuPing.ensurePing();
      }
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
        if (this.isStepFinished(request.step)) {
          request.resolve();
        } else {
          remainingRequest.push(request);
        }
      }, this);
      this._storedStepRequest = remainingRequest;
    },

    isFinished: function() {
      return this._done || this._skipped;
    },

    isStepFinished: function(step) {
      return this._done || this._skipped ||
        this._stepsList.indexOf(step) >= 0;
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

    /**
     * The function will be requested by the global Launcher
     * when it gets the ftu manifestURL.
     * @param  {String} manifestURL The manifest URL of ftu
     */
    launch: function(manifestURL) {
      this._ftuManifestURL = manifestURL;
      if (!manifestURL) {
        dump('FTU manifest cannot be found, skipping.\n');
        this.skip();
        return;
      }

      var ftu = this._ftu = applications.getByManifestURL(manifestURL);
      if (!ftu) {
        dump('Opps, bogus FTU manifest.\n');
        this.skip();
        return;
      }

      this._isRunningFirstTime = true;
      this._ftuOrigin = ftu.origin;
      // Open FTU
      ftu.launch();
    },

    respondToHierarchyEvent: function(evt) {
      if (this['_handle_' + evt.type]) {
        return this['_handle_' + evt.type](evt);
      }
      return true;
    },

    stepReady: function(step) {
      return new Promise(function(resolve) {
        if (this.isStepFinished(step)) {
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
      this._done = true;
      window.asyncStorage.setItem('ftu.enabled', false);
      // update the previous_os setting (asyn)
      // so we dont try and handle upgrade again
      LazyLoader.load(['shared/js/version_helper.js']).then(function() {
        VersionHelper.updatePrevious();
      });
      this.updateStep('done');
      this.publish('done');
      this.finish();
    },

    skip: function fl_skip() {
      window.performance.mark('ftuSkip');
      this._isRunningFirstTime = false;
      this._isUpgrading = false;
      this._skipped = true;
      this.updateStep('done');
      this.publish('skip');
      this.finish();
    },

    finish: function() {
      this.loadWhenIdle(['NewsletterManager']);
      this.writeSetting({'gaia.system.checkForUpdates': true});
      // XXX: remove after bug 1109451 is fixed
      LazyLoader.load(['js/migrators/settings_migrator.js']).then(function() {
        var settingsMigrator = new SettingsMigrator();
        settingsMigrator.start();
      });
    }
  });
}());
