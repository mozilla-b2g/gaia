/**
 * VersionDetector:
 *   - VersionDetector is an detector that identify the version of platform
 *     Bluetooth object.
 *   - It has only one method: getVersion.
 * VersionDetector only identify version and does not involve in any UI logic.
 *
 * @module modules/bluetooth/version_detector
 */
define(function(require) {
  'use strict';

  var NavigatorBluetooth = require('modules/navigator/mozBluetooth');

  var _debug = false;
  var debug = function() {};
  if (_debug) {
    debug = function vd_debug(msg) {
      console.log('--> [VersionDetector]: ' + msg);
    };
  }

  var VersionDetector = {
    /**
     * The value indicates whether the API version is responding.
     *
     * @access public
     * @memberOf VersionDetector
     * @return {number}
     */
    getVersion: function vd_getVersion() {
      if (!NavigatorBluetooth) {
        debug('[VersionDetector]: navigator.mozBluetooth is not existed!!');
        // Since there is no navigator.mozBluetooth on B2G Desktop,
        // we workaround to return version 1 for Gaia UI test case.
        return 1;
      } else if
        (typeof(NavigatorBluetooth.onattributechanged) !== 'undefined') {
        debug('[VersionDetector]: navigator.mozBluetooth is version 2!!');
        return 2;
      } else {
        debug('[VersionDetector]: navigator.mozBluetooth is version 1!!');
        return 1;
      }
    }
  };

  return VersionDetector;
});
