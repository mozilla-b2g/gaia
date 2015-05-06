'use strict';

/* global require, exports, dump, Services */
/* exported debug */

const utils = require('./utils');

const { Cc, Ci, Cu } = require('chrome');
Cu.import('resource://gre/modules/Services.jsm');

function debug(msg) {
  dump('-*- csslint.js: ' + msg + '\n');
}

const domUtils = Cc['@mozilla.org/inspector/dom-utils;1']
                   .getService(Ci.inIDOMUtils);

const domParser = Cc['@mozilla.org/xmlextras/domparser;1']
                    .createInstance(Ci.nsIDOMParser);

let CSSLint = null;

function execute(config) {
  let gaia = utils.gaia.getInstance(config);

  let files = [];

  // Starts by parsing the CSS files from apps/
  gaia.webapps.forEach(function getAllFilesFor(webapp) {
    var sourceDirectoryFile = utils.getFile(webapp.sourceDirectoryFilePath);
    if (sourceDirectoryFile.parent.leafName != 'apps') {
      return;
    }

    if (config.BUILD_APP_NAME != '*' &&
      webapp.sourceDirectoryName != config.BUILD_APP_NAME) {
      return;
    }
    files = files.concat(getCSSFilesFor(webapp.sourceDirectoryFilePath));
  });

  if (config.BUILD_APP_NAME == '*') {
    // And then parse the CSS files from shared/
    files = files.concat(getCSSFilesFor(gaia.sharedFolder));
  }

  files = files.map(function toRelativePath(path) {
    return path.slice(config.GAIA_DIR.length + 1);
  });

  let reportKnownErrorsOrWarnings = false;
  let quit = require('xpcshell').quit;
  return quit(lint(config.GAIA_DIR, files.join(' '),
    reportKnownErrorsOrWarnings));
}

function lint(root, files, reportKnownErrorsOrWarnings = true) {
  const xfailFilePath = 'build/csslint/xfail.list';

  let hasNewErrorsOrWarnings = 0;
  let fileHasNewErrorsOrWarnings = false;

  function lessErrorsOrWarnings(filename, type, previous, current) {
    hasNewErrorsOrWarnings = 1;
    fileHasNewErrorsOrWarnings = true;

    dump('You rock! ' + (previous - current) + ' ' + type + ' has been ' +
         'removed from ' + filename + '. Please update ' + xfailFilePath +
         ' with the updated number of errors (' + current + ') or remove ' +
         'the file from ' + xfailFilePath + '\n');
  }

  function moreErrorsOrWarnings(filename, type, previous, current) {
    hasNewErrorsOrWarnings = 1;
    fileHasNewErrorsOrWarnings = true;

    dump(':( ' + (previous - current) + ' ' + type + ' has been added to ' +
         filename + '.\n');
  }

  function lessWarnings(filename, previous, current) {
    lessErrorsOrWarnings(filename, 'warnings', previous, current);
  }

  function moreWarnings(filename, previous, current) {
    moreErrorsOrWarnings(filename, 'warnings', previous, current);
  }

  function lessErrors(filename, previous, current) {
    lessErrorsOrWarnings(filename, 'errors', previous, current);
  }

  function moreErrors(filename, previous, current) {
    moreErrorsOrWarnings(filename, 'errors', previous, current);
  }

  try {
    setupLinters(root);

    // Get the list of ignored files and build a map of:
    // filename: { errors: x, warnings: y }
    //
    // This map is used to check that no new errors or warnings are introduced
    // into a file.
    // Once an error/warning has been fixed the xfail.list file also needs
    // to be updated and so the number of errors/warnings should be smaller
    // and smaller...
    let xfail = {};

    let content = utils.getFileContent(utils.getFile(root, xfailFilePath));
    content.split('\n').forEach(function buildXfailMap(line) {
      // ignore lines starting with #.
      if (line[0] === '#') {
        return;
      }

      let [filename, errors, warnings] = line.split(' ');
      xfail[filename] = {
        errors: errors,
        warnings: warnings
      };
    });


    // Now lint the css of each files and reports any errors/warnings.
    files.split(/\s/).forEach(function parseCSSFor(filename) {
      fileHasNewErrorsOrWarnings = false;

      let file = utils.getFile(root, filename);
      if (!/^(apps|shared)\//.test(filename)) {
        return;
      }

      if (/\/(tests|docs)\//.test(file.path)) {
        return;
      }

      if (!/\.css$/.test(file.leafName)) {
        return;
      }

      let messages = parseCSS(file);

      let errorsCount = messages.errors.length;
      let warningsCount = messages.warnings.length;
      if (!errorsCount && !warningsCount && !(filename in xfail)) {
        return;
      }

      if (!(filename in xfail)) {
        hasNewErrorsOrWarnings = 1;
        fileHasNewErrorsOrWarnings = true;
        dump(filename + ' has new errors/warnings.\n');
        printWarningsAndErrors(messages.errors, messages.warnings, file);
        return;
      }

      let rules = xfail[filename];
      if (errorsCount > rules.errors) {
        moreErrors(filename, rules.errors, errorsCount);
      } else if (errorsCount < rules.errors) {
        lessErrors(filename, rules.errors, errorsCount);
      }

      if (warningsCount > rules.warnings) {
        moreWarnings(filename, rules.warnings, warningsCount);
      } else if (warningsCount < rules.warnings) {
        lessWarnings(filename, rules.warnings, warningsCount);
      }

      if (reportKnownErrorsOrWarnings || fileHasNewErrorsOrWarnings) {
        printWarningsAndErrors(messages.errors, messages.warnings, file);
      }
    });

    return hasNewErrorsOrWarnings;
  } catch(e) {
    dump('Error while trying to run csslint on files: ' + e + '\n');
    return 1;
  }
}

function setupLinters(root) {
  // Activate more CSS properties so those are not considered errors by
  // the parser.
  Services.prefs.setBoolPref('layout.css.sticky.enabled', true);
  Services.prefs.setBoolPref('layout.css.will-change.enabled', true);

  // Load the third-party CSS Linter.
  let scope = {};
  let url =
    'file:///' + root + '/build/csslinter.js?reload=' + Date.now();
  Services.scriptloader.loadSubScript(url, scope);
  CSSLint = scope.CSSLint;
}

function getCSSFilesFor(path) {
  return utils.listFiles(path, utils.FILE_TYPE_FILE, true, /^(docs|tests?)$/)
              .filter(function(path) {
                return path.endsWith('.css');
              });
}

function printWarningsAndErrors(errors, warnings, file) {
  function printMessage(msg) {
    dump('\t' + msg.message + ' line ' + msg.line + ', col ' + msg.col + ' \n');
  }

  // If any errors, print them to the console.
  if (errors.length) {
    dump('Errors in ' + file.path + '\n');

    for (let i = 0; i < errors.length; i++) {
      printMessage(errors[i]);
    }
  }

  // If any warnings, print them to the console.
  if (warnings.length) {
    dump('Warnings in ' + file.path + '\n');

    for (let i = 0; i < warnings.length; i++) {
      printMessage(warnings[i]);
    }
  }

  dump('\n');
}

function parseCSS(file) {
  let content = utils.getFileContent(file);

  let parserErrors = checkForParsingErrors(content);

  // If any parserErrors, print them to the console.
  if (parserErrors.length) {
    dump('Parsing errors in ' + file.path + '\n');

    for (let i = 0; i < parserErrors.length; i++) {
      let JSWarnRegexp = /\[JavaScript Warning: "(.+)"}\]/;
      let filenameRegexp = /" {file: "moz-nullprincipal:\{[a-f0-9-]+\}"/;

      let error = parserErrors[i].message
                                 .replace(JSWarnRegexp, '$1"')
                                 .replace(filenameRegexp, '');
      dump('\t' + error + '\n');
    }
  }

  let [errors, warnings] = checkForGoodPractices(content);

  return { errors: parserErrors.concat(errors),  warnings: warnings };
}

function checkForParsingErrors(content) {
  // Create a dummy dom document.
  let html = '<html><head><style></style></head></html>';
  let document = domParser.parseFromString(html, 'text/html');

  // Ignore @import rules.
  content = content.replace(/@import url('?.*'?);/g, '');

  // Ignore -moz-osx-font-smoothing rules.
  content = content.replace(/-moz-osx-font-smoothing: grayscale;/g, '');

  // Clear any possible leftovers in the console.
  Services.console.reset();

  // Load the CSS into the dummy document stylesheet.
  let sheet = document.styleSheets.item(0);
  domUtils.parseStyleSheet(sheet, content);

  // Get messages from the console and reset it.
  let messages = Services.console.getMessageArray();
  Services.console.reset();

  // Temporary fix for bug 1133971.
  // Allow CSS properties which we support in later versions of B2G.
  // Once we have bug 1089710 landed we can remove this workaround.
  messages = messages.filter(function(message) {
    var msg = message.message;
    if (msg.indexOf('offset-inline') !== -1 ||
        msg.indexOf('offset-block') !== -1) {
      return false;
    }
    return true;
  });

  return messages;
}

function checkForGoodPractices(content) {
  let rules = {
    /*** Errors ***/

    // Certain properties don't play well with certain display values.
    //  * - float should not be used with inline-block
    //  * - height, width, margin-top, margin-bottom, float should not be used
    //      with inline
    //  * - vertical-align should not be used with block
    //  * - margin, float should not be used with table-*
    'display-property-grouping': 1,

    // Duplicate properties must appear one after the other.
    // If an already-defined property appears somewhere else in the rule, then
    // it's likely an error.
    'duplicate-properties': 1,

    // Style rules without any properties defined should be removed.
    'empty-rules': 1,

    // Properties should be known (listed in CSS3 specification) or
    // be a vendor-prefixed property.
    //
    // This one is not enabled, because the linter codebase is oriented for
    // cross browsers compatibility, and is also lagging behind Gecko
    // implementation of those properties. Unknow properties will be caught in
    // a much more robust way by the step 1 of the CSS parsing which directly
    // use the Gecko engine to find unknow properties.
    'known-properties': 0,
  };

  let messages = CSSLint.verify(content, rules).messages;

  let errors = [];
  for (let i = 0; i < messages.length; i++) {
    let message = messages[i];

    // It's sad but a lot of 'errors' are just parser bugs. It would be nice
    // to fix them in the linter and upstream those changes.
    if (message.type !== 'warning') {
      continue;
    }

    errors.push(message);
  }

  rules =  {
    /*** Errors ***/

    // Don't use width or height when using padding or border.
    //
    // This one is not enabled, since it is related to how the box model works
    // and it is used to prevent general errors, but is not an errors by itself.
    // It is probably a good thing to use it, but since the codebase used a lot
    // of width/height/padding/border rules for the same selector, it is a lot
    // of efforts to get rid of it, and probably regression prone.
    'box-model': 0,

    /*** Maintainability & Duplication ***/

    // You shouldn't use more than 10 floats. If you do, there's probably
    // room for some abstraction.
    'floats': 1,

    // You shouldn't need more than 9 font-size declarations.
    'font-sizes': 1,

    // Make sure !important is not overused, this could lead to specificity
    // war. Display a warning on !important declarations, an error if it's
    // used more at least 10 times.
    'important': 1,

    // Don't use IDs for selectors.
    //
    // This one is not enabled. There is a lot of discussions on the web around
    // using ids as selectors or not. Not enabling it is not any rationale
    // decision based on if they should be used or not, but the codebase is
    // already using them a lot, and changing that is a lot of work, with a lot
    // of possible regressions.
    'ids': 0,


    /*** Compatibility ***/

    // Don't use adjoining classes (.foo.bar).
    //
    // This one is not enabled, as the main reason to enable it is to be
    // compatible with IE 6 and lesser. There is nothing against browser
    // compatibily here, but its doubtful that Gaia will support those one day.
    'adjoining-classes': 0,

    // box-sizing doesn't work in IE6 and IE7.
    //
    // This one is not enabled for the same reason as 'adjoining-classes'
    'box-sizing': 0,

    // Include all compatible vendor prefixes.
    //
    // This one is not enabled, since Gecko dumps some warnings in the console
    // when it does not recognized a CSS property, and this spew the console.
    // But there is less and less prefixes for many properties and hopefully
    // when Gaia will run on top of those others browser vendors, most of the
    // prefixes will be removed anyway.
    'compatible-vendor-prefixes': 0,

    // When using a vendor-prefixed gradient, make sure to use them all.
    //
    // This one is not enabled for the same reason as
    // 'compatible-vendor-prefixes'.
    'gradients': 0,

    // Don't use text-indent for image replacement if you need to support rtl.
    'text-indent': 1,

    // When using a vendor-prefixed property, make sure to
    // include the standard one.
    //
    // This one is not enabled since Gecko will spew a warning in the console if
    // there is a property that does not work without prefix and this is just
    // some noise in the console. Also some properties, like hyphens are
    // prefixed in all known browsers and that noise for that is painful.
    'vendor-prefix': 0,

    // Require fallback colors.
    //
    // This one is not enabled for the same reason as 'adjoining-classes'.
    // (Except that it not supported by < IE8 instead of < IE6.
    'fallback-colors': 0,

    // Don't use property with a star prefix.
    'star-property-hack': 1,

    // Don't use properties with a underscore prefix.
    'underscore-property-hack': 1,

    // Use the bulletproof @font-face syntax to avoid 404's in old IE.
    //
    // This one is not enabled for the same reason as 'adjoining-classes'
    'bulletproof-font-face': 0,

    // Warn people with approaching the IE 4095 limit.
    'selector-max-approaching': 1,

    // Warn people past the IE 4095 limit.
    'selector-max': 1,


    /*** Accessibility ***/

    // outline: none or outline: 0 should only be used in a :focus rule
    // and only if there are other properties in the same rule.
    'outline': 1,


    /*** Performance ***/

    // Avoid too many @font-face declarations in the same stylesheet.
    'font-faces': 1,

    // Don't use @import, use <link> instead.
    //
    // This one is not enabled since its not clear that it has any real impact
    // on locally installed app, which is the first target of Gaia.
    'import': 0,

    // Disallow duplicate background-images (using url).
    //
    // This one is not enabled since its not clear that it has any real impact
    // on locally installed app, which is the first target of Gaia. Also it
    // seems like there is some valid use cases to reuse an url when there
    // is multiple background images on an element, that varies based on some
    // classes. So maybe there is better way of doing it, or maybe this is
    // a linter bug.
    'duplicate-background-images': 0,

    // Selectors that look like regular expressions are slow and should be
    // avoided.
    //
    // This one is not enabled since it is used heavily in Gaia. It would be
    // nice to remove the usage of such selectors but that seems like a lot of
    // work and very regressions prone.
    'regex-selectors': 0,

    // Don't use universal selector because it's slow.
    //
    // This one is not enabled for the same reason as 'regex-selectors'
    'universal-selector': 0,

    // Don't use unqualified attribute selectors because they're just like
    // universal selectors.
    //
    // This one is not enabled for the same reason as 'universal-selectors'
    'unqualified-attributes': 0,

    // You don't need to specify units when a value is 0.
    'zero-units': 1,

    // Don't use classes or IDs with elements (a.foo or a#foo).
    //
    // This one is not enabled, not because it is believed to be useless but the
    // codebase is already heavily using that and fixing it is a lot of work and
    // can create some possible regressions.
    'overqualified-elements': 0,

    // Use shorthand properties where possible.
    'shorthand': 1,


    /*** OOCSS ***/

    // Headings (h1-h6) should not be qualified (namespaced).
    //
    // This one is not enabled, not because people does not want to do OOCSS,
    // but mostly because this is already heavily used in the codebase and
    // fixing it is a lot of efforts, and may generate regressions.
    'qualified-headings': 0,

    // Headings (h1-h6) should be defined only once.
    //
    // This one is not enabled for the same reason than 'qualified-headings'.
    'unique-headings': 0,


    /*** Misc. ***/

    // There should be no syntax errors. (Duh.)
    'errors': 1,

    // Total number of rules should not exceed x
    'rules-count': 1
  };

  messages = CSSLint.verify(content, rules).messages;

  let warnings = [];
  for (let i = 0; i < messages.length; i++) {
    let message = messages[i];

    // It's sad but a lot of 'errors' are just parser bugs. It would be nice
    // to fix them in the linter and upstream those changes.
    if (message.type !== 'warning') {
      continue;
    }

    warnings.push(message);
  }

  return [errors, warnings];
}

exports.execute = execute;
exports.lint = lint;
