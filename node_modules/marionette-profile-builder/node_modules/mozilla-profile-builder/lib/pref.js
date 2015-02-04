var PREF = 'pref';

/**
 * Builds a multi line string of prefs.
 *
 * @param {Object} prefs key/value pairs.
 * @return {String} lines
 */
function prefs(object) {
  var result = [];
  Object.keys(object).forEach(function(key) {
    result.push(pref(key, object[key]));
  });

  return result.join('\n');
}

/**
 * Create a pref string based on a name/value pair.
 *
 *    pref('browser.dom.window.dump.enabled', true);
 *    // => 'pref("browser.dom.window.dump.enabled", true);'
 *
 *    // can also be given a single object
 *
 *    pref({
 *      'key': value
 *    });
 *    // =>  multiple lines
 *
 * @param {String} name of pref;
 * @param {Object|Number|String} value of pref.
 * @return {String} version of pref.
 */
function pref(name, value) {
  if (!value && typeof name === 'object')
    return prefs(name);

  var type = typeof value;
  var out = PREF + '("' + name + '", ';

  switch (type) {
    case 'string':
      out += '"' + value + '"';
      break;
    case 'number':
    case 'boolean':
      out += value;
      break;
    default:
      out += '"' + JSON.stringify(value) + '"';
      break;
  }

  out += ');';
  return out;
}

module.exports = pref;
