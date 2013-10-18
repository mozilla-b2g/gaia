var utils = require('./utils');
const { Cc, Ci, Cr, Cu } = require('chrome');

exports.execute = function execute(config) {
  var layouts = config.GAIA_KEYBOARD_LAYOUTS.split(',');
  var appDir = utils.getFile(config.GAIA_DIR, 'apps', 'keyboard');
  var dictionariesDest = utils.getFile(appDir.path, 'js',
                                       'imes', 'latin', 'dictionaries');
  var layoutsDest = utils.getFile(appDir.path, 'js', 'layouts');
  var layoutData = {};

  // Read the layout files and find their names and dictionaries
  layouts.forEach(function(layoutName) {
    var layoutFile = utils.getFile(config.GAIA_DIR,
                                   'keyboard',
                                   'layouts',
                                   layoutName + '.js');

    try {
      layoutData[layoutName] = getLayoutNameAndDict(layoutName, layoutFile);
    }
    catch(e) {
      dump(e.message + '\n\n');
      throw new Error('Unknown keyboard layout "' + layoutName +
                      '" in GAIA_KEYBOARD_LAYOUTS');
    }

    // Copy the layout file to where it needs to go
    layoutFile.copyTo(layoutsDest, layoutFile.leafName);
  });

  // Copy the dictionary files that each layout needs
  for(var layoutName in layoutData) {
    var dictName = layoutData[layoutName].dict;
    if (!dictName)
      continue;
    var dictFile = utils.getFile(config.GAIA_DIR,
                                 'keyboard',
                                 'dictionaries',
                                 dictName + '.dict');
    try {
      dictFile.copyTo(dictionariesDest, dictFile.leafName);
    }
    catch(e) {
      dump(e.message + '\n\n');
      throw new Error('Unknown dictionary file ' + dictFile.path +
                      ' for keyboard layout ' + layoutName);

    }
  }

  // Read the template manifest.webapp file
  var manifestTemplateFile = utils.getFile(config.GAIA_DIR,
                                           'apps', 'keyboard',
                                           'manifest.template');
  var manifestTemplate = utils.getFileContent(manifestTemplateFile);

  var manifest = JSON.parse(manifestTemplate);

  // The entry_points property of the manifest object has one property
  // for each keyboard layout we support. And also a hard-coded one
  // for numeric keyboard layout.
  manifest.entry_points = {
    number: {
      launch_path: '/index.html#numberLayout',
      name: 'Number',
      description: 'Number layout',
      types: ['number']
    }
  };

  // Add each of our layouts to the list of entry points
  for(layoutName in layoutData) {
    var name = layoutData[layoutName].name;
    manifest.entry_points[layoutName] = {
      launch_path: '/index.html#' + layoutName,
      name: name,
      description: name,
      types: ['text', 'url']
    };
  }

  // Now write the edited manifest to manifest.webapp
  var manifestFile = utils.getFile(appDir.path, 'manifest.webapp');
  utils.writeContent(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

  // Read the .js file for the named keyboard layout and extract
  // the language name and auto-correct dictionary name.  We need these
  // to build the manifest file for the keyboard.
  function getLayoutNameAndDict(layoutName, layoutFile) {
    var content = utils.getFileContent(layoutFile);

    // The keyboard layout files are JavaScript files that add properties
    // to the Keybords object. They are not clean JSON, so we have to eval()
    // them.  They reference globals KeyEvent and KeyboardEvent, so we
    // have to define those here.
    var Keyboards = {};
    var KeyEvent = {};
    var KeyboardEvent = {};
    eval(content);  // Layouts are js, not JSON, so we can't JSON.parse()
    return {
      name: Keyboards[layoutName].menuLabel,
      dict: Keyboards[layoutName].autoCorrectLanguage || null
    };
  }
};
