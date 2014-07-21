require.config({
  baseUrl: '/js',
  paths: {
    'modules': 'modules',
    'panels': 'panels',
    'shared': '../shared/js'
  },
  shim: {
    'connectivity': {
      exports: 'Connectivity'
    },
    'settings': {
      exports: 'Settings'
    },
    'shared/async_storage': {
      exports: 'asyncStorage'
    },
    'shared/icc_helper': {
      exports: 'IccHelper'
    },
    'shared/keyboard_helper': {
      exports: 'KeyboardHelper'
    },
    'shared/lazy_loader': {
      exports: 'LazyLoader'
    },
    'shared/manifest_helper': {
      exports: 'ManifestHelper'
    },
    'shared/screen_layout': {
      exports: 'ScreenLayout'
    },
    'shared/settings_url': {
      exports: 'SettingsURL'
    },
    'shared/omadrm/fl': {
      exports: 'ForwardLock'
    },
    'shared/settings_listener': {
      exports: 'SettingsListener'
    },
    'shared/wifi_helper': {
      exports: 'WifiHelper'
    },
    'utils': {
      exports: ''
    },
    'shared/device_storage/enumerate_all': {
      exports: 'enumerateAll'
    }
  },
  modules: [
    {
      name: 'main'
    },
    {
      name: 'panels/root/panel',
      exclude: [
        'main',
        'modules/battery'
      ]
    },
    {
      name: 'panels/languages/panel',
      exclude: [
        'main',
        'shared/keyboard_helper'
      ]
    },
    {
      name: 'panels/feedback_send/panel',
      exclude: ['main']
    },
    {
      name: 'panels/feedback_choose/panel',
      exclude: ['main']
    },
    {
      name: 'panels/help/panel',
      exclude: ['main']
    },
    {
      name: 'panels/app_permissions_detail/panel',
      exclude: ['main']
    },
    {
      name: 'panels/app_permissions_list/panel',
      exclude: ['main']
    },
    {
      name: 'panels/screen_lock/panel',
      exclude: ['main']
    },
    {
      name: 'panels/screen_lock_passcode/panel',
      exclude: ['main']
    },
    {
      name: 'panels/display/panel',
      exclude: [
        'main',
        'modules/mvvm/observable'
      ]
    },
    {
      name: 'panels/keyboard/panel',
      exclude: [
        'main',
        'modules/mvvm/list_view',
        'modules/mvvm/observable',
        'modules/mvvm/observable_array',
        'modules/keyboard_context'
      ]
    },
    {
      name: 'panels/keyboard_add_layouts/panel',
      exclude: [
        'main',
        'modules/mvvm/list_view',
        'modules/mvvm/observable',
        'modules/mvvm/observable_array',
        'modules/keyboard_context',
        'shared/keyboard_helper'
      ]
    },
    {
      name: 'panels/keyboard_enabled_default/dialog',
      exclude: [
        'main'
      ]
    },
    {
      name: 'panels/app_storage/panel',
      exclude: [
        'main',
        'modules/mvvm/observable'
      ]
    },
    {
      name: 'panels/wifi/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_auth/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_enter_certificate_nickname/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_join_hidden/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_manage_certificates/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_manage_networks/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_select_certificate_file/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_status/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_wps/panel',
      exclude: ['main']
    }
  ]
});
