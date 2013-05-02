(function(global) {
'use strict';

var parser = new DOMParser();
var bodyHTML = {};

function getFile(filename, callback) {
  var req = new XMLHttpRequest();
  req.open('GET', filename, false);
  req.onerror = function() {
    throw new Error('Unable to load ' + filename + ' for body HTML');
  };
  req.send();
  if (req.status !== 200) {
    req.onerror();
  }

  // parse and sanitize the document
  var doc = parser.parseFromString(req.response, 'text/html');
  if (!doc) {
    throw new Error('Unable to parse ' + filename + ' for body HTML');
  }

  // remove scripts for safety
  var scripts = doc.querySelectorAll('script');
  Array.prototype.forEach.call(scripts, function(scriptNode) {
    scriptNode.parentNode.removeChild(scriptNode);
  });

  // copy html from body tag
  bodyHTML[filename] = doc.body.innerHTML;
}

function loadBodyHTML(filename) {
  if (!(filename in bodyHTML)) {
    getFile(filename);
  }
  document.body.innerHTML = bodyHTML[filename];
}

global.loadBodyHTML = loadBodyHTML;

}(this));
