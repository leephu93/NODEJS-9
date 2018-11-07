const bcrypt = require('bcrypt');

//Theo kiểu Callback
// codePASSWORD = (val,cb) => {
//     bcrypt.hash(val, 10, function (err, hash) {
//         return cb(err, hash);
//     });
// };
// codePASSWORD('hello', (err, rs) => {
//     if (err) throw err;
//     console.log(rs);
// });

module.exports = {
    codePASSWORD: (val) => {
        return new Promise((resolve, reject) => {
            bcrypt.hash(val, 10, function (err, hash) {
                if (err) reject(err);
                resolve(hash);
            });
        });
    },
    encodePASSWORD: (new_val, old_val) => {
        return new Promise((resolve, reject) => {
            bcrypt.compare(new_val, old_val, function (err, rs) {
                if (err) reject(err);
                resolve(rs); //Kết quả trả về true hoặc false
            });
        });
    }
}
