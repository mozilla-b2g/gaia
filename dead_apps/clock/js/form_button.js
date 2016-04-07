// outer IIFE
define(function(require) {
'use strict';

var Utils = require('utils');

function createButton(formButton) {
  var button = document.createElement(formButton.tagName);
  button.className = formButton.className;
  if (formButton.id) {
    button.id = formButton.id;
  }
  var input = formButton.input;
  input.parentNode.insertBefore(button, input.nextSibling);
  formButton.button = button;
}

/**
 * A FormButton is a button that triggers an input. The text
 * of the currently selected value will display on the buttons's face.
 *
 * The `config` paramater supports the following optional properties.
 * `formatLabel` - A function that is given the current value of the input
 * and should return a string which will be used as the textContent of
 * the button.
 *
 * `tagName` - The name of the tag to create and insert into the
 * document as the main button used to trigger the input. The default
 * value is 'button'
 *
 * `className` The value of the className property that will be assigned to
 *  the button element the default value is 'icon icon-dialog'.
 *
 * `id` - A string that is used as the id of the button element.
 *
 * @constructor
 * @param {HTMLElement} input The input element to trigger.
 * @param {Object} config An optional config object.
 *
 */
function FormButton(input, config) {
  config = config || {};
  Utils.extend(this, config);

  this.input = input;
  createButton(this);

  this.input.classList.add('form-button-input');
  // hide input
  this.input.classList.add('form-button-hide');

  // set isSelect
  Object.defineProperty(this, 'isSelect', {
    value: this.input.nodeName === 'SELECT'
  });

  this.button.addEventListener('click', this.focus.bind(this), false);

  input.addEventListener('change', this.refresh.bind(this), false);
  input.addEventListener('blur', this.refresh.bind(this), false);

  // Bind this.refresh so that the listener can be easily removed.
  this.refresh = this.refresh.bind(this);
  // Update the dropdown when the language changes.
  window.addEventListener('localized', this.refresh);
  window.addEventListener('timeformatchange', this.refresh);
}

FormButton.prototype = {

  /** Remove all event handlers. */
  destroy: function() {
    window.removeEventListener('localized', this.refresh);
  },

  /**
   * focus Triggers a focus event on the input associated with this
   * FormButton.
   *
   * @param {Object} event an event object.
   */
  focus: function(event) {
    event.preventDefault();
    setTimeout(this.input.focus.bind(this.input), 10);
  },

  /**
   * refresh Updates the label text on the button to reflect
   * the current value of the input.
   *
   */
  refresh: function() {
    var value = this.value;

    var label = this.formatLabel(value);

    // In some cases formatLabel returns a Promise that returns l10nId
    var labelPromise = label.then ? label : Promise.resolve(label);

    return labelPromise.then((l10nId) => {
      if (typeof l10nId === 'string') {
        this.button.setAttribute('data-l10n-id', l10nId);
      } else if (l10nId.raw) {
        this.button.removeAttribute('data-l10n-id');
        this.button.textContent = l10nId.raw;
      } else if (l10nId.id) {
        document.l10n.setAttributes(this.button, l10nId.id, l10nId.args);
      }
    });
  },

  /**
   * value Returns the current value of the input.
   *
   * @return {String|Object} The value of the input.
   *
   */
  get value() {
    if (this.isSelect) {
      if (this.input.multiple) {
        var selectedOptions = {};
        var options = this.input.options;
        for (var i = 0; i < options.length; i++) {
          if (options[i].selected) {
            selectedOptions[options[i].value] = true;
          }
        }
        return selectedOptions;
      }
      if (this.input.selectedIndex !== -1) {
        return Utils.getSelectedValueByIndex(this.input);
      }
      return null;
    }
    // input node
    return this.input.value;
  },

  /**
   * value sets the current value of the input and update's the
   * button text.
   *
   * @param {String|Object} value A string of the current values or an
   * object with properties that map to input options if the input is
   * a multi select.
   *
   */
  set value(value) {
    if (this.isSelect) {
      if (this.input.multiple) {
        // multi select
        var options = this.input.options;
        for (var i = 0; i < options.length; i++) {
          options[i].selected = value[options[i].value] === true;
        }
      } else {
        // normal select element
        Utils.changeSelectByValue(this.input, value);
      }
    } else {
      // input element
      this.input.value = value;
    }
    // Update the text on the button to reflect the new input value
    this.refresh();
  },

  /**
   * An overrideable method that is called when updating the textContent
   * of the button.
   *
   * @return {L10nId} The formatted text to display in the label.
   *
   */
  formatLabel: function(value) {
    return { raw: value };
  },

  /**
   * tagName The the name of the tag to insert into the document to use
   * as the button element.
   */
  tagName: 'button',

  /**
   * class The value to assign to the className property on the
   * generated button element.
   */
  className: 'icon icon-dialog'

};

  return FormButton;

// end outer IIFE
});
