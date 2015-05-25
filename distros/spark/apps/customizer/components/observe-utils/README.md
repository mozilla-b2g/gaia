ObserveUtils
============

See : [The Object.observe shim](https://github.com/KapIT/observe-shim).

Goal:
----
provide a utilities to facilitate the use of the [observe-shim](https://github.com/KapIT/observe-shim).


ObserveUtils.defineObservableProperties :
-----------------------------------------

### Description :
Define observable properties on the given object an return it.

### Usage : 

    var myObject = {};
    ObserveUtils.defineObservableProperties(myObject, "foo", "bar");
    Object.observe(myObject, function (changes) {
        console.log(changes);
    });
    myObject.foo = "Hello";
    myObject.bar = "World";

    //log

    [
        {
            name : "foo",
            object : myObject,
            oldValue : undefined,
            type : "update"
        },
        {
            name : "bar",
            object : myObject,
            oldValue : undefined,
            type : "update"
        }
    ]

ObserveUtils.List :
-------------------

### Description :
Provide a List class, similar to Array, that notify 'changesRecord' when modified

### Usage : 

    var List = ObserveUtils.List;
    var myList = List(1,2,3);
    List.observe(myList, function (changes) {
        console.log(changes);
    });
    myList.push(4,5);

    //log

    [
        {
            type : "splice",
            object: myList,
            index: 3,
            removed: [],
            addedCount: 2
        }
    ]

### Limitations :

While the list allow you to retrieve value associated to a given index with the brackets notation, like with array, setting values in the same way will be silent, and the length won't be modified if the index is out of bounds, the delete operator won't be caught neither.

### Difference with Array :

To set a value at a given index use the <code>set</code> method of the List :  

    var List = ObserveUtils.List;
    var myList = List(1,2,3);
    List.observe(myList, function (changes) {
        console.log(changes);
    });
    myList.set(3,4);
    myList.set(3,5);
    
    //log

    [
        {
            type : "update",
            object: myList,
            name: '3',
            oldValue: 3
        },
        {
            type : "update",
            object: myList,
            name: '3',
            oldValue: 4
        }
    ]

to delete a value at a given index use the <code>delete</code>  method of the List :

    var List = ObserveUtils.List;
    var myList = List(1,2,3);
    List.observe(myList, function (changes) {
        console.log(changes);
    });
    myList.delete(2);

    //log
   
    [
        {
            name : 2,
            object : myList,
            oldValue : 3,
            type : "delete"
        }
    ]
    
The list also provide a <code>toArray</code> method that return a clone array of the List, and a static method <code>fromArray</code> that create a List from a given array.
List methods corresponding to an Array methods that returns an array, return a List.

Build And Test:
---------------

Require [bower](https://github.com/twitter/bower) and [grunt-cli](https://github.com/gruntjs/grunt-cli) installed on your machine.

    npm install & bower install
    grunt // test 
