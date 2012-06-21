/*
 *  Module: Templates
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: TBD
 *
 *  @author José M. Cantera (jmcf@tid.es)
 *
 *  The module allows to work with HTML templates in client-side JS environments
 *
 * @example
 *
 *   <ul id="theList">
 *    <li data-template>
 *      <dl>
 *         <dt>#name#</dt>
 *         <dd class="img"><img src="#contactImg#"></dd>
 *      </dl>
 *    </li>
 *   </ul>
 *
 *   var myObj = { name: 'Nice Name!', contactImg: 'myImg.jpg' };
 *   owd.templates.append('#theList',myObj);
 *
 *
*/

var owd = window.owd || {};

if (!owd.templates) {
   (function() {
     // 'use strict';

      var Templates = owd.templates = {};

      /**
       *  Returns a target HTMLElement from a selector or HTMLElement itself
       *
       *  @element HTMLElement or Selector
       *
       *  @return HTMLElement.
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
      *    @target HTMLElement which contains the template
      *    @data to be used on the template
      *
      *    @return HTMLElement with the template.
      *
      */
      function getTemplate(target,data) {
        var template;
        var templates = target.querySelectorAll('*[data-template]');

        var total = templates.length;

        var multi = false;
        if (total > 1) {
          multi = true;
        }

        if (total > 0) {
          var condition = templates.item(0).dataset.condition;

          // If the first has no condition it will be selected by default
          // The most frequent case will be that the first is the one that wins
          if (!condition) {
             template = templates.item(0);
          }

          var evaluation;
          if (condition) {
            // Condition is evaluated over the object in question
            with (data) {
              try {
                evaluation = eval(condition);
              }
              catch (e) { evaluation = false; }
            }
            if (evaluation) {
              // The rest will be ignored
              total = 1;
              template = templates.item(0);
            }
          }

          for (var c = 1; c < total; c++) {
            var condition = templates.item(c).dataset.condition;

            if (condition) {
              with (data) {
                try {
                   evaluation = eval(condition);
                }
                catch (e) { evaluation = false; }
              }
              if (evaluation) {
                template = templates.item(c);
                break;
              }
            }
            else if (!template) {
              // Just to be sure that if there is no a condition something will be
              // selected
              template = templates.item(c);
            }
          } // Iteration trying to find a template
        } // total templates > 0

        return {template: template, isMulti: multi};
      }

      /**
       *   Returns a function used to replace data on a template
       *
       *   @param data the data to be used on the template.
       *
       *   @return function.
       *
       */
      function templateReplace(data) {
        return function(text,property) {
          var ret;
          // window.console.log("Replacing inner: " + t);
          if (property.indexOf('.') === -1) {
            ret = data[property];
          }
          else {
            with (data) {
              try {
                ret = eval(property);
              }
              catch (e) { }
            }
          }

          if (typeof ret === 'undefined') {
            ret = text;
          }
          return ret;
        }
      }

      /**
       *  Adds (append or prepend) a new instance HTMLElement (or array of) of a template
       *
       *  The template is assumed to be a child of the element passed as parameter
       *  The new element will be appended as a child
       *
       *  @param ele container lement that contains the template and which will
       *   contain the new instance. Can be an HTMLElement or a CSS selector.
       *
       *  @param data object or array with the data displayed by the template.
       *
       *  @param mode oneOf ('A','P').
       *
       *  @return the HTMLElement (or last element if data is an array).
       *
       *
       */
      function add(element,data,mode) {
        // It is supported both the element itself or a selector
        var target = getTarget(element);
        var newElem;

        var theData = [data];
        if (data instanceof Array) {
          theData = data;
        }

        // Optimization to avoid trying to find a template when only one is needed
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

            if (mode === 'A') {
               target.appendChild(newElem);
            } // append mode
            else if (mode === 'P') {
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
       *  The template is assumed to be a child of the element passed as parameter
       *  The new element will be appended as a child
       *
       *  @param ele container element that contains the template and which will
       *   contain the new instance. Can be an HTMLElement or a CSS selector.
       *
       *  @param data object or array with the data displayed by the template.
       *
       *  @return HTML element (or last element if data is an array).
       *
       *
       */
      Templates.append = function(element,data) {
        var f = add.bind(this);

        return f(element, data, 'A');
      };


      /**
       *   Prepends a new instance (or array of) of a template
       *
       *   The template is assumed to be a child of the element passed as parameter
       *
       *   @param ele container element that contains the template and which will
       *   contain the new instance. Can be an HTMLElement or a CSS selector.
       *
       *   @param data object or array with the data displayed by the template.
       *
       *   @return HTMLElement added.
       *
       *
       */
      Templates.prepend = function(element,data) {
         var f = add.bind(this);

        return f(element, data, 'P');
      };


      /**
       *  Renders the content specified by a template with object data
       *
       *  @param eleTemplate the template HTMLElement itself.
       *  @param data the data to be used.
       *
       *  @return a new HTMLElement according to the template and with the data.
       *
       *
       */
      Templates.render = function(eleTemplate,data) {
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
       *  @param element (selector or HTML element).
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
      }
    }) ();
} // window.templates
