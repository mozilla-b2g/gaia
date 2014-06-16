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

function bestMatchingBackground(config, manifest, origin) {

    var backgrounds = manifest.backgrounds;
    if (!backgrounds) {
      return undefined;
    }

    var url = backgrounds[config.displayHeight];
    if (url) {
      if (!isAbsoluteURL(url)) {
        url = origin + url;
      }
      return url;

    } else {
      throw new Error('invalid background height ' + config.displayHeight +
        ' for ' + manifest.name + ' (found ' +
        Object.keys(backgrounds).join(',') + ')\n');
    }
}

function getCollectionManifest(config, directory, appName) {
  var gaia = utils.gaia.getInstance(config);

  // Locate the directory of a given app.
  // If the directory (Gaia.distributionDir)/(directory)/(appName) exists,
  // favor it over (GAIA_DIR)/(directory)/(appName).
  var targetDir = gaia.distributionDir ?
    gaia.distributionDir : config.GAIA_DIR;
  var dir = utils.getFile(targetDir, directory, appName);

  if (!dir.exists()) {
    dir = utils.getFile(config.GAIA_DIR, directory, appName);
  }

  let manifestFile = dir.clone();
  // Looking for a homescreen's collection
  manifestFile.append('manifest.collection');
  if (manifestFile.exists()) {
    return utils.getJSON(manifestFile);
  }

  return null;
}

function getCollectionMetadata(config, directory, appName, entryPoint) {
  var manifest = getCollectionManifest(config, directory, appName);
  if (!manifest) {
      return null;
  }

  var descriptor = {
    entry_point: entryPoint,
    name: manifest.name,
    id: manifest.categoryId,
    categoryId: manifest.categoryId
  };

  // Iterating local apps installed in the collection by default
  var apps = [];
  if (Array.isArray(manifest.pinned)) {
    manifest.pinned.forEach(function iterate(app) {
      var iconInfo = getAppMetadata(config, app[0], app[1], app[2]);
      if (!iconInfo) {
        return;
      }
      app.splice(0, 2, iconInfo.manifestURL);
      apps.push(app);
    });
  }
  descriptor.pinned = apps;

  var origin = utils.gaiaOriginURL('collection', config.GAIA_SCHEME,
    config.GAIA_DOMAIN, config.GAIA_PORT);
 
  var background = bestMatchingBackground(config, manifest, origin);
  if (background) {
    descriptor.background = background;
  }

  descriptor.icon = bestMatchingIcon(config, manifest, origin);

  return descriptor;
}

function getAppMetadata(config, directory, appName, entryPoint) {
  var origin = null;
  var manifestURL = null;

  var manifest = getCollectionManifest(config, directory, appName);
  if (!manifest) {
    if (!config.webappsMapping[appName]) {
      dump('Warning: Can not find application ' + appName +
           ' at ' + directory + '\n');
      return;
    }

    manifest = config.webappsMapping[appName].originalManifest;

    let entryPoints = manifest.entry_points;
    if (entryPoint && entryPoints && entryPoints[entryPoint]) {
      manifest = entryPoints[entryPoint];
    }

    origin = config.webappsMapping[appName].origin;
    manifestURL = config.webappsMapping[appName].manifestURL;
  }

  let descriptor = {
    entry_point: entryPoint
  };

  if (manifest.role === 'collection') {
    descriptor.id = manifest.categoryId;
    descriptor.role = manifest.role;
  } else {
    descriptor.name = manifest.name;
    descriptor.manifestURL = manifestURL;
    descriptor.icon = bestMatchingIcon(config, manifest, origin);
  }

  return descriptor;
}

function customizeHomescreen(config, homescreen) {
  var content = {
    grid: homescreen.homescreens.map(
      function mapHomescreens(applist) {
        var output = [];
        for (var i = 0; i < applist.length; i++) {
          if (applist[i] !== null) {
            output.push(getAppMetadata(config, applist[i][0],
                                       applist[i][1], applist[i][2]));
          }
        }
        return output;
      }
    )
  };

  return content;
}

function getCollections(config, homescreen) {
  var collections = [];

  homescreen.homescreens.forEach(function (panel) {
    panel.forEach(function (app) {
      var collection = getCollectionMetadata(config, app[0], app[1], app[2]);
      if (collection) {
        collection.path = app;
        collections.push(collection);
      }
    });
  });

  return { collections: collections };
}

function loadHomescreen(config) {
  var defaultConfig = utils.getFile(config.GAIA_DIR, 'apps', 'verticalhome',
    'build', 'default-homescreens.json');
  var customize = utils.getJSON(defaultConfig);

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

exports.getHomescreen = function(config) {
  configure(config);
  var rawHomescreen = loadHomescreen(config);
  return customizeHomescreen(config, rawHomescreen);
};

exports.getCollections = function(config) {
  configure(config);
  var rawHomescreen = loadHomescreen(config);
  return getCollections(config, rawHomescreen);
};
