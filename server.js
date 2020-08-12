var UserRegistry = require('./user-registry.js');
var UserSession = require('./user-session.js');
var config = require('./config/config');
const fileUpload = require('express-fileupload');
var crypto = require('crypto')
  , key = 'taylor_robinson';

var path = require('path');
var userRegistry = new UserRegistry();
var rooms = {};
var exec = require("child_process").exec;

var http = require('http');
var express = require('express');

var cheerio = require('cheerio');

var request = require('request')

const https = require('https');
const fs = require("fs");
var cookieParser = require('cookie-parser');

var app = express();

app.use(express.static('public'));
app.use(cookieParser());
app.use(function(req, response, next) {
  response.setHeader("Access-Control-Allow-Origin", "*");
response.setHeader("Access-Control-Allow-Credentials", "true");
response.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
response.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
  next();
});

var CallfireClient = require('callfire-api-client-js')
var callFireCredentials = new CallfireClient("92ac652696d9", "d597041cf1d27b90", "Text");

app.use(fileUpload({
    createParentPath: true,
    limits: { 
        fileSize: 5 * 1024 * 1024 * 1024 //2MB max file(s) size
    },
}));


// mongodb code start here

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// mongoose.connect('mongodb://localhost/trmcIE');

var enviourment =  process.env.NODE_ENV || 'prod';
console.log('enviourment',enviourment)

var mongoDB = config[enviourment].db;
mongoose.connect(mongoDB, {
  useMongoClient: true
});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.set('view engine', 'ejs');

var modelsPath = __dirname + '/models';
fs.readdirSync(modelsPath).forEach(function (file) {
  if (file.indexOf('.js') >= 0) {
    require(modelsPath + '/' + file);
  }
});


var  Video = mongoose.model('Video');
var  Tools = mongoose.model('Tools');
var  Roomname = mongoose.model('Roomname');
var  Metronome = mongoose.model('Metronome');
var  User = mongoose.model('User');
var  Session = mongoose.model('Session');

var nodemailer = require('nodemailer');

var appSMTP = {
  host:"smtp.gmail.com",
  port:465,
  auth: {
    user: "noreply@trmc-lessons.com",
    pass: "TRMC2360!"
  }
};
var smtpTransport = require('nodemailer').createTransport(require('nodemailer-smtp-transport')(appSMTP));

// mongodb code end here with node mailer

var stripe = require("stripe")(
 "sk_test_YffIre0bAcSdkJN7Q1f1tJho"
 //"sk_test_4MKLcieBGR4FJ7KEUId3ggIJ"
);

// upload Api
app.post('/upload', function(req, res) {
  try {
        if(!req.files) {
            res.status(400).send({
                status: false,
                message: 'No file uploaded'
            });
        } else {
            //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
            let file = req.files.file;
            const ext = path.extname(file.name);
            const fileName = `${Date.now()}${ext}`;
            const newFileName = `file-TRMC-${file.name}-${ fileName }`;

            //Use the mv() method to place the file in upload directory (i.e. "uploads")
            file.mv(`/usr/share/jitsi-meet/static/chatFiles/${fileName}`);

            //send response
            res.send({
                status: true,
                message: 'File is uploaded',
                data: {
                    name: newFileName,
                    mimetype: file.mimetype,
                    size: file.size
                }
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

const options = {
     key: fs.readFileSync('/etc/letsencrypt/live/web.oneclickwebcam.com/privkey.pem'),
     cert: fs.readFileSync('/etc/letsencrypt/live/web.oneclickwebcam.com/fullchain.pem'),
     ca: fs.readFileSync('/etc/letsencrypt/live/web.oneclickwebcam.com/chain.pem')
}

var bodyParser = require('body-parser');

app.use(bodyParser.json({limit:'2048mb'}));

app.use(bodyParser.urlencoded({ extended: true ,limit:'2048mb'}));

var serverPort = config[enviourment].port || 4000;

var secureServer =  https.createServer(options, app);

var io = require('socket.io')(secureServer);

secureServer.listen(serverPort, function () {
    console.log('server up and running at %s port and %s enviourment', serverPort, enviourment==='prod' ? "'Production'" : "'Development'");
});

const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// login API
app.post('/user_logged_in',function(req,res){

    if (!req.body.email || !req.body.email.trim()) {
        return res.json({"status":false,"msg": "Please enter valid username."})
    }

    if (!req.body.password || !req.body.password.trim()) {
        return res.json({"status":false,"msg": "Password is required field." })
    }

    var plaintext = req.body.password;
    var cipher = crypto.createCipher('aes-256-cbc', key);
    cipher.update(plaintext, 'utf8', 'base64');
    var encryptedPassword = cipher.final('base64')

    User.findOne({email:req.body.email , password:encryptedPassword}).exec(function(err,user){
        if(err){
            res.json({"status":false,"msg":err})
        }else if(user){
            if(req.body.remember==true || req.body.remember=='true'){
                var json = {};
                json.ip = req.body.ip;
                json.browser = req.body.browser;
                json.user = user._id;
                json.systemIp = req.body.systemIp;
                var session = new Session(json);
                session.save(function(error, newgroup) {
                    res.json({"status":true, "data":user})
                });
            }else{
                res.json({"status":true, "data":user})
            }
            //res.json({"status":true, "data":user})
        }else{
            res.json({"status":false,"msg":"Email Or Password didnt match."})
        }
    })
});
// Login API end here


// Register API
app.post('/register_user',function(req,res){
    if (!req.body.email || !req.body.email.trim() || !emailRegexp.test(req.body.email)) {
        return res.json({"status":false,"msg": "Please enter valid Email" })
    }
    if (!req.body.username || !req.body.username.trim()) {
        return res.json({"status":false,"msg": "Username is required field." })
    }
    if (!req.body.password || !req.body.password.trim()) {
        return res.json({"status":false,"msg": "Password is required field." })
    }

    User.findOne({email:req.body.email}).exec(function(err,user){
        if(err){
            res.json({"status":false,"msg":err})
        }else if(user){
            if(user.username==req.body.username){
                res.json({"status":false,"msg":"Username already exists."})
            }else{
                res.json({"status":false,"msg":"Email already exists."})
            }
        }else{
            var plaintext = req.body.password;
            var cipher = crypto.createCipher('aes-256-cbc', key);
            cipher.update(plaintext, 'utf8', 'base64');
            var encryptedPassword = cipher.final('base64')
            req.body.password = encryptedPassword
            var newUser = new User(req.body);
            newUser.save(function(error, newUser) {
                if(!error && newUser){
                    stripe.customers.create({
                      email:newUser.email
                    }, function(err, customer) {
                        if(!err && customer){
                            User.findOneAndUpdate({
                                _id: newUser._id
                            },{customer_Stripe_Id:customer.id}).exec(function(err, response) {
                                if (err) {
                                  res.json({"status":false,"msg":err})
                                } else {
                                    var json = {};
                                    json.ip = req.body.ip;
                                    json.browser = req.body.browser;
                                    json.user = newUser._id;
                                    json.systemIp = req.body.systemIp;
                                    var session = new Session(json);
                                    session.save(function(error, newSession) {
                                        res.cookie('userLogged', newUser, {maxAge : 9999});
                                        res.json({"status":true, "data":newUser})
                                    });
                                    
                                }
                            });
                        }
                    });
                }else{
                    res.json({"status":false,"msg":error})
                }
            });
        }
    })
});
// Register API end

// Logout API
app.post('/logout',function(req,res){
    Session.remove(req.body , function(err, removed){
        if(err){
            res.json({"status":false,"data":err});
        }else{
            res.json({"status":true,"data":removed});
        }
    })
})
// Logout API end


// forgot password
app.post('/forgotPassword', function (req, res) {
    if (!req.body.email || !emailRegexp.test(req.body.email)) {
        return res.json({"status":false,"msg":{ response: "Please enter valid Email." }})
    }

    User.findOne({email:req.body.email}).exec(function(err,user){
        if(err){
            res.json({"status":false,"msg":{ response: err }})
        }else if(user){
            var decipher = crypto.createDecipher('aes-256-cbc', key)
            decipher.update(user.password, 'base64', 'utf8');
            var decryptedPassword = decipher.final('utf8');
            var mailOptions = {
                to:req.body.email,
                //from: appSMTP.auth.user,
                from:'customerservice@taylorrobinsonmusic.com',
                cc:'customerservice@taylorrobinsonmusic.com',
                subject: 'Password Reset',
                html: '<p>Password : '+decryptedPassword+'</p>',
                tls : {rejectUnauthorized: false}, 
                strictSSL: false
            }; 
           
            smtpTransport.sendMail(mailOptions, function (err) {
                if (!err) {
                    res.json({"status":false,"msg": { response: "Mail sent to your registered email." }})
                } else {
                    res.json({"status":false,"msg":err})
                }
            });
        }else{
            res.json({"status":false,"msg": { response: "No account exist with this Email Id." }})
        }
    })
   
});
// end

app.get('/get_owner_Room/:room',function(req,res){
    var json = {};
    //json.adminIp = req.params.ip;
    json.groupName = req.params.room;
    Roomname.find(json).exec(function(err,result){
        if(err){
            res.json({"status":false,"msg":err})
        }else{
            res.json({"status":true,"data":result})
        }
    });
});

// getting the user session
app.get('/user_session/:browser/:ip/:systemIp/:room' , function(req,res){
    Session.findOne({ ip: req.params.ip, systemIp: req.params.systemIp }).exec(function(err , session){
        var json = {};
        //json.adminIp = req.params.ip;
        json.groupName = req.params.room;

        Roomname.find(json).exec(function(RoomErr,RoomResult){
            var isAdmin = false;
            var isOpenRoom = true;
            var isPasswordProtected = false;
            var isAlreadyPaid = false;

            if (RoomResult.length && RoomResult[0].paid) {
                isOpenRoom = false;
            }

            if (RoomResult.length && RoomResult[0].private) {
                isPasswordProtected = true;
            }

            if(err){
                res.json({"status":false,"msg":err, RoomResult, isAdmin, isOpenRoom, isPasswordProtected, isAlreadyPaid});
            } else if(session){
                User.findOne({_id:session.user}).exec(function(err,user){
                   if ( user && user.email && RoomResult.length) {

                        if (user.email === RoomResult[0].email && user.username === RoomResult[0].userName) {
                            isAdmin = true;
                        }

                        if (RoomResult[0].otherUsers && RoomResult[0].otherUsers.length && RoomResult[0].otherUsers.indexOf(user.username) !== -1) {
                            isAlreadyPaid = true;
                        }
                    }

                    if(err){
                        res.json({"status":false,"data":err, RoomResult, isAdmin, isOpenRoom, isPasswordProtected, isAlreadyPaid});
                    }else{
                        res.json({"status":true,"data":user, RoomResult, isAdmin, isOpenRoom, isPasswordProtected, isAlreadyPaid});
                    }
                })
            }else{
                res.json({"status":true,"data":session, RoomResult, isAdmin, isOpenRoom, isPasswordProtected, isAlreadyPaid});
            }
        });
    })
})

// get Explore rooms
app.get('/get_explore_rooms/:publish/:category/:private',function(req,res){
    var json = {};
    json.publish = req.params.publish;
    json.category = req.params.category;
    if(req.params.private!=="both"){
        json.private = req.params.private;
    }
    Roomname.find(json).sort({date: -1}).exec(function(err,result){
        if(err){
            res.json({"status":false,"msg":err})
        }else{
            res.json({"status":true, "data":result})
        }
    });
});

// Get my room
app.get('/get_my_rooms/:email/:category/:private',function(req,res){
    var json = {};
    json.category = req.params.category;
    json.email = req.params.email;
    if(req.params.private!=="both"){
        json.private = req.params.private;
    }
    Roomname.find(json).exec(function(err,result){
        if(err){
            res.json({"status":false,"msg":err})
        }else{
            res.json({"status":true, "data":result})
        }
    });
});

// create room owner
app.post('/create_owner_Room',function(req,res){
    Roomname.find({groupName:req.body.groupName}).exec(function(err , results){
        if(err){
            res.json({"status":false,"msg":err})
        }else{
            if(results.length){
                res.json({"status":false,"msg":"Room already exists."})
            }else{
                if((req.body.paid==true || req.body.paid=='true') && !req.body.alreadyAccount){
                    User.findOne({email:req.body.email}).exec(function(err,user){
                        if(user){
                            stripe.tokens.create({
                                bank_account: {
                                    country: 'US',
                                    currency: 'usd',
                                    account_holder_name: req.body.accountDetails.account_holder_name,
                                    routing_number: req.body.accountDetails.routing_number,
                                    account_number: req.body.accountDetails.account_number,
                                    //customer: user.customer_Stripe_Id
                                }
                            }, function(err, token) {
                                if(token){
                                    stripe.accounts.create({
                                      type: 'custom',
                                      country: 'US',
                                      email: req.body.email
                                    },function(err, account) {
                                        if(account){
                                            stripe.accounts.createExternalAccount(
                                                account.id,
                                                {external_account: token.id },
                                            function(err, bank_account) {
                                                if(bank_account){
                                                    var room = new Roomname(req.body);
                                                    room.save(function(error, newgroup) {
                                                        User.findOneAndUpdate({
                                                            _id: user._id
                                                        },{account_Stripe_Id:account.id}).exec(function(err, response) {
                                                            if (err) {
                                                              res.json({"status":false,"msg":err})
                                                            } else {
                                                                res.json({"status":true,"data":response})
                                                            }
                                                        });
                                                    })
                                                }else{
                                                    res.json({"status":false,"msg":err.message}) 
                                                }
                                            });
                                        }else{
                                            res.json({"status":false,"msg":err.message}) 
                                        }
                                    });
                                }else{
                                   res.json({"status":false,"msg":err.message}) 
                                }
                            });
                        }
                    })
                }else{
                    var room = new Roomname(req.body);
                    room.save(function(error, newgroup) {
                        res.json({"status":true,"data":newgroup})
                    })
                }
            }
        }
    })
});


app.put('/update_owner_Room',function(req,res){
    Roomname.findOne({groupName:req.body.groupName , email:req.body.email}).exec(function(err , results){
        if(err){
            res.json({"status":false,"msg":err})
        }else{
            if(results){
                Roomname.findOneAndUpdate({
                    _id: results._id
                },req.body).exec(function(err, response) {
                    if (err) {
                      res.json({"status":false,"msg":err})
                    } else {
                        res.json({"status":true, "data":response})
                    }
                });
            }else{
               res.json({"status":false,"msg":"No such Room exists"}) 
            }
        }
    })
});

// Join user in room
app.post('/join_user_in_Room',function(req,res){
    Roomname.find({groupName:req.body.groupName}).exec(function(err , results){
        if(err){
            res.json({"status":false,"msg":err})
        }else{
            if(results.length){
                var userArray = results[0].otherUsers;
                if(req.body.userName==results[0].userName){
                    res.json({"status":true,"msg":"user added."})
                } else {
                    userArray.push(req.body.userName)
                    if(req.body.password==results[0].password && results[0].private){
                        Roomname.findOneAndUpdate({
                            _id: results[0]._id
                        },{otherUsers:userArray}).exec(function(err, response) {
                            if (err) {
                              res.json({"status":false,"msg":err})
                            } else {
                                res.json({"status":true, "data":response})
                            }
                        });
                    }else if(!results[0].private){
                        Roomname.findOneAndUpdate({
                            _id: results[0]._id
                        },{otherUsers:userArray}).exec(function(err, response) {
                            if (err) {
                              res.json({"status":false,"msg":err})
                            } else {
                                res.json({"status":true, "data":response})
                            }
                        });
                    }else{
                        res.json({"status":false,"msg":"Password donot match"})
                    }
                }
            }else{
                res.json({"status":false,"msg":"No room exists with this name."})
            }
        }
    })
});

// payment with stripe
app.post('/join_user_in_paidRoom',function(req,res){
    var transactionArray = [];
    Roomname.findOne({groupName:req.body.groupName}).exec(function(err,results){
        if(err){
            res.json({"status":false,"msg":err})
        }else if(results){
            var userArray = results.otherUsers;
            transactionArray = results.transaction;
            if(userArray.includes(req.body.userName) || req.body.userName==results.userName){
                res.json({"status":false,"msg":"UserName already exists. Please try another name"})
            } else {
                userArray.push(req.body.userName);
                if(results.paid){
                    var one_day=1000*60*60*24;
                    var date1 = new Date(results.endDate);
                    var date2 = new Date(req.body.todayDate);

                    var date1_ms = date1.getTime();
                    var date2_ms = date2.getTime();

                    var difference_ms = date1_ms - date2_ms;
                    var diff = Math.round(difference_ms/one_day);
                    if(diff>=0){
                        if(results.private && req.body.password==results.password){
                            if(req.body.existingCard && req.body.cardId){
                                StripePaymentWithExistingCard(req,res,results,userArray,transactionArray);
                            }else{
                                StripePayment(req,res,results,userArray,transactionArray);
                            }
                        }else if(!results.private){
                            if(req.body.existingCard){
                                StripePaymentWithExistingCard(req,res,results,userArray,transactionArray);
                            }else{
                                StripePayment(req,res,results,userArray,transactionArray);
                            }
                        }else{
                            res.json({"status":false,"msg":"Password donot match"})
                        }  
                    }else{
                        res.json({"status":false,"msg":"This Room has been expired."})
                    }

                }else{
                    if(results.private && req.body.password==results.password){
                        Roomname.findOneAndUpdate({
                            _id: results._id
                        },{otherUsers:userArray}).exec(function(err, response) {
                            if (err) {
                              res.json({"status":false,"msg":err})
                            } else {
                                res.json({"status":true, "data":response})
                            }
                        });
                    }else if(!results.private){
                        Roomname.findOneAndUpdate({
                            _id: results._id
                        },{otherUsers:userArray}).exec(function(err, response) {
                            if (err) {
                              res.json({"status":false,"msg":err})
                            } else {
                                res.json({"status":true, "data":response})
                            }
                        });
                    }else{
                        res.json({"status":false,"msg":"Password donot match"})
                    } 
                }
            }
        }else{
            res.json({"status":false,"msg":"No room exists with this name."})
        }
    })
});

function StripePayment(req,res,results,userArray,transactionArray){
    User.findOne({email:req.body.email}).exec(function(err,user){
        if(err){
           res.json({"status":false,"msg":err}) 
        }else if(user && user.customer_Stripe_Id){
            stripe.tokens.create({
                card: {
                    "number": req.body.card_number,
                    "exp_month": parseInt(req.body.exp_month),
                    "exp_year":  parseInt(req.body.exp_year),
                    "cvc": req.body.cvc
                }
            }, function(err, token) {
                if(err){
                    res.json({"status":false,"msg":err.message}) 
                }else{
                    var amount = parseInt(results.roomAmount)*100;
                    var precentage = (2/100)*amount;
                    stripe.customers.createSource(user.customer_Stripe_Id, { source: token.id }, function (err, card) {
                        if (err) {
                            res.json({"status":false,"msg":err.message}) 
                        }else{
                            User.findOne({email:results.email}).exec(function(err,owner){
                                if(err){
                                   res.json({"status":false,"msg":err})  
                                }else if(owner && owner.account_Stripe_Id){
                                    stripe.charges.create({
                                        amount:amount,
                                        currency: "usd",
                                        customer: user.customer_Stripe_Id,
                                        destination: {
                                            amount: (amount-precentage),
                                            account: owner.account_Stripe_Id
                                        }
                                    }, function (err, charge) {
                                        if (err) {
                                            res.json({"status":false,"msg":err.message})  
                                        } else {
                                            var transJson = {};
                                            transJson.username = req.body.userName;
                                            transJson.transId = charge.id;
                                            transJson.email = req.body.email;
                                            transactionArray.push(transJson);
                                            Roomname.findOneAndUpdate({
                                                _id: results._id
                                            },{otherUsers:userArray ,transaction:transactionArray}).exec(function(err, response) {
                                                if (err) {
                                                    res.json({"status":false,"msg":err})
                                                } else {
                                                    res.json({"status":true, "data":response})
                                                }
                                            });
                                        }
                                    });
                                }else{
                                   res.json({"status":false,"msg":"Something went wrong"})  
                                }
                            })
                        }
                    });
                }
            });
        }else{
           res.json({"status":false,"msg":"Register your self to continue."})  
        }
    })
}

function StripePaymentWithExistingCard(req,res,results,userArray,transactionArray){
    User.findOne({email:req.body.email}).exec(function(err,user){
        if(err){
           res.json({"status":false,"msg":err}) 
        }else if(user && user.customer_Stripe_Id){
            var amount = parseInt(results.roomAmount)*100;
            var precentage = (2/100)*amount;
            User.findOne({email:results.email}).exec(function(err,owner){
                if(err){
                   res.json({"status":false,"msg":err})  
                }else if(owner && owner.account_Stripe_Id){
                    stripe.charges.create({
                        amount:amount,
                        currency: "usd",
                        customer: user.customer_Stripe_Id,
                        destination: {
                            amount: (amount-precentage),
                            account: owner.account_Stripe_Id
                        }
                    }, function (err, charge) {
                        if (err) {
                            res.json({"status":false,"msg":err.message})  
                        } else {
                            var transJson = {};
                            transJson.username = req.body.userName;
                            transJson.transId = charge.id;
                            transJson.email = req.body.email;
                            transactionArray.push(transJson);
                            Roomname.findOneAndUpdate({
                                _id: results._id
                            },{otherUsers:userArray ,transaction:transactionArray}).exec(function(err, response) {
                                if (err) {
                                    res.json({"status":false,"msg":err})
                                } else {
                                    res.json({"status":true, "data":response})
                                }
                            });
                        }
                    });
                }else{
                   res.json({"status":false,"msg":"Something went wrong"})  
                }
            })
        }else{
           res.json({"status":false,"msg":"Register your self to continue."})  
        }
    })
}

// get Room info 

app.get('/roomInfo/:room/:email', function(req,res){
    var json={};
    User.findOne({email:req.params.email}).exec(function(err,user){
        if(err){
            res.json({"status":false,"msg":err}); 
        }else if(user){
            json.user = user;
            Roomname.findOne({email:req.params.email , groupName:req.params.room}).exec(function(err,room){
                if(err){
                    res.json({"status":false,"msg":err}); 
                }else if(room){
                    json.room = room;
                    if(user.account_Stripe_Id){
                        stripe.accounts.retrieve(user.account_Stripe_Id, function(err, account) {
                            if(err){
                                res.json({"status":false,"msg":err});  
                            }else{
                                json.account = account;
                                res.json({"status":true,"data":json});  
                            }
                        });
                    }else{
                        res.json({"status":true,"data":json});
                    }
                }else{
                    res.json({"status":false,"msg":"No Room exists with this roomname."}); 
                }
            })
        }else{
            res.json({"status":false,"msg":"Please login to continue."});
        }
    })
});

// sending text message
app.post('/send_text_message' , function(req,res){
    // console.log('seidng message***********',req.body);
    Roomname.findOne({groupName:req.body.room}).exec(function(err,room){
        if(err){
            res.json({"status":false,"data":err});
        }else{
            // console.log('seidng room***********',room);
            var msg;
            if(room){
                if(room.private && !room.paid){
                    msg = "Join me for a video call. Must use a chrome browser.\n" +
                                "Url: "+req.body.url+ "\n" +
                                "Password: "+room.password;
                }else if(room.paid && !room.private){
                    msg = "Join me for a video call. Must use a chrome browser.\n" +
                                "Url: "+req.body.url+ "\n" +
                                "Entrance fee: "+room.roomAmount +'$';
                    
                }else if(room.private && room.paid){
                    msg = "Join me for a video call. Must use a chrome browser.\n" +
                                "Url: "+req.body.url+ "\n" +
                                "Password: "+room.password +"\n"+
                                "Entrance fee: "+room.roomAmount +'$';
                }else{
                    msg = "Join me for a video call. Must use a chrome browser.\n" +
                                 "Url: "+req.body.url +"\n" ;
                }

                
            }else{
                    msg = "Join me for a video call. Must use a chrome browser.\n" +
                                 "Url: "+req.body.url +"\n" ;
            }

            //sending the message
            callFireCredentials.ready(() => {
                    callFireCredentials.texts.createTextBroadcast({
                        body: {
                            name: 'TRMC Invitation to join in Room',
                            labels: [
                              'participant',
                              'Invitation'
                            ],
                            fromNumber: '9726199504',
                            recipients: [
                              {
                                phoneNumber: req.body.number,
                              },
                            ],
                            message: msg
                        }
                    })
                    .then((response) => {
                        var url = "https://www.callfire.com/v2/texts/broadcasts/"+response.obj.id+"/start"
                        var auth = 'Basic ' + Buffer.from("92ac652696d9" + ':' + "d597041cf1d27b90").toString('base64');
                        var authjson = {};
                        authjson.Authorization = auth
                        request.post({ url: url, headers: authjson }, function (e, r, body) {
                            console.log("body in message response",body);
                            res.json({"status":true,"data":response});
                        });
                    })
                    .catch((err) => {
                        console.log('request error ' + err);
                        res.json({"status":false,"data":err});
                    });
                },
                (clientError) => {
                    res.json({"status":false,"data":clientError});
                });
        }

    });
})

// send Email
app.post('/sendEmail', function (req, res) {
    Roomname.findOne({groupName:req.body.room}).exec(function(err,room){
        if(err){
            res.json({"status":false,"data":err});
        }else{
            if(room){

                var mailOptions = {
                    to:req.body.email,
                    //from: appSMTP.auth.user,
                    from:'customerservice@taylorrobinsonmusic.com',
                    cc:'customerservice@taylorrobinsonmusic.com',
                    subject: 'Join TRMC Webcam room',
                    html: '<p>Join me in the Taylor Robinson Music Webclassroom by clicking on the link below. (must use a Chrome browser)</p><a href="'+req.body.url+'">'+req.body.room+'</a> <p>Password:  '+room.password+'</p><br/><br/><br/><p>Please feel free to call or email our office with any questions or concerns.</p><p>Customer Service</p><p>Taylor Robinson Music</p><p>www.TaylorRobinsonMusic.com</p><p>CustomerService@TaylorRobinsonMusic.com</p><p>1 (877) I-TEACH-U ext 2</p><p>1 (877) 483-2248 ext 2</p>',
                    tls : {rejectUnauthorized: false}, 
                    strictSSL: false
                };
            }else{
               var mailOptions = {
                    to:req.body.email,
                    //from: appSMTP.auth.user,
                    from:'customerservice@taylorrobinsonmusic.com',
                    cc:'customerservice@taylorrobinsonmusic.com',
                    subject: 'Join TRMC Webcam room',
                    html: '<p>Join me in the Taylor Robinson Music Webclassroom by clicking on the link below. (must use a Chrome browser)</p><a href="'+req.body.url+'">'+req.body.room+'</a><br/><br/><br/><p>Please feel free to call or email our office with any questions or concerns.</p><p>Customer Service</p><p>Taylor Robinson Music</p><p>www.TaylorRobinsonMusic.com</p><p>CustomerService@TaylorRobinsonMusic.com</p><p>1 (877) I-TEACH-U ext 2</p><p>1 (877) 483-2248 ext 2</p>',
                    tls : {rejectUnauthorized: false}, 
                    strictSSL: false
                }; 
            }
            smtpTransport.sendMail(mailOptions, function (err) {
                if (!err) {
                    res.json({ 'status': "mail send" });
                } else {
                    res.json({ 'status': "error" });
                }
            });
        }
    }) 
});

function leaveRoom(sessionId, callback) {
    var userSession = userRegistry.getById(sessionId);

    if (!userSession) {
        return;
    }

    var room = rooms[userSession.roomName];

    var participantRoom = userSession.roomName;
    var participantName =  userSession.name;
    if(!room){
        return;
    }
    var usersInRoom = room.participants;
    delete usersInRoom[userSession.id];
    userSession.outgoingMedia.release();
    for (var i in userSession.incomingMedia) {
        userSession.incomingMedia[i].release();
        delete userSession.incomingMedia[i];
    }


    Roomname.findOne({groupName:participantRoom}).exec(function(err , results){
        if(!err && results){
            
            if(participantName !==results.userName){   

                //remove username from otherUser array    
                var userArray = results.otherUsers;
                var indexOfUser = userArray.indexOf(participantName);
                
                if(indexOfUser > -1){
                   userArray.splice(indexOfUser, 1); 
                }                
                            
                Roomname.findOneAndUpdate({
                    _id: results._id
                },{otherUsers:userArray}).exec(function(err, response) {
                    
                });
            }
        }
    })

    var data = {
        id: 'participantLeft',
        sessionId: userSession.id,
        room: participantRoom,
        name: participantName
    };
    for (var i in usersInRoom) {
        var user = usersInRoom[i];
        if(user.incomingMedia[userSession.id]){
            user.incomingMedia[userSession.id].release();
        }
        delete user.incomingMedia[userSession.id];
        user.sendMessage(data);
    }

    if (Object.keys(room.participants).length == 0) {
        room.pipeline.release();
        delete rooms[userSession.roomName];
    }
    delete userSession.roomName;
}

// socket code
io.on('connection', function (socket) {
    var userList = '';
    for (var userId in userRegistry.usersById) {
        userList += ' ' + userId + ',';
    }
    socket.emit('id', socket.id);

    socket.on('error', function (data) {
        leaveRoom(socket.id, function () {

        });
    });
    
    socket.on('disconnect', function (data) {
        leaveRoom(socket.id, function () {
            console.log('************************disconnect*****************************',socket.id);
            var userSession = userRegistry.getById(socket.id);
            stop(userSession.id);
        });
    });
    socket.on('manual_disconnect', function(data){
        console.log('------------------------',data)
        leaveRoom(data.id, function () {
            console.log('************************disconnect*****************************',socket.id);
            var userSession = userRegistry.getById(socket.id);
            stop(userSession.id);
        });
    });

    socket.on('join_explore_user', function(data){
        // console.log('********incomming*=================================================***********',data);
        socket.broadcast.emit('join_explore_user_resp', data);      
    });
    socket.on('showchat',function(data){
        socket.broadcast.emit('showchatdiv',data)
    })

    socket.on('domiantUrl',function(data){
        console.log('data', data);

        socket.broadcast.emit('domiantUrl_return',data)
    })

    socket.on('file_share',function(data){ 
        socket.broadcast.emit('file_share_broad',data)
    });

    socket.on('openTools',function(data){
        socket.sender=true;
        socket.type = data.openTool;
        socket.room= data.location;
        socket.emit('openTools_return',data);
    });

    socket.on('closetool',function(data){
        socket.broadcast.emit('closetool_return',data);
    });

    socket.on('openTools_fromtool',function(data){
        socket.sender=true;
        socket.type = data.openTool;
        socket.room= data.location;
        socket.broadcast.emit('openTools_return',data);
    });

    socket.on('guitar_tuner',function(data){
        socket.sender=true;
        socket.type = "guitar";
        socket.room=data.room;
        socket.broadcast.emit('guitar_tuner_return',data);
    });

    socket.on('disconnect_guitar',function(data){
        socket.broadcast.emit('disconnect_guitar_all',data)
    });

    socket.on('metronomestart',function(data){
        socket.sender = true;
        socket.type="metronome";
        socket.room = data.room;
        socket.broadcast.emit('metroreturn',data)
    })

    socket.on('disconnectmetronome',function(data){
        socket.broadcast.emit('disconnectmetronomeclient',data)
    })

    socket.on('voicepitch', function (data) {
        socket.room = data.room;
        socket.broadcast.emit('openTools_return',data);
        socket.broadcast.emit('voicereturn', data);
    });

    socket.on('disconnectvoicePitch', function (data) {
        socket.broadcast.emit('disconnectvoicePitchClient', data);
    });
    socket.on('send_chord_data', function (data) {
        socket.sender = true;
        socket.type="voice-chord";
        socket.room = data.room;
        socket.broadcast.emit('broadcast_chord_data', data);
    });

    socket.on('check_chord_user', function (data) {
        var query = { 'groupName': data.roomName, userName: data.userName };
        Tools.remove(query, function (err, success) {
          
        });
        socket.broadcast.emit('close_tools', data);
    });

    socket.on('hide_chord', function (data) {
        var query = { 'groupName': data.roomName, userName: data.userName };
        Tools.remove(query, function (err, success) {
        });
        socket.broadcast.emit('close_chord', data)
    });

    socket.on("show_fretboard_data", function (data) {
        if (data.isFretboardOpen === false) {
            var Tools1 = new Tools({
                groupName: data.roomName,
                userName: data.userName,
                showchord: false,
                showfret: true,
            });
            Tools1.save(function (error) {
            });
        }
        var string_data = data.data;
        exec(`php parse.php ${new Buffer(string_data).toString('base64')}`, function (error, stdout, stderr) {
            var $ = cheerio.load(stdout);

            data.html = $('.results').html();
            io.sockets.emit('show_fretboard_data', data);
        })
    });

    socket.on('show_fretboard', function (data) {
        socket.broadcast.emit('open_fretboard', data)
    });

    socket.on('hide_fretboard', function (data) {
        var query = { 'groupName': data.roomName, userName: data.userName };
        Tools.remove(query, function (err, success) {
        });
        socket.broadcast.emit('close_fretboard', data)
    });

    socket.on('textconversion' , function(data){
        socket.broadcast.emit('textconversionreturn', data);
    })

    socket.on('disconnectspeaker', function (data) {
        socket.broadcast.emit('disconnect_speakers', data)
    })

    socket.on('delete_owner_Room' , function(data){
        //Roomname.findOne({})
        Roomname.findOneAndRemove(data, function (err,room){
            if(!err){
                io.sockets.emit('deleteroom', room);
            }
        });
    });

    socket.on('roomClaimed' , function(data){
        socket.broadcast.emit('receiveRoomClaimed' , data)
    })
});
