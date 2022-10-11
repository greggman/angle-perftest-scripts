const fs = require('fs');


function escape(s) {
  return s.replace(/"/g, '""')
}

const escapeRE = /[",\n\r ]/
function csvEscape(s) {
  const needQuotes = escapeRE.test(s);
  return needQuotes ? `"${escape(s)}"` : s;
}

function toCSVTests(tests, splitHeadings = false) {
  const headingsToColumn = new Map([['', 0]]);
  const headings = ['Git-Branch-Name . .'];
  const rows = [];
  for (const [testName, runs] of Object.entries(tests)) {
    const row = [testName];
    rows.push(row);
    Object.entries(runs).forEach(([test, steps], ndx) => {
      let colNdx = headingsToColumn.get(test);
      if (colNdx === undefined) {
        colNdx = headingsToColumn.size;
        headingsToColumn.set(test, colNdx);
        headings[colNdx] = test;
      }
      row[colNdx] = steps;
    });
  }
  if (splitHeadings) {
    let numHeadingRows = 0;
    const headingsPieces = [];
    for (const heading of headings) {
      const pieces = heading.split(/\s+/);
      headingsPieces.push(pieces);
      numHeadingRows = Math.max(numHeadingRows, pieces.length);
    }
    // add seperators
    {
      const separators = [];
      for (const pieces of headingsPieces) {
        const len = pieces.reduce((len, v) => Math.max(len, v.length), 0);
        separators.push(''.padEnd(len, '-'))
      }
      rows.unshift(separators);
    }
    for (let r = 0; r < numHeadingRows; ++r) {
      const row = [];
      for (const pieces of headingsPieces) {
        const ndx = pieces.length - 1 - r;
        row.push(ndx >= 0 ? pieces[ndx] : '')
      }
      rows.unshift(row);
    }
  } else {
    rows.unshift(headings);
  }
      
    
  return rows;
}

function toTable(gpus, splitHeadings = false) {
  const rows = [];
  for (const [gpu, tests] of Object.entries(gpus)) {
    rows.push([`\n\n---- [ ${gpu} ] ----`]);
    rows.push(...toCSVTests(tests, splitHeadings));
  }
  return rows;
}

function toCSV(gpus) {
  const rows = toTable(gpus);
  return rows.map(row => row.map(cell => csvEscape(cell)).join(',')).join('\n');
}

function toText(gpus) {
  const rows = toTable(gpus, true);
  const columnSizes = [];
  for (const row of rows) {
    row.forEach((cell, col) => {
      columnSizes[col] = Math.max(columnSizes[col] || 0, cell.toString().length);
    });
  }
  return rows.map(row => row.map((cell, col) => {
    return cell.toString().padStart(columnSizes[col]);
  }).join(' |')).join('\n');
}

function main() {
  let format;
  const filenames = process.argv.slice(2);
  while (filenames.length && filenames[0].startsWith('-')) {
    const option = filenames.shift();
    switch (option) {
      case '-csv':
      case '--csv':
        format = 'csv';
        break;
      case '-txt':
      case '--txt':
        format = 'txt';
        break;
      default:
        throw new Error(`unknown option: ${option}`);
    }
  }

  function getArch(renderer) {
    if ((/intel/i).test(renderer)) {
      return 'Intel';
    } else if ((/ATI|AMD/i).test(renderer)) {
      return 'AMD';
    } else if ((/NVidia/i).test(renderer)) {
      return 'NVidia';
    } else if ((/M1/i).test(renderer)) {
      return 'M1';
    } else {
      throw new Error(`unknown renderer: ${renderer}`);
    }
  }

  const gpus = {};
  for (const filename of filenames) {
    const f = fs.readFileSync(filename, {encoding: 'utf8'});
    const lines = f.split('\n');

    let renderer;
    let version;    // name of version (git branch)
    let test;       // results for current test
    let step;       // results for current test step
    let baseName;
    let subName;
    let tests = {};

    const parsers = [
      {
        re: /^build_and_run (.*?)$/,
        fn([, _]) {
          version = _;
        },
      },
      {
        re: /^GL_RENDERER: (.*)$/,
        fn([, _]) {
          renderer = _;
          const m = /^(.+?)(_.*)$/.exec(subName);
          const [api, sub] = m
              ? [m[1], m[2]]
              : [subName, ''];

          const arch = getArch(renderer);
          tests = gpus[arch] || {};
          gpus[arch] = tests;

          const testName = `${baseName}${sub}`;
          const testResults = tests[testName] || {};
          tests[testName] = testResults;
          const id = `${version}: ${api}`;
          test = [];
          testResults[id] = test;
        },
      },
      {
        re: /^\[ RUN {6}\] (.*)\/(.*?)$/,
        fn([, _baseName, _subName]) {
          baseName = _baseName;
          subName = _subName;
        },
      },
      {
        re: /^\*RESULT .*?\.cpu_time: .*?= (\d+\.\d+) ns/,
        fn([, _]) {
          step = {cpuTime: parseInt(_)};
          test.push(step);
        },
      },
      {
        re: /^\*RESULT .*?\.wall_time: .*?= (\d+\.\d+) ns/,
        fn([, _]) {
          step.wallTime = parseInt(_);
        },
      },
      {
        re: /^Ran (.*?) iterations per second/,
        fn([, _]) {
          step.iterationsPerSecond = parseInt(_);
        },
      },
    ];

    for (const line of lines) {
      for (const {re, fn} of parsers) {
        const m = re.exec(line);
        if (m) {
          fn(m);
          break;
        }
      }
    }
  }

  function averageSteps(steps) {
    const sum = steps.reduce((acc, step) => acc + step.iterationsPerSecond, 0);
    return sum / steps.length | 0 ;
  }

  for (const [gpu, tests] of Object.entries(gpus)) {
    for (const [name, test] of Object.entries(tests)) {
      for (const [version, steps] of Object.entries(test)) {
        test[version] = averageSteps(steps);
      }
    }
  }

  switch (format) {
    case 'csv':
      console.log(toCSV(gpus));
      break;
    case 'txt':
      console.log(toText(gpus));
      break;
    default:
      console.log(JSON.stringify(gpus, null, 2));
      break;
  }

}

main();
