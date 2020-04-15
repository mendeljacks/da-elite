const express = require('express')
const app = express()
var mysql = require('promise-mysql');
const cors = require('cors')

const dbConfig = {
    connectionLimit: 20,
    host: '34.95.55.192',
    user: 'root',
    password: '123',
    multipleStatements: true,
    timezone: 'utc',
    dateStrings: 'date'
};
var pool = null;
(async () => {
    pool = await mysql.createPool(dbConfig)
    pool.on('connection', connection => {
        connection.on('enqueue', function (sequence) {
            if (sequence.sql) {
                console.log(sequence.sql.slice(0,1000))
            }

        })
    })
})()

app.use(cors())
app.get('/contributors', async function (req, res) {
    const [[{count}], contributors] = await pool.query(`
        select count(*) as count from db.contributors where checked_picture = 1;
        select * from db.contributors where checked_picture = 1
        limit ${req.query.limit || 10} offset ${req.query.offset || 0} 
    `)
    res.status(200).json({row_count: count, contributors})
})
app.get('/stats', async function (req, res) {
    const [response] = await pool.query(`
    select (select count(*) as stage_1 from db.packages) as 'npm packages',
    (select count(*) as stage_2 from db.packages where github_url is not null) as 'github urls',
    (select count(*) as stage_3 from db.packages where scraped_contributors = 1) as 'got contributors',
    (select count(*) from db.contributors) as 'contributor count',
    (select count(*) from db.package_has_contributors) as 'package has contributor count'
    `)
    res.status(200).json(response)
})
 
app.listen(4500, () => {console.log('listening on 4500')})