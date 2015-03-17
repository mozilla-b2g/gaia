'use strict';
/* globals applications, VersionHelper, dump, FtuPing, Service */
/* This module deals with FTU stuff.
   FTU is known as First Time Usage,
   which is the first app the users would use, to configure their phone. */

var FtuLauncher = {
  name: 'FtuLauncher',

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

  init: function fl_init() {
    this._stepsList = [];
    this._storedStepRequest = [];
    // for iac connection
    window.addEventListener('iac-ftucomms', this);

    // Listen to appterminated event
    window.addEventListener('appterminated', this);

    // Avoid race condition that
    // lockscreen is locked after FTU inited.
    window.addEventListener('lockscreen-appopened', this);

    // Monitor appopen event
    // to unlock lockscreen if we are running FTU at first time
    window.addEventListener('appopened', this);

    Service.registerState('isFtuUpgrading', this);
    Service.registerState('isFtuRunning', this);
    Service.register('stepReady', this);
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

  _handle_home: function() {
    if (this._isRunningFirstTime) {
      // Because tiny devices have its own exit button,
      // this check is for large devices
      if (!this._bypassHomeEvent) {
        return false;
      } else {
        var killEvent = document.createEvent('CustomEvent');
        killEvent.initCustomEvent('killapp',
          /* canBubble */ true, /* cancelable */ false, {
          origin: this._ftuOrigin
        });
        window.dispatchEvent(killEvent);
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

  isStepFinished: function(step) {
    return this._done || this._skipped ||
      this._stepsList.indexOf(step) >= 0;
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

  handleEvent: function fl_init(evt) {
    switch (evt.type) {
      case 'appopened':
        if (evt.detail.origin == this._ftuOrigin && this._isRunningFirstTime) {
          // FTU starting, letting everyone know
          var ftuopenEvt = document.createEvent('CustomEvent');
          ftuopenEvt.initCustomEvent('ftuopen',
          /* canBubble */ true, /* cancelable */ false, {});
          window.dispatchEvent(ftuopenEvt);
        }
        break;

      case 'iac-ftucomms':
        var message = evt.detail;
        if (message === 'done') {
          this.setBypassHome(true);
        } else if (evt.detail.type === 'step') {
          this.updateStep(evt.detail.hash);
        }
        break;

      case 'appterminated':
        if (evt.detail.origin == this._ftuOrigin) {
          this.close();
        }
        break;
    }
  },

  close: function fl_close() {
    this._isRunningFirstTime = false;
    this._isUpgrading = false;
    this._done = true;
    window.asyncStorage.setItem('ftu.enabled', false);
    // update the previous_os setting (asyn)
    // so we dont try and handle upgrade again
    VersionHelper.updatePrevious();
    this.updateStep('done');
    // Done with FTU, letting everyone know
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('ftudone',
      /* canBubble */ true, /* cancelable */ false, {});
    window.dispatchEvent(evt);
  },

  launch: function fl_launch() {
    var self = this;

    var req = navigator.mozSettings.createLock().get('ftu.manifestURL');
    req.onsuccess = function() {
      var manifestURL = req.result['ftu.manifestURL'];

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
    };
    req.onerror = function() {
      dump('Couldn\'t get the ftu manifestURL.\n');
      self.skip();
    };
  },

  skip: function fl_skip() {
    this._isRunningFirstTime = false;
    this._isUpgrading = false;
    this._skipped = true;
    this.updateStep('done');
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('ftuskip',
      /* canBubble */ true, /* cancelable */ false, {});
    window.dispatchEvent(evt);
  },

  // Check if the FTU was executed or not, if not, get a
  // reference to the app and launch it.
  // Used by Bootstrap module.
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
        window.asyncStorage.getItem('ftu.enabled', function getItem(shouldFTU) {
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
};

FtuLauncher.init();
