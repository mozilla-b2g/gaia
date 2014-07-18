define(function(require) {
  'use strict';

  var SingletonFactory = require('utils/singleton_factory');

  var factory = new SingletonFactory({
    'Alarm': require('./alarm'),
    'Account': require('./account'),
    'Busytime': require('./busytime'),
    'Calendar': require('./calendar'),
    'Event': require('./event'),
    'IcalComponent': require('./ical_component'),
    'Setting': require('./setting')
  }, getArguments);

  function getArguments(data) {
    return [data.db];
  }

  return factory;

});
