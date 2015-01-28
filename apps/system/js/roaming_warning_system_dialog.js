/* global SystemDialog, Service */
'use strict';

(function(exports) {
  /**
   * @class RoamingWarningSystemDialog
   * @extends SystemDialog
   */
  var RoamingWarningSystemDialog = function(controller) {
    this.instanceID = 'raoming-warning';
    this.controller = controller;
    this.options = {};
    /**
     * render the dialog
     */
    this.render();
    this.publish('created');
  };

  RoamingWarningSystemDialog.prototype = Object.create(SystemDialog.prototype,
    {
      visible: {
        configurable: false,
        get: function() {
          return this._visible;
        }
      },
    });

  RoamingWarningSystemDialog.prototype.DEBUG = false;

  RoamingWarningSystemDialog.prototype.name = 'RoamingWarningSystemDialog';

  /**
   * Setting key for data enabled.
   * @memberof QuickSettings.prototype
   * @type {String}
   */
  RoamingWarningSystemDialog.prototype.DATA_KEY = 'ril.data.enabled';

  /**
   * Setting key for data roaming enabled.
   * @memberof QuickSettings.prototype
   * @type {String}
   */
  RoamingWarningSystemDialog.prototype.DATA_ROAMING_KEY =
    'ril.data.roaming_enabled';

  RoamingWarningSystemDialog.prototype.instanceID =
    'roaming-warning-system-dialog';

  RoamingWarningSystemDialog.prototype.customID = 'roaming-warning';

  RoamingWarningSystemDialog.prototype.view = function spd_view() {
    return `<form id="${this.instanceID}" data-type="confirm" role="dialog"
         class="generic-dialog">
        <section>
          <h1 data-l10n-id="data-roaming-enabled-title"></h1>
          <p data-l10n-id="data-roaming-enabled-warning2"></p>
        </section>
        <menu data-items="2">
          <button type="button" class="quick-setting-data-cancel-btn recommend"
            data-l10n-id="notNow">Not now</button>
          <button type="button" class="quick-setting-data-ok-btn"
            data-l10n-id="turnOn">Turn ON</button>
        </menu>
      </form>`;
  };

  RoamingWarningSystemDialog.prototype._registerEvents = function() {
    this.ok.onclick = this.enableRoaming.bind(this);
    this.cancel.onclick = this.hide.bind(this);
    this.ok.onmousedown = this._handle_mousedown.bind(this);
    this.cancel.onmousedown = this._handle_mousedown.bind(this);
  };

  RoamingWarningSystemDialog.prototype.enableRoaming = function() {
    var cset = {};
    cset[this.DATA_KEY] = true;
    cset[this.DATA_ROAMING_KEY] = true;
    Service.request('set', cset);
    this.hide();
  };

  RoamingWarningSystemDialog.prototype._fetchElements = function() {
    this.ok =
      document.querySelector('.quick-setting-data-ok-btn');
    this.cancel =
      document.querySelector('.quick-setting-data-cancel-btn');
    this.element = document.getElementById(this.instanceID);
  };

  RoamingWarningSystemDialog.prototype._handle_mousedown = function(evt) {
    evt.preventDefault();
  };

  RoamingWarningSystemDialog.prototype._visible = false;

  exports.RoamingWarningSystemDialog = RoamingWarningSystemDialog;
}(window));
