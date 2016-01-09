'use strict';

/**
 * Generate the default keyboard layout config
 * (shared/resources/keyboard_layouts.json)
 * which is used to setup which layouts we should enable for each language
 */

var utils = require('./utils');

// To get the manifestURL of an app from webapps collection.
// Note: right now directory is used only for logging the directory info.
// For now, we would not allow multiple apps with the same appName.
function getManifestURL(webappsMapping, appName) {
  if (!webappsMapping[appName]) {
    utils.log('keyboard-layouts', 'Can not find application ' + appName +
      ' in webappsMapping');
    return '';
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

// Generate the default layout mapping from language -> keyboard layouts
// config: build config
// webappsMapping: all the webapps mapping
// allLayouts: all the preloaded keyboard layouts
function genDefaultLayouts(config, webappsMapping, allLayouts) {
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

  // Handle language -> layouts mapping
  let mapping = defaultKeyboards.layout;

  Object.keys(defaultKeyboards.layout).forEach(function(lang) {
    // Remove those mappings without the layouts preloaded
    var filteredLayouts = mapping[lang].filter(function(layoutEntry) {
      return (allLayouts.indexOf(layoutEntry.layoutId) != -1);
    });

    // Put a fallback layout to avoid an empty layout set
    if (filteredLayouts.length === 0) {
      filteredLayouts = defaultKeyboards.fallbackLayouts;
    }

    result.layout[lang] = filteredLayouts.map(function parseLayout(layout) {
      return getLayoutEntry(layout, webappsMapping);
    });
  });

  // Handle language-independent layouts
  let langIndLayouts = defaultKeyboards.langIndependentLayouts;
  langIndLayouts.forEach(function parseLayout(layout) {
    result.langIndependentLayouts.push(getLayoutEntry(layout, webappsMapping));
  });

  // Write the result to file
  let content = JSON.stringify(result, null, 2);
  let resultFile = utils.resolve(utils.joinPath('shared', 'resources',
    'keyboard_layouts.json'), config.GAIA_DIR);
  if (resultFile.exists()) {
    let prev = utils.getFileContent(resultFile);
    if (prev === content) {
      return;
    }
  }
  utils.writeContent(resultFile, content);
}

function execute(options) {
  // Get web apps mapping file
  let stageFolder = options.STAGE_DIR;
  let webappsMappingFile = utils.resolve(
    utils.joinPath(stageFolder, 'webapps_stage.json'),
    options.GAIA_DIR);

  if (!webappsMappingFile.exists()) {
    throw new Error('webapps mapping file not found, you should use' +
      ' webapp-manifests.js to create it first, path: ' +
      webappsMappingFile.path);
  }

  let webappsMapping = utils.getJSON(webappsMappingFile);
  let allLayouts = options.GAIA_KEYBOARD_LAYOUTS.split(',');

  genDefaultLayouts(options, webappsMapping, allLayouts);
}

exports.execute = execute;
exports.genDefaultLayouts = genDefaultLayouts;
