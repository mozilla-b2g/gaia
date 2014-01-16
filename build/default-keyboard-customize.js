// Generate the default keyboard layout config
// (shared/resources/keyboard_layouts.json), which is used to setup which
// layouts we should enable for each language

'use strict';

var utils = require('./utils');
const { Cc, Ci, Cr, Cu } = require('chrome');
Cu.import('resource://gre/modules/osfile.jsm');


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

// Generate the default layout mapping from language-> keyboard layouts
// config:  the build config
// webapps: all the webapps
function genDefaultLayouts(config, webapps) {
  dump('genDefaultLayouts in default-keyboard-customize \n' + webapps);

  let defaultKeyboards = {
    'layout': {
      'ar': [
        {"layoutId": "es", "app": ['apps', 'keyboard']},
        {"layoutId": "en", "app": ['apps', 'keyboard']}
      ],
      "en-US": [
        {"layoutId": "ar", "app": ['apps', 'keyboard']}
      ]
    },
    'langIndependentLayouts' : [
      {"layoutId": "number", "app": ['apps', 'keyboard']}
    ]
  };

  let result = {
    layout: {},
    langIndependentLayouts: []
  };

  // handle language -> layouts mapping
  let mapping = defaultKeyboards.layout;

  for (var key in mapping) {
    dump('mapping ' + key + '\n');
    result.layout[key] = [];

    mapping[key].forEach(function parseLayout(layout) {
      result.layout[key].push({
        layoutId: layout.layoutId,
        appManifestURL: getManifestURL(webapps, layout.app[0], layout.app[1])
      });
    });
  }

  // handle language-independent layouts
  let langIndLayouts = defaultKeyboards.langIndependentLayouts;
  langIndLayouts.forEach(function parseLayout(layout)  {
    result.langIndependentLayouts.push({
      layoutId: layout.layoutId,
      appManifestURL: getManifestURL(webapps, layout.app[0], layout.app[1])
    });
  });

  // Write the result to file
  dump('result: ' + JSON.stringify(result));
  let resultFile = utils.resolve('shared/resources/keyboard_layouts.json',
                                 config.GAIA_DIR);
  utils.writeContent(resultFile, JSON.stringify(result));

  //defaultKeyboards = JSON.parse(utils.getDistributionFileContent('homescreens',
  //  defaultKeyboards, config.GAIA_DISTRIBUTION_DIR));
  //

}

exports.genDefaultLayouts = genDefaultLayouts;
