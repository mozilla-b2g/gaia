var bridge = module.exports = self['bridge'] || {};
bridge['client'] = require('../src/client');
if ((typeof define)[0] != 'u') define([], () => bridge);
else self['bridge'] = bridge;
