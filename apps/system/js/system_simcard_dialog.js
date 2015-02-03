/* global SimPinDialog */
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

  SimPinSystemDialog.prototype.focus = function() {
    // We will combine SimPinDialog and SimPinSystemDialog in
    // mobile connection subsystem
    SimPinDialog.focus();
  };

  SimPinSystemDialog.prototype.requestFocus = function() {
    this.publish('requestfocus');
  };

  SimPinSystemDialog.prototype.view = function spd_view() {
    return `<div id="${this.instanceID}" role="dialog"
           class="generic-dialog" data-z-index-level="system-dialog" hidden>
           <section role="region">
             <gaia-header>
               <h1></h1>
             </gaia-header>
             <div class="container">
             <div id="errorMsg" class="error" hidden>
               <div id="messageHeader"></div>
               <span id="messageBody"></span>
             </div>
             <!-- tries left -->
             <div id="triesLeft" data-l10n-id="inputCodeRetriesLeft" hidden>
             </div>
             <!-- sim pin input field -->
             <div id="pinArea" hidden>
               <div data-l10n-id="simPin"></div>
               <div class="input-wrapper">
                 <input name="simpin" type="password" x-inputmode="digit"
                 size="8" maxlength="8" />
               </div>
             </div>
             <!-- sim puk input field -->
             <div id="pukArea" hidden>
               <div data-l10n-id="pukCode"></div>
               <div class="input-wrapper">
                 <input name="simpuk" type="password" x-inputmode="digit"
                 size="8" maxlength="8" />
               </div>
             </div>
             <!-- sim nck/cck/spck input field -->
             <div id="xckArea" hidden>
               <div name="xckDesc" data-l10n-id="nckCode"></div>
               <div class="input-wrapper">
                 <input name="xckpin" type="number" size="16"
                 maxlength="16" />
               </div>
             </div>
             <!-- new sim pin input field -->
             <div id="newPinArea" hidden>
               <div data-l10n-id="newSimPinMsg"></div>
               <div class="input-wrapper">
                 <input name="newSimpin" type="password"
                 x-inputmode="digit" size="8" maxlength="8" />
               </div>
             </div>
             <!-- confirm new sim pin input field -->
             <div id="confirmPinArea" hidden>
               <div data-l10n-id="confirmNewSimPinMsg"></div>
               <div class="input-wrapper">
                 <input name="confirmNewSimpin" type="password"
                 x-inputmode="digit" size="8" maxlength="8" />
               </div>
             </div>
             </div>
           </section>
           <menu data-items="2">
             <button type="reset" data-l10n-id="skip"></button>
             <button data-l10n-id="ok" type="submit"></button>
           </menu>
           </div>`;
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
