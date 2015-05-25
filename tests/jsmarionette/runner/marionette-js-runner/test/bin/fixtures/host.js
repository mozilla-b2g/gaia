'use strict';
var Promise = require('promise');
var assert = require('assert');

exports.help = {
  group: {
    title: 'CUSTOM XFOO',
    description: 'CUSTOM DESC'
  },

  arguments: {
    '--code': {
      type: 'int',
      help: 'exit code'
    }
  }
};

var expectedHost = {
  destroy: function() {
    return Promise.resolve();
  }
};
module.exports.createHost = function() {
  return Promise.resolve(expectedHost);
};

module.exports.createSession = function(host, profile, opts) {
  assert.equal(host, expectedHost);
  process.exit(opts.code);
  return Promise.resolve();
};
