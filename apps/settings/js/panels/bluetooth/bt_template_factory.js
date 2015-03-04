/**
 * The template function for generating an UI element for an item of Bluetooth
 * paired/remote device.
 *
 * @module bluetooth/bt_template_factory
 */
define(function() {
  'use strict';

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function bttf_debug(msg) {
      console.log('--> [BluetoothTemplateFactory]: ' + msg);
    };
  }

  function btTemplate(deviceType, onItemClick, observableItem) {
    var device = observableItem;

    var nameSpan = document.createElement('span');
    _updateItemName(nameSpan, device.name);

    var descSmall = document.createElement('small');
    if (deviceType === 'remote') {
      descSmall.setAttribute('data-l10n-id', 'device-status-tap-connect');
    }

    var li = document.createElement('li');
    var anchor = document.createElement('a');
    li.classList.add('bluetooth-device');

    // According to Bluetooth class of device to give icon style.
    Debug('device.type = ' + device.type);
    li.classList.add('bluetooth-type-' + device.type);

    anchor.appendChild(nameSpan);
    anchor.appendChild(descSmall); // should append this first
    li.appendChild(anchor);

    // Register the handler for the click event.
    if (typeof onItemClick === 'function') {
      li.onclick = function() {
        onItemClick(observableItem);
      };
    }

    // Observe name property for update device name
    // while device 'onattributechanged' event is coming.
    device.observe('name', function(newName) {
      _updateItemName(nameSpan, newName);
    });

    // Observe paired property for update device state
    // while device starts pairing or 'onattributechanged' event is coming.
    device.observe('paired', function(statePaired) {
      _updateItemState(li, descSmall, statePaired);
    });

    return li;
  }

  function _updateItemName(element, name) {
    if (name !== '') {
      element.removeAttribute('data-l10n-id');
      element.textContent = name;
    } else {
      element.setAttribute('data-l10n-id', 'unnamed-device');
    }
  }

  function _updateItemState(li, element, statePaired) {
    if (statePaired === false) {
      li.removeAttribute('aria-disabled');
      element.setAttribute('data-l10n-id', 'device-status-tap-connect');
    } else if (statePaired === 'pairing') {
      li.setAttribute('aria-disabled', true);
      element.setAttribute('data-l10n-id', 'device-status-pairing');
    } else if (statePaired === true) {
      li.removeAttribute('aria-disabled');
      element.setAttribute('data-l10n-id', 'device-status-paired');
    }
  }

  return function ctor_btTemplate(deviceType, onItemClick) {
    return btTemplate.bind(null, deviceType, onItemClick);
  };
});
