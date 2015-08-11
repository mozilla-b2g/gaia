
var threads = {
  'service': require('../src/service'),
  'client': require('../src/client'),
  _m: require('../src/message')
};

if ((typeof define)[0] != 'u') define([], () => threads);
else self['threads'] = threads;
