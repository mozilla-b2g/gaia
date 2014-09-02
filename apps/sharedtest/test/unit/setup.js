(function(window) {

  /* require most of the coupled / util objects */

  function l10nLink(href) {
    var resource = document.createElement('link');
    resource.setAttribute('href', href);
    resource.setAttribute('rel', 'localization');
    document.head.appendChild(resource);
  }

  l10nLink('/shared/locales/date/date.{locale}.properties');

  // setup localization....
  require('/shared/js/l10n.js', function() {
    suiteSetup(function(done) {
      navigator.mozL10n.ready(done);
    });
  });

  require('/shared/js/l10n_date.js');
  require('/shared/test/unit/mocks/mocks_helper.js');

}(this));
