/**
 * BluetoothClassOfDeviceMapper:
 *   - BluetoothClassOfDeviceMapper is a mapper that helps settings/bluetooth
 *     apps to decide the icon type. Since platform exposed the 'number' type
 *     for class of device(Major Service Classes, Major Device Classes,
 *     Minor Device Classes), the helper will map the input number to specific
 *     device type. And the decision is referenced from Baseband.
 *     (Assigned numbers for Baseband identifies the Inquiry Access codes
 *     and Class of Device/Service (CoD) fields.)[3]
 *     According to the specifications described, we define the device type in
 *     Gaia side entirely. And the naming of device type we given is also
 *     mapping to CSS style sheet.
 *
 *   - [1] Bluetooth API v1, BluetoothDevice icon property:
 *     https://developer.mozilla.org/en-US/docs/Web/API/BluetoothDevice.icon
 *   - [2] Bluetooth API v2, BluetoothClassOfDevice object:
 *     https://wiki.mozilla.org/B2G/Bluetooth/WebBluetooth-v2/
 *     BluetoothClassOfDevice
 *   - [3] Bluetooth Class of Device Reference:
 *     https://www.bluetooth.org/en-us/specification/assigned-numbers/baseband
 *   - We can update the mapper if the specifications Baseband is updated.
 *
 * @module BluetoothClassOfDeviceMapper
 */
define(function() {
  'use strict';

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function btcodm_debug(msg) {
      console.log('--> [BluetoothCODMapper]: ' + msg);
    };
  }

  var MinorDeviceClasses = {
    Computer: {
      0: 'computer',             // Uncategorized, code for device not assigned
      1: 'computer',             // Desktop workstation
      2: 'computer',             // Server-class computer
      3: 'computer',             // Laptop
      4: 'pda',                  // Handheld PC/PDA (clamshell)
      5: 'pda',                  // Palm-size PC/PDA
      6: 'computer',             // Wearable computer (watch size)
      7: 'computer',             // Tablet
      reserved: 'computer'       // All other values reserved. Default type
                                 // 'computer' given for reserved case.
    },

    Phone: {
      0: 'phone',                // Uncategorized, code for device not assigned
      1: 'phone',                // Cellular
      2: 'phone',                // Cordless
      3: 'phone',                // Smartphone
      4: 'modem',                // Wired modem or voice gateway
      5: 'phone',                // Common ISDN access
      reserved: 'phone'          // All other values reserved. Default type
                                 // 'phone' given for reserved case.
    },

    AudioVideo: {
      0: 'audio-card',           // Uncategorized, code not assigned
      1: 'audio-card',           // Wearable Headset Device
      2: 'audio-card',           // Hands-free Device
      4: 'audio-input-microphone', // Microphone
      5: 'audio-card',           // Loudspeaker
      6: 'audio-card',           // Headphones
      7: 'audio-card',           // Portable Audio
      8: 'audio-card',           // Car audio
      9: 'audio-card',           // Set-top box
      10: 'audio-card',          // HiFi Audio Device
      11: 'camera-video',        // VCR
      12: 'camera-video',        // Video Camera
      13: 'camera-video',        // Camcorder
      14: 'video-display',       // Video Monitor
      15: 'video-display',       // Video Display and Loudspeaker
      16: 'video-display',       // Video Conferencing
      18: 'audio-card',          // Gameing/Toy
      reserved: 'audio-card'     // All other values reserved. Default type
                                 // 'audio-card' given for reserved case.
    },

    Peripheral: {
      1: 'input-gaming',         // Joystick
      2: 'input-gaming',         // Gamepad
      16: 'input-keyboard',      // Keyboard
      17: 'input-keyboard',      // Keyboard
      18: 'input-keyboard',      // Keyboard
      19: 'input-keyboard',      // Keyboard
      20: 'input-keyboard',      // Keyboard
      21: 'input-keyboard',      // Keyboard
      22: 'input-keyboard',      // Keyboard
      23: 'input-keyboard',      // Keyboard
      24: 'input-keyboard',      // Keyboard
      25: 'input-keyboard',      // Keyboard
      26: 'input-keyboard',      // Keyboard
      27: 'input-keyboard',      // Keyboard
      28: 'input-keyboard',      // Keyboard
      29: 'input-keyboard',      // Keyboard
      30: 'input-keyboard',      // Keyboard
      31: 'input-keyboard',      // Keyboard
      32: 'input-mouse',         // Pointing device
      33: 'input-mouse',         // Pointing device
      34: 'input-mouse',         // Pointing device
      35: 'input-mouse',         // Pointing device
      36: 'input-mouse',         // Pointing device
      37: 'input-tablet',        // Digitizer tablet
      38: 'input-mouse',         // Pointing device
      39: 'input-mouse',         // Pointing device
      40: 'input-mouse',         // Pointing device
      41: 'input-mouse',         // Pointing device
      42: 'input-mouse',         // Pointing device
      43: 'input-mouse',         // Pointing device
      44: 'input-mouse',         // Pointing device
      45: 'input-mouse',         // Pointing device
      46: 'input-mouse',         // Pointing device
      47: 'input-mouse'          // Pointing device
    },

    Imaging: {
      4: 'video-display',        // Display, bit: XXX1XX
      8: 'camera-photo',         // Camera, bit: XX1XXX
      16: 'scanner',             // Scanner, bit: X1XXXX
      32: 'printer'              // Printer, bit: 1XXXXX
    }
  };

  var MajorDeviceClasses = {
    1: MinorDeviceClasses.Computer,
    2: MinorDeviceClasses.Phone,
    3: 'network-wireless',       // LAN/Network Access Point Major Class
    4: MinorDeviceClasses.AudioVideo,
    5: MinorDeviceClasses.Peripheral,
    6: MinorDeviceClasses.Imaging
  };

  var BluetoothClassOfDeviceMapper = {
    /**
     * The string indicating which kind of icon could be used to represent
     * the device.
     *
     * @access public
     * @memberOf BluetoothClassOfDeviceMapper
     * @param {Object BluetoothClassOfDevice} cod
     * @return {String}
     */
    getDeviceType: function btcodm_getDeviceType(cod) {
      Debug('cod.majorDeviceClass = ' + cod.majorDeviceClass);
      Debug('cod.majorServiceClass = ' + cod.majorServiceClass);
      Debug('cod.minorDeviceClass = ' + cod.minorDeviceClass);
      // Given an empty string to be default type.
      // Then, we won't show any icon for empty type.
      var deviceType = '';
      var majorDeviceClass = MajorDeviceClasses[cod.majorDeviceClass];
      Debug('majorDeviceClass = ' + majorDeviceClass);
      if (typeof(majorDeviceClass) === 'object') {
        // drop in other Major Class
        deviceType = majorDeviceClass[cod.minorDeviceClass] || 
                     majorDeviceClass.reserved || '';
        Debug('return in minor class, type = ' + deviceType);
        return deviceType;
      } else if (typeof(majorDeviceClass) === 'string') {
        // drop in LAN/Network Access Point Major Class
        Debug('return in major class, type = network-wireless');
        return majorDeviceClass;
      } else {
        // Not in any Major Class which is defined in Gaia.
        // Ex: Wearable, Toy, Health.
        Debug('not mapping in any class, return type = ' + deviceType);
        return deviceType;
      }
    }
  };

  return BluetoothClassOfDeviceMapper;
});
