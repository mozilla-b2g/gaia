'use strict';

(function(exports) {
  var AppDownloadCancelDialog = function AppDownloadCancelDialog(options) {
    this.options = options || {};
    this.render();
    this.publish('created');
  };

  AppDownloadCancelDialog.prototype = Object.create(window.SystemDialog.prototype);

  AppDownloadCancelDialog.prototype.customID = 'app-download-cancel-dialog';

  AppDownloadCancelDialog.prototype.DEBUG = false;

  /**
   * Used for element id access.
   * e.g., 'authentication-dialog-alert-ok'
   * @type {String}
   * @memberof AppDownloadCancelDialog.prototype
   */
  AppDownloadCancelDialog.prototype.ELEMENT_PREFIX = 'app-download-';

  /**
   * Maps to DOM elements.
   * @type {Object}
   * @memberof AppDownloadCancelDialog.prototype
   */
  AppDownloadCancelDialog.prototype.elements = null;

  AppDownloadCancelDialog.prototype._fetchElements =
    function appid__fetchElements() {
    this.element = document.getElementById(this.instanceID);
    this.elements = {};

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    this.elementIds = [
      'stop-button', 'continue-button'
    ];

    this.elementIds.forEach(function createElementRef(id) {
      this.elements[toCamelCase(id)] =
        this.element.querySelector('#' + this.ELEMENT_PREFIX + id);
    }, this);
  };

  AppDownloadCancelDialog.prototype.view = function appid_view() {
    return `<form id="${this.instanceID}" class="generic-dialog"
            data-type="confirm" role="dialog"
            data-z-index-level="app-install-dialog" hidden>
              <section>
                <h1></h1>
                <p data-l10n-id="app-download-can-be-restarted">
                  The download can be restarted later.
                </p>
              </section>
              <menu data-items="2">
                <button id="app-download-stop-button" 
                class="danger confirm" data-l10n-id="app-download-stop-button">
                  Stop Download
                </button>
                <button id="app-download-continue-button" 
                class="cancel" type="reset" data-l10n-id="continue">
                  Continue
                </button>
              </menu>
            </form>`;
  };

  AppDownloadCancelDialog.prototype.getView = function appid_getView() {
    return document.getElementById(this.instanceID);
  };

  exports.AppDownloadCancelDialog = AppDownloadCancelDialog;

}(window));
