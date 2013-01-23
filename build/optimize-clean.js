
function debug(str) {
  //dump(' -*- l10n-clean.js: ' + str + '\n');
}

debug('Begin');

Gaia.webapps.forEach(function(webapp) {
  // if BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (BUILD_APP_NAME != '*' && webapp.sourceDirectoryName != BUILD_APP_NAME)
    return;

  debug(webapp.sourceDirectoryName);

  let re = new RegExp('\\.html\\.' + GAIA_DEFAULT_LOCALE + '$');
  let files = ls(webapp.sourceDirectoryFile, true);
  files.forEach(function(file) {
    if (
      re.test(file.leafName) ||
      file.leafName.indexOf(Gaia.aggregatePrefix) === 0
    ) {
      file.remove(false);
    }
  });
});

debug('End');

