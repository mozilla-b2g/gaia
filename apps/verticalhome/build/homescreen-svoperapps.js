'use strict';

/* global require, exports */
var utils = require('utils');

const APPS_CONF_FILENAME = 'singlevariantconf.json';

// Read grid of homescreen to check which apps are not present but
// are going to be installed as a system apps.
function getSystemApps(config, grid) {
  // hiddenRoles identify applications that are not visible.
  var hiddenRoles = ['system', 'input', 'homescreen'];
  var systemApps = [];

  utils.gaia.getInstance(config).webapps.forEach(function(webapp) {
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

function customizeAppPosition(data, config, homescreen) {
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

  var conf = {};

  var systemApps = getSystemApps(config, homescreen.grid);

  var appsInfo = data.apps;

  data.operators.forEach(function(operator) {
    var grid = JSON.parse(JSON.stringify(homescreen.grid));

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

      var previousApps = 0;
      for (var i = 0; i < app.screen; i++) {
        previousApps += grid[i].length;
      }

      var location = previousApps + app.screen + app.location;
      if (screenLocations.indexOf(location) != -1) {
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

        if (wildcardApps.length > 0) {
          screen.push(wildcardApps.pop());
          continue;
        }

        throw new Error('Invalid position for app ' + app.id);
      }
      screen.splice(app.location, 0, app);
      screenLocations.push(location);
      app.location = location;
      app.manifestURL = appsInfo[app.id].manifestURL;
      delete app.id;
      delete app.screen;
    });

    // Insert wildcard apps to the output configuration
    var previousApps = 0;
    for (var i = 0; i < grid.length; i++) {
      previousApps += grid[i].length;
    }

    // Add remaining apps with no location
    wildcardApps.forEach(function(app) {
      app.manifestURL = appsInfo[app.id].manifestURL;
      delete app.id;
      delete app.screen;
      delete app.location;
      apps.push(app);
    });

    // For each mcc-mnc create an object with its apps array and add it to
    // output
    for (i = 0; i < operator['mcc-mnc'].length; i++) {
      conf[operator['mcc-mnc'][i]] = apps;
    }
  });

  return conf;
}

// main function
// the main flow of this module is:
// 1. read variants.json
// 2. validate variant.json and reorder index
// 3. customize layout with mcc-mnc.
function execute(options, homescreen, stageDir) {
  if (!options.VARIANT_PATH) {
    throw new Error('PROFILE_DIR, GAIA_DISTRIBUTION_DIR, VARIANT_PATH are all' +
                  ' required');
  }

  // read variant.json
  var data = utils.readJSONFromPath(options.VARIANT_PATH);
  // validate variant.json and customize layout with mcc-mnc
  var config = customizeAppPosition(data, options, homescreen);

  var file = utils.getFile(stageDir.path, 'js', APPS_CONF_FILENAME);
  utils.writeContent(file, JSON.stringify(config));
}

exports.execute = execute;
