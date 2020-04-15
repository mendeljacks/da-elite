require('@tensorflow/tfjs-node')
const canvas = require('canvas');
const faceapi = require('face-api.js')
var mysql = require('promise-mysql');
const { Canvas, Image, ImageData } = canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const r4 = num => (num||0).toFixed(4)
const r0 = num => (num||0).toFixed(0)

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
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./weights')
    await faceapi.nets.faceExpressionNet.loadFromDisk('./weights')
    await faceapi.nets.ageGenderNet.loadFromDisk('./weights')

    let pool = await mysql.createPool(dbConfig)
    pool.on('connection', connection => {
        connection.on('enqueue', function (sequence) {
            if (sequence.sql) {
                console.log(sequence.sql.slice(0, 1000))
            }

        })
    })



    const [{ count }] = await pool.query(`
    SELECT count(*) as count FROM db.contributors where avatar_url is not null and checked_picture is null
    `)
    const page_size = 10
    const page_count = Math.ceil(count / page_size)
    for (let page_number = 0; page_number < page_count; page_number++) {
        console.log(page_number, page_count)

        const contributors = await pool.query(`
        SELECT id, avatar_url, login FROM db.contributors where avatar_url is not null and checked_picture is null
        limit ${page_size} offset ${page_number * page_size}
        `)

        const detections = await Promise.all(contributors.map(async contributor => {
            const { id, avatar_url, login } = contributor
            const img = await canvas.loadImage(avatar_url).catch(err => {
                console.error(`can't get avatar_url ${avatar_url}`, err)
                return Promise.reject(null)
            })

            const detection = await faceapi.detectSingleFace(img).withFaceExpressions().withAgeAndGender()
            return detection
        }))

        const queryString = mysql.format(`
            
            INSERT INTO db.contributors (id, checked_picture, gender, age, angry, disgusted, fearful, happy, neutral, sad, surprised)
            VALUES ${detections.map((detection={}, i) => {
                const { id, avatar_url, login } = contributors[i]
                const {age, gender, expressions: {angry, disgusted, fearful, happy, neutral, sad, surprised}={}} = detection
                return `(${id}, 1, ${mysql.escape(gender)}, ${r0(age)}, ${r4(angry)}, ${r4(disgusted)}, ${r4(fearful)}, ${r4(happy)}, ${r4(neutral)}, ${r4(sad)}, ${r4(surprised)})`
            })}
            ON DUPLICATE KEY UPDATE 
            checked_picture = VALUES(checked_picture),
            gender = VALUES(gender),
            age = VALUES(age),
            angry = VALUES(angry),
            disgusted = VALUES(disgusted),
            fearful = VALUES(fearful),
            happy = VALUES(happy),
            neutral = VALUES(neutral),
            sad = VALUES(sad),
            surprised = VALUES(surprised)

        `)
        await pool.query(queryString)

    }


})()