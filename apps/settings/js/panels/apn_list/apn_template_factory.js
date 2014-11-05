/**
 * The template function for generating an UI element for an APN item.
 *
 * @module apn_list/apn_template_factory
 */
define(function(require) {
  'use strict';

  function apnTemplate(apnType, onItemclick, onRadioClick, item) {
    var rawApn = item.apn;

    // create an <input type="radio"> element
    var input = document.createElement('input');
    input.type = 'radio';
    input.checked = item.active;
    input.name = apnType;

    // include the radio button element in a list item
    var radioSpan = document.createElement('span');
    var radioLabel = document.createElement('label');
    radioLabel.classList.add('pack-radio');
    radioLabel.appendChild(input);
    radioLabel.appendChild(radioSpan);

    var nameSpan = document.createElement('span');
    var nameLabel = document.createElement('label');
    nameLabel.classList.add('name');
    if (!rawApn.carrier || rawApn.carrier === '_custom_') {
      nameSpan.textContent = rawApn.apn;
    } else {
      nameSpan.textContent = rawApn.carrier;
    }
    nameLabel.appendChild(nameSpan);

    var li = document.createElement('li');
    li.classList.add('apn-item');
    li.appendChild(radioLabel);
    li.appendChild(nameLabel);

    // Register the handler for the checked change.
    if (typeof onRadioClick === 'function') {
      input.onclick = function(event) {
        onRadioClick(item, input);
        event.stopPropagation();
        event.preventDefault();
      };
    }

    // Register the handler for the click event.
    if (typeof onItemclick === 'function') {
      nameLabel.onclick = function() {
        onItemclick(item);
      };
    }

    return li;
  }

  return function ctor_apnTemplate(apnType, onItemclick, onRadioClick) {
    return apnTemplate.bind(null, apnType, onItemclick, onRadioClick);
  };
});
