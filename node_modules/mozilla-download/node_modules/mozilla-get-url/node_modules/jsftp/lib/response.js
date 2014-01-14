"use strict";

var RE_RES = /^(\d\d\d)\s(.*)/;
var RE_MULTI = /^(\d\d\d)-/;

/**
 * Receives a stream of responses from the server and filters
 * them before pushing them back into the stream. The filtering is
 * necessary to detect multiline responses, in which several responses from
 * the server belong to a single command.
 */
function responseHandler() {
  var buffer = [];
  var currentCode = 0;

  return function(line) {
    var simpleRes = RE_RES.exec(line);
    var multiRes;

    var code;
    if (simpleRes) {
      code = parseInt(simpleRes[1], 10);

      if (buffer.length) {
        buffer.push(line);

        if (currentCode === code) {
          line = buffer.join("\n");
          buffer = [];
          currentCode = 0;
        }
      }

      return { code: code, text: line };
    }
    else {
      if (!buffer.length && (multiRes = RE_MULTI.exec(line))) {
        currentCode = parseInt(multiRes[1], 10);
      }
      buffer.push(line.toString());
    }
  }
}

module.exports = responseHandler;
