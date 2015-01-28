'use strict';

(function(exports) {
  var AppInstallCancelDialog = function AppInstallDialog(options) {
    this.options = options || {};
    this.render();
    this.publish('created');
  };

  AppInstallCancelDialog.prototype =
    Object.create(window.SystemDialog.prototype);

  AppInstallCancelDialog.prototype.customID = 'app-install-cancel-dialog';

  AppInstallCancelDialog.prototype.DEBUG = false;

  /**
   * Used for element id access.
   * e.g., 'authentication-dialog-alert-ok'
   * @type {String}
   * @memberof AppInstallCancelDialog.prototype
   */
  AppInstallCancelDialog.prototype.ELEMENT_PREFIX = 'app-install-cancel-';

  /**
   * Maps to DOM elements.
   * @type {Object}
   * @memberof AppInstallCancelDialog.prototype
   */
  AppInstallCancelDialog.prototype.elements = null;

  AppInstallCancelDialog.prototype._fetchElements =
    function appid__fetchElements() {
    this.element = document.getElementById(this.instanceID);
    this.elements = {};

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    this.elementIds = [
      'confirm-cancel-button', 'resume-button'
    ];

    this.elementIds.forEach(function createElementRef(id) {
      this.elements[toCamelCase(id)] =
        this.element.querySelector('#' + this.ELEMENT_PREFIX + id);
    }, this);
  };

  AppInstallCancelDialog.prototype.view = function appid_view() {
    return `<form id="${this.instanceID}" class="generic-dialog"
            data-type="confirm" role="dialog"
            data-z-index-level="app-install-dialog" hidden>
              <section>
                <h1 data-l10n-id="cancel-install">Cancel Install</h1>
                <p>
                  <small data-l10n-id="cancelling-will-not-refund">
                    Cancelling will not refund a purchase. Refunds 
                    for paid content are provided by the original seller.
                  </small>
                  <small data-l10n-id="apps-can-be-installed-later">
                    Apps can be installed later 
                    from the original installation source.
                  </small>
                </p>
                <p data-l10n-id="are-you-sure-you-want-to-cancel">
                  Are you sure you want to cancel this install?
                </p>
              </section>
              <menu data-items="2">
                <button id="app-install-cancel-confirm-cancel-button" 
                type="reset" data-l10n-id="cancel-install-button">
                  Cancel Install
                </button>
                <button id="app-install-cancel-resume-button" type="submit" 
                  data-l10n-id="resume">Resume</button>
              </menu>
            </form>`;
  };

  AppInstallCancelDialog.prototype.getView = function appid_getView() {
    return document.getElementById(this.instanceID);
  };

  exports.AppInstallCancelDialog = AppInstallCancelDialog;

}(window));
