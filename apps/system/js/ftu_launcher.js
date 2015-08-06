'use strict';
/* globals applications, VersionHelper, dump, FtuPing, SettingsCache */
/* This module deals with FTU stuff.
   FTU is known as First Time Usage,
   which is the first app the users would use, to configure their phone. */

var FtuLauncher = {
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
    // We have to block home/holdhome event if FTU is first time running.
    // Note: FTU could be launched from Settings app too.
    // We don't want to block home/holdhome in that case.
    window.addEventListener('home', this);
    window.addEventListener('holdhome', this);

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

      case 'home':
        if (this._isRunningFirstTime) {
          // Because tiny devices have its own exit button,
          // this check is for large devices
          if (!this._bypassHomeEvent) {
            evt.stopImmediatePropagation();
          } else {
            var killEvent = document.createEvent('CustomEvent');
            killEvent.initCustomEvent('killapp',
              /* canBubble */ true, /* cancelable */ false, {
              origin: this._ftuOrigin
            });
            window.dispatchEvent(killEvent);
          }
        }
        break;

      case 'iac-ftucomms':
        var message = evt.detail;
        if (message === 'done') {
          this.setBypassHome(true);
        }
        break;

      case 'holdhome':
        if (this._isRunningFirstTime) {
          evt.stopImmediatePropagation();
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
    window.asyncStorage.setItem('ftu.enabled', false);
    // update the previous_os setting (asyn)
    // so we dont try and handle upgrade again
    VersionHelper.updatePrevious();
    // Done with FTU, letting everyone know
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('ftudone',
      /* canBubble */ true, /* cancelable */ false, {});
    window.dispatchEvent(evt);
  },

  launch: function fl_launch() {
    var self = this;

    SettingsCache.get('ftu.manifestURL', function(value) {
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
