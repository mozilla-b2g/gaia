var bridge = module.exports = self['bridge'] || {};
bridge['service'] = require('../src/service');
if ((typeof define)[0] != 'u') define([], () => bridge);
else self['bridge'] = bridge;
