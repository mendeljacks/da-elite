const names = require("all-the-package-names")
const axios = require('axios')
const puppeteer = require('puppeteer');
var mysql = require('promise-mysql');
function fib(n) {
    var a = 0, b = 1, c;
    if (n < 3) {
        if (n < 0) return fib(-n);
        if (n === 0) return 0;
        return 1;
    }
    while (--n)
        c = a + b, a = b, b = c;
    return c;
};
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
                console.log(sequence.sql)
            }

        })
    })

    const browser = await puppeteer.launch({ headless: false, args: ['--proxy-server=socks5://127.0.0.1:9050'] })
    // const [page] = await browser.pages()

    const [{ count }] = await pool.query(`
    select count(*) as count from db.packages where github_url is null
    `)
    const page_size = 1
    const page_count = Math.ceil(count / page_size)
    for (let page_number = 0; page_number < page_count; page_number++) {
        const packages = await pool.query(`
    select * from db.packages where github_url is null limit ${page_size} offset ${page_number * page_size}
        `)
        await Promise.all(packages.map(el => el.package_name).map(async package_name => {
            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(0); 
            page.setViewport({ width: 1280, height: 960 })
            const response = await page.goto(`https://www.npmjs.com/package/${package_name}`)
            var status = response._status
            // let n = 5
            // while (status === 429) {
            //     n = n+1
            //     const r2 = await page.reload()
            //     await new Promise(r => setTimeout(r, fib(n)));
            //     status = r2._status

            // }
            await page.waitForXPath('/html/body/div/div/div[1]/main/div[2]/div[3]', {timeout: 0})
            // await page.waitFor(1000)

            const github_url = await page.evaluate(() => {
                var xpath = '/html/body/div/div/div[1]/main/div[2]/div[3]';
                var xpath_deprecated = '/html/body/div/div/div[1]/main/div[2]/div[4]';

                function getElementByXpath(path) {
                    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                }

                var a = (getElementByXpath(xpath) || {})
                var b = (getElementByXpath(xpath_deprecated) || {})
                var children = (a.children||[]).length > (b.children||[]).length ? a.children : b.children
                var github_url = null
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    if (/github\.com\/[\s\S]+/.test(child.innerText)) {
                        if (/github\.com\/[\s\S]+/.test(child.childNodes[1].innerText)) {
                            child.childNodes[1].style.background = 'red'

                            github_url = child.childNodes[1].innerText
                        }
                    }
                }
                return github_url
            })
            await pool.query(`update db.packages set github_url = ? where package_name = ?`, [github_url||'', package_name])

            await page.close()
        })).catch(err => console.error(err))


    }

    await browser.close();
})()
