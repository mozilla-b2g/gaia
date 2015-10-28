/* global SystemDialog, LazyLoader, Service */
'use strict';

(function(exports) {

  const LEARN_MORE_URL =
    'https://support.mozilla.org/kb/tracking-protection-firefox-os';

  /**
   * @class TrackingNotice
   * @param {options} object for attributes `onShow`, `onHide` callback.
   * @extends SystemDialog
   */
  var TrackingNotice = function(controller) {
    this.instanceID = 'tracking-notice';
    this.controller = controller || {};
    this.options = {};
    this._settings = navigator.mozSettings;
    this.renderDialog();
    this.publish('created');
  };

  TrackingNotice.prototype = Object.create(SystemDialog.prototype);

  TrackingNotice.prototype.customID = 'tracking-notice';

  TrackingNotice.prototype.DEBUG = false;

  TrackingNotice.prototype.name = 'TrackingNotice';

  TrackingNotice.prototype.containerElement =
    document.getElementById('fullscreen-dialog-overlay');

  TrackingNotice.prototype.renderDialog = function() {
    LazyLoader.load('shared/elements/gaia_switch/script.js', () => {
      this.render();
    });
  };

  TrackingNotice.prototype.view = function view() {
    return `<section id="tracking-notice" data-z-index-level="system-dialog"
              class='hidden dialog'>
              <div class="panel">
                <header><h1 data-l10n-id="tracking-notice-header"></h1></header>
                <p class="copy">
                  <span id="tracking-notice-copy"
                  data-l10n-id="tracking-notice-description-v2"></span>
                  <a id="tracking-notice-learn-more"
                    data-l10n-id="tracking-notice-learn-more">
                  </a>
                </p>
                <div class="setting">
                  <label data-l10n-id="tracking-protection"
                  for="tracking-protection-toggle"></label>
                  <gaia-switch id="tracking-protection-toggle">
                  </gaia-switch>
                  <p data-l10n-id="tracking-protection-setting-description"
                  class="subtitle"></p>
                </div>
              </div>
              <div class="confirm" id="tracking-notice-confirm">
                <p class="copy" data-l10n-id="tracking-notice-confirm"></p>
              </div>
            </section>`;
  };


  TrackingNotice.prototype._registerEvents = function() {
    var self = this;
    self.confirm.addEventListener('click', function onConfirm() {
      self.confirm.removeEventListener('click', onConfirm);
      self.confirmNotice();
    });
    window.addEventListener('appopened', this);
  };

  TrackingNotice.prototype.updateSwitchToMatchSettings = function() {
    var settingName = 'privacy.trackingprotection.enabled';
    var req = this._settings.createLock().get(settingName);
    req.onsuccess = () => {
      this.setting.checked = req.result[settingName];
    };
  };

  TrackingNotice.prototype._fetchElements = function spl_initElements() {
    this.element = document.querySelector('#' + this.instanceID);
    this.confirm = this.element.querySelector('#tracking-notice-confirm');
    this.setting = this.element.querySelector('gaia-switch');
    this.learnMore = this.element.querySelector('#tracking-notice-learn-more');

    this.learnMore.addEventListener('click', () => {
      var self = this;
      var activeApp = Service.query('AppWindowManager.getActiveWindow');
      var element = activeApp.element;

      this.hide();
      activeApp.navigate(LEARN_MORE_URL);

      // When the user clicks 'Learn More', go to that URL and display
      // back the dialog when navigates to any other page.
      element.addEventListener('_locationchange', function onLoadLearnMore() {
        element.removeEventListener('_locationchange', onLoadLearnMore);
        element.addEventListener('_locationchange', self);
      });
    });
  };

  TrackingNotice.prototype.show = function(data) {
    this.updateSwitchToMatchSettings();
    this.element.classList.remove('hidden');
    this.publish('show');
  };

  TrackingNotice.prototype.handleEvent = function(evt) {
    switch (evt.type) {
      case 'appopened':
      case '_locationchange':
        this.showIfNeeded(evt);
      break;
    }
  };

  TrackingNotice.prototype.showIfNeeded = function(evt) {
    var app = evt.detail;
    if (app.isSearch() || app.isBrowser()) {
      this.show();
    }
    app.element.removeEventListener('_locationchange', this);
  };

  TrackingNotice.prototype.resize = function resize() {
    var width = Service.query('LayoutManager.width');
    this.containerElement.style.width = width + 'px';
  };

  TrackingNotice.prototype.confirmNotice = function() {
    this._settings.createLock().set({
      'privacy.trackingprotection.enabled': this.setting.checked,
      'privacy.trackingprotection.shown': true
    });
    window.removeEventListener('appopened', this);
    window.removeEventListener('_locationchange', this);
    this.destroy();
  };

  TrackingNotice.prototype.hide = function() {
    this.element.classList.add('hidden');
    this.publish('hide');
  };

  TrackingNotice.prototype.destroy = function() {
    if (this.element) {
      this.hide();
      this.containerElement.removeChild(this.element);
    }
    this.publish('destroyed');
  };

  exports.TrackingNotice = TrackingNotice;
}(window));

