require.config({
  baseUrl: '/js',
  paths: {
    'modules': 'modules',
    'views': 'views',
    'shared': '../shared/js'
  },
  shim: {
    'shared/bluetooth_helper': {
      exports: 'BluetoothHelper'
    }
  }
});
