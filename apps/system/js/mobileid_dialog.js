/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(exports) {

  /**
   * @class MobileIdDialog
   * @param {options} object for attributes `onShow`, `onHide`.
   * extends SystemDialog
   */
  var MobileIdDialog = function MobileIdDialog(options) {
    this.options = options || {};
    // Render the dialog
    this.render();
    // Create the iframe on it with MobileID flow
    this.createIframe();
    // Publish that it's created
    this.publish('created');
  };

  MobileIdDialog.prototype = Object.create(window.SystemDialog.prototype);

  MobileIdDialog.prototype.customID = 'mobileid-dialog';

  MobileIdDialog.prototype.DEBUG = false;

  MobileIdDialog.prototype.panel = null;
  MobileIdDialog.prototype.iframe = null;

  MobileIdDialog.prototype.view = function mobileid_view() {
    return '<div id="' + this.instanceID + '" role="dialog" hidden></div>';
  };

  MobileIdDialog.prototype.createIframe =
  function mobileid_getIFrame(onLoaded) {
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'mobileid-iframe';
    this.iframe.src = '/mobile_id/index.html';
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.getView().appendChild(this.iframe);
    this.iframe.onload = function onLoaded() {
      if (typeof this.options.onLoaded === 'function') {
        this.options.onLoaded();
      }
      // We open with a transition
      this.open(function onOpened() {
        // Once the iframe is loaded, we send the params to render
        this.dispatchEvent('shown');
      }.bind(this));
    }.bind(this);

    return this.iframe;
  };

  MobileIdDialog.prototype.dispatchEvent =
  function mobileid_dispatchEvent(eventName, params) {
    if (!this.iframe) {
      return;
    }

    var event = new CustomEvent(
      eventName,
      {
        detail: params
      }
    );
    this.iframe.contentWindow.dispatchEvent(event);
  };

  MobileIdDialog.prototype.getView = function mobileid_getIFrame() {
    return document.getElementById(this.instanceID);
  };

  MobileIdDialog.prototype.open = function mobileid_open(onOpened) {
    // Cache the main panel
    this.panel = this.getView();
    // Show it
    this.show();
    // If something should happen after the transition
    // we add a listener
    var onTransitionEnd = function onOpenedAnimation() {
      this.panel.classList.remove('opening');
      this.panel.removeEventListener('animationend', onTransitionEnd);

      if (typeof onOpened === 'function') {
        onOpened();
      }
    }.bind(this);

    this.panel.addEventListener(
      'animationend',
      onTransitionEnd
    );
    // Add a transition to show it properly
    this.panel.classList.add('opening');
  };

  MobileIdDialog.prototype.close = function mobileid_close(onClosed) {
    var onTransitionEnd = function onClosedAnimation() {
      this.panel.removeEventListener('animationend', onTransitionEnd);
      this.panel.innerHTML = '';
      this.panel.classList.remove('closing');
      this.panel.classList.remove('opening');
      this.panel = null;

      if (typeof onClosed === 'function') {
        onClosed();
      }

      this.hide();
    }.bind(this);

    this.panel.addEventListener(
      'animationend',
      onTransitionEnd
    );

    this.panel.classList.add('closing');
  };

  exports.MobileIdDialog = MobileIdDialog;

}(window));
