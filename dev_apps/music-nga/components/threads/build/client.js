var threads = module.exports = self['threads'] || {};
threads['client'] = require('../src/client');
if ((typeof define)[0] != 'u') define([], () => threads);
else self['threads'] = threads;
