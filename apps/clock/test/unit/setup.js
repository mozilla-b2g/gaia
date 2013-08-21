requireApp('email/test/unit/mock_l10n.js', function() {

  var nativeMozL10n;

  nativeMozL10n = navigator.mozL10n;
  navigator.mozL10n = MockL10n;

});

if (typeof asyncStorage === 'undefined') {
  require('/shared/js/async_storage.js');
}

if (typeof loadBodyHTML === 'undefined') {
  require('/shared/test/unit/load_body_html_helper.js');
}
