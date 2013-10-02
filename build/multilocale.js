var sectionLine = /\[(.*)\]/;
var importLine = /@import url\((.*)\)/;
var propertyLine = /(.*)\s*[:=]\s*(.*)/;

function parseManifestProperties(content) {
  var strings = {
    'default': {},
    'entry_points': {}
  };
  content.split('\n').forEach(function(line) {
    var m = line.match(propertyLine);
    if (!m || line.trim().startsWith('#')) {
      return;
    }
    var value = m[2].trim();
    var entryPoint, key;
    if (m[1].contains('.')) {
      [entryPoint, key] = m[1].split('.', 2);
      if (!strings['entry_points'][entryPoint]) {
        strings['entry_points'][entryPoint] = {};
      }
      strings['entry_points'][entryPoint][key.trim()] = value;
    } else {
      key = m[1];
      strings['default'][key.trim()] = value;
    }
  });
  return strings;
}

function parseIni(content) {
  var section = 'default';
  var imports = { 'default': [] };
  content.split('\n').forEach(function(line) {
    if (line.trim() === '' || line.startsWith('!') ||
      line.startsWith('#')) {
      return;
    } else if (line.trim().startsWith('[')) {
      section = line.match(sectionLine)[1];
      imports[section] = [];
    } else if (line.contains('@import')) {
      var propertyLine = line.match(importLine)[1];
      imports[section].push(propertyLine);
    } else {
      dump('multilocale.js: found a line with contents ' +
                     'unaccounted for "' + line.trim() + '"');
    }
  });
  return imports;
}

function serializeIni(imports) {
  function _section(locale) {
    return '[' + locale + ']';
  }
  function _import(path) {
    return '@import url(' + path + ')';
  }
  var output = [];
  for (var locale in imports) {
    if (locale === 'default') {
      imports[locale].forEach(function(path) {
        output.splice(0, 0, _import(path));
      });
      continue;
    }
    output.push(_section(locale));
    imports[locale].forEach(function(path) {
      output.push(_import(path));
    });
  }
  return output.join('\n');
}

function addLocaleImports(locales, origin) {
  var imports = {
    'default': parseIni(origin)['default']
  };
  locales.forEach(function(locale) {
    imports[locale] = [];
    imports['default'].forEach(function(path) {
      var localePath = path.replace('en-US', locale);
      imports[locale].push(localePath);
    });
  });
  return serializeIni(imports);
}

function addLocaleManifest(locales, localesProps, origin) {
  var manifest = JSON.parse(JSON.stringify(origin));
  locales.forEach(function(locale, index) {
    if (manifest['entry_points']) {
      for (var name in manifest['entry_points']) {
        var ep = manifest['entry_points'][name];
        if (!ep['locales'] || !localesProps[index]['entry_points'][name]) {
          continue;
        }
        ep['locales'][locale] = localesProps[index]['entry_points'][name];
      }
    }
    if (manifest['locales']) {
      manifest['locales'][locale] = localesProps[index]['default'];
    }
  });
  return manifest;
}

exports.parseManifestProperties = parseManifestProperties;
exports.parseIni = parseIni;
exports.serializeIni = serializeIni;
exports.addLocaleImports = addLocaleImports;
exports.addLocaleManifest = addLocaleManifest;
