'use strict';

/* jshint node: true */

var utils = require('utils');

// All layouts for handwriting should be contained.
// When adding a new handwriting IME, add its layout here.
const allHandwritingLayouts = ['zh-Hans-Handwriting'];

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

function addSettings(appDirPath, distDirPath, enabledFeatures) {
  var settings = utils.getFile(appDirPath, 'settings.html');
  var content = utils.getFileContent(settings);
  var domDoc = utils.getDocument(content);

  // Add scripts and modify html for handwriting and user dictionary settings.
  // If parse handwriting-settings.html to dom element, and
  // add it to container with container.appendChild(), we met
  // an error:
  // "Exception: HierarchyRequestError: Node cannot be inserted at
  // the specified point in the hierarchy"
  // Is it a bug?

  var baseViewScriptElemInHead =
    domDoc.head.querySelector('script[src="js/settings/base_view.js"]');

  var insertScript = function (src) {
    var script = domDoc.createElement('script');
    script.defer = 'defer';
    script.src = src;
    domDoc.head.insertBefore(script, baseViewScriptElemInHead.nextSibling);
  };

  if (enabledFeatures.handwriting) {
    insertScript('js/settings/handwriting_settings_view.js');

    var hwSettings = utils.getFile(appDirPath, 'handwriting-settings.html');
    var hwContent = utils.getFileContent(hwSettings);
    domDoc.getElementById('general-container').innerHTML += hwContent;
  }

  if (enabledFeatures.userDict) {
    insertScript('js/settings/user_dictionary_edit_dialog.js');
    insertScript('js/settings/user_dictionary_list_panel.js');
    insertScript('js/settings/word_list_converter.js');
    insertScript('js/settings/user_dictionary.js');

    var udSettings = utils.getFile(appDirPath, 'user-dictionary-settings.html');
    var udContent = utils.getFileContent(udSettings);
    domDoc.querySelector('#general-container #general-settings ul').innerHTML +=
      udContent;
  }

  var sDoc = utils.serializeDocument(domDoc);
  utils.writeContent(utils.getFile(distDirPath, 'settings.html'), sDoc);
}

exports.checkHandwriting = checkHandwriting;
exports.addSettings = addSettings;
