'use strict';
/* This module deals with FTU stuff.
   FTU is known as First Time Usage,
   which is the first app the users would use, to configure their phone. */

var FtuLauncher = {

  /* The url of FTU */
  _origin: '',

  /* Store that if FTU is currently running */
  _isRunningFirstTime: false,

  _bypassHomeEvent: false,

  isFtuRunning: function fl_isFtuRunning() {
    return this._isRunningFirstTime;
  },

  getFtuOrigin: function fl_getFtuOrigin() {
    return this._origin;
  },

  setBypassHome: function fl_setBypassHome(value) {
    this._bypassHomeEvent = value;
  },

  init: function fl_init() {
    var self = this;

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
    window.addEventListener('lock', this);

    // Monitor appopen event
    // to unlock lockscreen if we are running FTU at first time
    window.addEventListener('appopened', this);
  },

  handleEvent: function fl_init(evt) {
    switch (evt.type) {
      case 'appopened':
        if (evt.detail.origin == this._origin && this._isRunningFirstTime) {
          // FTU starting, letting everyone know
          var evt = document.createEvent('CustomEvent');
          evt.initCustomEvent('ftuopen',
          /* canBubble */ true, /* cancelable */ false, {});
          window.dispatchEvent(evt);
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
              origin: this._origin
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
        if (evt.detail.origin == this._origin) {
          this.close();
        }
        break;

      case 'lock':
        if (this._isRunningFirstTime)
          lockScreen.unlock(true);
        break;
    }
  },

  close: function fl_close() {
    this._isRunningFirstTime = false;
    window.asyncStorage.setItem('ftu.enabled', false);
    var lock = navigator.mozSettings.createLock();
    lock.set({ 'deviceinfo.previous_os': '' });
    // Done with FTU, letting everyone know
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('ftudone',
      /* canBubble */ true, /* cancelable */ false, {});
    window.dispatchEvent(evt);
  },

  skip: function fl_skip() {
    this._isRunningFirstTime = false;
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('ftuskip',
      /* canBubble */ true, /* cancelable */ false, {});
    window.dispatchEvent(evt);
  },

  launch: function fl_launch() {
    var self = this;
    var lock = navigator.mozSettings.createLock();
    var req = lock.get('ftu.manifestURL');
    req.onsuccess = function() {
      var manifestURL = this.result['ftu.manifestURL'];
      if (!manifestURL) {
        self.skip();
        return;
      }

      var ftu = applications.getByManifestURL(manifestURL);
      if (!ftu) {
        self.skip();
        return;
      }

      self._origin = ftu.origin + ftu.manifest.entry_points['ftu'].launch_path;
      self._isRunningFirstTime = true;
      ftu.launch('ftu');
    };
    req.onerror = function() {
      self.skip();
    };
  },

  // Check if the FTU was executed or not, if not, get a
  // reference to the app and launch it.
  // Used by Bootstrap module.
  retrieve: function fl_retrieve() {
    var self = this;
    FtuPing.ensurePing();
    window.asyncStorage.getItem('ftu.enabled', function getItem(shouldFTU) {
      if (shouldFTU !== false) {
        self.launch();
        return;
      }

      // Verify if there is any FTU Update to show
      var lock = navigator.mozSettings.createLock();
      var req = lock.get('deviceinfo.os');
      req.onsuccess = function() {
        var currentVersion = this.result['deviceinfo.os'];

        var reqPrevious = lock.get('deviceinfo.previous_os');
        reqPrevious.onsuccess = function() {
          var previousVersion = this.result['deviceinfo.previous_os'];
          if (previousVersion !== '' && previousVersion !== currentVersion) {
            self.launch();
          } else {
            self.skip();
          }
        };
      };
    });
  }
};

FtuLauncher.init();
