exports.request = function(query, callback) {
    var options = {
        "query": query,
        "experienceId": "",
        "typeHint": "",
        "feature": "rtrn",
        "cachedIcons": "",
        "exact": true,
        "spellcheck": true,
        "suggest": true,
        "first": 0,
        "limit": 16,
        "idx": "",
        "iconFormat": 20,
        "prevQuery": "",
        "clientInfo": "lc=en-US,tz=2,kb=",
        "apiKey": "68f36b726c1961d488b63054f30d312c",
        "v": "2.0.145",
        "native": true,
        "sid": "69964af2-0b03-4616-8677-a54bc914ff78",
        "stats": "{\"retryNum\":0,\"firstSession\":false}"
    }

    var params = '';
    
    for (var k in options) {
        if (typeof options[k] !== "undefined") {
            params += k + "=" + encodeURIComponent(options[k]) + "&";
        }
    }

    var https = require('https');
    var reqOptions = {
      host: 'marketplace.firefox.com',
      path: '/api/v1/apps/search/?lang=en-US&pro=8a35d06e.32.1&q=' + query + '&region=us',
      port: 443,
      method: 'GET'
    };

    var req = https.request(reqOptions, function(response) {
      var str = ''
      response.on('data', function (chunk) {
        str += chunk;
      });

      response.on('end', function () {
        callback(str);
      });
    });
    req.end();
}
