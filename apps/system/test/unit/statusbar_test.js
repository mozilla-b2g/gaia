requireApp('system/test/unit/mock_settings_listener.js');
requireApp('system/test/unit/mock_l10n.js');

requireApp('system/js/statusbar.js');

if (!this.SettingsListener) {
  this.SettingsListener = null;
}

suite('system/Statusbar', function() {
  var fakeStatusBarNode;
  var realSettingsListener, realMozL10n;
      fakeIcons = [];

  suiteSetup(function() {
    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    window.SettingsListener = realSettingsListener;
  });

  setup(function() {
    fakeStatusBarNode = document.createElement("div");
    fakeStatusBarNode.id = "statusbar";
    document.body.appendChild(fakeStatusBarNode);

    StatusBar.ELEMENTS.forEach(function testAddElement(elementName) {
      var elt = document.createElement("div");
      elt.id = "statusbar-" + elementName;
      elt.hidden = true;
      fakeStatusBarNode.appendChild(elt);
      fakeIcons[elementName] = elt;
    });

    // executing init again
    StatusBar.init();
  });
  teardown(function() {
    fakeStatusBarNode.parentNode.removeChild(fakeStatusBarNode);
  });

  suite("system-downloads", function() {
    test("incrementing should display the icon", function() {
      StatusBar.incSystemDownloads();
      assert.isFalse(fakeIcons["system-downloads"].hidden);
    });
    test("incrementing then decrementing should not display the icon", function() {
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      assert.isTrue(fakeIcons["system-downloads"].hidden);
    });
    test("incrementing twice then decrementing once should display the icon", function() {
      StatusBar.incSystemDownloads();
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      assert.isFalse(fakeIcons["system-downloads"].hidden);
    });
    test("incrementing then decrementing twice should not display the icon", function() {
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      StatusBar.decSystemDownloads();
      assert.isTrue(fakeIcons["system-downloads"].hidden);
    });

    /* JW: testing that we can't have a negative counter */
    test("incrementing then decrementing twice then incrementing should display the icon", function() {
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      StatusBar.decSystemDownloads();
      StatusBar.incSystemDownloads();
      assert.isFalse(fakeIcons["system-downloads"].hidden);
    });
  });
});
