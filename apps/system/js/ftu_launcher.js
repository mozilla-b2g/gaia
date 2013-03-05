'use strict';
/* This module deals with FTU stuff.
   FTU is known as First Time Usage,
   which is the first app the users would use, to configure their phone. */

var FtuLauncher = {

  /* The application object of ftu got from Application module */
  _ftu: null,

  /* The manifest URL of FTU */
  _ftuManifestURL: '',

  /* The url of FTU */
  _ftuURL: '',

  /* Store that if FTU is currently running */
  _isRunningFirstTime: false,

  isFtuRunning: function fl_isFtuRunning() {
    return this._isRunningFirstTime;
  },

  getFtuOrigin: function fl_getFtuOrigin() {
    return this._ftuURL;
  },

  init: function fl_init() {
    // We have to block home/holdhome event if FTU is first time running.
    // Note: FTU could be launched from Settings app too.
    // We don't want to block home/holdhome in that case.
    window.addEventListener('home', this);
    window.addEventListener('holdhome', this);

    // Listen to appterminated event
    window.addEventListener('appterminated', this);

    // Avoid race condition that
    // lockscreen is locked after FTU inited.
    window.addEventListener('lock', this);

    // Monitor appopen event
    // to unlock lockscreen if we are running FTU at first time
    window.addEventListener('appopen', this);
  },

  handleEvent: function fl_init(evt) {
    switch (evt.type) {
      case 'appopen':
        if (evt.detail.origin == this._ftuURL && this._isRunningFirstTime) {
          LockScreen.unlock(true);
        }
        break;

      case 'home':
      case 'holdhome':
        if (this._isRunningFirstTime) {
          evt.stopImmediatePropagation();
        }
        break;

      case 'appterminated':
        if (evt.detail.origin == this._ftuURL) {
          this.close();
        }
        break;

      case 'lock':
        if (this._isRunningFirstTime)
          LockScreen.unlock(true);
        break;
    }
  },

  close: function fl_close() {
    this._isRunningFirstTime = false;
    window.asyncStorage.setItem('ftu.enabled', false);
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

  // Check if the FTU was executed or not, if not, get a
  // reference to the app and launch it.
  // Used by Bootstrap module.
  retrieve: function fl_retrieve() {
    var self = this;
    window.asyncStorage.getItem('ftu.enabled', function getItem(launchFTU) {
      if (launchFTU === false) {
        self.skip();
        return;
      }
      var lock = navigator.mozSettings.createLock();
      var req = lock.get('ftu.manifestURL');
      req.onsuccess = function() {
        self._ftuManifestURL = this.result['ftu.manifestURL'];
        if (!self._ftuManifestURL) {
          dump('FTU manifest cannot be found skipping.\n');
          self.skip();
          return;
        }
        self._ftu = Applications.getByManifestURL(self._ftuManifestURL);
        if (!self._ftu) {
          dump('Opps, bogus FTU manifest.\n');
          self.skip();
          return;
        }
        self._ftuURL =
          self._ftu.origin + self._ftu.manifest.entry_points['ftu'].launch_path;
        self._isRunningFirstTime = true;
        // Open FTU
        self._ftu.launch('ftu');
      };
      req.onerror = function() {
        dump('Couldn\'t get the ftu manifestURL.\n');
        self.skip();
      };
    });
  }
};

FtuLauncher.init();
