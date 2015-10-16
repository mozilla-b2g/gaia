/*
    Contains things to initialize before we kick off the app.
    core/init, routes, and settings_app should be among the first modules
    required.
    Exposes a promise that the `main` module should wait on.
*/
define('init',
    ['core/init', 'routes', 'settings_app', 'templates'],
    function(init, routes, settingsApp, templates) {

    return init.ready;
});
