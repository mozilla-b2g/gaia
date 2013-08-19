var Step = require('step');

/**
Inherits object prototype.
(Prototypal inheritance.)


@param {Object} object object to inherit from
@param {Object} props properties to add to object.
@return {Object}

*/
var inheritObject = function(object, props){

  var newObject = Object.create(object),
      list = Object.getOwnPropertyNames(props),
      i = 0, prop, len;


  for(i = 0, len = list.length; i < len; i++){
    prop = list[i];
    newObject[prop] = props[prop];
  }

  return newObject;

};


/**
Step inheritance for created StepObject.


@param {Object} methods methods for step object.
@param {Array} order method order
@return {Object} newly created step object

*/
var inheritStep = function(methods, order){
    var createdMethods = inheritObject(this.methods, methods);
    order = (order || this.order);

    return StepObject(createdMethods, order);
};

/**
Creates step function based on methods and order.

@param {Object} method to add on the StepObject
@param {Array} order order to call the functions in methods
*/
var createStepFn = function(methods, order){
  var list = [], i, len, methodObject, listMethod = function(){
    //We want all properties minus those on Object
    var hasOwn = Object.prototype.hasOwnProperty, method;

    //Prime object with methods...
    for(method in methods){
      // not checking for has own property intentionally
      this[method] = methods[method];
    }

    this.next = this;

    this.apply(this, arguments);
  };

  list.push(listMethod);

  for(i = 0, len = order.length; i < len; i++){
    list.push(methods[order[i]]);
  }
  return Step.fn.apply(null, list);

};

/**

Creates Step object. Similar to Step.fn but designed
for function object reuse.


    var StepObject = require('step-object'),
        fs = require('fs');

    var ReadDir = StepObject({

      queueRead: function(path){
        fs.readdir(path, this);
      },

      fsReadDir: function(err, files){
        if(err){
          throw err;
        }

        return files;
      }

    }, ['queueRead', 'fsReadDir']);

    ReadDir(function(err, files){
      //files is the result of fsReadDir
    });

@param {Object} methods
@param {Array} order
@return {Function}

*/
var StepObject = function(methods, order){

  var result = function(){

    if(!result.stepFn){
      result.stepFn = createStepFn(result.methods, result.order);
    }

    return result.stepFn.apply(result.stepFn, arguments);
  };

  result.inherit = inheritStep;
  result.methods = methods;
  result.order = order;

  return result;

};

StepObject.inheritObject = inheritObject;
module.exports = exports = StepObject;
