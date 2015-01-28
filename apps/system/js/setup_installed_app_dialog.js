'use strict';

(function(exports) {
  var SetupInstalledAppDialog = function SetupInstalledAppDialog(options) {
    this.options = options || {};
    this.render();
    this.publish('created');
  };

  SetupInstalledAppDialog.prototype = Object.create(window.SystemDialog.prototype);

  SetupInstalledAppDialog.prototype.customID = 'setup-installed-app-dialog';

  SetupInstalledAppDialog.prototype.DEBUG = false;

  /**
   * Used for element id access.
   * e.g., 'authentication-dialog-alert-ok'
   * @type {String}
   * @memberof SetupInstalledAppDialog.prototype
   */
  SetupInstalledAppDialog.prototype.ELEMENT_PREFIX = 'setup-';

  /**
   * Maps to DOM elements.
   * @type {Object}
   * @memberof SetupInstalledAppDialog.prototype
   */
  SetupInstalledAppDialog.prototype.elements = null;

  SetupInstalledAppDialog.prototype._fetchElements =
    function appid__fetchElements() {
    this.element = document.getElementById(this.instanceID);
    this.elements = {};

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    this.elementIds = [
      'app-name', 'app-description',
      'cancel-button', 'confirm-button'
    ];

    this.elementIds.forEach(function createElementRef(id) {
      this.elements[toCamelCase(id)] =
        this.element.querySelector('#' + this.ELEMENT_PREFIX + id);
    }, this);
  };

  SetupInstalledAppDialog.prototype.view = function appid_view() {
    return `<form id="${this.instanceID}" class="generic-dialog"
            data-type="confirm" role="dialog"
            data-z-index-level="setup-installed-app-dialog" hidden>
              <section>
                <h1 id="setup-app-name"></h1>
                <p id="setup-app-description"></p>
              </section>
              <menu data-items="2">
                <button id="setup-cancel-button" type="button" 
                data-l10n-id="later">
                  Later
                </button>
                <button id="setup-confirm-button" 
                class="recommend" type="button" data-l10n-id="setup">
                  Setup
                </button>
              </menu>
            </form>`;
  };

  SetupInstalledAppDialog.prototype.getView = function appid_getView() {
    return document.getElementById(this.instanceID);
  };

  exports.SetupInstalledAppDialog = SetupInstalledAppDialog;

}(window));
