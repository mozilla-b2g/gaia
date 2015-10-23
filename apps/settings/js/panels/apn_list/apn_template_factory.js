/**
 * The template function for generating an UI element for an APN item.
 *
 * @module apn_list/apn_template_factory
 */
define(function(require) {
  'use strict';

  function apnTemplate(apnType, onItemclick, onRadioClick, item) {
    var rawApn = item.apn;

    // create an <gaia-radio> element
    var radio = document.createElement('gaia-radio');
    radio.className = 'split';
    radio.checked = item.active;
    radio.name = apnType;

    // include the radio button element in a list item
    var radioLabel = document.createElement('label');

    radioLabel.classList.add('name');
    if (!rawApn.carrier || rawApn.carrier === '_custom_') {
      radioLabel.textContent = rawApn.apn;
    } else {
      radioLabel.textContent = rawApn.carrier;
    }
    radio.appendChild(radioLabel);

    var li = document.createElement('li');
    li.classList.add('apn-item');
    li.appendChild(radio);

    // Keep track if we clicked the label or not.
    // This is needed because you can't stop the event from propagating to the
    // shadow DOM from the label currently.
    var labelClicked = false;

    // Register the handler for click event.
    // Must listen to click, which matches the event in <gaia-radio>.
    // Use event capturing because we are overriding the default functionality.
    if (typeof onRadioClick === 'function') {
      radio.addEventListener('click', event => {
        if (!labelClicked && !radio.checked) {
          onRadioClick(item, radio);
        }
        labelClicked = false;
        event.stopPropagation();
        event.preventDefault();
      }, true);
    }

    // Register the handler for a mouseup event.
    // Use mouseup so that it wouldn't be stopped by stopPropagation.
    if (typeof onItemclick === 'function') {
      radioLabel.addEventListener('mouseup', () => {
        labelClicked = true;
        onItemclick(item);
      });
    }

    return li;
  }

  return function ctor_apnTemplate(apnType, onItemclick, onRadioClick) {
    return apnTemplate.bind(null, apnType, onItemclick, onRadioClick);
  };
});
