Pushpop.Transitions = [
  
  // Transition: slide-horizontal
  {
    "name": "slide-horizontal",
    "push": {
      "setup": {
        "wrapper": {
          "width": "200%",
          "x": "0"
        },
        "oldView": {
          "width": "50%",
          "x": "0"
        },
        "newView": {
          "width": "50%",
          "x": "100%"
        }
      },
      "transition": {
        "element": "wrapper", // Options: wrapper, oldView, newView
        "duration": "0.5s",
        "easingFunction": "ease",
        "delay": "0.1s",
        "start": {
          "x": "0"
        },
        "end": {
          "x": "-50%"
        }
      }
    },
    "pop": {
      "setup": {
        "wrapper": {
          "width": "200%",
          "x": "-50%"
        },
        "oldView": {
          "width": "50%",
          "x": "100%"
        },
        "newView": {
          "width": "50%",
          "x": "0"
        }
      },
      "transition": {
        "element": "wrapper", // Options: wrapper, oldView, newView
        "duration": "0.5s",
        "easingFunction": "ease",
        "delay": "0.1s",
        "start": {
          "x": "-50%"
        },
        "end": {
          "x": "0"
        }
      }
    }
  },

  // Transition: flip-horizontal
  {
    "name": "flip-horizontal",
    "push": {
      "setup": {
        "wrapper": {},
        "oldView": {
          "z-index": "1",
          "transform": "rotateY(0deg)"
        },
        "newView": {
          "z-index": "2",
          "transform": "rotateY(180deg)"
        }
      },
      "transition": {
        "element": "wrapper", // Options: wrapper, oldView, newView
        "duration": "1s",
        "easingFunction": "ease",
        "delay": "0.1s",
        "start": {
          "transform": "rotateY(0deg)"
        },
        "end": {
          "transform": "rotateY(-180deg)"
        }
      }
    },
    "pop": {
      "setup": {
        "wrapper": {},
        "oldView": {
          "transform": "rotateY(0deg)"
        },
        "newView": {
          "transform": "rotateY(180deg)"
        }
      },
      "transition": {
        "element": "wrapper", // Options: wrapper, oldView, newView
        "duration": "1s",
        "easingFunction": "ease",
        "delay": "0.1s",
        "start": {
          "transform": "rotateY(0deg)"
        },
        "end": {
          "transform": "rotateY(180deg)"
        }
      }
    }
  },
  
  // Transition: door-left
  {
    "name": "door-left",
    "push": {
      "setup": {
        "wrapper": {},
        "oldView": {
          "z-index": "2",
          "transform": "rotateY(0deg)",
          "transform-origin": "0% 50%"
        },
        "newView": {
          "z-index": "1",
          "transform": "rotateY(0deg)",
          "transform-origin": "0 50%"
        }
      },
      "transition": {
        "element": "oldView", // Options: wrapper, oldView, newView
        "duration": "1s",
        "easingFunction": "ease",
        "delay": "0.1s",
        "start": {
          "transform": "rotateY(0deg)"
        },
        "end": {
          "transform": "rotateY(-90deg)"
        }
      }
    },
    "pop": {
      "setup": {
        "wrapper": {},
        "oldView": {
          "z-index": "1",
          "transform": "rotateY(0deg)",
          "transform-origin": "0 50%"
        },
        "newView": {
          "z-index": "2",
          "transform": "rotateY(-90deg)",
          "transform-origin": "0 50%"
        }
      },
      "transition": {
        "element": "newView", // Options: wrapper, oldView, newView
        "duration": "1s",
        "easingFunction": "ease",
        "delay": "0.1s",
        "start": {
          "transform": "rotateY(-90deg)"
        },
        "end": {
          "transform": "rotateY(0deg)"
        }
      }
    }
  }
  
];
