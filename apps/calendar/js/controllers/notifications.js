define(function(require, exports) {
'use strict';

var calc = require('common/calc');
var core = require('core');
var dateFormat = require('date_format');
var debug = require('common/debug')('controllers/notifications');
var messageHandler = require('message_handler');
var notification = require('notification');

exports.observe = function() {
  debug('Will start notifications controller...');
  messageHandler.responder.on('alarm', exports.onAlarm);
  core.bridge.on('alarm', exports.onAlarm);
};

exports.unobserve = function() {
  messageHandler.responder.off('alarm', exports.onAlarm);
  core.bridge.off('alarm', exports.onAlarm);
};

exports.onAlarm = function(alarm) {
  debug('Will request cpu wake lock...');
  var lock = navigator.requestWakeLock('cpu');
  debug('Received cpu lock. Will issue notification...');
  return issueNotification(alarm).catch(err => {
    console.error('controllers/notifications', err.toString());
  }).then(() => {
    // release cpu lock with or without errors
    debug('Will release cpu wake lock...');
    lock.unlock();
  });
};

function issueNotification(alarm) {
  core.bridge.getNotificationDetails(alarm).then(data => {
    var { event, busytime } = data;

    var begins = calc.dateFromTransport(busytime.start);
    var distance = dateFormat.fromNow(begins);
    var now = new Date();

    var alarmType = begins > now ?
      'alarm-start-notice' :
      'alarm-started-notice';

    var l10n = navigator.mozL10n;
    var title = l10n.get(alarmType, {
      title: event.remote.title,
      distance: distance
    });

    var body = event.remote.description || '';
    debug('Will send event notification with title:', title, 'body:', body);
    return notification.sendNotification(
      title,
      body,
      `/alarm-display/${busytime._id}`
    );
  });
}

});
