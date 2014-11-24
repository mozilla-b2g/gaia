'use strict';

/* global SettingsPromiseManager, CloseLockManager, UserDictionaryListPanel,
          GeneralSettingsGroupView, HandwritingSettingsGroupView,
          MozActivity, PanelController, UserDictionaryEditPanel */

(function(exports) {

var KeyboardSettingsApp = function KeyboardSettingsApp() {
  this.closeLockManager = null;
  this.generalSettingsGroupView = null;
  this.handwritingSettingsGroupView = null;

  // the existence of panelController is indicative of the suport for userdict.
  // let's keep the reference of panels here for now.
  this.panelController = null;
  this.userDictionaryListPanel = null;
  this.userDictionaryEditPanel = null;

  this._closeLock = null;
};

KeyboardSettingsApp.prototype.start = function() {
  this.closeLockManager = new CloseLockManager(this);
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

  // We support user dictionary!
  if (typeof PanelController === 'function') {
    this.panelController = new PanelController(document.getElementById('root'));
    this.panelController.start();

    this.userDictionaryEditPanel = new UserDictionaryEditPanel();

    this.userDictionaryListPanel = new UserDictionaryListPanel(this);

    document.getElementById('menu-userdict').addEventListener('click', this);
  }

  var header = this.header = document.getElementById('root-header');
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

  if (this.panelController) {
    this.panelController.stop();
    this.panelController = null;

    this.userDictionaryListPanel.uninit();
    this.userDictionaryListPanel = null;

    this.userDictionaryEditPanel.uninit();
    this.userDictionaryEditPanel = null;

    document.getElementById('menu-userdict').removeEventListener('click', this);
  }

  this.header.removeEventListener('action', this);
  this.header = null;

  document.removeEventListener('visibilitychange', this);
};

KeyboardSettingsApp.prototype.onclose = function() {
  this.stop();
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

    case 'click':
      this.panelController.navigateToPanel(this.userDictionaryListPanel);
      evt.preventDefault();
  }
};

exports.KeyboardSettingsApp = KeyboardSettingsApp;

})(window);
