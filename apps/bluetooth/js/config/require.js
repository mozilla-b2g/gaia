require.config({
  baseUrl: '/js',
  paths: {
    'modules': 'modules',
    'views': 'views',
    'shared': '../shared/js'
  },
  shim: {
    'shared/async_storage': {
      exports: 'asyncStorage'
    },
    'shared/bluetooth_helper': {
      exports: 'BluetoothHelper'
    }
  }
});
