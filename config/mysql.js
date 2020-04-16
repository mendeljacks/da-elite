var mysql = require('promise-mysql')
const dbConfig = {
    connectionLimit: 20,
    host: '34.95.55.192',
    user: 'root',
    password: '123',
    multipleStatements: true,
    timezone: 'utc',
    dateStrings: 'date',
};
var pool = mysql.createPool(dbConfig)
pool.on('connection', connection => {
    connection.on('enqueue', function (sequence) {
        if (sequence.sql) {
           // console.log(sequence.sql.slice(0, 1000))
        }

    })
})
module.exports = pool