'use strict';

// Create a report about unused icons in a project.

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var optimist = require('optimist');

var cli = optimist
  .usage('Create a report about unused icons in a project.' + '\n' +
  'Usage: $0 path/to/your/project/');
var projectDir = cli.argv._[0];

// No folder passed? Show help message then.
if (!projectDir) {
  cli.showHelp();
  process.exit(0);
}

// Check if the directory exist.
var stats = fs.lstatSync(projectDir);
if (!stats.isDirectory()) {
  console.log('\x1b[31mPlease provide a valid folder.\x1b[0m\n');
  cli.showHelp();
  process.exit(0);
}

/**
 * Get the list of all the icons in the font.
 * @returns {Array}
 */
function getIcons() {
  var icons = fs.readdirSync('./images/');

  icons = icons.map(function(icon) {
    return path.basename(icon, '.svg');
  });

  return icons;
}

/**
 * Use a grep pattern to extract used icons from files.
 * @param {string} grep
 * @param {Function} callback
 */
function getUsedIcons(grep, callback) {
  exec(grep, function(err, stdout, stderr) {
    var usedIcons = stdout
      .trim()
      .split('\n')
      .map(function(icon) {
        // Take only the icon name.
        return icon.split(/["']/)[1];
      })
      .filter(function(icon) {
        // Remove non string items.
        return icon && icon.match(/^[a-z0-9-]+$/);
      });

    callback(usedIcons);

    if (err) {
      console.log(err);
    }
  });
}

/**
 * Get the list of unused icons in a folder. The patterns of extraction are:
 *   * data-icon="[^"]+"
 *   * .dataset.icon ?= ?.+
 */
function getUnusedIcons() {
  var usedIcons = [];
  var length = 2;

  var cb = function(icons) {
    usedIcons = usedIcons.concat(icons);
    length--;

    if (length > 0) {
      return;
    }

    var allIcons = getIcons();
    var unusedIcons = [];

    allIcons.forEach(function(icon) {
      if (usedIcons.indexOf(icon) === -1) {
        unusedIcons.push(icon);
      }
    });

    outputUnusedIcons(allIcons, unusedIcons);
  };

  getUsedIcons('grep -rhoP \'data-icon="[^"]+"\' ' + projectDir, cb);
  getUsedIcons('grep -rhoP \'.dataset.icon ?= ?.+\' ' + projectDir, cb);
}

/**
 * Display the list of unused icons to the screen.
 * @param {Array.<string>} icons
 * @param {Array.<string>} unusedIcons
 */
function outputUnusedIcons(icons, unusedIcons) {
  console.log('\x1b[36mList of unused icons in %s (%d/%d):\x1b[0m',
    projectDir, unusedIcons.length, icons.length);

  unusedIcons.forEach(function(icon) {
    console.log('* ' + icon);
  });
}

getUnusedIcons();
