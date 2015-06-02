/**
 * SmartModalDialog creates a dialog with a group of buttons as select
 * options. It also includes open/close animation and bubbling animation.
 * The template is shown below:
 *   <smart-dialog class="modal-dialog">
 *     <div class="outer-container">
 *       <div class="container">
 *         <div class="modal-dialog-message-container">
 *           <div class="modal-dialog-message"></div>
 *           <div class="modal-dialog-custom-group"></div>
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

  function SmartModalDialog(container, options) {

    // Determine whether this dialog is opened or not
    this.isOpened = false;
    this._clickedIndex = null;

    this._margin = options && options.margin ? options.margin : DEFAULT_MARGIN;
    this._translateX = 0;

    this.smartBubble = document.createElement('smart-bubbles');

    // smart-dialog helps us to handle ESC key to close the dialog.
    this.element = document.createElement('smart-dialog');
    this.element.classList.add('modal-dialog');
    // make dialog focusable in order to catch focus from mouse click or touch
    // event.
    this.element.setAttribute('tabIndex', '-1');

    // in order to make vertical align, we need additional container
    this.outerContainer = document.createElement('div');
    this.outerContainer.classList.add('outer-container');

    this.innerContainer = document.createElement('div');
    this.innerContainer.classList.add('container');

    this.messageElement = document.createElement('div');
    this.messageElement.classList.add('modal-dialog-message');

    this.customElementGroup = document.createElement('div');
    this.customElementGroup.classList.add('modal-dialog-custom-group');

    this.messageContainer = document.createElement('div');
    this.messageContainer.classList.add('modal-dialog-message-container');
    this.messageContainer.appendChild(this.messageElement);
    this.messageContainer.appendChild(this.customElementGroup);

    this.buttonGroup = document.createElement('div');
    this.buttonGroup.classList.add('modal-dialog-button-group');
    this.buttonGroup.setAttribute('smart-bubbles', 'true');

    this.innerContainer.appendChild(this.messageContainer);
    this.innerContainer.appendChild(this.buttonGroup);

    this.outerContainer.appendChild(this.innerContainer);
    this.element.appendChild(this.outerContainer);

    this.container = container || document.body;
    this.container.appendChild(this.element);

    this.element.addEventListener('will-open', this);
    this.element.addEventListener('will-close', this);
    this.element.addEventListener('opened', this);
    this.element.addEventListener('closed', this);
    this.smartBubble.addEventListener('all-items-bubbled', this);
  }

  var proto = Object.create(SmartDialog);

  proto._setL10n = function(element, l10n) {
    if ((typeof l10n) === 'string') {
      element.setAttribute('data-l10n-id', l10n);
    } else if (navigator.mozL10n) {
      navigator.mozL10n.setAttributes(element, l10n.id, l10n.args);
    }
  };

  proto._open = function(options) {
    this.message = options.message || {};
    var renderedCallback = options.onButtonRendered;

    this.customSettings = options.customElementSettings || null;
    if (this.customSettings) {
      while (this.customElementGroup.firstChild) {
        this.customElementGroup.removeChild(this.customElementGroup.firstChild);
      }
      // Focusable should be true when it is defaultFocus.
      this.customSettings.focusable =
        this.customSettings.focusable || this.customSettings.defaultFocus;
      // Set customElementOffset to 1 when custom element is focusable,
      // note that we only support 1 custom element at the time.
      this.customElementOffset = this.customSettings.focusable ? 1 : 0;
      this.customElementGroup.appendChild(this.customSettings.element);
      this._focusedIndex = this.customSettings.defaultFocus ?
                            0 : this._focusedIndex;
      this.customElementGroup.classList.remove('hidden');
    } else {
      this.customElementOffset = 0;
      this.customElementGroup.classList.add('hidden');
    }

    // onCancel is triggered when ESC key is pressed.
    this.onCancel = options.onCancel || function() {};
    this.buttonElements = [];
    this.buttonSettings = options.buttonSettings || [];
    if (!this.message.textRaw && !this.message.textL10nId) {
      this.messageElement.classList.add('hidden');
    } else {
      this.messageElement.classList.remove('hidden');
      this.messageElement.textContent = this.message.textRaw || '';
      if (this.message.textL10nId) {
        this._setL10n(this.messageElement, this.message.textL10nId);
      }
    }

    this.buttonGroup.innerHTML = '';

    // Set up every button
    this.buttonSettings.forEach(function buildButton(buttonSetting, index) {
      var button = document.createElement('smart-button');
      button.setAttribute('type', buttonSetting.type || 'circle-text');
      button.textContent = buttonSetting.textRaw || 'OK';
      if (buttonSetting.textL10nId) {
        this._setL10n(button, buttonSetting.textL10nId);
      }
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
      // We may have focusable elements in custom elements, adding offset from
      // custom elements and reflects real focus index it should be.
      this._focusedIndex = (buttonSetting.defaultFocus && !customFocus) ?
        (index + this.customElementOffset) : this._focusedIndex;
      if (renderedCallback) {
        // We add render callback to let user to do more complex visual
        // modifications.
        renderedCallback(button, buttonSetting);
      }
    }.bind(this));

    this.element.classList.add('visible');
    this.element.open();
    this.element.focus();
  };

  proto.open = function(options) {
    if (this.isOpened) {
      return;
    }
    this._focusedIndex = -1;
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

  proto.startKeyNavigation = function() {
    this.element.addEventListener('keydown', this);
    if (this.buttonElements.length > 0) {
      if (this._focusedIndex === -1) {
        this._focusedIndex = 0;
      }
      this.focus();
    }
  };


  /**
   * Scroll the list to the input element
   */
  proto._scrollTo = function(element) {
    var newTransition = this._getScrollOffset(element);
    this._translateX = newTransition;
    this.buttonGroup.style.transform = 'translateX(' + this._translateX +
                                       'px)';
  };

  /**
   * Get the offset of the node element
   */
  proto._getScrollOffset = function(nodeElem) {
    if (!this._viewWidth) {
      this._viewWidth = this.innerContainer.clientWidth - 2 * this._margin;
    }
    var nodeLeft = nodeElem.offsetLeft;
    var nodeWidth = nodeElem.offsetWidth;
    var listWidth = this.buttonGroup.offsetWidth;
    var newTranslate = this._translateX;
    var lastElement = this.buttonElements[this.buttonElements.length - 1];
    var firstElement = this.buttonElements[0];

    if (listWidth < this._viewWidth) {
      // align to horizontal center if list width is smaller than the container
      return (this._viewWidth - listWidth) / 2 + this._margin;
    } else if (nodeLeft + nodeWidth >
                          -this._translateX + this._viewWidth + this._margin) {
      // scroll left if the node falls beyond the right edge of container
      newTranslate = this._viewWidth - nodeLeft - nodeWidth + this._margin;
    } else if (nodeLeft < -this._translateX + this._margin) {
      // scroll right if the node falls beyond the left edge of container
      newTranslate = -nodeLeft + this._margin;
    }


    // If the new scroll offset contains first/last node, we have to align the
    // list to begin/end.
    if (lastElement.offsetLeft + lastElement.offsetWidth <=
                              -newTranslate + this._viewWidth + this._margin) {
      return this._viewWidth + this._margin - lastElement.offsetLeft -
                                              lastElement.offsetWidth;
    } else if (firstElement.offsetLeft >= -newTranslate + this._margin) {
      return -firstElement.offsetLeft + this._margin;
    }
    return newTranslate;
  };

  proto.focus = function() {
    if (this.element.classList.contains('opening') ||
        this.element.classList.contains('closing')) {
      this.element.focus();
    } else {
      var elem;

      if (this.customSettings &&
          this._focusedIndex < this.customElementOffset) {
        elem = this.customSettings.element;
      } else {
        var buttonIndex = this._focusedIndex - this.customElementOffset;
        elem = this.buttonElements[buttonIndex];
        this._scrollTo(elem);
      }

      // move focus to smart dialog while transition running
      if (elem.focus && (typeof elem.focus) === 'function') {
        elem.focus();
      }
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

  proto.moveUp = function() {
    if (this._focusedIndex < 1 || this.customElementOffset === 0) {
      // Do nothing when focus index is at the first custom element,
      // or custom element is not focusable.
      return;
    }

    this.prevButtonIndex = this._focusedIndex;
    if (this._focusedIndex < this.customElementOffset - 1) {
      this._focusedIndex--;
    } else if (this._focusedIndex > this.customElementOffset - 1) {
      this._focusedIndex = this.customElementOffset - 1;
    }

    this.focus();
  };

  proto.moveDown = function() {
    if (this._focusedIndex > this.customElementOffset) {
      // Do nothing when focus index is at one of the button elements.
      return;
    }

    if (this._focusedIndex < this.customElementOffset - 1) {
      this._focusedIndex++;
    } else {
      this._focusedIndex = this.prevButtonIndex || this.customElementOffset;
    }

    this.focus();
  };

  proto.movePrevious = function() {
    if (this._focusedIndex < 1 + this.customElementOffset) {
      // Do nothing when focus index is at the first button element.
      return;
    }

    this._focusedIndex--;
    this.focus();
  };

  proto.moveNext = function() {
    if (this._focusedIndex >
        this.buttonElements.length - 2 + this.customElementOffset) {
      // Do nothing when focus index is at the last button element.
      return;
    }
    this._focusedIndex++;
    this.focus();
  };

  proto.handleEvent = function(e) {
    if (e.keyCode === KeyEvent.DOM_VK_UP) {
      this.moveUp();
    } else if (e.keyCode === KeyEvent.DOM_VK_DOWN) {
      this.moveDown();
    } else if (e.keyCode === KeyEvent.DOM_VK_LEFT) {
      this.movePrevious();
    } else if (e.keyCode === KeyEvent.DOM_VK_RIGHT) {
      this.moveNext();
    }

    switch(e.target) {
      case this.element:
        if (e.type === 'will-open' || e.type === 'will-close') {
          this.fireEvent('modal-dialog-' + e.type);
        } else if (e.type === 'opened') {
          this._scrollTo(this.buttonElements[0]);
          // Play bubble animation when the smart-dialog is opened
          this.smartBubble.play(this.buttonElements);
        } else if (e.type === 'closed') {
          // Do click actions when the smart-dialog is closed
          this.element.classList.remove('visible');
          if ((this._clickedIndex || this._clickedIndex === 0) &&
              this.buttonSettings[this._clickedIndex].onClick) {
            this.buttonSettings[this._clickedIndex].onClick(
              this.buttonSettings[this._clickedIndex]);
            this._clickedIndex = null;
          } else if (this.onCancel) {
            // ESC key enter
            this.onCancel();
          }
          this.isOpened = false;
          this.stopKeyNavigation();
          this.element.classList.remove('modal-dialog-opened');
          this.fireEvent('modal-dialog-closed');
        }
        break;
      case this.smartBubble:
        this.element.classList.add('modal-dialog-opened');
        this.startKeyNavigation();
        this.focus();
        this.fireEvent('modal-dialog-opened');
        break;
    }
  };

  proto.fireEvent = function smd_fireEvent(event, detail) {
    var evtObject = new CustomEvent(event, {
                                      bubbles: true,
                                      detail: detail || this
                                    });
    this.container.dispatchEvent(evtObject);
  };


  SmartModalDialog.prototype = proto;
  exports.SmartModalDialog = SmartModalDialog;

})(window);
