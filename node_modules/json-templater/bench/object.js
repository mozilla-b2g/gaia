var tplString = require('../string');
var objectRender = require('../object');
var mustache = require('mustache');

var fixture = require('./fixture.json');

module.exports.compare = {
  "json-template/string": function() {
    return objectRender(fixture, fixture.parameters);
  },

  "mustache": function() {
    return objectRender(fixture, fixture.parameters, mustache.render);
  }
};
