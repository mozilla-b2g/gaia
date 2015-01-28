/**
 * The template function for generating an UI element for an item of Bluetooth
 * paired/remote device.
 *
 * @module bluetooth/bt_template_factory
 */
define(function(require) {
  'use strict';

  var debug = false;

  function Debug(msg) {
    if (debug) {
      console.log('--> [BluetoothTemplateFactory]: ' + msg);
    }
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
    // li.classList.add('bluetooth-type-' + device.icon);

    // https://bugzilla.mozilla.org/show_bug.cgi?id=1122365
    // TODO: According to Bluetooth class of device to implement icon style.
    Debug('device.cod = ' + device.cod);
    Debug('device.cod.majorDeviceClass = ' + device.cod.majorDeviceClass);
    Debug('device.cod.majorServiceClass = ' + device.cod.majorServiceClass);
    Debug('device.cod.minorDeviceClass = ' + device.cod.minorDeviceClass);

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
    Debug('_updateItemState(): statePaired = ' + statePaired);
    if (statePaired === false) {
      li.removeAttribute('aria-disabled');
      element.setAttribute('data-l10n-id', 'device-status-tap-connect');
    } else if (statePaired === 'pairing') {
      li.setAttribute('aria-disabled', true);
      element.setAttribute('data-l10n-id', 'device-status-pairing');
    } else if (statePaired === true) {
      li.parentNode.removeAttribute('aria-disabled');
      element.setAttribute('data-l10n-id', 'device-status-paired');
    }
  }

  return function ctor_btTemplate(deviceType, onItemClick) {
    return btTemplate.bind(null, deviceType, onItemClick);
  };
});
