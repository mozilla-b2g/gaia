/*
    The main file that initializes the app.
    Only put initialization code in here. Everything else should go into
    separate and appropriate modules. This is not your diaper.
*/
console.log('Firefox Marketplace App');

define('main', ['init'], function(init) {
init.done(function() {
require(
    [// Modules actually used in main.
     'core/l10n', 'core/log', 'core/navigation', 'core/nunjucks',
     'core/settings', 'core/user', 'core/z',
     // Modules we require to initialize global stuff.
     'core/forms', 'core/login', 'helpers_local'],
    function(l10n, log, navigation, nunjucks,
             settings, user, z) {
    var logger = log('main');

    z.body.addClass('html-' + l10n.getDirection());

    z.page.on('reload_chrome', function() {
        // Last minute template compilation.
        logger.log('Reloading chrome');

        z.body.toggleClass('logged-in', user.logged_in());
        z.page.trigger('reloaded_chrome');
    }).trigger('reload_chrome');

    z.body.on('click', '.site-header .back', function(e) {
        e.preventDefault();
        navigation.back();
    });

    // Perform initial navigation.
    z.page.trigger('navigate',
                   [window.location.pathname + window.location.search]);
    logger.log('Done');
});
});
});
