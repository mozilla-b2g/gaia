/* global Receiver */
'use strict';

(function(exports) {

  exports.receiver = new Receiver();

  var onLoad = function() {
    exports.removeEventListener('load', onLoad);
    exports.receiver.init();
  };

  exports.addEventListener('load', onLoad);

}(window));
