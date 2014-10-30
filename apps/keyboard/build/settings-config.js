'use strict';

/* global require, exports */

let {Cc, Ci} = require('chrome');

let utils = require('utils');

let parser = Cc['@mozilla.org/xmlextras/domparser;1']
             .createInstance(Ci.nsIDOMParser);
let serializer = Cc['@mozilla.org/xmlextras/xmlserializer;1']
                 .createInstance(Ci.nsIDOMSerializer);

// All layouts for handwriting should be contained.
// When adding a new handwriting IME, add its layout here.
const allHandwritingLayouts = ['zh-Hans-Handwriting'];

exports.checkHandwriting = checkHandwriting;
exports.addHandwritingSettings = addHandwritingSettings;

// Check whether pre-installed layouts contain layout for handwriting.
function checkHandwriting(allLayouts) {
  for (var i = 0; i < allHandwritingLayouts.length; i++) {
    for (var j = 0; j < allLayouts.length; j++) {
      if (allHandwritingLayouts[i] == allLayouts[j]) {
        return true;
      }
    }
  }
  return false;
}

function addHandwritingSettings(appDirPath, distDirPath) {
  var settings = utils.getFile(appDirPath, 'settings.html');
  var content = utils.getFileContent(settings);
  var domDoc = parser.parseFromString(content, 'text/html');

  // Add handwriting-settings.js
  var script = domDoc.createElement('script');
  script.defer = 'defer';
  script.src = 'js/settings/handwriting-settings.js';
  domDoc.head.appendChild(script);

  // Modify html for handwriting settings.
  // If parse handwriting-settings.html to dom element, and
  // add it to container with container.appendChild(), we met
  // an error:
  // "Exception: HierarchyRequestError: Node cannot be inserted at
  // the specified point in the hierarchy"
  // Is it a bug?
  settings = utils.getFile(appDirPath, 'handwriting-settings.html');
  content = utils.getFileContent(settings);
  var container = domDoc.getElementById('container');
  container.innerHTML += content;
  var sDoc = serializer.serializeToString(domDoc);
  utils.writeContent(utils.getFile(distDirPath, 'settings.html'), sDoc);
}
