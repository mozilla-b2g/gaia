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
  // shim global object into AMD format
  // organized in alphabet order
  shim: {
    'dsds_settings': {
      exports: 'DsdsSettings'
    },
    'settings': {
      exports: 'Settings'
    },
    'shared/airplane_mode_helper': {
      exports: 'AirplaneModeHelper'
    },
    'shared/apn_helper': {
      exports: 'ApnHelper'
    },
    'shared/async_storage': {
      exports: 'asyncStorage'
    },
    'shared/bluetooth_helper': {
      exports: 'BluetoothHelper'
    },
    'shared/device_storage/enumerate_all': {
      exports: 'enumerateAll'
    },
    'shared/homescreens/homescreen_settings': {
      exports: 'homescreenSettings'
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
    'shared/manifest_helper': {
      exports: 'ManifestHelper'
    },
    'shared/mobile_operator': {
      exports: 'MobileOperator'
    },
    'shared/omadrm/fl': {
      exports: 'ForwardLock'
    },
    'shared/passcode_helper': {
      exports: 'PasscodeHelper'
    },
    'shared/sanitizer': {
      exports: 'Sanitizer'
    },
    'shared/screen_layout': {
      exports: 'ScreenLayout'
    },
    'shared/search_provider': {
      exports: 'SearchProvider'
    },
    'shared/settings_helper': {
      exports: 'SettingsHelper'
    },
    'shared/settings_listener': {
      exports: 'SettingsListener'
    },
    'shared/settings_url': {
      exports: 'SettingsURL'
    },
    'shared/sim_settings_helper': {
      exports: 'SimSettingsHelper'
    },
    'shared/simslot': {
      exports: 'SIMSlot'
    },
    'shared/simslot_manager': {
      exports: 'SIMSlotManager',
      deps: ['shared/simslot']
    },
    'shared/stk_helper': {
      exports: 'STKHelper'
    },
    'shared/toaster': {
      exports: 'Toaster'
    },
    'shared/tz_select': {
      exports: 'tzSelect',
      deps: ['shared/icc_helper']
    },
    'shared/uuid': {
      exports: 'uuid'
    },
    'shared/findmydevice_iac_api': {
      exports: 'wakeUpFindMyDevice'
    },
    'shared/wifi_helper': {
      exports: 'WifiHelper'
    },
    'utils': {
      exports: ''
    },
    'vendor/jszip': {
      exports: 'JSZip'
    }
  },
  // exclude reusable file in modules
  // XXX Bug 1207472 organized in alphabet order
  modules: [
    {
      name: 'main'
    },
    {
      name: 'modules/apn/apn_settings_manager',
      exclude: [
        'main',
        'modules/async_storage'
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
        'modules/media_storage',
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
      name: 'panels/findmydevice/panel',
      exclude: [
        'main',
        'modules/settings_utils'
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
      exclude: ['main']
    },
    {
      name: 'panels/keyboard/panel',
      exclude: [
        'main',
        'modules/mvvm/list_view',
        'modules/keyboard_context'
      ]
    },
    {
      name: 'panels/keyboard_add_layouts/panel',
      exclude: [
        'main',
        'modules/mvvm/list_view',
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
      name: 'panels/operator_settings/panel',
      exclude: [
        'main',
        'dsds_settings',
        'modules/defer',
        'modules/state_model',
        'modules/mvvm/list_view',
        'modules/dialog_service',
        'modules/customized_network_type_map'
      ]
    },
    {
      name: 'panels/date_time/panel',
      exclude: [
        'main',
        'modules/date_time'
      ]
    },
    {
      name: 'panels/browsing_privacy/panel',
      exclude: [
        'main',
        'modules/dialog_service'
      ]
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
        'modules/dialog_service'
      ]
    },
    {
      name: 'panels/hotspot_wifi_settings/panel',
      exclude: ['main']
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
      exclude: ['main']
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
      exclude: ['main']
    },
    {
      name: 'panels/call_barring_passcode_change/panel',
      exclude: ['main']
    },
    {
      name: 'panels/firefox_sync/panel',
      exclude: [
        'main',
        'modules/settings_utils'
      ]
    },
    {
      name: 'panels/usb_storage/panel',
      exclude: [
        'main',
        'modules/media_storage'
      ]
    }
  ]
});
