'use strict';

(function(exports) {

function injectTo(fwindow) {
  fwindow.navigator.mozApps = {
    getSelf: function() {
      return {
        set onsuccess(func) {
          func.call({}, { target: { result: { manifest: {}} } });
        }
      };
    }
  };
}

exports.Shims.contribute(
  'mozApps',
  { injectTo: injectTo }
);

})(window);
