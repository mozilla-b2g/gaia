'use strict';

/* global dump, require, exports */
const utils = require('utils');

const BASE_ICON_SIZE = 60;

function isAbsoluteURL(url) {
  return url.indexOf('data:') === 0 ||
         url.indexOf('app://') === 0 ||
         url.indexOf('http://') === 0 ||
         url.indexOf('https://') === 0;
}

// c.f. the corresponding implementation in the Homescreen app.
function bestMatchingIcon(config, manifest, origin) {
  var icons = manifest.icons;
  if (!icons) {
    return undefined;
  }

  var preferredIconSize = Number.MAX_VALUE;
  var max = 0;

  for (var size in icons) {
    size = parseInt(size, 10);
    if (size > max) {
      max = size;
    }

    if (size >= config.preferredIconSize && size < preferredIconSize) {
      preferredIconSize = size;
    }
  }
  // If there is an icon matching the preferred size, we return the result,
  // if there isn't, we will return the maximum available size.
  if (preferredIconSize === Number.MAX_VALUE) {
    preferredIconSize = max;
  }

  var url = icons[preferredIconSize];
  if (!url) {
    return undefined;
  }

  // If the icon path is not an absolute URL, prepend the app's origin.

  if (!isAbsoluteURL(url)) {
    url = origin + url;
  }

  return url;
}

function getAppMetadata(config, directory, appName, entryPoint) {
  var origin = null;
  var manifestURL = null;

  if (!config.webappsMapping[appName]) {
    dump('Warning: Can not find application ' + appName +
         ' at ' + directory + '\n');
    return;
  }

  var manifest = config.webappsMapping[appName].originalManifest;

  let entryPoints = manifest.entry_points;
  if (entryPoint && entryPoints && entryPoints[entryPoint]) {
    manifest = entryPoints[entryPoint];
  }

  origin = config.webappsMapping[appName].origin;
  manifestURL = config.webappsMapping[appName].manifestURL;

  let descriptor = {
    entry_point: entryPoint
  };

  descriptor.name = manifest.name;
  descriptor.manifestURL = manifestURL;
  descriptor.icon = bestMatchingIcon(config, manifest, origin);

  return descriptor;
}

function customizeHomescreen(config, homescreen) {
  var content = {
    grid: homescreen.homescreens.map(
      function mapHomescreens(applist) {
        var output = [];
        for (var i = 0; i < applist.length; i++) {
          if (applist[i] !== null) {
            var meta = getAppMetadata(config, applist[i][0],
                                      applist[i][1], applist[i][2]);
            meta && output.push(meta);
          }
        }
        return output;
      }
    ),
    preferences: homescreen.preferences || {}
  };

  return content;
}

function loadHomescreen(config, homescreen) {
  homescreen = homescreen || 'verticalhome';
  var defaultConfig = utils.getFile(config.GAIA_DIR, 'apps', homescreen,
    'build', 'default-homescreens.json');
  var customize = utils.getJSON(defaultConfig);

  // Load device specific configuration
  var deviceConfig = utils.getFile(config.GAIA_DIR, 'build', 'config',
    config.GAIA_DEVICE_TYPE, 'homescreens.json');
  if (deviceConfig.exists()) {
    customize = utils.getJSON(deviceConfig);
  }

  // Load distribution specific configuration
  if (config.GAIA_DISTRIBUTION_DIR) {
    var distributionCustom =
      JSON.parse(utils.getDistributionFileContent('homescreens',
        customize, config.GAIA_DISTRIBUTION_DIR));
    customize = customizeSettings(customize, distributionCustom);
  }

  return customize;
}

function customizeSettings(origin, custom) {
  Object.keys(custom).forEach(function(key) {
    origin[key] = custom[key];
  });
  return origin;
}

function configure(config) {
  config.preferredIconSize = BASE_ICON_SIZE *
                             parseFloat(config.GAIA_DEV_PIXELS_PER_PX);

  var mappingFile = utils.getFile(config.STAGE_DIR, 'webapps_stage.json');
  if (!mappingFile.exists()) {
    throw new Error('build_stage/webapps_stage.json not found.');
  }
  config.webappsMapping = utils.getJSON(mappingFile);

  config.displayHeight = config.GAIA_DEV_DISPLAY_HEIGHT;
}

exports.getHomescreen = function(config, homescreen) {
  configure(config);
  var rawHomescreen = loadHomescreen(config, homescreen);
  return customizeHomescreen(config, rawHomescreen);
};
