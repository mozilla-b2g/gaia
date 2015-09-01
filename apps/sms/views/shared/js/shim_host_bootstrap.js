/* global MozMobileMessageShim */

(function(exports) {
'use strict';

exports.bootstrap = function(appInstanceId) {
  MozMobileMessageShim.init(appInstanceId, navigator.mozMobileMessage);
};
})(self);
