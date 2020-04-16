const axios = require('axios')
var mysql = require('promise-mysql');
const stopcock = require('stopcock');
const ora = require('ora');

const token = '4e7e29d28dbbfdf86596f8a70c9eb711f3a4def3';
const ax_get = url => {
    return axios.get(url, { headers: { 'Authorization': `token ${token}` } })
}
const get = stopcock(ax_get, { bucketSize: 1, limit: 18, interval: 25000 });

const dbConfig = {
    connectionLimit: 20,
    host: '34.95.55.192',
    user: 'root',
    password: '123',
    multipleStatements: true,
    timezone: 'utc',
    dateStrings: 'date'
};
(async () => {
    let pool = await mysql.createPool(dbConfig)
    pool.on('connection', connection => {
        connection.on('enqueue', function (sequence) {
            if (sequence.sql) {
                console.log(sequence.sql.slice(0,1000))
            }

        })
    })



    const [{ count }] = await pool.query(`
    select count(*) as count from db.packages where github_url is not null and github_url != '' and scraped_contributors is null
    `)
    const page_size = 10
    const page_count = Math.ceil(count / page_size)
    const spinner = ora('Loading...').start();
    for (let page_number = 0; page_number < page_count; page_number++) {
        spinner.text = `github ${page_number} / ${page_count} pages`

        const packages = await pool.query(`
            select * from db.packages where github_url is not null and github_url != '' and scraped_contributors is null
            limit ${page_size} offset ${page_number * page_size}
        `)

        const package_contributors = await Promise.all(packages.map(async package => {
            const url = package.github_url.replace(/^(github\.com)/, "https://api.github.com/repos") + '/contributors';
            console.log('getting', url)
            const response = await get(url).catch(err => {
                if (err.response.status === 404) {
                    return null
                } else {
                    return Promise.reject(err.response)
                }
            })
            if (response === null) return null
            var contributors = response.data
            if (response.headers.link) {
                const { last, next, prev, first } = parser(response.headers.link)
                for (let i = 2; i <= last; i++) {
                    let paginated_url = url + `?page=${i}`
                    console.log('getting', paginated_url)
                    const { data } = await get(paginated_url)
                    contributors = [...contributors, ...data]
                }
            }
            return { package: package.package_name, contributors }
        })).then(r => r.filter(el => el))

        if (package_contributors.length === 0) continue

        const queryString = mysql.format(`
        INSERT INTO db.contributors (avatar_url,login) 
        VALUES ?
        ON DUPLICATE KEY UPDATE contributors.avatar_url = VALUES(contributors.avatar_url);

        INSERT INTO db.package_has_contributors (package_id,contributor_id) 
        VALUES ${  package_contributors.reduce((acc, val) => {
            for (let i = 0; i < val.contributors.length; i++) {
                acc.push(`((select id from db.packages where package_name = '${val.package}'), (select id from db.contributors where login = '${val.contributors[i].login}'))`)
            }
            return acc
        }, [])}
        ON DUPLICATE KEY UPDATE id=id

        `, [
            package_contributors.reduce((acc, val) => {
                return [...acc, ...val.contributors]
            }, []).map(contributor => ([contributor.avatar_url, contributor.login])),

        ])

        await pool.query(queryString)
        const queryString2 = mysql.format('update db.packages set scraped_contributors = 1 where package_name in (?)', [package_contributors.map(el => el.package)])
        await pool.query(queryString2)

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