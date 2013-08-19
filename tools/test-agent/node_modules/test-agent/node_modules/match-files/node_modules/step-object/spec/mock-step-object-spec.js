var MockStep = require('../lib/mock-step-object'),
    StepObject = require('../lib/step-object');

describe("Mock StepObject spec helper", function(){
  var subject, StepSubject, spy, methods, order, context, wrapped;

  spy = {
    onMe: function(callback){
      return callback(null, true);
    }
  };

  order = ['init', 'syncCall', 'nextCall', 'groupCall', 'parallelCall', 'methodCall'];

  methods = {
    _helper: function(){
      return 'uniq';
    },

    init: function(){
      context = this;

      //Save arguments
      this.stepArguments = Array.prototype.slice.call(arguments);

      //Setup initial call
      this.calls = ['init'];

      return true;
    },

    syncCall: function(){
      this.calls.push('syncCall');
      return 'woot!';
    },

    nextCall: function(){
      this.calls.push('nextCall');
      spy.onMe(this.next());
    },

    groupCall: function(){
      this.calls.push('groupCall');
      var group = this.group();

      spy.onMe(group());
    },

    parallelCall: function(){
      var parallel = this.parallel();
      this.calls.push('parallelCall');
      spy.onMe(parallel());
    },

    methodCall: function(){
      this.calls.push('methodCall');
      return this._helper();
    }

  };


  //NOTE:
  //When this is executed the 'context' variable will be updated
  //with the 'this' inside the step execution.
  StepSubject = StepObject(
    methods, order
  );

  beforeEach(function(){
    sinon.spy(spy, 'onMe');

    subject = MockStep(StepSubject);
  });

  describe("StepSubject validity (lets make sure our test subject works in real life)", function(){

    var expectedResult = 'uniq';

    it("should execute each step in correct order", function(done){
      StepSubject(function(err, result){
        expect(result).to.eql(expectedResult);
        expect(context.calls).to.eql(order);

        done();
      });
    });

  });

  describe("when calling a sync step", function(){

    beforeEach(function(){
      subject.init();
      subject.syncCall();
    });

    it("should not call the following step", function(){
      expect(subject.calls).to.eql(['init', 'syncCall']);
    });

  });

  describe("spying on .group calls", function(){

    beforeEach(function(){
      //We need to init the call first because its not done for us.
      subject.init();
      subject.groupCall();
    });

    it("should have passed a group into spy.onMe", function(){
      //The wrapper causes subject.group() to return itself.
      expect(spy.onMe).was.calledWith(subject.group);
    });
  
  });

  describe("spying on .parallel calls", function(){

    beforeEach(function(){
      //We need to init the call first because its not done for us.
      subject.init();
      subject.parallelCall();
    });

    it("should have passed a group into spy.onMe", function(){
      //The wrapper causes subject.group() to return itself.
      expect(spy.onMe).was.calledWith(subject.parallel);
    });

  });

  describe("returning an 'in context' StepObject without execution logic", function(){

    it("should have stopped execution before init", function(){
      expect(subject.calls).to.be(undefined);
    });

    it("should have a real context with all methods defined", function(){
      var method;
      for(method in methods){
        expect(subject[method]).to.be(methods[method]);
      }
    });

    it("should be in the same context", function(){
      subject.init();

      expect(subject).to.be(context);
    });

  });

});
