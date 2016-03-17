require.config({
  baseUrl: '/js',
  paths: {
    'modules': 'modules',
    'panels': 'panels',
    'shared': '../shared/js',
    'views': '../views'
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
    'shared/addons/match_pattern': {
      exports: 'MatchPattern'
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
    'shared/download/download_formatter': {
      exports: 'DownloadFormatter'
    },
    'shared/download/download_store': {
      exports: 'DownloadStore'
    },
    'shared/download/download_ui': {
      exports: 'DownloadUI'
    },
    'shared/download/download_helper': {
      exports: 'DownloadHelper'
    },
    'shared/fxa_iac_client': {
      exports: 'FxAccountsIACHelper'
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
    'shared/mime_mapper': {
      exports: 'MimeMapper'
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
    'shared/text_normalizer': {
      exports: 'Normalizer'
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
    'vendor/jszip': {
      exports: 'JSZip'
    }
  },
  // exclude reusable file in modules
  // organized in alphabet order
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
      name: 'panels/about/panel',
      exclude: ['main']
    },
    {
      name: 'panels/about_more_info/panel',
      exclude: [
        'main',
        'modules/bluetooth/bluetooth_context'
      ]
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
      name: 'panels/app_storage/panel',
      exclude: [
        'main',
        'modules/app_storage',
        'modules/storage_helper'
      ]
    },
    {
      name: 'views/phone/bluetooth/panel',
      exclude: [
        'main',
        'modules/mvvm/list_view',
        'modules/dialog_service',
        'modules/bluetooth/bluetooth_context'
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
      name: 'panels/call_barring/panel',
      exclude: ['main']
    },
    {
      name: 'panels/call_barring_passcode_change/panel',
      exclude: ['main']
    },
    {
      name: 'panels/date_time/panel',
      exclude: [
        'main',
        'modules/date_time'
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
      name: 'panels/display/panel',
      exclude: ['main']
    },
    {
      name: 'panels/feedback_choose/panel',
      exclude: ['main']
    },
    {
      name: 'panels/feedback_send/panel',
      exclude: ['main']
    },
    {
      name: 'panels/findmydevice/panel',
      exclude: [
        'main',
        'modules/settings_utils'
      ]
    },
    {
      name: 'panels/firefox_accounts/panel',
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
      name: 'panels/frame/panel',
      exclude: ['main']
    },
    {
      name: 'panels/help/panel',
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
      name: 'panels/languages/panel',
      exclude: [
        'main',
        'shared/keyboard_helper',
        'modules/date_time'
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
      name: 'panels/operator_settings/panel',
      exclude: [
        'main',
        'dsds_settings',
        'modules/defer',
        'modules/state_model',
        'modules/mvvm/list_view',
        'modules/dialog_service',
        'modules/customized_network_type_map',
        'modules/mobile/supported_network_info'
      ]
    },
    {
      name: 'views/phone/root/panel',
      exclude: [
        'main',
        'views/phone/root/low_priority_items',
        'modules/apps_cache',
        'modules/addon_manager',
        'modules/storage_helper'
      ]
    },
    {
      name: 'views/phone/root/low_priority_items',
      exclude: [
        'main',
        'modules/app_storage',
        'modules/battery',
        'modules/bluetooth/bluetooth_context',
        'modules/media_storage',
        'modules/sim_security',
        'modules/wifi_context'
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
      name: 'panels/search/panel',
      exclude: ['main']
    },
    {
      name: 'panels/simcard_manager/panel',
      exclude: ['main']
    },
    {
      name: 'panels/simpin/panel',
      exclude: [
        'main',
        'modules/sim_security'
      ]
    },
    {
      name: 'panels/sound/panel',
      exclude: [
        'main',
        'modules/mobile/supported_network_info'
      ]
    },
    {
      name: 'panels/usb_storage/panel',
      exclude: [
        'main',
        'modules/media_storage'
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
    }
  ]
});
