const express = require('express');
const app = express();
const session = require('express-session');
const bodyparser = require('body-parser');
const path = require('path');
const moment = require('moment');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const config = require('./config');
const util = require('./util');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.use('/static', express.static(path.join(__dirname, '/public')));
app.use(bodyparser.urlencoded({ extended: true }));
app.use(session({
    secret: 'note',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 10 * 60 * 1000
    }
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
    config.pool.query('SELECT * FROM notes', (err, rs) => {
        if (err) throw err;
        rs.rows.map((val, key) => {
            rs.rows[key].created_at = moment(val.created_at).format('DD/MM/YYYY HH:mm:ss');
        });
        res.render('index', { title: "Home", data: rs.rows, dataSESSION: req.session.passport });
    });
});

app.route('/signup')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            res.redirect('/admin');
        }
        else {
            res.render('signup', { title: "Signup Page", message: null, dataSESSION: req.session.passport });
        }
    })
    .post((req, res) => {
        var obj = {
            id: Date.now().toString(),
            username: req.body.username,
            password: req.body.password,
            re_password: req.body.re_password,
            created_at: moment().format('DD/MM/YYYY HH:mm:ss'),
            updated_at: null
        };
        if (req.body.rules) {
            if (obj.username || obj.password || obj.re_password) {
                if (!obj.username) {
                    res.render('signup', { title: "Signup Page", message: "Username empty!", dataSESSION: req.session.passport });
                }
                else if (!obj.password && !obj.re_password) {
                    res.render('signup', { title: "Signup Page", message: "Two password empty!", dataSESSION: req.session.passport });
                }
                else {
                    if (obj.password == obj.re_password) {
                        config.pool.query('SELECT username FROM members WHERE username=$1', [obj.username], (err, rs) => {
                            if (err) throw err;
                            if (rs.rows.length == 0) {
                                util.codePASSWORD(obj.password).then((rs, err) => {
                                    if (err) throw err;
                                    config.pool.query('INSERT INTO members VALUES ($1,$2,$3,$4,$5)', [obj.id, obj.username, rs, obj.created_at, null], (err) => {
                                        if (err) throw err;
                                        res.redirect('/signin');
                                    });
                                });
                            }
                            else {
                                res.render('signup', { title: "Signup Page", message: "Username existed!", dataSESSION: req.session.passport });
                            }
                        });
                    }
                    else if (obj.password != obj.re_password) {
                        res.render('signup', { title: "Signup Page", message: "Two password wrong!", dataSESSION: req.session.passport });
                    }
                    else {
                        if (!obj.password) {
                            res.render('signup', { title: "Signup Page", message: "Password empty!", dataSESSION: req.session.passport });
                        }
                        else {
                            if (!obj.re_password) {
                                res.render('signup', { title: "Signup Page", message: "Re-Password empty!", dataSESSION: req.session.passport });
                            }
                        }
                    }
                }
            }
            else {
                res.render('signup', { title: "Signup Page", message: "All empty!", dataSESSION: req.session.passport });
            }
        }
        else {
            res.render('signup', { title: "Signup Page", message: "Bạn chưa đồng ý các điều khoản của chúng tôi !", dataSESSION: req.session.passport });
        }
    });

app.route('/signin')
    .get((req, res, next) => { 
         
        if (req.isAuthenticated()) {
            // next();
            res.redirect('/admin');
        }
        else {
            res.render('signin', { title: "Signin Page", dataSESSION: req.session.passport });
        }
    })
    .post(passport.authenticate('local', { failureRedirect: '/signin', successRedirect: '/admin' }));

passport.use(new LocalStrategy(
    function (username, password, done) {
        if (!username || !password) {
            return done(null, false); // Username hoặc password để trống
        }
        else {
            config.pool.query('SELECT * FROM members WHERE username=$1', [username], (err, rs) => {
                if (err) return done(err);
                if (rs.rows.length != 0) {
                    try {
                        rs.rows.forEach(async (val) => {
                            let rs = await util.encodePASSWORD(password, val.password);
                            if (rs == true) {
                                var obj = {
                                    id: val.id,
                                    username: val.username
                                }
                                return done(null, obj); //Đúng mật khẩu
                            }
                            else {
                                return done(null, false); // Sai mật khẩu
                            }
                        });
                    } catch (error) {
                        console.log(error + '');
                        return done(null, false); // Hệ thống lỗi
                    }
                }
                else {
                    return done(null, false); // Không tồn tại username nào như nhập vào cả
                }
            });
        }
    }
));

passport.serializeUser((obj, done) => {
    return done(null, obj);
});

passport.deserializeUser((obj, done) => {
    config.pool.query('SELECT * FROM members WHERE id=$1', [obj.id], (err, rs) => {
        if (err) throw err;
        if (rs) {
            return done(null, true);
        }
        // else {
        //     return done(null, false);
        // }
    });
});

app.get('/admin', (req, res) => {
    if (req.isAuthenticated()) {
        checknote = async () => {
            let rs = await config.pool.query('SELECT * FROM notes WHERE member=$1',[req.session.passport.user.id]);
            if(rs.rows.length == 0){
                res.render('admin', { title: "Admin Page", dataSESSION: req.session.passport, data: 'Hiện tại, bạn chưa có ghi chú nào cả!' });
            }
            else{
                rs.rows.forEach((val) => {
                    val.appointment = moment(val.appointment).format('DD/MM/YYYY HH:mm:ss');
                    val.created_at = moment(val.created_at).format('DD/MM/YYYY HH:mm:ss');
                    val.updated_at = moment(val.updated_at).format('DD/MM/YYYY HH:mm:ss');
                });
                res.render('admin', { title: "Admin Page", dataSESSION: req.session.passport, data: rs.rows });
            }
        }
        checknote();
    }
    else {
        res.redirect('/signin');
    }
});

app.get('/signout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.get('/detail-note/:id', async (req, res) => {
    const { rows } = await config.pool.query('SELECT * FROM notes WHERE id=$1', [req.params.id]);
    rows[0].created_at = moment(rows[0].created_at).format('DD/MM/YYYY HH:mm:ss');
    res.render('detail-note', { title: "Detail Note", data: rows, dataSESSION: req.session.passport });
});

app.get('/delete/:id', async (req, res) => {
    if(req.isAuthenticated()){
        const rs = await config.pool.query('SELECT * FROM notes WHERE id=$1', [req.params.id]);
        if(rs.rows[0].member == req.session.passport.user.id){
            config.pool.query('DELETE FROM notes WHERE id=$1', [req.params.id], (err) => {
                if(err) throw err;
                res.redirect('/admin');
            });
        }
        else{
            res.redirect('/admin');
        }
    }
    else{
        res.redirect('/signin');
    }
});

app.get('/edit/:id', async (req, res) => {
    if(req.isAuthenticated()){
        const rs = await config.pool.query('SELECT * FROM notes WHERE id=$1', [req.params.id]);
        if(rs.rows[0].member == req.session.passport.user.id){
            res.render('edit', { title: "Edit Note", data: rows, dataSESSION: req.session.passport });
        }
        else{
            res.redirect('/admin');
        }
    }
    else{
        res.redirect('/signin');
    }
});

app.get('/auth/facebook', passport.authenticate('facebook', { authType: 'rerequest', scope: ['public_profile'] }));
app.get('/auth/facebook/cb', passport.authenticate('facebook', { failureRedirect: '/signin', successRedirect: '/admin', failWithError:true }));
passport.use(new FacebookStrategy({
    clientID: config.facebook.clientID,
    clientSecret: config.facebook.clientSecret,
    callbackURL: config.facebook.callbackURL,
    profileFields: ['id', 'displayName', 'photos', 'email'],
    passReqToCallback: true
},
    function (req, accessToken, refreshToken, profile, done) {
        var id = profile._json.id;
        var username = profile._json.name;
        // var password = null;
        var created_at = moment().format('DD/MM/YYYY HH:mm:ss');
        var avatar = profile._json.picture.data.url;
        util.codePASSWORD(id).then((res, er) => {
            if (er) return done(null, false);
            config.pool.query('SELECT * FROM members WHERE id=$1', [id], (err, rs) => {
                if (err) return done(null, false);
                if (rs.rows.length == 0) {
                    config.pool.query('INSERT INTO members(id,username,password,created_at,avatar) VALUES ($1,$2,$3,$4,$5)', [id, username, res, created_at, avatar], (err) => {
                        if (err) return done(null, false);
                        return done(null, {
                            id: id,
                            username: username,
                            avatar: avatar
                        });
                    });
                }
                else {
                    return done(null, {
                        id: rs.rows[0].id,
                        username: rs.rows[0].username,
                        avatar: rs.rows[0].avatar
                    });
                }
            });
        });
    }
));

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));
app.get('/auth/google/cb', passport.authenticate('google', { failureRedirect: '/signin' }), (req, res) => {
    res.redirect('/admin');
});
passport.use(new GoogleStrategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackURL
},
    (accessToken, refreshToken, profile, done) => {
        var id = profile._json.id;
        var username = profile._json.displayName;
        var password = profile._json.etag;
        var created_at = moment().format('DD/MM/YYYY HH:mm:ss');
        var avatar = profile._json.image.url;
        config.pool.query('SELECT * FROM members WHERE id=$1', [id], (err, rs) => {
            if (err) return done(null, false);
            if (rs.rows.length == 0) {
                config.pool.query('INSERT INTO members(id,username,password,created_at,avatar) VALUES ($1,$2,$3,$4,$5)', [id, username, password, created_at, avatar], (err) => {
                    if (err) return done(null, false);
                    return done(null, {
                        id: id,
                        username: username,
                        avatar: avatar
                    });
                });
            }
            else {
                return done(null, {
                    id: rs.rows[0].id,
                    username: rs.rows[0].username,
                    avatar: rs.rows[0].avatar
                });
            }
        });
    }
));

app.get('/auth/github', passport.authenticate('github'));
app.get('/auth/github/cb', passport.authenticate('github', { failureRedirect: '/signin' }), (req, res) => {
    res.redirect('/admin');
});
passport.use(new GitHubStrategy({
    clientID: config.github.clientID,
    clientSecret: config.github.clientSecret,
    callbackURL: config.github.callbackURL
},
    (accessToken, refreshToken, profile, done) => {
        var id = profile._json.id;
        var username = profile._json.login;
        var password = profile._json.node_id;
        var created_at = moment().format('DD/MM/YYYY HH:mm:ss');
        var avatar = profile._json.avatar_url;
        config.pool.query('SELECT * FROM members WHERE id=$1', [id], (err, rs) => {
            if (err) return done(null, false);
            if (rs.rows.length == 0) {
                config.pool.query('INSERT INTO members(id,username,password,created_at,avatar) VALUES ($1,$2,$3,$4,$5)', [id, username, password, created_at, avatar], (err) => {
                    if (err) return done(null, false);
                    return done(null, {
                        id: id,
                        username: username,
                        avatar: avatar
                    });
                });
            }
            else {
                return done(null, {
                    id: rs.rows[0].id,
                    username: rs.rows[0].username,
                    avatar: rs.rows[0].avatar
                });
            }
        });
    }
));

app.listen(3000, (err) => {
    if (err) throw err;
    console.log("SERVER RAN SUCCESSFULLY ON PORT 3000 !");
});