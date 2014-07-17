define(function(require) {
  'use strict';

  var SingletonFactory = require('utils/singleton_factory');

  var factory = new SingletonFactory({
    'Alarm': require('store/alarm'),
    'Busytime': require('store/busytime'),
    'Calendar': require('store/calendar'),
    'Event': require('store/event'),
    'IcalComponent': require('store/ical_component'),
    'Setting': require('store/setting')
  }, getArguments);

  function getArguments(data) {
    return [data.db];
  }

  return factory;

});
