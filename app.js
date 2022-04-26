var express = require('express');
const session = require('express-session')
var app = express();
var path = require('path');
var mysql = require('mysql');
var bodyParser = require('body-parser');
require('dotenv').config();

const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

app.use('/public', express.static(__dirname + '/public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(
    session({
        secret: process.env.SESSION_SECRET, 
        name: process.env.SESSION_ENV, 
        saveUninitialized: false,
        resave: false
    })
)

var conn = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB
});

conn.connect((err) => {
    if (err) throw err;
})

var message = "";
var valid = "";

var obj = {};
app.get('/', (req, res) => {
        conn.query("SELECT movie_title, content, author, creation_time FROM posts ORDER BY creation_time DESC", function(err, result){
            if (err) throw err;
            else{
                console.log(result)

                obj = {print: result};
                res.render('index', {obj: obj, loggedIn: req.session.loggedIn});
            }
        })
});

// REGISTER: -----------------------------------------------------------
app.get('/register', (req, res) => {
    if(!req.session.loggedIn)
        res.render('register', { message: message, valid: valid, loggedIn: req.session.loggedIn });
    else{
        console.log("You have already registered.")         // look later
        res.redirect('/profile')
    }
})


app.post('/register', 
    body('username').trim().escape().isLength({min: 3}).withMessage('Name should have minimum 3'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
                    .matches('[0-9]').withMessage('Password must contain a number')
                    .matches('[A-Z]').withMessage('Password must contain an uppercase letter'),
    body('confirm_password'),
    (req, res) => {
        const errors = validationResult(req);
        if (req.body.password != req.body.confirm_password){
            let errorMessage = [{"value": "pass", "msg": "Passwords do not match", "param": 'confirm_password', "location": 'body'}]
            res.render('register',  {message: message, valid: errorMessage, loggedIn: req.session.loggedIn })
        }
        else{
            if (!errors.isEmpty()) {
                console.log(errors.array());
                res.render('register', { valid: errors.array(), message: message, loggedIn: req.session.loggedIn });           
            }else{
                bcrypt.hash(req.body.password, 12).then(function(hashpass) {
                    console.log(req.body.username, hashpass);
                    let sql = `INSERT INTO users (username, password) VALUES (?, ?)`;
                    conn.query(sql, [req.body.username, hashpass], function(err, result){
                        if(err){
                            let errorMessage = [{"value": req.body.username, "msg": "Username has already been used", "param": 'username', "location": 'body'}]
                            res.render('register',  {message: message, valid: errorMessage, loggedIn: req.session.loggedIn })
                        }
                        else{
                            console.log("one record has been inserted!"); 
                            let successMessage = "User is registered successfully"
                            res.render('login', {message: successMessage, valid: valid, loggedIn: req.session.loggedIn})
                        }
                    });
                });
            }
        }
    }
);


// LOGIN: -----------------------------------------------------------
app.get('/login', (req, res) => {
    if(!req.session.loggedIn)
        res.render('login', { message: message, valid: valid, loggedIn: req.session.loggedIn });
    else{
        console.log("You have already logged in.")         // look later
        res.redirect('/profile')
    }
})


app.post('/login', 
    body('username').notEmpty().withMessage("Username field cannot be empty"),
    body('password').notEmpty().withMessage("Password field cannot be empty"),   
    (req, res)=>{
        const errors = validationResult(req)
        if(!errors.isEmpty()){
            console.log(errors.array())
            res.render('login', {valid: errors.array(), message: message, loggedIn: req.session.loggedIn})
        }
        else{

            let sql = `SELECT password FROM users WHERE username = ?`
            
            conn.query(sql, [req.body.username], (err, result)=>{
                if(err) throw err;
                bcrypt.compare(req.body.password, result[0].password).then((result2)=>{
                    if(result2){
                        console.log("Successful login")
                        res.locals.username = req.body.username

                        req.session.loggedIn = true
                        req.session.username = res.locals.username
                        console.log(req.session)
                        
                        let successMessage = "Login successful"
                        res.render('profile', {message: successMessage, valid: valid, loggedIn: req.session.loggedIn})
                    }
                    else{
                        console.log("not successful")
                        res.render('login', {message: message, valid: "Credentials are not correct", loggedIn: req.session.loggedIn})
                    }
                })
            })
        }
    }
)

// PROFILE: -----------------------------------------------------------
app.get('/profile', (req, res) => {
    res.render('profile', { message: message, valid: valid, loggedIn: req.session.loggedIn});
})

// LOGOUT: -----------------------------------------------------------
app.get('/logout',(req, res)=>{
    req.session.destroy((err)=>{})
    // res.send('Thank you! Visit again')
    res.render('logout', {loggedIn: false})
})


// CREATE_POST: -----------------------------------------------------------
app.get('/create_post', (req, res) => {
    res.render('create_post', { message: message, valid: valid, loggedIn: req.session.loggedIn });
})


app.post('/create_post', 
    body('movie_title').trim().escape().notEmpty().withMessage('Movie Title cannot be empty'),
    body('content').trim().escape().notEmpty().withMessage('Content cannot be empty'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log(errors.array());
            res.render('create_post', { valid: errors.array(), message: message, loggedIn: req.session.loggedIn});           
        }else{
            console.log(req.body.movie_title, req.body.content);
            let sql = `INSERT INTO posts (movie_title, content, author) VALUES (?, ?, ?)`;
            conn.query(sql, [req.body.movie_title, req.body.content, req.session.username], function(err, result){
                if(err) throw err;
                console.log("one post has been inserted!"); 
                // let successMessage = "Post is added successfully"
                res.redirect('/');
            });
        }
    }
);

app.listen(process.env.PORT);
console.log("running server!");