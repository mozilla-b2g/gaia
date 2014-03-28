// Generate the default keyboard layout config
// (shared/resources/keyboard_layouts.json), which is used to setup which
// layouts we should enable for each language

/* global require, exports */
'use strict';
var utils = require('./utils');

// To get the manifestURL of an app from webapps collection.
// Note: right now directory is used only for logging the directory info.
// For now, we would not allow multiple apps with the same appName.
function getManifestURL(webappsMapping, appName) {
  if (!webappsMapping[appName]) {
    throw new Error(
      'Can not find application ' + appName + 'in webappsMapping'
    );
  }

  return webappsMapping[appName].manifestURL;
}

// Helper function to return a layout entry which represents a layout
// in the keyboard_layouts.json.
function getLayoutEntry(layout, webappsMapping) {
  return {
    layoutId: layout.layoutId,
    appManifestURL: getManifestURL(webappsMapping, layout.app[1])
  };
}

// Generate the default layout mapping from language-> keyboard layouts
// config:  the build config
// webappsMapping: all the webapps mapping
function genDefaultLayouts(config, webappsMapping) {
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
    return getLayoutEntry(layout, webappsMapping);
  }

  for (var key in mapping) {
    result.layout[key] = mapping[key].map(parseLayout);
  }

  // handle language-independent layouts
  let langIndLayouts = defaultKeyboards.langIndependentLayouts;
  langIndLayouts.forEach(function parseLayout(layout) {
    result.langIndependentLayouts.push(getLayoutEntry(layout, webappsMapping));
  });

  // Write the result to file
  let resultFile = utils.resolve(
    utils.joinPath('shared', 'resources', 'keyboard_layouts.json'),
    config.GAIA_DIR);
  utils.writeContent(resultFile, JSON.stringify(result));
}

function execute(options) {
  // Get web apps mapping file
  let stageFolder = utils.getEnv('STAGE_FOLDER');
  let webappsMappingFile = utils.resolve(
    utils.joinPath(stageFolder, 'webapps-mapping.json'),
    options.GAIA_DIR);

  if (!webappsMappingFile.exists()) {
    throw new Error('webapps mapping file not found, you should use' +
      ' webapp-manifests.js to create it first, path: ' +
      webappsMappingFile.path);
  }

  let webappsMapping = utils.getJSON(webappsMappingFile);
  utils.log(JSON.stringify(webappsMapping));

  genDefaultLayouts(options, webappsMapping);
}

exports.execute = execute;
exports.genDefaultLayouts = genDefaultLayouts;
