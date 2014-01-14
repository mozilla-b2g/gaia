var http = require('http'),
    url = require('url');

/**
 * Issue a request to the control server.
 *
 * @param {String} target for request.
 * @param {Object} details for request.
 * @param {Function} callback [Error err, Object json].
 */
function request(target, details, callback) {
  var body = JSON.stringify(details);
  var options = url.parse(target);
  options.headers = {
    // content-type is not strictly needed but is good practice.
    'Content-Type': 'application/json',
    // content-length is required otherwise the control server cannot read
    // the body.
    'Content-Length': Buffer.byteLength(body)
  };

  var req = http.request(options, function(res) {
    var data = new Buffer(0);
    res.on('data', function(buffer) {
      data = Buffer.concat([data, buffer]);
    });

    res.once('error', callback);
    res.once('end', function() {
      callback(null, JSON.parse(data.toString()));
    });
  });

  req.end(body);
}

module.exports = request;
