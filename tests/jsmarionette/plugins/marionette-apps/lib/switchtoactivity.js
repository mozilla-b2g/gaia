'use strict';
var getActivity = require('./getapp').getActivity;
var waitForActivity = require('./waitforapp').waitForActivity;

/**
 * Switch focus to an app that is run as inline activity based on the origin.
 * @param {Apps} apps to manage state.
 * @param {String} origin of the application.
 * @param {String} [activityHref] of the activity.
 * @param {Function} callback [Error err].
 */
function switchToActivity(apps, origin, activityHref, callback) {
  if (typeof activityHref === 'function') {
    callback = activityHref;
    activityHref = null;
  }

  var client = apps._client;
  callback = callback || client.defaultCallback;

  return getActivity(apps, origin, activityHref, function(err, app) {
    if (err) {
      return callback(err);
    }

    return waitForActivity(apps, app.source, function(err, iframe) {
      if (err) {
        return callback(err);
      }

      // By default, should set focus to the frame.
      return client.switchToFrame(iframe, {focus: true}, function(err) {
        return callback(err, iframe, app);
      });
    });
  });
}

module.exports.switchToActivity = switchToActivity;
