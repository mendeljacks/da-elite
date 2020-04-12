const names = require("all-the-package-names")
const axios = require('axios')
const puppeteer = require('puppeteer');
var mysql = require('promise-mysql');
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
                console.log("__________START QUERY__________")
                console.log(sequence.sql)
                console.log("__________END QUERY__________")
            }

        })
    })
    
    const browser = await puppeteer.launch({ headless: false })
    const [page] = await browser.pages()

    const [{count}] = await pool.query(`
        select count(*)as count from db.packages where github_url is null
    `)
    const chunk_size = 20
    const page_count = Math.ceil(count/chunk_size)
    for (let i = 0; i < page_count; i++) {
        const packages = await pool.query(`
            select * from db.packages where github_url is null limit ${chunk_size} offset ${i * chunk_size}
        `)


        
    }

 
 



    // const chunked = chunkArray(names, 100000)


    // for (let i = 0; i < chunked.length; i++) {
    //     console.log(`${i} / ${chunked.length} chunks completed`)
    //     const queryString = mysql.format(`
    //     INSERT INTO db.packages (package_name, github_url)
    //     VALUES ?
    //     ON DUPLICATE KEY UPDATE
    //     packages.package_name = VALUES(packages.package_name)
    //     `, [chunked[i].map(el => ([el, null]))])
    //     await mysql.createConnection(dbConfig).then(async connection => {
    //         await connection.query(queryString)
    //         await connection.destroy()
    //     })
    // }



    // for (let i = 0; i < names.length; i++) {
    //     const package_name = names[i];
    //     console.time(`package name ${package_name}`)

    //     const github_url = null
    //     // await page.goto(`https://www.npmjs.com/package/${package_name}`)
    //     // // await page.waitForXPath('/html/body/div/div/div[1]/main/div[2]/div[3]')
    //     // await page.waitFor(1000)
    //     // const github_url = await page.evaluate(() => {
    //     //     var xpath = '/html/body/div/div/div[1]/main/div[2]/div[3]';

    //     //     function getElementByXpath(path) {
    //     //         return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    //     //     }

    //     //     var a = (getElementByXpath(xpath) || {})
    //     //     var children = a.children
    //     //     var github_url = null
    //     //     for (let i = 0; i < children.length; i++) {
    //     //         const child = children[i];
    //     //         if (/github\.com\/[\s\S]+/.test(child.innerText)) {
    //     //             github_url = child.childNodes[1].innerText
    //     //         }    
    //     //     }
    //     //     return github_url
    //     // })



    //     // const url = github_url.replace(/^(github\.com)/, "https://api.github.com/repos") + '/contributors';
    //     // const { data } = await axios.get(url)


    //     console.timeEnd(`package name ${package_name}`)

    // }
    await browser.close();
})()

function chunkArray(myArray, chunk_size) {
    var results = [];

    while (myArray.length) {
        results.push(myArray.splice(0, chunk_size));
    }

    return results;
}
