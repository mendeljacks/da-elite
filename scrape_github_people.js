var mysql = require('promise-mysql')
const stopcock = require('stopcock')
const ora = require('ora')
const axios = require('axios')
const token = '4e7e29d28dbbfdf86596f8a70c9eb711f3a4def3'
function remove_emoji (string) {
    if (!string) return string
    var regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
    return string.replace(regex, '');
  }
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
    dateStrings: 'date',
};
(async () => {
  
    let pool = await mysql.createPool(dbConfig)
    pool.on('connection', connection => {
        connection.on('enqueue', function (sequence) {
            if (sequence.sql) {
                console.log(sequence.sql.slice(0, 1000))
            }

        })
    })



    const [{ count }] = await pool.query(`
    SELECT count(*) as count 
    FROM db.contributors 
    where checked_person is null
    `)
    const page_size = 10
    const page_count = Math.ceil(count / page_size)
    const spinner = ora('Loading...').start();
    for (let page_number = 0; page_number < page_count; page_number++) {
        spinner.text = `${page_number} / ${page_count} pages`

        const contributors = await pool.query(`
        SELECT id, login FROM db.contributors where checked_person is null
        limit ${page_size} offset ${page_number * page_size}
        `)

        const people = await Promise.all(contributors.map(async contributor => {
            const { id, login } = contributor
            const {data} = await get(`https://api.github.com/users/${login}`).catch(err => {
                if (err.response.status === 404) {
                    return {}
                } else {
                    return Promise.reject(err.response)
                }
            })
            return data
        }))

        const queryString = mysql.format(`
            
            INSERT INTO db.contributors (id, checked_person, name, location, blog, email, bio)
            VALUES ${people.map((person={}, i) => {
                if (!person) return ''
                const { id, avatar_url, login } = contributors[i]
                const {name, location, blog, email, bio} = person
                return `(${id}, 1, ${mysql.escape(name)}, ${mysql.escape(location)}, ${mysql.escape(blog)}, ${mysql.escape(email)}, ${mysql.escape(remove_emoji(bio))})`
            })}
            ON DUPLICATE KEY UPDATE 
            checked_person = VALUES(checked_person),
            name = VALUES(name),
            location = VALUES(location),
            blog = VALUES(blog),
            email = VALUES(email),
            bio = VALUES(bio)

        `)
        await pool.query(queryString).catch(err => {
            debugger
            return Promise.reject(err)
        })

    }


})()