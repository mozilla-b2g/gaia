define('settings_app',
    ['core/capabilities', 'core/settings', 'core/storage', 'settings_local'],
    function(capabilities, settings, storage, settingsLocal) {

     function offline_cache_enabled() {
        if (storage.getItem('offline_cache_disabled') || capabilities.phantom) {
            return false;
        }
        return window.location.search.indexOf('cache=false') === -1;
    }

    settings._extend({
        api_url: 'http://' + window.location.hostname,

        param_whitelist: ['q', 'sort'],
        api_param_blacklist: null,
        api_cdn_whitelist: {},

        // Specifies URLs to be cached (key: URL; value: TTL in seconds).
        // Cache is always refreshed asynchronously; TTLs only apply to when
        // app is first launched.
        offline_cache_whitelist: {},
        offline_cache_enabled: offline_cache_enabled,
        offline_cache_limit: 1024 * 1024 * 4, // 4 MB

        model_prototypes: {
            'apps': 'slug'
        },

        fragment_error_template: 'errors/fragment.html',
        pagination_error_template: 'errors/pagination.html',

        switches: [],

        title_suffix: 'Firefox Marketplace App'
    });

    settings._extend(settingsLocal);
});
