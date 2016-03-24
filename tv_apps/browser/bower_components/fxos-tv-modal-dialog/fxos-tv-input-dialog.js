/**
 * FxosTvInputDialog creates an input text box with a clear button to clear text,
 * and a dialog with a group of buttons as select options, Text box includes
 * focus/blur animation, buttons includes open/close and bubbling animation.
 * The template is shown below:
 *   <fxos-tv-dialog class="modal-dialog">
 *     <div class="outer-container">
 *       <div class="container">
 *         <div class="modal-dialog-message-container">
 *           <div class="modal-dialog-message"></div>
 *           <div class="modal-dialog-custom-group"></div>
 *           <div class="modal-dialog-input-group">
 *             <input></input>
 *             <button class="clear"></button>
 *             <div class="focus"></div>
 *           </div>
 *         </div>
 *         <div class="modal-dialog-button-group">
 *           <fxos-tv-button></fxos-tv-button>
 *           ...
 *           <fxos-tv-button></fxos-tv-button>
 *         </div>
 *       </div>
 *     </div>
 *   </fxos-tv-dialog>
 */

(function(exports) {
  'use strict';

  function FxosTvInputDialog(container, options) {
    FxosTvModalDialog.call(this, container, options);

    this.element.id = 'fxos-tv-input-dialog-' + this.dialogCounter;
  }

  var proto = Object.create(FxosTvModalDialog.prototype);

  proto._render = function() {
    FxosTvModalDialog.prototype._render.call(this);
    this.textInput = document.createElement('input');
    this.textInput.addEventListener('keydown', (e) => {
      switch (e.keyCode) {
        case KeyEvent.DOM_VK_RIGHT:
          // We are going to move cursor in the text input, calling
          // stopPropagation to prevent focus from being transfer to clear
          // button.
          if (this.textInput.selectionEnd < this.textInput.value.length) {
            e.stopPropagation();
          }
          break;
        case KeyEvent.DOM_VK_LEFT:
          // We are going to move cursor in the text input, calling
          // stopPropagation to prevent focus from being transfer out of the
          // input.
          if (this.textInput.selectionStart > 0) {
            e.stopPropagation();
          }
          break;
        case KeyEvent.DOM_VK_BACK_SPACE:
          e.stopPropagation();
          break;
      }
    });

    this.clearButton = document.createElement('button');
    this.clearButton.setAttribute('data-icon', 'close');
    this.clearButton.classList.add('clear');
    this.clearButton.addEventListener('click', function() {
      this.textInput.value = '';
      this.textInput.focus();
    }.bind(this));

    this.focusBar = document.createElement('div');
    this.focusBar.classList.add('focus');

    this.fxosTvInputGroup = document.createElement('div');
    this.fxosTvInputGroup.classList.add('modal-dialog-input-group');
    this.fxosTvInputGroup.appendChild(this.textInput);
    this.fxosTvInputGroup.appendChild(this.clearButton);
    this.fxosTvInputGroup.appendChild(this.focusBar);

    this.messageContainer.appendChild(this.fxosTvInputGroup);
  };

  proto._createMessageGroup = function(options) {
    this.message = options.message || {};

    if (!this.message.textRaw && !this.message.textL10nId) {
      this.messageElement.classList.add('hidden');
    } else {
      this.messageElement.classList.remove('hidden');
      this.messageElement.textContent = this.message.textRaw || '';
      if (this.message.textL10nId) {
        this.messageElement.setAttribute('data-l10n-id',
                                         this.message.textL10nId);
      }
    }
  };

  proto._createCustomGroup = function(options) {
    this.customElements = [];
    this.customElementOffset = 0;

    this.customSettings = options.customElementSettings || null;

    if (this.customSettings) {
      while (this.customElementGroup.firstChild) {
        this.customElementGroup.removeChild(this.customElementGroup.firstChild);
      }
      this.customElementGroup.appendChild(this.customSettings.element);
      this.customElementGroup.classList.remove('hidden');
    } else {
      this.customElementGroup.classList.add('hidden');
    }
  };

  proto._createInputGroup = function(options) {
    this.inputElements = [this.textInput, this.clearButton];

    if (options.initialInputValue) {
      this.textInput.value = options.initialInputValue;
    }

    var retrunedCallback = options.onReturned;
    if (retrunedCallback) {
      this.textInput.addEventListener('keydown', function(evt) {
        if (evt.keyCode === KeyEvent.DOM_VK_RETURN &&
            this._getFocusedElement() !== this.clearButton) {
          retrunedCallback();
        }
      }.bind(this));
    }
  };

  proto._createButtonGroup = function(options) {
    this.buttonElements = [];

    // onCancel is triggered when ESC key is pressed.
    this.onCancel = options.onCancel || function() {};
    this.buttonElements = [];
    this.buttonSettings = options.buttonSettings || [];
    // XXX: Clear buttonGroup innerHTML with removeChild
    this.buttonGroup.innerHTML = '';

    // Set up every button
    this.buttonSettings.forEach(function buildButton(buttonSetting, index) {
      var button = document.createElement('fxos-tv-button');
      button.setAttribute('type', buttonSetting.type || 'circle-text');
      if (buttonSetting.textL10nId) {
        button.setAttribute('data-l10n-id', buttonSetting.textL10nId);
      }
      button.textContent = buttonSetting.textRaw || 'OK';
      button.classList.add(buttonSetting.class || 'confirm');
      if (buttonSetting.class === 'primary') {
        button.classList.add('confirm');
      }
      if (buttonSetting.icon) {
        button.style.backgroundImage = 'url(' + buttonSetting.icon + ')';
      } else if (buttonSetting.iconFont) {
        button.dataset.icon = buttonSetting.iconFont;
      }
      button.addEventListener('click', function() {
        // Click action will be handled in closed event
        this._clickedIndex = index;
        if (!button.classList.contains('disabled')) {
          this.close();
        }
      }.bind(this));
      this.buttonElements.push(button);
      this.buttonGroup.appendChild(button);

      var customFocus = this.customSettings && this.customSettings.defaultFocus;
      if ((!this.defaultFocusElement && !customFocus) ||
          buttonSetting.defaultFocus) {
        this.defaultFocusElement = button;
      }

      var renderedCallback = options.onButtonRendered;
      if (renderedCallback) {
        // We add render callback to let user to do more complex visual
        // modifications.
        renderedCallback(button, buttonSetting);
      }
    }.bind(this));
  };

  proto._open = function(options) {
    this._createMessageGroup(options);
    this._createCustomGroup(options);
    this._createInputGroup(options);
    this._createButtonGroup(options);
    BaseModalDialog.prototype._open.call(this, options);
  };

  FxosTvInputDialog.prototype = proto;
  exports.FxosTvInputDialog = FxosTvInputDialog;

})(window);
