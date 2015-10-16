define('settings_local',
    ['core/polyfill'],
    function(polyfill) {

    // core/polyfill is needed for `window.location.origin`.
    settings._extend({
        api_url: window.location.origin,
        media_url: document.body.getAttribute('data-media')
    });
});
