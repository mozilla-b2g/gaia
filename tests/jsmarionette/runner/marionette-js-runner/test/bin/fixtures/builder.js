'use strict';
function Builder() {}
Builder.prototype = {
  build: function(callback) {
    // magic process exit number to indicate that this file was loaded.
    process.exit(66);
  }
};

module.exports = Builder;
