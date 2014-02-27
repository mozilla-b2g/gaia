'use strict';

/* global require, exports */
var utils = require('utils');

const DEFAULT_EMPTY_SCREENS = 2;
const MAX_ICONS_PER_PAGE = 4 * 4;
const APPS_CONF_FILENAME = 'singlevariantconf.json';

// read the app postion customization part in variant.json and write the result
// to APPS_CONF_FILENAME.
function customizeAppPosition(data, profilePath, distributionPath) {
  utils.log('svoperapps.js', 'fetch config');
  // generating metadata
  var apps = data.apps;
  var outputHomescreen = {};
  data.operators.forEach(function(operator) {
    // Build an array with the apps for one operator and check if id is valid
    if (!operator.apps) {
      return;
    }
    var row = [];
    var rowHomescreen = [];
    operator.apps.forEach(function(app) {
      var appId = app.id;
      if (!apps[appId]) {
        throw new Error('Invalid application id: ' + appId);
      }
      row.push(appId);
      if (!apps[appId].manifestURL) {
        throw new Error('manifestURL not found for application: ' + appId);
      }
      app.manifestURL = apps[appId].manifestURL;
      delete app.id;
      rowHomescreen.push(app);
    });
    // For each mcc-mnc create an object with its apps array and add it to
    // output
    for (var i = 0; i < operator['mcc-mnc'].length; i++) {
      outputHomescreen[operator['mcc-mnc'][i]] = rowHomescreen;
    }
  });

  return outputHomescreen;
}

// Read grid of homescreen to check which apps are not present but
// are going to be installed as a system apps.
function getSystemApps(config, grid) {
  // hiddenRoles identify applications that are not visible.
  var hiddenRoles = ['system', 'input', 'homescreen'];
  var systemApps = [];

  utils.getGaia(config).webapps.forEach(function(webapp) {
    if (!webapp.manifest.role ||
      hiddenRoles.indexOf(webapp.manifest.role) === -1) {
      // Check if the application has an entrypoint, it means that there are
      // multiple icons for that application.
      if (webapp.manifest.entry_points) {
        for(var i in webapp.manifest.entry_points){
          if (webapp.manifest.entry_points[i].icons) {
            systemApps.push(webapp.manifest.entry_points[i].name);
          }
        }
      } else {
        systemApps.push(webapp.manifest.name);
      }
    }
  });

  // systemApps contains all systemApps, the ones configured in grid
  // have to be deleted to avoid duplication.
  grid.forEach(function(screen){
    screen.forEach(function(app) {
      var index = systemApps.indexOf(app.name);
      if (index !== -1) {
        systemApps.splice(index, 1);
      }
    });
  });

  return systemApps;
}

function validateHomescreen(data, config, homescreen) {
  // Custom comparation function used to sort apps by screen and location
  function compare(a, b) {
    if (a.screen < b.screen) {
      return -1;
    }
    if (a.screen > b.screen) {
      return 1;
    }
    if (a.location < b.location) {
      return -1;
    }
    if (a.location > b.location) {
      return 1;
    }
    return 0;
  }


  var systemApps = getSystemApps(config, homescreen.grid);

  data.operators.forEach(function(operator) {
    var grid = JSON.parse(JSON.stringify(homescreen.grid));

    // Remove dock apps
    grid.shift();

    var apps = [];

    // Variable to hold system apps, used to fill gaps. These ones cannot be
    // placed in screen 0.
    var wildcardSystemApps = systemApps.slice(0);

    // variable to hold apps with no location and screen, used to fill gaps
    var wildcardApps = [];
    operator.apps.forEach(function(app) {
      if(!app.id) {
        throw new Error('Missing id in some app');
      }

      // Check if screen and location both exists and are a number
      if ((typeof app.screen !==  'undefined' &&
           typeof app.screen !== 'number') ||
           typeof app.screen !== typeof app.location) {
        throw new Error('Invalid app position for ' + app.id +
                        '. Missing location or screen property,' +
                        ' or properties are not a number');
      }

      if(typeof app.screen == 'number') {
        apps.push(app);
      } else {
        wildcardApps.push(app);
      }
    });

    // Sort list of apps with position by screen and location and validate
    // position in homescreen.
    apps = apps.sort(compare);

    // Initialize grid in case it is empty
    for (var i = 0; i < DEFAULT_EMPTY_SCREENS; i++) {
      if (!grid[i]) {
        grid.push([]);
      }
    }

    var screenLocations = [];
    apps.forEach(function(app) {
      var screen = grid[app.screen];
      if (!screen) {
        if (!(grid[app.screen - 1])) {
          throw new Error('Invalid screen position');
        }

        // Create new screen
        screen = [];
        grid.push(screen);
      }

      var screenLocation = parseInt(app.screen + '' + app.location);
      if (screenLocation in screenLocations) {
        throw new Error('Two applications are in the same position');
      }

      // If the position of the application is greater than the number of
      // applications in the screen, the position is invalid. However, other
      // single variant apps with no screen and position can be used to fill
      // gaps. System apps not present in the init.json can also be used to
      // fill gaps, but these ones can not be put in the screen 0.
      while (app.location > screen.length) {
        if (app.screen > 0 && wildcardSystemApps.length > 0) {
          screen.push(wildcardSystemApps.pop());
          continue;
        }

        if (wildcardApps.length > 0){
          screen.push(wildcardApps.pop());
          continue;
        }

        throw new Error('Invalid position for app ' + app.id);
      }
      screen.splice(app.location, 0, app);
      screenLocations.push(screenLocation);
    });

    // Check if some screen has more apps than MAX_ICON_PER_PAGE
    var counter = 0;
    grid.forEach(function(screen) {
      if (screen.length > MAX_ICONS_PER_PAGE) {
        utils.log('svoperapps.js', 'WARNING: More apps than ' +
          MAX_ICONS_PER_PAGE + ' in screen ' + counter);
      }
      counter++;
    });
  });
}

// main function
// the main flow of this module is:
// 1. read variants.json
// 2. validate variant.json and reorder index
// 3. customize layout with mcc-mnc.
function execute(options, homescreen, stageDir) {
  if (!options.PROFILE_DIR || !options.GAIA_DISTRIBUTION_DIR ||
      !options.VARIANT_PATH) {
    throw new Error('PROFILE_DIR, GAIA_DISTRIBUTION_DIR, VARIANT_PATH are all' +
                  ' required');
  }

  var profilePath = options.PROFILE_DIR;
  var distributionPath = options.GAIA_DISTRIBUTION_DIR;

  // read variant.json
  var data = utils.readJSONFromPath(options.VARIANT_PATH);
  // validate variant.json
  validateHomescreen(data, options, homescreen);

  // customize layout with mcc-mnc.
  var config = customizeAppPosition(data, profilePath, distributionPath);
  var file = utils.getFile(stageDir.path, 'js', APPS_CONF_FILENAME);
  utils.writeContent(file, JSON.stringify(config));
}

exports.execute = execute;
