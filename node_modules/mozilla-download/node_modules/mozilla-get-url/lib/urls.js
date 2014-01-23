var fsPath = require('path');

var PREFIX = 'pub/mozilla.org';

/**
where we serve all content from over http
*/
var HTTP_URL = 'http://ftp.mozilla.org';

/**
where we serve ftp content (used instead of scraping html)
*/
var FTP_HOST = 'ftp.mozilla.org';

function httpUrl(uri) {
  return HTTP_URL + '/' + uri;
}

function ftpPath() {
  var parts = [PREFIX].concat(Array.prototype.slice.call(arguments));
  return fsPath.join.apply(fsPath, parts);
}

module.exports = {
  HTTP_URL: HTTP_URL,
  FTP_HOST: FTP_HOST,
  PUB_PREFIX: PREFIX,
  httpUrl: httpUrl,
  ftpPath: ftpPath
};
