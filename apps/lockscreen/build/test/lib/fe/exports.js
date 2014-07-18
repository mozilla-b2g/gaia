/* jshint ignore:start */
(function() {
var Fe = require(__dirname + '/fe.js');
var fs = require(__dirname + '/fe.fs.js');
Fe.fs = fs;
module.exports = Fe;
})();
/* jshint ignore:end */
