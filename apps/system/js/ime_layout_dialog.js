/* global displayName */
/* global imeName */

'use strict';

(function(exports) {
  var ImeLayoutDialog = function AppInstallDialog(options) {
    this.options = options || {};
    this.render();
    this.publish('created');
  };

  ImeLayoutDialog.prototype =
    Object.create(window.SystemDialog.prototype);

  ImeLayoutDialog.prototype.customID = 'ime-layout-dialog';

  ImeLayoutDialog.prototype.DEBUG = false;

  /**
   * Used for element id access.
   * e.g., 'authentication-dialog-alert-ok'
   * @type {String}
   * @memberof ImeLayoutDialog.prototype
   */
  ImeLayoutDialog.prototype.ELEMENT_PREFIX = 'ime-';

  /**
   * Maps to DOM elements.
   * @type {Object}
   * @memberof ImeLayoutDialog.prototype
   */
  ImeLayoutDialog.prototype.elements = null;

  ImeLayoutDialog.prototype._fetchElements =
    function appid__fetchElements() {
    this.element = document.getElementById(this.instanceID);
    this.elements = {};

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    this.elementIds = [
      'list-template', 'list',
      'cancel-button', 'confirm-button'
    ];

    this.elementIds.forEach(function createElementRef(id) {
      this.elements[toCamelCase(id)] =
        this.element.querySelector('#' + this.ELEMENT_PREFIX + id);
    }, this);
  };

  ImeLayoutDialog.prototype.view = function appid_view() {
    return `<form id="${this.instanceID}"
            data-type="confirm" role="dialog"
            data-z-index-level="ime-layout-dialog" hidden>
              <section>
                <h1 data-l10n-id="ime-addkeyboards">Add keyboards</h1>
                <!-- template for selecting IME layout
                after 3rd-party keyboard installed -->
                <div id="ime-list-template" hidden>
                  <!--
                  <li>
                    <a>${displayName}</a>
                    <label class="pack-checkbox ime">
                      <input type="checkbox" name="keyboards"
                      value="${imeName}">
                      <span></span>
                    </label>
                  </li>
                  -->
                </div>
                <ul id="ime-list"></ul>
              </section>
              <menu data-items="2">
                <button id="ime-cancel-button" type="button" 
                data-l10n-id="cancel">
                  Cancel
                </button>
                <button id="ime-confirm-button" class="recommend" 
                type="button" data-l10n-id="confirm">
                  Confirm
                </button>
              </menu>
            </form>`;
  };

  ImeLayoutDialog.prototype.getView = function appid_getView() {
    return document.getElementById(this.instanceID);
  };

  exports.ImeLayoutDialog = ImeLayoutDialog;

}(window));
