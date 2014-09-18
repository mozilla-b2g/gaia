'use strict';

(function() {

  function l10nLink(href) {
    var resource = document.createElement('link');
    resource.setAttribute('href', href);
    resource.setAttribute('rel', 'localization');
    document.head.appendChild(resource);
  }

  l10nLink('/locales/system.{locale}.properties');
  require('/shared/test/unit/mocks/mocks_helper.js');

}());
