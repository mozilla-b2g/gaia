'use strict';
var fsPath = require('path'),
    list = require('./list').list,
    url = require('url');

/**
 * Creates the expected source of a app iframe.
 *
 * @param {App} app object to get source from.
 * @private
 */
function sourceForEntrypoint(app) {
  var origin = app.origin;
  var launchPath = app.entrypoint.details.launch_path;

  var urlParts = url.parse(origin);

  // Handle hashes in the launchPath
  if (launchPath.indexOf('#') !== -1) {
    var hashParts = launchPath.split('#');
    launchPath = hashParts[0];
    urlParts.hash = hashParts[1];
  }

  urlParts.pathname = fsPath.join(urlParts.pathname || '/', launchPath);
  return url.format(urlParts);
}

function sourceForActivity(app, activityHref) {
  var origin = app.origin;
  var activities = app.manifest.activities;
  var isHrefValid = false;

  for (var key in activities) {
    if (activities[key].href === activityHref) {
      isHrefValid = true;
    }
  }

  if (!isHrefValid) {
    throw new Error(origin + ' does not contain the href ' + activityHref);
  }

  return origin + activityHref;
}

/**
 * Find a given app by its origin and optionally an entrypoint.
 *
 * @param {Object} state current app state.
 * @param {String} origin of the app.
 * @param {String} [entrypoint] of the app.
 * @param {Function} callback [Error, App].
 */
function getApp(state, origin, entrypoint, callback) {
  if (typeof entrypoint === 'function') {
    callback = entrypoint;
    entrypoint = null;
  }

  callback = callback || state._client.defaultCallback;

  return getAppWithCheckOnOriginOnly(state, origin, function(err, originApp) {
    if (err) {
      return callback && callback(err);
    }

    originApp.source = origin;

    if (entrypoint) {
      // verify this is a valid entrypoint
      var details = originApp.manifest.entry_points[entrypoint];
      if (!details) {
        return callback(new Error('invalid entrypoint "' + entrypoint + '"'));
      }

      // add sugar for the apps entrypoint instance.
      originApp = Object.create(originApp);

      originApp.entrypoint = {
        name: entrypoint,
        details: details
      };

      // must come after the entrypoint assignment
      originApp.source = sourceForEntrypoint(originApp);
    }

    return callback(null, originApp);
  });
}

function getActivity(state, origin, activityHref, callback) {
  if (typeof activityHref === 'function') {
    callback = activityHref;
    activityHref = null;
  }

  return getAppWithCheckOnOriginOnly(state, origin, function(err, originApp) {
    if (err) {
      return callback && callback(err);
    }

    originApp.source = sourceForActivity(originApp, activityHref);
    return callback(null, originApp);
  });
}

function getAppWithCheckOnOriginOnly(state, origin, callback) {
  callback = callback || state._client.defaultCallback;

  var originApp;
  return list(state, function(err, apps) {

    if (err) {
      return callback && callback(err);
    }

    for (var i = 0, len = apps.length; i < len; i++) {
      if (apps[i].origin === origin) {
        originApp = apps[i];
        break;
      }
    }

    if (!originApp) {
      return callback(
        new Error('could not find an app with the origin: "' + origin + '"')
      );
    }

    originApp.source = origin;
    return callback(null, originApp);
  });
}

module.exports.getApp = getApp;
module.exports.getActivity = getActivity;
module.exports.sourceForEntrypoint = sourceForEntrypoint;
