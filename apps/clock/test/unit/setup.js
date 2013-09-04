require('/shared/js/template.js');
require('/shared/js/async_storage.js');
require('/shared/test/unit/load_body_html_helper.js');
requireApp('clock/js/constants.js');


requireApp('email/test/unit/mock_l10n.js', function() {

  var nativeMozL10n;

  nativeMozL10n = navigator.mozL10n;
  navigator.mozL10n = MockL10n;

});
