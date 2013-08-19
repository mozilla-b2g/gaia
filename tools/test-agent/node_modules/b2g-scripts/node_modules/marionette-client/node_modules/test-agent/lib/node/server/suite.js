/**
 * Exposes suite to server.
 * This enhancement is here for consistency as it
 * essentially does no work
 *
 * @param {Object} suite suite instance.
 */
function Suite(suite) {
  this.suite = suite;
}

Suite.prototype = {
  enhance: function enhance(server) {
    server.suite = this.suite;
  }
};

module.exports = exports = Suite;
