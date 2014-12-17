'use strict';

(function(exports) {
/**
 * KeyView handles the rendering of each key on the keyboard.
 */

function KeyView(target, options, viewManager) {
  this.target = target;
  this.attributeList = options.attributeList || [];
  this.className = '';

  if (target.isSpecialKey) {
    this.className = 'special-key';
  } else {
    // The 'key' role tells an assistive technology that these buttons
    // are used for composing text or numbers, and should be easier to
    // activate than usual buttons. We keep special keys, like backspace,
    // as buttons so that their activation is not performed by mistake.
    this.attributeList.push({
      key: 'role',
      value: 'key'
    });

    if (options.keyClassName) {
      this.className = options.keyClassName;
    }
  }

  if (target.className) {
    this.className += ' ' + target.className;
  }

  if (target.disabled) {
    this.attributeList.push({
      key: 'disabled',
      value: 'true'
    });
  }

  var ARIA_LABELS = this.ARIA_LABELS || {};
  if (target.ariaLabel || ARIA_LABELS[target.value]) {
    this.attributeList.push({
      key: 'data-l10n-id',
      value: target.ariaLabel || ARIA_LABELS[target.value]
    });
  } else {
    this.attributeList.push({
      key: 'aria-label',
      value: target.ariaLabel || target.value
    });
  }

  // If this layout requires different rendering for uppercase/lowercase
  // buttons, we will also read the another outputChar , and KeyView
  // would be smart enough to put two label <span>s in the DOM.
  this.outputChar = (options.outputChar) || target.value;
  this.altOutputChar = options.altOutputChar;

  this.keyWidth = options.keyWidth;

  this.viewManager = viewManager;
}

KeyView.prototype.ARIA_LABELS = {
  '⇪': 'upperCaseKey2',
  '⌫': 'backSpaceKey2',
  '&nbsp': 'spaceKey2',
  '↵': 'returnKey2',
  '.': 'periodKey2',
  ',': 'commaKey2',
  ':': 'colonKey2',
  ';': 'semicolonKey2',
  '?': 'questionMarkKey2',
  '!': 'exclamationPointKey2',
  '(': 'leftBracketKey2',
  ')': 'rightBracketKey2',
  '"': 'doubleQuoteKey2',
  '«': 'leftDoubleAngleQuoteKey2',
  '»': 'rightDoubleAngleQuoteKey2'
};

KeyView.prototype.render = function render() {
  // Create the DOM element for the key.
  var contentNode = document.createElement('button');
  contentNode.className = 'keyboard-key ' + this.className;
  contentNode.style.width = this.keyWidth + 'px';

  if (this.attributeList) {
    this.attributeList.forEach(function(attribute) {
      contentNode.setAttribute(attribute.key, attribute.value);
    });
  }

  var vWrapperNode = document.createElement('span');
  vWrapperNode.className = 'visual-wrapper';

  var labelNode = document.createElement('span');
  // Using innerHTML here because some labels (so far only the &nbsp; in the
  // space key) can be HTML entities.
  labelNode.innerHTML = this.outputChar;
  labelNode.className = 'key-element';
  labelNode.dataset.label = this.outputChar;
  vWrapperNode.appendChild(labelNode);

  // If the |label| argument is an array, that means we need to insert another
  // DOM element represents the lowercase label so that container styling can
  // toggle between two.
  if (this.altOutputChar) {
    // Create a lowercase label element
    labelNode = document.createElement('span');
    labelNode.innerHTML = this.altOutputChar;
    labelNode.className = 'key-element lowercase';
    labelNode.dataset.label = this.altOutputChar;
    vWrapperNode.appendChild(labelNode);
  }

  // Add uppercase and lowercase pop-up for highlighted key
  labelNode = document.createElement('span');
  labelNode.innerHTML = this.outputChar;
  labelNode.className = 'uppercase popup';
  vWrapperNode.appendChild(labelNode);

  labelNode = document.createElement('span');
  labelNode.innerHTML = this.target.lowercaseValue;
  labelNode.className = 'lowercase popup';
  vWrapperNode.appendChild(labelNode);

  if (this.target.longPressValue) {
    var altNoteNode = document.createElement('div');
    altNoteNode.className = 'alt-note';
    altNoteNode.textContent = this.target.longPressValue;
    vWrapperNode.appendChild(altNoteNode);
  }

  contentNode.appendChild(vWrapperNode);

  // a few dataset properties are retained in bug 1044525 because some css
  // and ui/integration tests rely on them.
  // Also to not break them we spell keycode instead of keyCode in dataset
  contentNode.dataset.keycode = this.target.keyCode;
  contentNode.dataset.keycodeUpper = this.target.keyCodeUpper;

  if ('targetPage' in this.target) {
    contentNode.dataset.targetPage = this.target.targetPage;
  }

  this.element = contentNode;

  if (this.viewManager) {
    this.viewManager.registerView(this.target, this);
  }
};

KeyView.prototype.highlight = function highlight(options) {
  options = options || {};
  if (options.upperCase) {
    this.element.classList.add('uppercase-popup');
  } else {
    this.element.classList.add('lowercase-popup');
  }

  this.element.classList.add('highlighted');
};

KeyView.prototype.unHighlight = function unHighlight() {
  this.element.classList.remove('highlighted');

  this.element.classList.remove('uppercase-popup');
  this.element.classList.remove('lowercase-popup');
};

exports.KeyView = KeyView;

})(window);
