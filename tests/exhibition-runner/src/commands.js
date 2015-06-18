import 'babel/register';

import fsPath from 'path';
import fs from 'mz/fs';
import pad from 'pad';
import { docopt } from 'docopt';
import camelcase from 'camel-case';

// Docopt sections to parse...
const PARSED_DOCOPT_SECTIONS = new Set([
  'commands'
]);

function firstLine(doc) {
  let idx = doc.indexOf('\n');
  if (idx === -1) return doc;
  return doc.slice(0, idx);
}

/**
Parse out the doc block sections...

Note: This is a really terrible (not even) parser.
*/
async function parseDocBlocks(path) {
  let doc = (await fs.readFile(path, 'utf8')).trim();
  // First section is usage...
  let usageIdx = doc.indexOf(doc);
  if (usageIdx === -1) {
    throw new Error(`docopt error: ${path} must contain "Usage"`);
  }

  let results = {
    path: path,
    commands: []
  }

  // Skip usage section we don't need it to find commands.
  doc = doc.slice(usageIdx);

  let blockLevel;
  doc.split('\n').forEach((line) => {
    // If line does not start with space it's a block level change...
    if (line[0] !== ' ') {
      // Options: -> options
      blockLevel = line.toLowerCase().trim().replace(':', '');
      // Don't parse anything else after consuming the block level header...
      return;
    }

    // Skip any sections we don't need to use later...
    if (!PARSED_DOCOPT_SECTIONS.has(blockLevel)) {
      return;
    }

    results[blockLevel] = results[blockLevel] || [];
    results[blockLevel].push(line);
  });


  // Format commands into something more machine readable...
  if (results.commands) {
    results.commands = results.commands.map((v) => {
      // Split only on first help...
      // command does this stuff => { command: 'command', help: 'does this stuff' }
      let [command, help] = v.trim().split(/\s(.+)?/)
      return { command, help: help.trim() };
    });
  }

  return results;
}

class Commands {
  constructor(config) {
    this.config = config;
  }

  showHelp() {
    // XXX: This is a lazy version of argparse formatter...
    for (let group in this.config.groups) {
      let groupConfig = this.config.groups[group];
      console.log(`${group}:`)
      console.log(`  ${groupConfig.description}`);
      for (let paths of groupConfig.paths) {
        for (let command of paths.docopt.commands) {
          console.log(`  ${pad(command.command, 22)} ${pad(command.help)}`);
        }
      }
      console.log('\n');
    }
  }

  /**
  Attempt to find a command that matches the given command name.

  @return {Object|null}
  */
  getCommand(name) {
    for (let group in this.config.groups) {
      let groupConfig = this.config.groups[group];
      for (let paths of groupConfig.paths) {
        for (let command of paths.docopt.commands) {
          if (name === command.command) return paths;
        }
      }
    }
  }

  async run(argv) {
    switch(argv[0]) {
      case undefined:
      case '--help':
      case '-h':
      case 'help':
       return this.showHelp()
       break;
    }

    // Map commands ....
    let command = this.getCommand(argv[0]);
    if (!command) {
      console.error(`Unknown command: ${argv[0]}\n`);
      this.showHelp();
      process.exit(1);
    }

    let doc = await fs.readFile(command.docopt.path, 'utf8');
    let docoptParsed = docopt(doc, {
      argv: argv.slice(1)
    });

    let mod = require(command.cli);
    let modMethod = camelcase(argv[0]);
    await mod[modMethod](docoptParsed);
  }
}


export default async function createCommands(cwd, config) {
  // Init structure
  // {
  //   groups: [{
  //     "Example": {
  //       description: {},
  //       commands: [{
  //         cli: "...",
  //         docopt: {} // parsed docopt
  //       }]
  //     }
  //   }]
  // }
  let ops = [];

  async function registerDoc(group, idx, command) {
    group[idx] = {
      // XXX: Perhaps run node module resolution?
      cli: fsPath.join(cwd, command.cli),
      docopt: await parseDocBlocks(fsPath.join(cwd, command.docopt))
    }
  }

  // Convert the configuration format into the fully parsed group configs...
  // Note that we try to do as much of this in parallel as possible.
  for (let group in config.groups) {
    let groupConfig = config.groups[group];
    groupConfig.paths.forEach((command, idx) => {
      // Note that we mutate some state here in an async fashion this is safe to
      // do in parallel as the object and the place in the object are known.
      ops.push(registerDoc(groupConfig.paths, idx, command));
    });
  }

  // Ensure all groups configs are loaded...
  await Promise.all(ops);

  // Rather then attempting to validate anything incrementally we run
  // validation/optimization only as needed...
  return new Commands(config);
}
