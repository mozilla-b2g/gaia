Object based creation of step functions.

Still an experiment at this stage.

## Step Creation

    var StepObject = require('step-object'),
        fs = require('fs');

    var ReadDir = StepObject({

      _filter: function(files){
        var filteredFiles;

        //some filter logic
        return filteredFiles;
      },

      queue: function(path){
        fs.readdir(path, this);
      },

      read: function(err, files){
        if(err){
          throw err;
        }

        return this._filter(files);
      },

    }, ['queue', 'read']);

    ReadDir(function(err, files){
      //files is the result of read
    });
    
    
    

## Testing

One problem I ran into using step initially was gaining access to the
scope in which the steps actually execute in.

I still perfer to specify the behaviour of each function which becomes
very difficult if these functions utlize the shared contex to store
information.

The below will give you a reference to the the context the step
execution. This is the same object you refer to when using 'this' inside
of your step methods.


    //Note that this will not call queue from the above example
    var subject = require('step-object/lib/mock-step-object')(ReadDir);

    subject.queue //


Its important for me to note that this works via a simple hack
where by not returning anything in a function the step execution
halts because its effectivly waiting for a callback to execute.

So if you did the following:

    subject(); 
    //(which is the same as `this()` or next inside of step scope)


It will cause werid things to happen such as two steps
executing without waiting for the other to finish.


### Group / Parallel

The `.group` and `.parallel` functions are overriden to return
themselves. This is so you can spy for them inside of your tests.

## Methods / Order

You can also gain access to methods and order of the StepObject at
anytime with:

    ReadDir.methods //{queue: ....}
    ReadDir.order //['queueRead', 'fsReadDir']



## License

See LICENSE (MIT)
