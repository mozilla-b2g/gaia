
test('parseManifestProperties', function() {
  var content = 'name=Transfer Bluetooth\n' +
             'description=Gaia Bluetooth Transfer';
  var strings = parseManifestProperties(content);
  assert.equal(strings['default']['name'], 'Transfer Bluetooth');
  assert.equal(strings['default']['description', 'Gaia Bluetooth Transfer']);
});

test('parseManifestProperties with entry points', function() {
  var content = 'dialer.name=Telefon\n' +
                'dialer.description=Gaia Phone\n';
  var strings = parseManifestProperties(content);
  assert.equal(strings['entry_points']['dialer']['name'], 'Telefon');
})

test('parseIni', function() {
  var content = '@import url(branding/branding.en-US.properties)\n' +
                '\n' +
                '[ar]\n' +
                '@import url(branding/branding.ar.properties)\n' +
                '\n' +
                '[fr]\n' +
                '@import url(branding/branding.fr.properties)\n' +
                '\n' +
                '[zh-TW]\n' +
                '@import url(branding/branding.zh-TW.properties)\n';
  var imports = parseIni(content);
  assert.equal(imports['default'][0], 'branding/branding.en-US.properties');
  assert.equal(imports['zh-TW'][0], 'branding/branding.zh-TW.properties');
  assert.equal(imports['fr'][0], 'branding/branding.fr.properties');
});

test('serializeIni', function() {
  var imports = {
    'default': ['branding/branding.en-US.properties'],
    'pl': ['branding/branding.pl.properties']
  };
  var output = serializeIni(imports).split('\n');
  assert.equal(output[0], '@import url(branding/branding.en-US.properties)');
  assert.equal(output[1], '[pl]');
  assert.equal(output[2], '@import url(branding/branding.pl.properties)');
});

test('addLocaleImports', function() {
  var locales = ['pl'];
  var origin = '@import url(branding/branding.en-US.properties)\n' +
                '\n' +
                '[ar]\n' +
                '@import url(branding/branding.ar.properties)\n' +
                '\n' +
                '[fr]\n' +
                '@import url(branding/branding.fr.properties)\n' +
                '\n' +
                '[zh-TW]\n' +
                '@import url(branding/branding.zh-TW.properties)\n';
  var imports = addLocaleImports(locales, origin).split('\n');
  assert.equal(imports[0], '@import url(branding/branding.en-US.properties)');
  assert.equal(imports[1], '[pl]');
  assert.equal(imports[2], '@import url(branding/branding.pl.properties)');
});

test('addLocaleManifest', function() {
  var localesProps = [{
    "default": {},
    "entry_points": {
        "dialer": {
            "description": "Gaia Phone",
            "name": "Telefon"
        }
    }
  }];
  var locales = ['pl'];
  var origin = {
    "entry_points": {
      "dialer": {
        "locales": {
          "en-US": {
            "name": "Phone",
            "description": "Gaia Phone"
          }
        }
      }
    }
  };
  var manifest = addLocaleManifest(locales, localesProps, origin);
  var dialer = manifest['entry_points']['dialer'];
  assert.equal(dialer['locales']['pl']['name'], 'Telefon');
});