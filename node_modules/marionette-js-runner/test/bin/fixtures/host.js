function Host() {}
Host.metadata = {};
Host.prototype = {
  start: function(callback) {
    // magic process exit number to indicate that this file was loaded.
    process.exit(55);
  }
};

module.exports = Host;
