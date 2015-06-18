import assert from 'assert';
import { exec } from 'mz/child_process';

suite('end to end test', function() {

  let fixture = `${__dirname}/fixtures/multi-doc/`;
  let babel = `${__dirname}/../node_modules/.bin/babel-node`;
  let setupBin = `${__dirname}/../src/bin/setup.js`;
  let bootstrap = `${__dirname}/../src/bootstrap.sh`;

  async function run(cmd) {
    return exec(`sh -c "${cmd}"`, { cwd: fixture });
  }

  setup(async function() {
    await exec(`rm -Rf ${fixture}/node_modules/`)
    await exec(`${babel} ${setupBin} --bootstrap ${bootstrap} v1.6.4 ex`, {
      cwd: fixture
    });
  });

  test('help output', async function() {
    let [help] = await run('./ex help');

    assert.ok(help.indexOf('first') !== -1);
    assert.ok(help.indexOf('second') !== -1);
    assert.ok(help.indexOf('third') !== -1);
  });

  test('arguments passed to commands', async function() {
    // Ensure things are installed so the output is only json...
    await run('./ex help');

    let [output] = await run('./ex third --another=xfoo --super-attack value');
    let json = JSON.parse(output);

    assert.deepEqual(json, {
      "--super-attack": true,
      "--another": "xfoo",
      "--help": false,
      "<attack>": "value"
    });
  });

});
