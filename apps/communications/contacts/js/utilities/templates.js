'use strict';

var utils = window.utils || {};

if (!utils.templates) {
  (function() {
    var Templates = utils.templates = {};

    /**
     *  Returns a target HTMLElement from a selector or HTMLElement itself
     *
     *  @param {HTMLElement or Selector} element target element.
     *
     *  @return {HTMLElement} HTMLElement according to the selector or itself.
     *
     *
     */
    function getTarget(element) {
      var target = element;
      if (!element.tagName) {
        target = document.querySelector(element);
      }

      return target;
    }

    /**
    *    Given a target HTML element which contains a template set
    *    returns the template that will have to be applied over the data
    *
    *    @param {HTMLElement} target which contains the template.
    *    @param {Object} data to be used on the template.
    *
    *    @return {HTMLElement} HTMLElement with the template.
    *
    */
    function getTemplate(target, data) {
      // Multi templates temporarily disabled to avoid eval usage
      // TODO: Implement an alternative for eval
      var templates = target.querySelectorAll('*[data-template]');
      if (templates.length === 0) {
        throw new Error('No template declared');
      }
      if (templates.length > 1 && templates.item(0).dataset.condition) {
        throw new Error('Only one template supported in this version');
      }

      return {
        template: templates.item(0),
        isMulti: false
      };
    }

    /**
     *   Returns a function used to replace data on a template
     *
     *   @param {Object} data the data to be used on the template.
     *
     *   @return {function} to be used.
     *
     */
    function templateReplace(data) {
      return function(text, property) {
        var out;
        if (property.indexOf('.') === -1) {
          out = data[property];
          if (Array.isArray(out) && out.length > 0) {
            out = out[0];
          }
        } else {
            throw new Error('Dotted expressions not supported');
        }

        if (typeof out === 'undefined') {
          out = text;
        }
        return out;
      }
    }

    /**
     *  Adds (append or prepend) a new instance HTMLElement (or array of)
     *  of a template
     *  The template is assumed to be a child of the element
     *  passed as parameter
     *  The new element will be appended as a child
     *
     *  @param {HTMLElement} ele container lement that contains the template
     *  and which will contain the new instance. Can be an HTMLElement
     *  or a CSS selector.
     *
     *  @param {object or array} data with the data displayed by the template.
     *
     *  @param {String} mode oneOf ('A','P').
     *
     *  @return {HTMLElement} (or last element if data is an array).
     *
     *
     */
    function add(element, data, mode, targetNode) {
      // It is supported both the element itself or a selector
      var target = getTarget(element);
      var newElem;

      var theData = [data];
      if (data instanceof Array) {
        theData = data;
      }

      // Optimization to avoid trying to find a template when
      // only one is needed
      var multiTemplate = true;
      var template;
      var idx = 0;
      theData.forEach(function(oneData) {
        // Pseudo-field with the index
        oneData._idx_ = idx++;
        // A suitable template for the data is firstly found
         if (multiTemplate === true) {
         var tresult = getTemplate(target, oneData);
          template = tresult.template;
          if (tresult.isMulti === false) {
            multiTemplate = false;
          }
        }

        if (template) {
          newElem = this.render(template, oneData);
          target = targetNode || target;
          if (mode === 'A') {
             target.appendChild(newElem);
          } else if (mode === 'P') { // Append mode
            if (target.firstChild) {
              target.insertBefore(newElem, ele.firstChild);
            } else {
              target.appendChild(newElem);
            }
          } // prepend mode

        } // if template

      }.bind(this)); // forEach data

      return newElem;
    }


    /**
     *  Appends a new instance HTMLElement (or array of) of a template
     *
     *  The template is assumed to be a child of the element passed
     *  as parameter
     *  The new element will be appended as a child
     *
     *  @param {HTMLElement or String} ele container element that
     *  contains the template and which will contain the new instance.
     *  Can be an HTMLElement or a CSS selector.
     *
     *  @param {object or array} data with the data displayed by the template.
     *
     *  @return {HTMLelement} (or last element if data is an array).
     *
     *
     */
    Templates.append = function(element, data, targetNode) {
      var f = add.bind(this);

      return f(element, data, 'A', targetNode);
    };


    /**
     *   Prepends a new instance (or array of) of a template
     *
     *   The template is assumed to be a child of the element passed
     *   as parameter
     *
     *   @param {HTMLElement or String} ele container element that
     *   contains the template and which will contain the new instance.
     *   Can be an HTMLElement or a CSS selector.
     *
     *   @param {Object or Array} data with the data displayed.
     *
     *   @return {HTMLElement} added.
     *
     *
     */
    Templates.prepend = function(element, data, targetNode) {
       var f = add.bind(this);

      return f(element, data, 'P', targetNode);
    };


    /**
     *  Renders the content specified by a template with object data
     *
     *  @param {HTMLElement} eleTemplate the template itself.
     *  @param {Object} data the data to be used.
     *
     *  @return {HTMLElement} according to the template and with the data.
     *
     *
     */
    Templates.render = function(eleTemplate, data) {
      var newElem = eleTemplate.cloneNode(true);
      newElem.removeAttribute('data-template');
      newElem.removeAttribute('data-condition');

      /* var pattern = /#(\w+)#/g; */
      var pattern = /#(\w+[\w.]*)#/g;

      var inner = newElem.innerHTML;

      // Replace function
      var replaceFunction = templateReplace(data);
      var ninner = inner.replace(pattern, replaceFunction);

      newElem.innerHTML = ninner;

      var attrs = newElem.attributes;

      var total = attrs.length;
      for (var c = 0; c < total; c++) {
        var val = attrs[c].value;
        var nval = val.replace(pattern, replaceFunction);

        newElem.setAttribute(attrs[c].name, nval);
      }

      if (!newElem.id) {
        if (data.id) {
          newElem.id = data.id;
        }
      }

      return newElem;
    };

    /**
     *  Clears a container element
     *
     *  @param {HTMLElement or String} element (selector or HTML element).
     *
     *
     */
    Templates.clear = function(element) {
      var target = getTarget(element);

      var templates = target.querySelectorAll('*[data-template]');

      target.innerHTML = '';

      var total = templates.length;

      for (var c = 0; c < total; c++) {
        target.appendChild(templates.item(c));
      }
    };
  }) ();
} // window.templates
