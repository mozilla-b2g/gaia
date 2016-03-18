#! /usr/bin/env node

// Register means every single file will get processed by babel that we import!
import 'babel/polyfill'

import fs from 'mz/fs';
import fsPath from 'path';
import eventToPromise from 'event-to-promise';
import { ArgumentParser } from 'argparse';

const CONFIG_DIR = '.exhibition';

async function setupConfigs(basedir, iojsVersion) {
  let configPath = fsPath.join(basedir, CONFIG_DIR);
  let iojsVersionFile = fsPath.join(configPath, 'iojs_version');

  if (!await fs.exists(configPath)) {
    await fs.mkdir(configPath);
  }

  await fs.writeFile(iojsVersionFile, iojsVersion);
}

async function main() {
  let parser = new ArgumentParser({
    version: require('../../package.json').version,
    addHelp: true,
    description: `
      Initialize a project to use exhibition.
    `
  });

  parser.addArgument(['--bootstrap', '-b'], {
    type: fsPath.resolve,
    help: 'Override default bootstrap script with one on disk'
  });

  parser.addArgument(['iojs-version'], {
    help: 'IO JS Version number'
  });

  parser.addArgument(['entrypoint'], {
    help: `Entrypoint and bootstrapping script location`
  });

  let args = parser.parseArgs();

  let entrypoint = fsPath.resolve(args.entrypoint);
  let basedir = fsPath.dirname(entrypoint);

  await setupConfigs(basedir, args['iojs-version']);

  if (args.bootstrap) {
    let stream = fs.createReadStream(args.bootstrap).pipe(fs.createWriteStream(
      entrypoint
    ));
    await eventToPromise(stream, 'finish');
    await fs.chmod(entrypoint, '0744');
  } else {

  }

}

main(process.argv[2]).catch((e) => {
  setTimeout(() => {
    throw e;
  });
});
