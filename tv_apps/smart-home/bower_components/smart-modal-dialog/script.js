/**
 * SmartModalDialog creates a dialog with a group of buttons as select
 * options. It also includes open/close animation and bubbling animation.
 * The template is shown below:
 *   <smart-dialog class="modal-dialog">
 *     <div class="outer-container">
 *       <div class="container">
 *         <div class="modal-dialog-message">
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

  function SmartModalDialog(container) {

    // Determine whether this dialog is opened or not
    this.isOpened = false;
    this._clickedIndex = null;

    this.smartBubble = document.createElement('smart-bubbles');

    this.element = document.createElement('smart-dialog');
    this.element.classList.add('modal-dialog');
    // make dialog focusable in order to catch focus from mouse click or touch
    // event.
    this.element.setAttribute('tabIndex', '-1');

    // in order to make vertical align, we need additional container
    this.outerContainer = document.createElement('div');
    this.outerContainer.classList.add('outer-container');

    this.container = document.createElement('div');
    this.container.classList.add('container');

    this.messageElement = document.createElement('div');
    this.messageElement.classList.add('modal-dialog-message');

    this.buttonGroup = document.createElement('div');
    this.buttonGroup.classList.add('modal-dialog-button-group');
    this.buttonGroup.setAttribute('smart-bubbles', 'true');

    this.container.appendChild(this.messageElement);
    this.container.appendChild(this.buttonGroup);

    this.outerContainer.appendChild(this.container);
    this.element.appendChild(this.outerContainer);

    this.container = container || document.body;
    this.container.appendChild(this.element);

    this.element.addEventListener('opened', this);
    this.element.addEventListener('closed', this);
    this.smartBubble.addEventListener('all-items-bubbled', this);
  }

  var proto = Object.create(SmartDialog);

  proto.open = function(options) {
    this._focusedIndex = -1;
    this.isOpened = true;
    this.message = options.message || {};

    // onCancel is triggered when ESC key is pressed.
    this.onCancel = options.onCancel || function() {};
    this.buttonElements = [];
    this.buttonSettings = options.buttonSettings || [];
    this.messageElement.textContent = this.message.textRaw || '';
    this.messageElement.setAttribute('data-l10n-id', this.message.textL10nId);
    this.buttonGroup.innerHTML = '';

    this.messageElement.classList.remove('hidden');
    if (!this.message.textRaw && !this.message.textL10nId) {
      this.messageElement.classList.add('hidden');
    }

    // Set up every button
    this.buttonSettings.forEach(function(buttonSetting, index) {
      var button = document.createElement('smart-button');
      button.setAttribute('type', 'circle-text');
      button.setAttribute('data-l10n-id', buttonSetting.textL10nId);
      button.textContent = buttonSetting.textRaw || 'OK';
      button.classList.add(buttonSetting.class || 'confirm');
      button.addEventListener('click', function() {
        // Click action will be handled in closed event
        this._clickedIndex = index;
        this.element.close();
      }.bind(this));
      this.buttonElements.push(button);
      this.buttonGroup.appendChild(button);
      this._focusedIndex =
                    (buttonSetting.defaultFocus) ? index : this._focusedIndex;
    }.bind(this));

    this.element.classList.add('visible');
    this.element.open();
  };

  proto.remove = function() {
    this.container.removeChild(this.element);
  };

  proto.startKeyNavigation = function() {
    this.element.addEventListener('keydown', this);
    if (this.buttonElements.length > 0) {
      if (this._focusedIndex === -1) {
        this._focusedIndex = 0;
      }
      this.focus();
    }
  };

  proto.focus = function() {
    var elem = this.buttonElements[this._focusedIndex];
    if (elem.focus && (typeof elem.focus) === 'function') {
      elem.focus();
    }
  };

  proto.blur = function() {
    var elem = this.buttonElements[this._focusedIndex];
    if (elem.blur && (typeof elem.blur === 'function')) {
      elem.blur();
    }
  };

  proto.stopKeyNavigation = function() {
    this.element.removeEventListener('keydown', this);
  };

  proto.movePrevious = function() {
    if (this._focusedIndex < 1) {
      return;
    }

    this._focusedIndex--;
    this.focus();
  };

  proto.moveNext = function() {
    if (this._focusedIndex > this.buttonElements.length - 2) {
      return;
    }
    this._focusedIndex++;
    this.focus();
  };

  proto.handleEvent = function(e) {
    if (e.keyCode === KeyEvent.DOM_VK_LEFT) {
      this.movePrevious();
    } else if (e.keyCode === KeyEvent.DOM_VK_RIGHT) {
      this.moveNext();
    }

    switch(e.target) {
      case this.element:
        if (e.type === 'opened') {
          // Play bubble animation when the smart-dialog is opened
          this.smartBubble.play(this.buttonElements);
        } else if (e.type === 'closed') {
          // Do click actions when the smart-dialog is closed
          this.element.classList.remove('visible');
          if ((this._clickedIndex || this._clickedIndex === 0) &&
              this.buttonSettings[this._clickedIndex].onClick) {
            this.buttonSettings[this._clickedIndex].onClick();
            this._clickedIndex = null;
          } else if (this.onCancel) {
            // ESC key enter
            this.onCancel();
          }
          this.isOpened = false;
          this.stopKeyNavigation();
        }
        break;
      case this.smartBubble:
        this.startKeyNavigation();
        this.focus();
        break;
    }
  };

  SmartModalDialog.prototype = proto;
  exports.SmartModalDialog = SmartModalDialog;

})(window);

