'use strict';

var fs = require('fs');
var colors = require('colors');
var gettextParser = require('gettext-parser');
var path = require('path');

var cli = require('yargs')
            .usage('Extract strings from files for translation.\nUsage: $0 [options]')
            .version(require(__dirname + '/../package.json').version)
            .alias('version', 'v')
            .help('help')
            .alias('help', 'h')
            .option('po', {
              alias: 'po',
              describe: 'Paths you would like to extract strings from. You can use path expansion, glob patterns and multiple paths',
              type: 'array',
              normalize: true
            })
            .check(options => { console.log(options.po);
              options.po.forEach((file) => {
                if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
                  console.log(colors.red(`The path you supplied was not found: '${file}' -> create`));

                  var locale = path.basename(file, '.po');
                  fs.closeSync(fs.openSync(file, 'w'));
                  fs.appendFileSync(file, 'msgid ""' + "\n");
                  fs.appendFileSync(file, 'msgstr ""' + "\n");
                  fs.appendFileSync(file, '"MIME-Version: 1.0"' + "\n");
                  fs.appendFileSync(file, '"Content-Type: text/plain; charset=utf-8"' + "\n");
                  fs.appendFileSync(file, '"Language: ' + locale + '\\n"' + "\n");
                }

              });
              return true;
            })
            .exitProcess(true)
            .parse(process.argv);

cli.po.forEach((poDir) => {
  console.log(colors.blue.bold(poDir), 'additions'.blue.bold);

  var po = gettextParser.po.parse(fs.readFileSync(poDir));
  var pot = gettextParser.po.parse(fs.readFileSync(cli.pot));
  var keys = Object.keys(pot.translations['']);

  var totals = {
    added: 0,
    changed: 0
  };

  for (var i = 1; i < keys.length; i++) {
    if (po.translations[''][keys[i]]) {
      pot.translations[''][keys[i]]['msgstr'] = po.translations[''][keys[i]]['msgstr'];

      if (po.translations[''][keys[i]].comments &&
        po.translations[''][keys[i]].comments.reference !== pot.translations[''][keys[i]].comments.reference)
      {
        var comments = {
          changes: [],
          out: po.translations[''][keys[i]].comments.reference.split('\n'),
          in: pot.translations[''][keys[i]].comments.reference.split('\n')
        };

        comments.out.forEach(function(item) {
          if (comments.in.indexOf(item) === -1) {
            comments.changes.push('-'.red + ' ' + item.grey);
          }
        });

        comments.in.forEach(function(item) {
          if (comments.out.indexOf(item) === -1) {
            comments.changes.push('+'.green + ' ' + item.grey);
          }
        });

        if (comments.changes.length && (!cli.show || cli.show === 'change') ) {
          console.log('[CHANGE]'.yellow, keys[i]);

          comments.changes.map(function(item) {
            console.log(item);
          });

          totals.changed++;
        }
      }
    } else if ((!cli.show || cli.show === 'add')) {
      console.log('[ADD]'.green, keys[i]);

      if (pot.translations[''][keys[i]].comments) {
        console.log(pot.translations[''][keys[i]].comments.reference.grey);
      }

      if (cli.keyAsDefaultValue) {
        let key = keys[i];

        if (cli.routesPrefix) {
          key = key.replace(cli.routesPrefix, '');
        }

        pot.translations[''][keys[i]]['msgstr'] = key;
      }

      totals.added++;
    }
  }

  console.log('');

  pot.headers = po.headers;

  if (!cli.debug) {
    fs.writeFileSync(poDir, gettextParser.po.compile(pot));
  }

  console.log('------------------------------------------'.black);
  console.log('Totals:'.black);
  console.log(colors.green(totals.added), 'additions'.green);
  console.log(colors.yellow(totals.changed), 'changes'.yellow);
  console.log('------------------------------------------'.black);
});