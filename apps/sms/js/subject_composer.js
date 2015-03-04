/* global EventDispatcher */

/* exported SubjectComposer */
(function(exports) {
  'use strict';

  const MAX_LENGTH = 40;
  const privateMembers = new WeakMap();

  function onKeyDown(e) {
    /* jshint validthis: true */
    var priv = privateMembers.get(this);

    if (e.keyCode === e.DOM_VK_BACK_SPACE) {
      if (!priv.isHoldingBackspace) {
        priv.isEmptyOnBackspace = !this.getValue();
        priv.isHoldingBackspace = true;
      }
    } else {
      priv.isHoldingBackspace = false;
      // Input char will be ignored when:
      // - Reaching the maximum subject length. Any char input is not allowed
      // - Return key(new line) input. Since new line won't work in subject
      if (this.getValue().length >= MAX_LENGTH ||
          e.keyCode === e.DOM_VK_RETURN) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }

  function onKeyUp(e) {
    /* jshint validthis: true */
    var priv = privateMembers.get(this);

    // User removes subject field by either:
    // - Selecting options menu in top right hand corner, or
    // - Selecting the delete button in the keyboard. if all
    // the text is removed from the subject field and the user
    // selects delete on the keyboard the subject field is removed
    if (e.keyCode === e.DOM_VK_BACK_SPACE && priv.isHoldingBackspace &&
        priv.isEmptyOnBackspace) {
      this.hide();
    }
    priv.isEmptyOnBackspace = false;
    priv.isHoldingBackspace = false;
  }

  function onInput(e) {
    /* jshint validthis: true */
    privateMembers.get(this).updateValue(e.target.textContent);
  }

  function updatePlaceholder() {
    /* jshint validthis: true */
    var priv = privateMembers.get(this);

    if (priv.value) {
      priv.placeholder.remove();
    } else {
      priv.node.appendChild(priv.placeholder);
    }
  }

  function updateValue(newValue) {
    /* jshint validthis: true */
    var priv = privateMembers.get(this);

    // Bug 877141 - contenteditable will insert non-break spaces when
    // multiple consecutive spaces are entered, we don't want them.
    if (newValue) {
      newValue = newValue.replace(/\n\s*|\u00A0/g, ' ');
    }

    if (priv.value !== newValue) {
      priv.value = newValue;
      priv.updatePlaceholder();

      this.emit('change');
    }

    return newValue;
  }

  var SubjectComposer = function(node) {
    EventDispatcher.mixin(this, [
      'focus',
      'change',
      'visibility-change'
    ]);

    if (!node) {
      throw new Error('Subject node is required');
    }

    var priv = {
      isHoldingBackspace: false,
      isEmptyOnBackspace: false,
      isVisible: false,
      value: '',

      // nodes
      node: node,
      input: null,
      placeholder: null,

      // methods
      updateValue: updateValue.bind(this),
      updatePlaceholder: updatePlaceholder.bind(this),
    };
    privateMembers.set(this, priv);

    priv.input = priv.node.querySelector('.subject-composer-input');
    priv.placeholder = priv.node.querySelector(
      '.subject-composer-placeholder'
    );

    priv.input.addEventListener('keydown', onKeyDown.bind(this));
    priv.input.addEventListener('keyup', onKeyUp.bind(this));
    priv.input.addEventListener('input', onInput.bind(this));
    priv.input.addEventListener('focus', this.emit.bind(this, 'focus'));
  };

  SubjectComposer.prototype.show = function ms_show() {
    this.toggle(true);
  };

  SubjectComposer.prototype.hide = function ms_hide() {
    this.toggle(false);
  };

  SubjectComposer.prototype.toggle = function ms_toggle(toggle) {
    var priv = privateMembers.get(this);

    priv.node.classList.toggle('hide', !toggle);
    priv.isVisible = toggle;

    this.emit('visibility-change');
  };

  SubjectComposer.prototype.isVisible = function ms_is_visible() {
    return privateMembers.get(this).isVisible;
  };

  SubjectComposer.prototype.focus = function ms_focus() {
    privateMembers.get(this).input.focus();
  };

  SubjectComposer.prototype.getMaxLength = function ms_get_maxLength() {
    return MAX_LENGTH;
  };

  SubjectComposer.prototype.getValue = function ms_get_value() {
    return privateMembers.get(this).value;
  };

  SubjectComposer.prototype.setValue = function ms_set_value(value) {
    var priv = privateMembers.get(this);

    if (typeof value !== 'string') {
      throw new Error('Value should be a valid string!');
    }

    priv.input.textContent = priv.updateValue(value);
  };

  SubjectComposer.prototype.reset = function ms_reset() {
    var priv = privateMembers.get(this);

    priv.value = priv.input.textContent = '';
    priv.node.classList.add('hide');
    priv.isVisible = false;

    priv.updatePlaceholder();
  };

  exports.SubjectComposer = SubjectComposer;
})(window);
