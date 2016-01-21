const debug = require('debug')('eslint:gaia-formatter');

const xfailFilename = 'build/eslint/xfail.list';
const pwd = process.cwd().replace(/\/$/, '');
const reStartWithPwd = new RegExp(`^${pwd}/`);

function readXfail() {
  var xfail;
  try {
    xfail = require('fs').readFileSync(xfailFilename, 'utf-8').split('\n');
  } catch(e) {
    debug(`Error while loading ${xfailFilename}`, e);
    return {};
  }

  // xfail list uses the format output by "eslint -f unix"
  const reParseXfailLine = /^([^:]+):(\d+:\d+):(.+)\[[^\/]+\/(.+)\]$/;

  return xfail.reduce((result, cur) => {
    const parsed = reParseXfailLine.exec(cur);
    if (!parsed) {
      return result;
    }

    const filename = parsed[1].replace(reStartWithPwd, '');
    const errorLocation = parsed[2];
    const errorMessage = parsed[3].trim();
    const errorCode = parsed[4];

    if (!result[filename]) {
      result[filename] = {};
    }

    if (!result[filename][errorLocation]) {
      result[filename][errorLocation] = [];
    }
    result[filename][errorLocation].push({ message: errorMessage, code: errorCode });

    return result;
  }, {});
}

function cloneXfailFile(xfailFile) {
  if (!xfailFile) {
    return xfailFile;
  }

  var clone = {};
  for (var key in xfailFile) {
    clone[key] = xfailFile[key].slice();
  }

  return clone;
}


module.exports = function(results) {
  var stylish = require('eslint/lib/formatters/stylish');

  const xfail = readXfail();
  debug('Read xfail file:');
  debug(xfail);

  results.forEach(result => result.filePath = result.filePath.replace(reStartWithPwd, ''));

  results.forEach(result => {
    const thisXfail = cloneXfailFile(xfail[result.filePath]);

    if (!thisXfail) {
      result.messages.forEach(message => message.message += ' (unexpected)')
      return;
    }

    result.messages.forEach(message => {
      const errorLocation = `${message.line}:${message.column}`;
      const thisErrorLocation = thisXfail[errorLocation];
      if (!thisErrorLocation) {
        message.message += ' (UNEXPECTED-FAIL)';
        return;
      }

      const foundIdx = thisErrorLocation.findIndex(error => error.code === message.ruleId);
      if (foundIdx < 0) {
        message.message += ' (UNEXPECTED-FAIL)';
        return;
      }

      debug('Found error', message, 'in the xfail list, reducing severity to warning.');

      thisErrorLocation.splice(foundIdx, 1);
      message.message += ' (EXPECTED-FAIL)';
      if (message.severity === 2) {
        message.severity = 1;
        result.warningCount++;
        result.errorCount--;
      }

      result.gaiaXfailed = true;
    });

    for (var location in thisXfail) {
      var locationDetailed = location.split(':');
      thisXfail[location].forEach(error => {
        result.messages.push({
          ruleId: error.code,
          severity: 2,
          message: `UNEXPECTED-PASS: ${error.message} Please remove this error from ${xfailFilename}`,
          line: locationDetailed[0],
          column: locationDetailed[1]
        });
        result.errorCount++;
      });
    }
  });

  var output = stylish(results);
  output += '\n' + results.filter(result => result.gaiaXfailed)
    .map(result => `${result.filePath}: some errors have been changed to warnings because it's present in ${xfailFilename}.`)
    .join('\n');

  return output;
};
