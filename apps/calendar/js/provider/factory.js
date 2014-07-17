define(function(require) {
  'use strict';

  var SingletonFactory = require('utils/singleton_factory');

  var factory = new SingletonFactory({
    'Caldav': require('./caldav'),
    'Local': require('./local')
  }, getArguments);

  function getArguments(data) {
    return [data.app];
  }

  return factory;

});
