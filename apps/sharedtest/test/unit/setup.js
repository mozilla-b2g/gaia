(function(window) {
  'use strict';

  // setup localization....
  require('/shared/js/l10n.js', function() {
    suiteSetup(function(done) {
      navigator.mozL10n.ready(done);
    });
  });

  require('/shared/test/unit/mocks/mocks_helper.js');
  require('/shared/test/unit/mocks/elements/custom_elements_helper.js');

}(this));
