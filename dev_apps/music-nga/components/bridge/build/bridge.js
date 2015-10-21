
var bridge = {
  'service': require('../src/service'),
  'client': require('../src/client'),
  _m: require('../src/message')
};

if ((typeof define)[0] != 'u') define([], () => bridge);
else self['bridge'] = bridge;
