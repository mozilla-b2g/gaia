define('routes',
    ['core/router'],
    function(router) {

    router.addRoutes([
        {pattern: '^/$', view_name: 'homepage'},
        {pattern: '^/index.html$', view_name: 'homepage'}
    ]);

    router.api.addRoutes({
        // TODO: Update API url after backend is ready.
        'apps': '/api/v2/fireplace/multi-search/',
    });

    // Processors to set query arguments on API requests.
    // router.api.addProcessor(function(endpoint) {
    //     return {something: 'to-be-in-the-query'};
    // });
});
