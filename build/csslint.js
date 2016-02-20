'use strict';

const os = require('os');
const utils = require('./utils');
const csslint = require('csslint').CSSLint;

const XFAIL_LIST_PATH = utils.joinPath('build', 'csslint', 'xfail.list');

const RULES = {
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

function CSSLint() {

}

CSSLint.prototype.execute = function csslint_execute(options) {
  this.options = options;

  let gaia = utils.gaia.getInstance(options);
  let files = [];

  // Starts by parsing the CSS files from apps/
  gaia.webapps.forEach((webapp) => {
    if (utils.getFile(webapp.sourceDirectoryFilePath, '..')
        .leafName !=='apps' ||
        (options.BUILD_APP_NAME !== '*' &&
        webapp.sourceDirectoryName !== options.BUILD_APP_NAME)) {
      return;
    }
    files = files.concat(this.getCSSFilesFrom(webapp.sourceDirectoryFilePath));
  });

  if (options.BUILD_APP_NAME == '*') {
    // And then parse the CSS files from shared/
    files = files.concat(this.getCSSFilesFrom(gaia.sharedFolder));
  }

  files = files.map((path) => {
    return path.slice(options.GAIA_DIR.length + 1);
  });

  let xfailContent = utils.getFileContent(utils.getFile(
                     options.GAIA_DIR, XFAIL_LIST_PATH));
  let xfailList = [];
  xfailContent.split(os.EOL).forEach((line) => {
    if (line[0] !== '#') {
      xfailList.push(line);
    }
  });

  let exitCode = this.lint(files, xfailList);

  process.exit(exitCode);
};

CSSLint.prototype.getCSSFilesFrom = function csslint_getCSSFilesFrom(path) {
  return utils.listFiles(path, utils.FILE_TYPE_FILE, true, /^(docs|tests?)$/)
    .filter((path) => {
      return path.endsWith('.css');
    });
};

CSSLint.prototype.report = function csslint_report(file, msgs) {
  console.log(msgs[0].type + ' in ' + file);
  msgs.forEach((msg) => {
    console.log('    ' + msg.message + ' at' + msg.evidence);
  });
};

CSSLint.prototype.lint = function csslint_lint(files, xfailList) {
  let messages;

  files.forEach((file) => {
    if (xfailList.indexOf(file) !== -1) {
      return;
    }

    messages = csslint.verify(utils.getFileContent(file), RULES).messages;

    if (messages.length > 0) {
      this.report(file, messages);
    }
  });

  return messages.length > 0;
};

function execute(options) {
  (new CSSLint()).execute(options);
}

exports.execute = execute;
