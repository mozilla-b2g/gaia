// Generate the default keyboard layout config
// (shared/resources/keyboard_layouts.json), which is used to setup which
// layouts we should enable for each language

/* global require, exports */
'use strict';
var utils = require('./utils');

// To get the manifestURL of an app from webapps collection.
// Note: right now directory is used only for logging the directory info.
// For now, we would not allow multiple apps with the same appName.
function getManifestURL(webapps, directory, appName) {
  if (!webapps[appName]) {
    throw new Error(
      'Can not find application ' + appName + ' at ' + directory
    );
  }

  return webapps[appName].webappsJson.manifestURL;
}

// Helper function to return a layout entry which represents a layout
// in the keyboard_layouts.json.
function getLayoutEntry(layout, webapps) {
  return {
    layoutId: layout.layoutId,
    appManifestURL: getManifestURL(webapps, layout.app[0], layout.app[1])
  };
}

// Generate the default layout mapping from language-> keyboard layouts
// config:  the build config
// webapps: all the webapps
function genDefaultLayouts(config, webapps) {
  let layoutDefFile = utils.resolve(config.KEYBOARD_LAYOUTS_PATH,
    config.GAIA_DIR);

  if (!layoutDefFile.exists()) {
    throw new Error('file not found: ' + layoutDefFile.path);
  }

  let defaultKeyboards = utils.getJSON(layoutDefFile);

  let result = {
    layout: {},
    langIndependentLayouts: []
  };

  // handle language -> layouts mapping
  let mapping = defaultKeyboards.layout;

  function parseLayout(layout) {
      result.layout[key].push(getLayoutEntry(layout, webapps));
  }

  for (var key in mapping) {
    result.layout[key] = [];
    mapping[key].forEach(parseLayout);
  }

  // handle language-independent layouts
  let langIndLayouts = defaultKeyboards.langIndependentLayouts;
  langIndLayouts.forEach(function parseLayout(layout) {
    result.langIndependentLayouts.push(getLayoutEntry(layout, webapps));
  });

  // Write the result to file
  let resultFile = utils.resolve(
    utils.joinPath('shared', 'resources', 'keyboard_layouts.json'),
    config.GAIA_DIR);
  utils.writeContent(resultFile, JSON.stringify(result));
}

exports.genDefaultLayouts = genDefaultLayouts;
