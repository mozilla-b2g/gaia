/*global define */
define(function() {
  var queryString = {
    /**
     * Takes a querystring value, name1=value1&name2=value2... and converts
     * to an object with named properties.
     * @param  {String} value query string value.
     * @return {Object}
     */
    toObject: function toObject(value) {
      if (!value)
        return null;

      var result = {};

      value.split('&').forEach(function(keyValue) {
        var pair = keyValue.split('=');
        result[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      });
      return result;
    },

    fromObject: function fromObject(object) {
      var result = '';
      Object.keys(object).forEach(function(key) {
        result += (result ? '&' : '') + encodeURIComponent(key) +
                 '=' + encodeURIComponent(object[key]);
      });
      return result;
    }
  };

  return queryString;
});
