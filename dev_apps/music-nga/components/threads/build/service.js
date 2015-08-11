var threads = module.exports = self['threads'] || {};
threads['service'] = require('../src/service');
if ((typeof define)[0] != 'u') define([], () => threads);
else self['threads'] = threads;
