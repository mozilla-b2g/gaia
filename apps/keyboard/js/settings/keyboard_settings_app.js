'use strict';

/* global SettingsPromiseManager, CloseLockManager, DialogController,
          MozActivity, PanelController, PromiseStorage */

(function(exports) {

var KeyboardSettingsApp = function KeyboardSettingsApp() {
  this.closeLockManager = null;

  this.settingsPromiseManager = null;
  this.preferencesStore = null;

  this.panelController = null;
  this.dialogController = null;

  this._closeLock = null;
};

KeyboardSettingsApp.prototype.PREFERENCES_STORE_NAME = 'preferences';

KeyboardSettingsApp.prototype.start = function() {
  this.closeLockManager = new CloseLockManager();
  this.closeLockManager.onclose = this.close.bind(this);
  this.closeLockManager.start();

  // SettingsPromiseManager wraps Settings DB methods into promises.
  // This must be available to *GroupView.
  this.settingsPromiseManager = new SettingsPromiseManager();

  // This is where we store keyboard specific preferences
  this.preferencesStore = new PromiseStorage(this.PREFERENCES_STORE_NAME);
  this.preferencesStore.start();

  this.panelController = new PanelController(this);
  this.panelController.start();

  this.dialogController = new DialogController();
  this.dialogController.start();

  document.addEventListener('visibilitychange', this);
};

KeyboardSettingsApp.prototype.stop = function() {
  this.closeLockManager.stop();
  this.closeLockManager = null;

  this.settingsPromiseManager = null;

  this.preferencesStore.stop();
  this.preferencesStore = null;

  this.panelController.stop();
  this.panelController = null;

  this.dialogController.stop();
  this.dialogController = null;

  document.removeEventListener('visibilitychange', this);
};

KeyboardSettingsApp.prototype.close = function() {
  this.stop();
  window.close();
};

KeyboardSettingsApp.prototype.requestClose = function() {
  // Until Haida lands this is how users could go back to Settings app
  Promise.resolve(new MozActivity({
    name: 'moz_configure_window',
    data: { target: 'device' }
  })).catch(function(e) {
    console.error(e);
  });
};

KeyboardSettingsApp.prototype.handleEvent = function(evt) {
  if (document.hidden) {
    this._closeLock =
      this.closeLockManager.requestLock('requestClose');
  } else if (this._closeLock) {
    this._closeLock.unlock();
    this._closeLock = null;
  }
};

exports.KeyboardSettingsApp = KeyboardSettingsApp;

})(window);
