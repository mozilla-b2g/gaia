define(function(require) {
  'use strict';

  function MockTemplate(idOrNode) {

  }

  MockTemplate.prototype.interpolate = function(data, options) {
    return data;
  };

  return MockTemplate;
});
