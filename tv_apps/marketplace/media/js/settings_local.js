define('settings_local',
    [],
    function() {
    return {
        // Remove to have data fetched from CDN rather than API.
        api_cdn_whitelist: {},
        api_url: 'https://marketplace.firefox.com',
        media_url: 'https://marketplace.cdn.mozilla.net/media/',
    };
});
