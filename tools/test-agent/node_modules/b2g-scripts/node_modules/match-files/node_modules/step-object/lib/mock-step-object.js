/**
 * Problems we are trying to solve with this helper:
 *
 * Replicating context (this) inside of step object execution.
 * Testing queuing of this (next), group and parallel.
 *
 *
 * See specs for more examples.
 *
 */
function MockStep(stepObject){
  var order = ['__haltSteps__'], i = 0, newStep, context,
      group, parallel, len;

  for(i, len = stepObject.order.length; i < len; i++){
    order.push(stepObject.order[i]);
  }

  group = function(){
    //Return myself
    return group;
  };

  parallel = function(){
    return parallel;
  };

  newStep = stepObject.inherit({
    __haltSteps__: function(){
      context = this;
      //By not returning or calling next we halt queue.
    },

    //Note: this overrides steps .group. 
    //Which you normally would *not* want to do.
    group: group,

    //Note: this overrides steps .parallel.
    //Which you normally would *not* want to do.
    parallel: group

  }, order);

  //Execute newly created step.
  //It will stop at __haltSteps__ and give us the context we want.

  newStep();

  return context;

}

module.exports = exports = MockStep;
