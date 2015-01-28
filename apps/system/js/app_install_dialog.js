'use strict';

(function(exports) {
  var AppInstallDialog = function AppInstallDialog(options) {
    this.options = options || {};
    this.render();
    this.publish('created');
  };

  AppInstallDialog.prototype = Object.create(window.SystemDialog.prototype);

  AppInstallDialog.prototype.customID = 'app-install-dialog';

  AppInstallDialog.prototype.DEBUG = false;

  /**
   * Used for element id access.
   * e.g., 'authentication-dialog-alert-ok'
   * @type {String}
   * @memberof AppInstallDialog.prototype
   */
  AppInstallDialog.prototype.ELEMENT_PREFIX = 'app-install-';

  /**
   * Maps to DOM elements.
   * @type {Object}
   * @memberof AppInstallDialog.prototype
   */
  AppInstallDialog.prototype.elements = null;

  AppInstallDialog.prototype._fetchElements =
    function appid__fetchElements() {
    this.element = document.getElementById(this.instanceID);
    this.elements = {};

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    this.elementIds = [
      'message', 'size',
      'author-name', 'author-url',
      'install-button', 'cancel-button'
    ];

    this.elementIds.forEach(function createElementRef(id) {
      this.elements[toCamelCase(id)] =
        this.element.querySelector('#' + this.ELEMENT_PREFIX + id);
    }, this);
  };

  AppInstallDialog.prototype.view = function appid_view() {
    return `<form id="${this.instanceID}"
            class="generic-dialog"
            data-type="confirm" role="dialog"
            data-z-index-level="app-install-dialog" hidden>
              <section>
                <h1 id="app-install-message"></h1>
                <dl>
                  <dt data-l10n-id="size">Size</dt>
                  <dd id="app-install-size"></dd>
                  <dt data-l10n-id="author">Author</dt>
                  <dd>
                    <span id="app-install-author-name"></span><br />
                    <span id="app-install-author-url"></span>
                  </dd>
                </dl>
              </section>
              <menu data-items="2">
                <button id="app-install-cancel-button"
                 data-l10n-id="cancel">Cancel</button>
                <button id="app-install-install-button"
                 class="recommend" data-l10n-id="install">Install</button>
              </menu>
            </form>`;
  };

  AppInstallDialog.prototype.getView = function appid_getView() {
    return document.getElementById(this.instanceID);
  };

  exports.AppInstallDialog = AppInstallDialog;

}(window));
