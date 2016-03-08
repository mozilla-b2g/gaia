/**
 * BaseModalDialog creates a dialog and handles esc key to close it. It also
 * includes open/close animation.
 * The template is shown below:
 *   <fxos-tv-dialog class="modal-dialog">
 *     <div class="outer-container">
 *       <div class="container"></div>
 *     </div>
 *   </fxos-tv-dialog>
 */

(function(exports) {
  'use strict';

  function BaseModalDialog(container) {
    // Determine whether this dialog is opened or not
    this.isOpened = false;

    // fxos-tv-dialog helps us to handle ESC key to close the dialog.
    this.element = document.createElement('fxos-tv-dialog');
    this.element.classList.add('modal-dialog');
    this.element.setAttribute('role', 'dialog');
    // make dialog focusable in order to catch focus from mouse click or touch
    // event.
    this.element.setAttribute('tabIndex', '-1');

    // in order to make vertical align, we need additional container
    this.outerContainer = document.createElement('div');
    this.outerContainer.classList.add('outer-container');

    this.innerContainer = document.createElement('div');
    this.innerContainer.classList.add('container');

    this.outerContainer.appendChild(this.innerContainer);
    this.element.appendChild(this.outerContainer);

    this.container = container || document.body;
    this.container.appendChild(this.element);

    this._init();
  }

  var proto = Object.create(FxosTvDialog.prototype);

  proto._render = function() {
    // implement rendering here.
  };

  proto._init = function(container, options) {
    // Put your custom init code here.
  };

  proto._setL10n = function(element, l10n) {
    if ((typeof l10n) === 'string') {
      element.setAttribute('data-l10n-id', l10n);
    } else if (navigator.mozL10n) {
      navigator.mozL10n.setAttributes(element, l10n.id, l10n.args);
    }
  };

  proto._open = function(options) {
    // If you want to override this, please call this at function at the end of
    // yours.

    // onCancel is triggered when ESC key is pressed.
    this.onCancel = options.onCancel || function() {};

    this.element.classList.add('visible');
    this.element.open();
    this.element.focus();
  };

  proto.open = function(options) {
    if (this.isOpened) {
      return;
    }
    this.isOpened = true;
    // We should wait two frames for reflow.
    window.requestAnimationFrame(function() {
      window.requestAnimationFrame(this._open.bind(this, options));
    }.bind(this));
  };

  proto.close = function() {
    this.element.close();
    this.element.focus();
  };

  proto.remove = function() {
    this.container.removeChild(this.element);
  };

  proto._focusContent = function() {};

  proto._blurContent = function() {};

  proto.focus = function() {
    if (this.element.classList.contains('opening') ||
        this.element.classList.contains('closing')) {
      this.element.focus();
    } else {
      this._focusContent();
    }
  };

  proto.blur = function() {
    this._blurContent();
  };

  proto.fireEvent = function smd_fireEvent(event, detail) {
    var evtObject = new CustomEvent(event, {
                                      bubbles: true,
                                      detail: detail || this
                                    });
    this.container.dispatchEvent(evtObject);
  };


  BaseModalDialog.prototype = proto;
  exports.BaseModalDialog = BaseModalDialog;

})(window);
