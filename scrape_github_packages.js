var {format, escape} = require('promise-mysql')
const cliProgress = require('cli-progress');
const {get} = require('./config/github')
const pool = require('./config/mysql');


(async () => {

    const [{ count }] = await pool.query(`
        select count(*) as count 
        from db.packages 
        where github_url is not null 
        and github_url != '' 
        and scraped_contributors is null
    `)
    const page_size = 10
    const page_count = Math.ceil(count / page_size)
    const multibar = new cliProgress.MultiBar({
        format: 'progress [{bar}] {percentage}% | ETA: {eta_formatted} | {value}/{total}',
        clearOnComplete: false,
        hideCursor: true,
    }, cliProgress.Presets.shades_grey);
    const b1 = multibar.create(page_count, 0);
    for (let page_number = 0; page_number < page_count; page_number++) {
        b1.increment()
        const packages = await pool.query(`
            select * from db.packages 
            where github_url is not null 
            and github_url != '' 
            and scraped_contributors is null    
            limit ${page_size} offset ${page_number * page_size}
        `)
        
        const b2 = multibar.create(packages.length, 0);
        const package_contributors = await Promise.all(packages.map(async package => {
            const url = package.github_url.replace(/#readme/,'').replace(/^(github\.com)/, "https://api.github.com/repos") + '/contributors';
            const response = await get(url)
            b2.increment()
            if (Object.keys(response).length === 0) return null
            var contributors = response.data
            if (response.headers.link) {
                const { last, next, prev, first } = parser(response.headers.link)
                const b3 = multibar.create(last, 0);
                for (let i = 2; i <= last; i++) {
                    let paginated_url = url + `?page=${i}`
                    const { data } = await get(paginated_url)
                    contributors = [...contributors, ...data]
                    b3.increment()
                }
                multibar.remove(b3)
            }
            return { package: package.package_name, contributors }
        })).then(r => r.filter(el => el))
        multibar.remove(b2)
        if (package_contributors.length === 0) continue

        const queryString = format(`
        INSERT INTO db.contributors (avatar_url,login) 
        VALUES ?
        ON DUPLICATE KEY UPDATE contributors.avatar_url = VALUES(contributors.avatar_url);

        INSERT INTO db.package_has_contributors (package_id,contributor_id) 
        VALUES ${  package_contributors.reduce((acc, val) => {
            for (let i = 0; i < val.contributors.length; i++) {
                acc.push(`(
                    (select id from db.packages where package_name = '${val.package}'), 
                    (select id from db.contributors where login = '${val.contributors[i].login}')
                )`)
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
        const queryString2 = format('update db.packages set scraped_contributors = 1 where package_name in (?)', [package_contributors.map(el => el.package)])
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