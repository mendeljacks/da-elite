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
app.use(express.json())
var criteria = `
WHERE checked_picture = 1 
and gender is not null
and checked_person = 1
and happy > 0.8
AND CHAR_LENGTH(blog) > 1
`
app.get('/shortlist', async function (req, res) {
    const [[{count}], contributors] = await pool.query(`
        select count(*) as count 
        from db.contributors 
        ${criteria}
        and ${req.query.human_approved === 'null' ? 'human_approved is null' : `human_approved = ${req.query.human_approved}`}
        ;

        select *, (
            select 
                group_concat(package_name separator ', ') 
            from db.package_has_contributors 
            inner join db.packages on db.packages.id = package_id
            where contributor_id = db.contributors.id 
            group by contributor_id
            ) as packages 
        from db.contributors 
        ${criteria}
        and ${req.query.human_approved === 'null' ? 'human_approved is null' : `human_approved = ${req.query.human_approved}`}
        order by happy desc
        limit ${req.query.limit || 10} offset ${req.query.offset || 0} 
    `)
    res.status(200).json({row_count: count, contributors})
})
app.get('/stats', async function (req, res) {
    const [response] = await pool.query(`
    select
    (select count(*) as stage from db.packages where github_url is not null) as 'found_packages',
    (select count(*) as stage from db.packages) as 'total_packages',
    (select count(*) as stage from db.packages where scraped_contributors = 1) as 'found_pop',
    (select count(*) from db.contributors) as 'total_people',
    (select count(*) as stage from db.contributors where checked_picture = 1) as 'checked_faces',
    (select count(*) as stage from db.contributors where checked_person = 1) as 'checked_people',
    (select count(*) as stage from db.contributors where checked_picture = 1 and checked_person = 1) as 'short_list_ready',
    (select count(*) as stage from db.contributors ${criteria}) as 'shortlisted_people'
    `)
    res.status(200).json(response)
})
app.patch('/notes', async function (req, res) {
    const human_contact_notes = req.body.note
    const id = req.body.id
    const response = await pool.query(`
    update db.contributors set human_contact_notes = ? where id = ?
    `,[human_contact_notes, id])
    res.status(200).json(response)
})
app.patch('/approve', async function (req, res) {
    const human_approved = req.body.human_approved
    const id = req.body.id
    const response = await pool.query(`
    update db.contributors set human_approved = ? where id = ?
    `,[human_approved, id])
    res.status(200).json(response)
})
 
app.listen(4500, () => {console.log('listening on 4500')})