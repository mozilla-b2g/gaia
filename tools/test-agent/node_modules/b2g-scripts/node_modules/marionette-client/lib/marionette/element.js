(function(exports) {
  if (typeof(exports.Marionette) === 'undefined') {
    exports.Marionette = {};
  }

  function Element(id, client) {
    this.id = id;
    this.client = client;
  }

  Element.prototype = {

    /**
     * Sends remote command processes the result.
     * Appends element id to each command.
     *
     * @param {Object} command marionette request.
     * @param {String} responseKey key in the response to pass to callback.
     * @param {Function} callback callback function receives the result of
     *                            response[responseKey] as its first argument.
     *
     * @return {Object} self.
     */
    _sendCommand: function(command, responseKey, callback) {
      if (!command.element) {
        command.element = this.id;
      }

      this.client._sendCommand(command, responseKey, callback);
      return this;
    },

    /**
     * Finds a single child of this element.
     *
     * @param {String} query search string.
     * @param {String} method search method.
     * @param {Function} callback element callback.
     * @return {Object} self.
     */
    findElement: function findElement(query, method, callback) {
      this.client.findElement(query, method, this.id, callback);
      return this;
    },

    /**
     * Finds a all children of this element that match a pattern.
     *
     * @param {String} query search string.
     * @param {String} method search method.
     * @param {Function} callback element callback.
     * @return {Object} self.
     */
    findElements: function findElement(query, method, callback) {
      this.client.findElements(query, method, this.id, callback);
      return this;
    },

    /**
     * Shortcut method to execute
     * a function with this element as first argument.
     *
     *
     * @param {Function|String} script remote script.
     * @param {Function} callback callback when script completes.
     */
    scriptWith: function scriptWith(script, callback) {
      this.client.executeScript(script, [this], callback);
    },

    /**
     * Checks to see if two elements are equal
     *
     * @param {String|Marionette.Element} element element to test.
     * @param {Function} callback called with boolean.
     * @return {Object} self.
     */
    equals: function equals(element, callback) {

      if (element instanceof this.constructor) {
        element = element.id;
      }

      var cmd = {
        type: 'elementsEqual',
        elements: [this.id, element]
      };
      this.client._sendCommand(cmd, 'value', callback);
      return this;
    },

    /**
     * Gets attribute value for element.
     *
     * @param {String} attr attribtue name.
     * @param {Function} callback gets called with attribute's value.
     * @return {Object} self.
     */
    getAttribute: function getAttribute(attr, callback) {
      var cmd = {
        type: 'getElementAttribute',
        name: attr
      };

      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Sends typing event keys to element.
     *
     *
     * @param {String} string message to type.
     * @param {Function} callback boolean success.
     * @return {Object} self.
     */
    sendKeys: function sendKeys(string, callback) {
      var cmd = {
        type: 'sendKeysToElement',
        value: string
      };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Clicks element.
     *
     * @param {Function} callback boolean result.
     * @return {Object} self.
     */
    click: function click(callback) {
      var cmd = {
        type: 'clickElement'
      };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Gets text of element
     *
     *
     * @param {Function} callback text of element.
     * @return {Object} self.
     */
    text: function text(callback) {
      var cmd = {
        type: 'getElementText'
      };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Gets value of element
     *
     *
     * @param {Function} callback value of element.
     * @return {Object} self.
     */
    value: function value(callback) {
      var cmd = {
        type: 'getElementValue'
      };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Clears element.
     *
     *
     * @param {Function} callback value of element.
     * @return {Object} self.
     */
    clear: function clear(callback) {
      var cmd = {
        type: 'clearElement'
      };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Checks if element is selected.
     *
     *
     * @param {Function} callback boolean argument.
     * @return {Object} self.
     */
    selected: function selected(callback) {
      var cmd = {
        type: 'isElementSelected'
      };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Checks if element is enabled.
     *
     *
     * @param {Function} callback boolean argument.
     * @return {Object} self.
     */
    enabled: function enabled(callback) {
      var cmd = {
        type: 'isElementEnabled'
      };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Checks if element is displayed.
     *
     *
     * @param {Function} callback boolean argument.
     * @return {Object} self.
     */
    displayed: function displayed(callback) {
      var cmd = {
        type: 'isElementDisplayed'
      };
      return this._sendCommand(cmd, 'value', callback);
    }

  };

  exports.Marionette.Element = Element;

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
