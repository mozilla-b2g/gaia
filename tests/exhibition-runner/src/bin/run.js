#! /usr/bin/env node

// Register means every single file will get processed by babel that we import!
import 'babel/polyfill';

import yaml from 'js-yaml';
import fsPath from 'path';
import fs from 'mz/fs';
import createCommands from '../commands';

const CONFIG = 'exhibition.yml';

async function main(cwd) {
  // Resolve cwd to an absolute path...
  cwd = fsPath.resolve(cwd);

  let configPath = fsPath.join(cwd, CONFIG);

  if (!fs.exists(config)) {
    throw new Error(`
      Config file is missing (${configPath})
    `);
  }

  let config = yaml.safeLoad(await fs.readFile(configPath, 'utf8'));
  let commands = await createCommands(cwd, config);

  await commands.run(process.argv.slice(3));
}

main(process.argv[2]).catch((e) => {
  setTimeout(() => {
    throw e;
  });
});
