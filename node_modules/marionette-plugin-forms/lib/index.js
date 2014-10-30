var formatters = require('./formatters');

function Forms(client) {
  this.client = client;
}

/**
 * Fill out one or more input elements (regardless of visibility)
 * @param {Element} elem The input element to change (when setting a single
 *                        value) or the parent node (when setting multiple
 *                        values).
 * @param {object} value The value to set (when setting a single value) or a
 *                       hash of form element names to corresponding values
 *                       (when setting multiple values)
 */
Forms.prototype.fill = function(elem, value, done) {

  elem.tagName(function(err, tagName) {
    if (tagName === 'form') {
      setValues(elem, value, done);
    } else {
      setValue(elem, value, done);
    }
  });
};

function setValue(elem, value, done) {
  elem.getAttribute('type', function(err, type) {
    if (err) {
      if (done) {
        done(err);
      } else {
        throw err;
      }
      return;
    }

    type = type.trim().toLowerCase();

    if (formatters.hasOwnProperty(type)) {
      value = formatters[type](value);
    }

    elem.client.executeScript(function(elem, value) {
      elem.value = value;
    }, [elem, value], done);
  });
}

function setValues(form, values, done) {
  var keys = Object.keys(values);
  var setCount = keys.length;
  function setKey() {
    setCount--;
    if (setCount === 0) {
      done && done();
    }
  }

  keys.forEach(function(key) {
    form.findElement('[name="' + key + '"]', function(err, elem) {
      setValue(elem, values[key], setKey);
    });
  });
}

module.exports = function(client, options) {
  return new Forms(client);
};
