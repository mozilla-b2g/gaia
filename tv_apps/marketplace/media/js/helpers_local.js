define('helpers_local', ['core/nunjucks'], function(nunjucks) {
    var filters = nunjucks.require('filters');
    var globals = nunjucks.require('globals');

    // filters.myFilter = function(text) {...

    // Functions provided in the default context.
    var helpers = {
    };

    // Put the helpers into the nunjucks global.
    for (var i in helpers) {
        if (helpers.hasOwnProperty(i)) {
            globals[i] = helpers[i];
        }
    }

    return helpers;
});
