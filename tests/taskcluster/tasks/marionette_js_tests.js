module.exports = {
  task: {
    metadata: {
      name: "Marionette JS tests",
      description: "Run entire suite of marionette js tests"
    },
    payload: {
      command: ["./bin/ci run marionette_js"]
    },
    tags: {
      treeherderProject: "Gij"
    }
  }
};

