const repos = require('all-the-package-repos')
const pool = require('./config/mysql');
const cliProgress = require('cli-progress');
var {format, escape} = require('promise-mysql')
const chunk = (arr, size) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    );

const arr = chunk(Object.entries(repos), 1000);
(async () => {
    const multibar = new cliProgress.MultiBar({
        format: 'progress [{bar}] {percentage}% | ETA: {eta_formatted} | {value}/{total} | {custom_val}',
        clearOnComplete: false,
        hideCursor: true,
    }, cliProgress.Presets.shades_grey);
    const b1 = multibar.create(arr.length, 0);
    for (let i = 0; i < arr.length; i++) {
        b1.increment(1)
        const chunk = arr[i]
        const queryString = format(`
            insert into db.packages (package_name, github_url)
            values ${chunk.map(el => `(${escape(el[0])},${escape(el[1])})`)}
            on duplicate key update packages.github_url = values(packages.github_url)
       `)
        await pool.query(queryString)

        //    console.log(package_name, github_url)


    }
})()