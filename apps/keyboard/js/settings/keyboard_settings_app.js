'use strict';

/* global SettingsPromiseManager, CloseLockManager,
          GeneralSettingsGroupView, HandwritingSettingsGroupView,
          MozActivity */

(function(exports) {

var KeyboardSettingsApp = function KeyboardSettingsApp() {
  this.closeLockManager = null;
  this.generalSettingsGroupView = null;
  this.handwritingSettingsGroupView = null;

  this._closeLock = null;
};

KeyboardSettingsApp.prototype.start = function() {
  this.closeLockManager = new CloseLockManager();
  this.closeLockManager.start();

  // SettingsPromiseManager wraps Settings DB methods into promises.
  // This must be available to *GroupView.
  this.settingsPromiseManager = new SettingsPromiseManager();

  this.generalSettingsGroupView = new GeneralSettingsGroupView(this);
  this.generalSettingsGroupView.start();

  // We might not have handwriting settings
  if (typeof HandwritingSettingsGroupView === 'function') {
    this.handwritingSettingsGroupView = new HandwritingSettingsGroupView(this);
    this.handwritingSettingsGroupView.start();
  }

  var header = this.header = document.getElementById('header');
  header.addEventListener('action', this);

  document.addEventListener('visibilitychange', this);
};

KeyboardSettingsApp.prototype.stop = function() {
  this.closeLockManager.stop();
  this.closeLockManager = null;

  this.settingsPromiseManager = null;

  this.generalSettingsGroupView.stop();
  this.generalSettingsGroupView = null;

  if (this.handwritingSettingsGroupView) {
    this.handwritingSettingsGroupView.stop();
    this.handwritingSettingsGroupView = null;
  }

  this.header.removeEventListener('action', this);
  this.header = null;

  document.removeEventListener('visibilitychange', this);
};

KeyboardSettingsApp.prototype.handleEvent = function(evt) {
  switch (evt.type) {
    case 'action':
      // Until Haida lands this is how users could go back to Settings app
      Promise.resolve(new MozActivity({
        name: 'moz_configure_window',
        data: { target: 'device' }
      })).catch(function(e) {
        console.error(e);
      });

      break;

    case 'visibilitychange':
      if (document.hidden) {
        this._closeLock =
          this.closeLockManager.requestLock('requestClose');
      } else if (this._closeLock) {
        this._closeLock.unlock();
        this._closeLock = null;
      }

      break;
  }
};

exports.KeyboardSettingsApp = KeyboardSettingsApp;

})(window);
