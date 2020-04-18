// function roundround(array, index) {
//     index = index || 0;

//     return function () {
//         if (index >= array.length) index = 0;
//         return array[index++];
//     };
// };
// const tokens = ['4e7e29d28dbbfdf86596f8a70c9eb711f3a4def3','fdbea0b6be493ee6d11387ef649baaf70612fddd','b74f02e8042c763ebbb614d8b51ecdae124cb302']
// const next_token = roundround(tokens)
const axios = require('axios')
const stopcock = require('stopcock')
const ax_get = url => {
    // return axios.get(url, { headers: { 'Authorization': `token ${next_token()}` } }).catch(err => {
    return axios.get(url).catch(err => {

        if (err.response && err.response.status === 404) {
            return {}
        } else {
            return Promise.reject(err)
        }

    })
}
const get = stopcock(ax_get, { bucketSize: 1, limit: 200, interval: 1000 });
module.exports = { get }