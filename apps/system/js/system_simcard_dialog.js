/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global StatusBar, System */
'use strict';

(function(exports) {

  /**
   * @class SimPinSystemDialog
   * @param {options} object for attributes `onShow`, `onHide` callback.
   * @extends SystemDialog
   */
  var SimPinSystemDialog = function SimPinSystemDialog(options) {
    if (options) {
      this.options = options;
    }
    /**
     * render the dialog
     */
    this.render();
    this.publish('created');
  };

  SimPinSystemDialog.prototype = Object.create(window.SystemDialog.prototype);

  SimPinSystemDialog.prototype.customID = 'simpin-dialog';

  SimPinSystemDialog.prototype.DEBUG = false;

  SimPinSystemDialog.prototype.view = function spd_view() {
    return '<div id="' + this.instanceID + '" role="dialog" ' +
           'class="generic-dialog" data-z-index-level="system-dialog" hidden>' +
           '<section role="region">' +
             '<gaia-header>' +
               '<h1></h1>' +
             '</gaia-header>' +
             '<div class="container">' +
             '<div id="errorMsg" class="error" hidden>' +
               '<div id="messageHeader">The PIN was incorrect.</div>' +
               '<span id="messageBody">3 tries left.</span>' +
             '</div>' +
             //<!-- tries left -->
             '<div id="triesLeft" data-l10n-id="inputCodeRetriesLeft" hidden>' +
               '3 tries left</div>' +
             //<!-- sim pin input field -->
             '<div id="pinArea" hidden>' +
               '<div data-l10n-id="simPin">SIM PIN</div>' +
               '<div class="input-wrapper">' +
                 '<input name="simpin" type="password" x-inputmode="digit" ' +
                 'size="8" maxlength="8" />' +
               '</div>' +
             '</div>' +
             //<!-- sim puk input field -->
             '<div id="pukArea" hidden>' +
               '<div data-l10n-id="pukCode">PUK Code</div>' +
               '<div class="input-wrapper">' +
                 '<input name="simpuk" type="password" x-inputmode="digit" ' +
                 'size="8" maxlength="8" />' +
               '</div>' +
             '</div>' +
             //<!-- sim nck/cck/spck input field -->
             '<div id="xckArea" hidden>' +
               '<div name="xckDesc" data-l10n-id="nckCode">NCK Code</div>' +
               '<div class="input-wrapper">' +
                 '<input name="xckpin" type="number" size="16" ' +
                 'maxlength="16" />' +
               '</div>' +
             '</div>' +
             //<!-- new sim pin input field -->
             '<div id="newPinArea" hidden>' +
               '<div data-l10n-id="newSimPinMsg">' +
                 'Create PIN (must contain 4 to 8 digits)' +
               '</div>' +
               '<div class="input-wrapper">' +
                 '<input name="newSimpin" type="password" ' +
                 'x-inputmode="digit" size="8" maxlength="8" />' +
               '</div>' +
             '</div>' +
             //<!-- confirm new sim pin input field -->
             '<div id="confirmPinArea" hidden>' +
               '<div data-l10n-id="confirmNewSimPinMsg">' +
                 'Confirm New PIN' +
               '</div>' +
               '<div class="input-wrapper">' +
                 '<input name="confirmNewSimpin" type="password" ' +
                 'x-inputmode="digit" size="8" maxlength="8" />' +
               '</div>' +
             '</div>' +
             '</div>' +
           '</section>' +
           '<menu data-items="2">' +
             '<button type="reset" data-l10n-id="skip">Skip</button>' +
             '<button data-l10n-id="ok" type="submit">Done</button>' +
           '</menu>' +
           '</div>';
  };

  SimPinSystemDialog.prototype.updateHeight = function() {
    // The LayoutManager is already taking care of the keyboard height,
    // so we don't need to worry about that here.
    var height = window.layoutManager.height - StatusBar.height;
    // Since we always want to account for the SHB (even when on the
    // lockscreen to avoid the flashing in bug 1085593), we do so now.
    if (System.locked && window.softwareButtonManager.enabled) {
      height -= window.softwareButtonManager.height;
    }
    this.containerElement.style.height = height + 'px';
    // Scroll up so as to show simpin input box
    document.activeElement.scrollIntoView(false);
  };

  // Get all elements when inited.
  SimPinSystemDialog.prototype._fetchElements =
    function spd__fetchElements() {

  };

  // Register events when all elements are got.
  SimPinSystemDialog.prototype._registerEvents =
    function spd__registerEvents() {

    };

  exports.SimPinSystemDialog = SimPinSystemDialog;

}(window));
