/**
 * SmartInputDialog creates an input text box with a clear button to clear text,
 * and a dialog with a group of buttons as select options, Text box includes
 * focus/blur animation, buttons includes open/close and bubbling animation.
 * The template is shown below:
 *   <smart-dialog class="modal-dialog">
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
 *           <smart-button></smart-button>
 *           ...
 *           <smart-button></smart-button>
 *         </div>
 *       </div>
 *     </div>
 *   </smart-dialog>
 */

(function(exports) {
  'use strict';

  var DEFAULT_MARGIN = 44;
  var INPUT_GROUP_INDEX = 0;
  var BUTTON_GROUP_INDEX = 1;

  function SmartInputDialog(container, options) {
    SmartModalDialog.call(this, container, options);
  }

  var proto = Object.create(SmartModalDialog.prototype);

  proto._init = function() {
    this.defaultFocusIndex = [-1, -1];

    this.textInput = document.createElement('input');
    this.textInput.addEventListener('keydown', function(e) {
      if (e.keyCode === KeyEvent.DOM_VK_RIGHT) {
        if (this.selectionEnd < this.value.length) {
          // We are going to move cursor in the text input, calling
          // stopPropagation to prevent focus being transfer to clear button.
          e.stopPropagation();
        }
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

    this.smartInputGroup = document.createElement('div');
    this.smartInputGroup.classList.add('modal-dialog-input-group');
    this.smartInputGroup.appendChild(this.textInput);
    this.smartInputGroup.appendChild(this.clearButton);
    this.smartInputGroup.appendChild(this.focusBar);

    this.messageContainer.appendChild(this.smartInputGroup);
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

    this.buttonGroup.innerHTML = '';
    this._focusedIndex[BUTTON_GROUP_INDEX] = 0;

    // Set up every button
    this.buttonSettings.forEach(function buildButton(buttonSetting, index) {
      var button = document.createElement('smart-button');
      button.setAttribute('type', buttonSetting.type || 'circle-text');
      if (buttonSetting.textL10nId) {
        button.setAttribute('data-l10n-id', buttonSetting.textL10nId);
      }
      button.textContent = buttonSetting.textRaw || 'OK';
      button.classList.add(buttonSetting.class || 'confirm');
      if (buttonSetting.icon) {
        button.style.backgroundImage = 'url(' + buttonSetting.icon + ')';
      } else if (buttonSetting.iconFont) {
        button.dataset.icon = buttonSetting.iconFont;
      }
      button.addEventListener('click', function() {
        // Click action will be handled in closed event
        this._clickedIndex = index;
        this.element.close();
        this.element.focus();
      }.bind(this));
      this.buttonElements.push(button);
      this.buttonGroup.appendChild(button);

      var customFocus = this.customSettings && this.customSettings.defaultFocus;
      if (buttonSetting.defaultFocus && !customFocus) {
        this._focusedIndex[BUTTON_GROUP_INDEX] = index;
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

    this._focusedGroupIndex = 0;
    this._focusedGroupIndex[INPUT_GROUP_INDEX] = 0;
    // Put focusable element groups into verticalGroup,
    // so we can simply navigate up/down among these groups.
    this.verticalGroup = [this.inputElements, this.buttonElements];

    this.element.classList.add('visible');
    this.element.open();
    this.element.focus();
  };

  proto.startKeyNavigation = function() {
    this.element.addEventListener('keydown', this);
    if (this._focusedIndex[0] === -1) {
      this._focusedIndex[0] = 0;
    }
    this.focus();
  };

  proto._getFocusedElement = function() {
    return this.verticalGroup[this._focusedGroupIndex]
            [this._focusedIndex[this._focusedGroupIndex]];
  };

  proto.moveUp = function(e) {
    if (this._focusedGroupIndex < 1) {
      return;
    }

    this._focusedGroupIndex--;
    this.focus();
  };

  proto.moveDown = function(e) {
    if (this._focusedGroupIndex > this.verticalGroup.length - 1) {
      return;
    }

    // Move input-group's focus back to input box when focus on button-group
    this._focusedIndex[INPUT_GROUP_INDEX] = 0;
    this._focusedGroupIndex++;
    this.focus();
  };

  proto.movePrevious = function(e) {
    if (this._focusedIndex[this._focusedGroupIndex] < 1) {
      // Do nothing when focus index is at the first element.
      return;
    }

    this._focusedIndex[this._focusedGroupIndex]--;
    if (this._focusedGroupIndex === INPUT_GROUP_INDEX) {
      // Moving from clean button to input text will move input caret position
      // back one character, preventDefault so we don't change the position.
      e.preventDefault();
    }
    this.focus();
  };

  proto.moveNext = function(e) {
    if (this._focusedIndex[this._focusedGroupIndex] >
        this.verticalGroup[this._focusedGroupIndex].length - 2) {
      // Do nothing when focus index is at the last element
      return;
    }

    this._focusedIndex[this._focusedGroupIndex]++;
    this.focus();
  };

  proto._handleKeyEvent = function(e) {
    if (e.keyCode === KeyEvent.DOM_VK_UP) {
      this.moveUp(e);
    } else if (e.keyCode === KeyEvent.DOM_VK_DOWN) {
      this.moveDown(e);
    } else if (e.keyCode === KeyEvent.DOM_VK_LEFT) {
      this.movePrevious(e);
    } else if (e.keyCode === KeyEvent.DOM_VK_RIGHT) {
      this.moveNext(e);
    } else if (e.keyCode == KeyEvent.DOM_VK_TAB) {
      e.preventDefault();
      if (this._focusedGroupIndex === INPUT_GROUP_INDEX) {
        this.moveDown(e);
      } else {
        this.moveUp(e);
      }
    }
  };

  SmartInputDialog.prototype = proto;
  exports.SmartInputDialog = SmartInputDialog;

})(window);
