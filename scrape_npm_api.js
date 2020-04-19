var { format, escape } = require('promise-mysql')
const cliProgress = require('cli-progress');
const { get } = require('./config/npm')
const pool = require('./config/mysql');
console.clear();
process.on('exit', async () => {
    require('fs').writeFileSync('./tmp.js', 'crash', 'utf-8')
});


(async () => {
    const [{ count }] = await pool.query(`
        select count(*) as count 
        from db.packages 
        where github_url is null 
    `)
    const page_size = 200
    const page_count = Math.ceil(count / page_size)
    const multibar = new cliProgress.MultiBar({
        format: 'progress [{bar}] {percentage}% | ETA: {eta_formatted} | {value}/{total} | {custom_val}',
        clearOnComplete: false,
        hideCursor: true,
    }, cliProgress.Presets.shades_grey);
    const b1 = multibar.create(page_count, 0);
    for (let page_number = 0; page_number < page_count; page_number++) {
        b1.increment(1, { custom_val: '' })
        const packages = await pool.query(`
            select * from db.packages 
            where github_url is null 
            limit ${page_size} offset ${page_number * page_size}
        `)

        const b2 = multibar.create(packages.length, 0);
        const github_urls = await Promise.all(packages.map(async package => {
            const package_name = package.package_name.toLowerCase()
            const { data } = await get(`http://registry.npmjs.com/${package_name}`)

            b2.increment(1, { custom_val: package.package_name })
            // if (Object.keys(response).length === 0) return null
            var url = ((data || {}).repository || {}).url
            // if (!url) {
            //     debugger
            // }
            return { package: package_name, url }
        })).then(r => r.filter(el => el))
        multibar.remove(b2)
        if (github_urls.length === 0) continue

        const queryString = format(`
        INSERT INTO db.packages (package_name,github_url) 
        VALUES ?
        ON DUPLICATE KEY UPDATE packages.github_url = VALUES(packages.github_url);

        `, [
            github_urls.map(gu => ([gu.package, gu.url])),

        ])

        await pool.query(queryString)

    }


})()



function parser(linkStr) {
    return linkStr.split(',').map(function (rel) {
        return rel.split(';').map(function (curr, idx) {
            if (idx === 0) return /[^_]page=(\d+)/.exec(curr)[1];
            if (idx === 1) return /rel="(.+)"/.exec(curr)[1];
        })
    }).reduce(function (obj, curr, i) {
        obj[curr[1]] = curr[0];
        return obj;
    }, {});
}