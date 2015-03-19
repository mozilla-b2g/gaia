require.config({
  baseUrl: '/js',
  paths: {
    'modules': 'modules',
    'panels': 'panels',
    'shared': '../shared/js'
  },
  // This is the default value of the loading timeout, we will disable the
  // timeout in the production build
  waitSeconds: 7,
  shim: {
    'settings': {
      exports: 'Settings'
    },
    'dsds_settings': {
      exports: 'DsdsSettings'
    },
    'simcard_lock': {
      exports: 'SimPinLock'
    },
    'shared/apn_helper': {
      exports: 'ApnHelper'
    },
    'shared/async_storage': {
      exports: 'asyncStorage'
    },
    'shared/icc_helper': {
      exports: 'IccHelper'
    },
    'shared/keyboard_helper': {
      exports: 'KeyboardHelper',
      deps: ['shared/input_mgmt/input_app_list']
    },
    'shared/language_list': {
      exports: 'LanguageList'
    },
    'shared/lazy_loader': {
      exports: 'LazyLoader'
    },
    'shared/search_provider': {
      exports: 'SearchProvider'
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
    'shared/settings_helper': {
      exports: 'SettingsHelper'
    },
    'shared/omadrm/fl': {
      exports: 'ForwardLock'
    },
    'shared/settings_listener': {
      exports: 'SettingsListener'
    },
    'shared/toaster': {
      exports: 'Toaster'
    },
    'shared/template': {
      exports: 'Template'
    },
    'shared/sim_settings_helper': {
      exports: 'SimSettingsHelper'
    },
    'shared/tz_select': {
      exports: 'tzSelect',
      deps: ['shared/icc_helper']
    },
    'shared/wifi_helper': {
      exports: 'WifiHelper'
    },
    'shared/bluetooth_helper': {
      exports: 'BluetoothHelper'
    },
    'shared/simslot': {
      exports: 'SIMSlot'
    },
    'shared/simslot_manager': {
      exports: 'SIMSlotManager',
      deps: ['shared/simslot']
    },
    'shared/mobile_operator': {
      exports: 'MobileOperator'
    },
    'utils': {
      exports: ''
    },
    'shared/device_storage/enumerate_all': {
      exports: 'enumerateAll'
    },
    'shared/airplane_mode_helper': {
      exports: 'AirplaneModeHelper'
    },
    'shared/homescreens/vertical_preferences': {
      exports: 'verticalPreferences'
    },
    'shared/stk_helper': {
      exports: 'STKHelper'
    }
  },
  modules: [
    {
      name: 'main'
    },
    {
      name: 'modules/apn/apn_settings_manager',
      exclude: [
        'main',
        'modules/async_storage',
        'modules/mvvm/observable'
      ]
    },
    {
      name: 'modules/dialog_service',
      exclude: ['main']
    },
    {
      name: 'panels/root/panel',
      exclude: [
        'main',
        'panels/root/low_priority_items',
        'modules/apps_cache',
        'modules/bluetooth/version_detector',
        'modules/addon_manager'
      ]
    },
    {
      name: 'panels/root/low_priority_items',
      exclude: [
        'main',
        'modules/bluetooth/version_detector',
        'modules/app_storage',
        'modules/battery',
        'modules/wifi_context',
        'modules/sim_security'
      ]
    },
    {
      name: 'panels/simpin/panel',
      exclude: [
        'main',
        'modules/sim_security'
      ]
    },
    {
      name: 'panels/languages/panel',
      exclude: [
        'main',
        'shared/keyboard_helper',
        'modules/date_time'
      ]
    },
    {
      name: 'panels/frame/panel',
      exclude: ['main']
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
      exclude: [
        'main',
        'modules/apps_cache'
      ]
    },
    {
      name: 'panels/screen_lock/panel',
      exclude: ['main']
    },
    {
      name: 'panels/screen_lock_passcode/panel',
      exclude: [
        'main',
        'modules/settings_utils'
      ]
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
      name: 'panels/app_storage/panel',
      exclude: [
        'main',
        'modules/app_storage'
      ]
    },
    {
      name: 'panels/wifi/panel',
      exclude: [
        'main',
        'modules/dialog_service'
      ]
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
      exclude: [
        'main',
        'modules/settings_utils'
      ]
    },
    {
      name: 'panels/wifi_manage_networks/panel',
      exclude: [
        'main',
        'modules/dialog_service'
      ]
    },
    {
      name: 'panels/wifi_select_certificate_file/panel',
      exclude: [
        'main',
        'modules/settings_utils'
      ]
    },
    {
      name: 'panels/wifi_status/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_wps/panel',
      exclude: ['main']
    },
    {
      name: 'panels/date_time/panel',
      exclude: [
        'main',
        'modules/mvvm/observable',
        'modules/date_time'
      ]
    },
    {
      name: 'panels/browsing_privacy/panel',
      exclude: ['main']
    },
    {
      name: 'panels/search/panel',
      exclude: ['main']
    },
    {
      name: 'panels/homescreens/panel',
      exclude: [
        'main',
        'modules/apps_cache'
      ]
    },
    {
      name: 'panels/sound/panel',
      exclude: ['main']
    },
    {
      name: 'panels/simcard_manager/panel',
      exclude: ['main']
    },
    {
      name: 'panels/hotspot/panel',
      exclude: [
        'main',
        'modules/mvvm/observable',
        'modules/dialog_service'
      ]
    },
    {
      name: 'panels/hotspot_wifi_settings/panel',
      exclude: [
        'main',
        'modules/mvvm/observable'
      ]
    },
    {
      name: 'panels/messaging/panel',
      exclude: [
        'main',
        'modules/messaging',
        'modules/settings_utils'
      ]
    },
    {
      name: 'panels/messaging_details/panel',
      exclude: [
        'main',
        'modules/messaging',
        'modules/settings_utils'
      ]
    },
    {
      name: 'panels/about/panel',
      exclude: [
        'main'
      ]
    },
    {
      name: 'panels/about_more_info/panel',
      exclude: [
        'main',
        'modules/bluetooth/version_detector',
        'modules/bluetooth/bluetooth_v1',
        'modules/bluetooth/bluetooth_context'
      ]
    },
    {
      name: 'panels/developer/panel',
      exclude: [
        'main',
        'modules/dialog_service',
        'modules/apps_cache'
      ]
    },
    {
      name: 'panels/developer_hud/panel',
      exclude: ['main']
    },
    {
      name: 'panels/call_barring/panel',
      exclude: [
        'main',
        'modules/mvvm/observable'
      ]
    },
    {
      name: 'panels/call_barring_passcode_change/panel',
      exclude: ['main']
    }
  ]
});
