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
const fcmNode = require('fcm-node');
const serverKey = 'AAAAq2V2RSQ:APA91bGMBw5lEQTlyOEfpRIUbBBj968itK8xq_2viNQRb__ikMuV4jBePPvb0a2VoQmmawcNPh96wBgEgzVse7y-vIwM_a0TXscMlllFnmUzPYeQYMqOAs2agFBOkaScx9Nr9nhB4jfI'; //put your server key here
const fcm = new fcmNode(serverKey);
var W3CWebSocket = require('websocket').w3cwebsocket;
var jwt = require('jsonwebtoken');
var cors = require('cors')
var app = express()
app.use(cors())
var ObjectID = require('mongodb').ObjectID;

app.use(express.static('public'));
app.use(cookieParser());
app.use(function (req, response, next) {
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

var enviourment = process.env.NODE_ENV || 'prod';
console.log('enviourment', enviourment)

var mongoDB = config[enviourment].db;
mongoose.connect(mongoDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
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


var Video = mongoose.model('Video');
var License = mongoose.model('License');
var Tools = mongoose.model('Tools');
var Roomname = mongoose.model('Roomname');
var Metronome = mongoose.model('Metronome');
var User = mongoose.model('User');
var Session = mongoose.model('Session');
var SorUsers = mongoose.model('SorUsers');
var SorRooms = mongoose.model('SorRooms');
var SorRoomParticipants = mongoose.model('SorRoomParticipants');
var SorMessages = mongoose.model('SorMessages');
var SorClasses = mongoose.model('SorClasses');

var nodemailer = require('nodemailer');

var appSMTP = {
    host: "smtp.gmail.com",
    port: 465,
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
app.post('/upload', function (req, res) {
    try {
        if (!req.files) {
            res.status(400).send({
                status: false,
                message: 'No file uploaded'
            });
        } else {
            //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
            let file = req.files.file;
            const ext = path.extname(file.name);
            const fileName = `${Date.now()}${ext}`;
            const newFileName = `file-TRMC-${file.name}-${fileName}`;

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
    key: fs.readFileSync('/etc/letsencrypt/live/live.realtimeaudio.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/live.realtimeaudio.com/fullchain.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/live.realtimeaudio.com/chain.pem')
    // key: fs.readFileSync('/home/mss/jitsi.staging02.com/private.key'),
    // cert: fs.readFileSync('/home/mss/jitsi.staging02.com/certificate.crt'),
    // ca: fs.readFileSync('/home/mss/jitsi.staging02.com/ca_bundle.crt')
}

var bodyParser = require('body-parser');
const { executionAsyncResource } = require('async_hooks');
// const { exec } = require('child_process');

app.use(bodyParser.json({ limit: '2048mb' }));

app.use(bodyParser.urlencoded({ extended: true, limit: '2048mb' }));

var serverPort = config[enviourment].port || 4000;

var secureServer = https.createServer(options, app);

// var secureServer =  http.createServer(app);

var io = require('socket.io')(secureServer);
// var ws = new W3CWebSocket('ws://localhost:8443');
var ws = new W3CWebSocket('wss://live.realtimeaudio.com:8443');

secureServer.listen(serverPort, function () {
    console.log('server up and running at %s port and %s enviourment', serverPort, enviourment === 'prod' ? "'Production'" : "'Development'");
});

const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// login API
app.post('/user_logged_in', function (req, res) {

    if (!req.body.email || !req.body.email.trim()) {
        return res.json({ "status": false, "msg": "Please enter valid username." })
    }

    if (!req.body.password || !req.body.password.trim()) {
        return res.json({ "status": false, "msg": "Password is required field." })
    }

    var plaintext = req.body.password;
    var cipher = crypto.createCipher('aes-256-cbc', key);
    cipher.update(plaintext, 'utf8', 'base64');
    var encryptedPassword = cipher.final('base64')

    User.findOne({ email: req.body.email, password: encryptedPassword }).exec(function (err, user) {
        if (err) {
            res.json({ "status": false, "msg": err })
        } else if (user) {
            if (req.body.remember == true || req.body.remember == 'true') {
                var json = {};
                json.ip = req.body.ip;
                json.browser = req.body.browser;
                json.user = user._id;
                json.systemIp = req.body.systemIp;
                var session = new Session(json);
                session.save(function (error, newgroup) {
                    res.json({ "status": true, "data": user })
                });
            } else {
                res.json({ "status": true, "data": user })
            }
            //res.json({"status":true, "data":user})
        } else {
            res.json({ "status": false, "msg": "Email Or Password didnt match." })
        }
    })
});
// Login API end here


// Register API
app.post('/register_user', function (req, res) {
    if (!req.body.email || !req.body.email.trim() || !emailRegexp.test(req.body.email)) {
        return res.json({ "status": false, "msg": "Please enter valid Email" })
    }
    if (!req.body.username || !req.body.username.trim()) {
        return res.json({ "status": false, "msg": "Username is required field." })
    }
    if (!req.body.password || !req.body.password.trim()) {
        return res.json({ "status": false, "msg": "Password is required field." })
    }

    User.findOne({ email: req.body.email }).exec(function (err, user) {
        if (err) {
            res.json({ "status": false, "msg": err })
        } else if (user) {
            if (user.username == req.body.username) {
                res.json({ "status": false, "msg": "Username already exists." })
            } else {
                res.json({ "status": false, "msg": "Email already exists." })
            }
        } else {
            var plaintext = req.body.password;
            var cipher = crypto.createCipher('aes-256-cbc', key);
            cipher.update(plaintext, 'utf8', 'base64');
            var encryptedPassword = cipher.final('base64')
            req.body.password = encryptedPassword
            var newUser = new User(req.body);
            newUser.save(function (error, newUser) {
                if (!error && newUser) {
                    stripe.customers.create({
                        email: newUser.email
                    }, function (err, customer) {
                        if (!err && customer) {
                            User.findOneAndUpdate({
                                _id: newUser._id
                            }, { customer_Stripe_Id: customer.id }).exec(function (err, response) {
                                if (err) {
                                    res.json({ "status": false, "msg": err })
                                } else {
                                    var json = {};
                                    json.ip = req.body.ip;
                                    json.browser = req.body.browser;
                                    json.user = newUser._id;
                                    json.systemIp = req.body.systemIp;
                                    var session = new Session(json);
                                    session.save(function (error, newSession) {
                                        res.cookie('userLogged', newUser, { maxAge: 9999 });
                                        res.json({ "status": true, "data": newUser })
                                    });

                                }
                            });
                        }
                    });
                } else {
                    res.json({ "status": false, "msg": error })
                }
            });
        }
    })
});
// Register API end

// Logout API
app.post('/logout', function (req, res) {
    Session.remove(req.body, function (err, removed) {
        if (err) {
            res.json({ "status": false, "data": err });
        } else {
            res.json({ "status": true, "data": removed });
        }
    })
})
// Logout API end

const getDateDifference = (enddate, currentdate) => {
    var date2 = new Date(enddate);

    // To calculate the time difference of two dates 
    var Difference_In_Time = date2.getTime() - currentdate.getTime();

    // To calculate the no. of days between two dates 
    var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);

    return Math.round(Difference_In_Days);
}

// checking software license
app.post('/checkLicense', function (req, res) {

    console.log("I am here");
    if (!req.body.license) {
        return res.json({ "status": false, "msg": { response: "Please enter valid License." } });
    }


    console.log('req.body.license', req.body.license);

    // find or create license
    License.findOne({
        macAddress: req.body.license
    }, function (err, license) {
        if (err) {
            return done(err);
        }
        if (!license) {
            var myDate = new Date();

            //add a day to the date
            myDate.setDate(myDate.getDate() + 30);

            var license = new License({
                macAddress: req.body.license,
                endDate: myDate,
                createdDate: new Date()
            });
            license.save(function (error, license) {
                const daysLeft = getDateDifference(license.endDate, new Date());

                return res.json({
                    "status": true, "data": {
                        id: license._id,
                        endDate: license.endDate,
                        expired: (license.endDate < new Date()) ? true : false,
                        daysLeft
                    }
                });
            });
        } else {
            const daysLeft = getDateDifference(license.endDate, new Date());

            return res.json({
                "status": true, "data": {
                    id: license._id,
                    endDate: license.endDate,
                    expired: (license.endDate < new Date()) ? true : false,
                    daysLeft
                }
            });
        }
    });
})
// End software License

// forgot password
app.post('/forgotPassword', function (req, res) {
    if (!req.body.email || !emailRegexp.test(req.body.email)) {
        return res.json({ "status": false, "msg": { response: "Please enter valid Email." } })
    }

    User.findOne({ email: req.body.email }).exec(function (err, user) {
        if (err) {
            res.json({ "status": false, "msg": { response: err } })
        } else if (user) {
            var decipher = crypto.createDecipher('aes-256-cbc', key)
            decipher.update(user.password, 'base64', 'utf8');
            var decryptedPassword = decipher.final('utf8');
            var mailOptions = {
                to: req.body.email,
                //from: appSMTP.auth.user,
                from: 'customerservice@taylorrobinsonmusic.com',
                cc: 'customerservice@taylorrobinsonmusic.com',
                subject: 'Password Reset',
                html: '<p>Password : ' + decryptedPassword + '</p>',
                tls: { rejectUnauthorized: false },
                strictSSL: false
            };

            smtpTransport.sendMail(mailOptions, function (err) {
                if (!err) {
                    res.json({ "status": false, "msg": { response: "Mail sent to your registered email." } })
                } else {
                    res.json({ "status": false, "msg": err })
                }
            });
        } else {
            res.json({ "status": false, "msg": { response: "No account exist with this Email Id." } })
        }
    })

});
// end

app.get('/get_owner_Room/:room', function (req, res) {
    var json = {};
    //json.adminIp = req.params.ip;
    json.groupName = req.params.room;
    Roomname.find(json).exec(function (err, result) {
        if (err) {
            res.json({ "status": false, "msg": err })
        } else {
            res.json({ "status": true, "data": result })
        }
    });
});

// getting the user session
app.get('/user_session/:browser/:ip/:systemIp/:room', function (req, res) {
    Session.findOne({ ip: req.params.ip, systemIp: req.params.systemIp }).exec(function (err, session) {
        var json = {};
        //json.adminIp = req.params.ip;
        json.groupName = req.params.room;

        Roomname.find(json).exec(function (RoomErr, RoomResult) {
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

            if (err) {
                res.json({ "status": false, "msg": err, RoomResult, isAdmin, isOpenRoom, isPasswordProtected, isAlreadyPaid });
            } else if (session) {
                User.findOne({ _id: session.user }).exec(function (err, user) {
                    if (user && user.email && RoomResult.length) {

                        if (user.email === RoomResult[0].email && user.username === RoomResult[0].userName) {
                            isAdmin = true;
                        }

                        if (RoomResult[0].otherUsers && RoomResult[0].otherUsers.length && RoomResult[0].otherUsers.indexOf(user.username) !== -1) {
                            isAlreadyPaid = true;
                        }
                    }

                    if (err) {
                        res.json({ "status": false, "data": err, RoomResult, isAdmin, isOpenRoom, isPasswordProtected, isAlreadyPaid });
                    } else {
                        res.json({ "status": true, "data": user, RoomResult, isAdmin, isOpenRoom, isPasswordProtected, isAlreadyPaid });
                    }
                })
            } else {
                res.json({ "status": true, "data": session, RoomResult, isAdmin, isOpenRoom, isPasswordProtected, isAlreadyPaid });
            }
        });
    })
})

// get Explore rooms
app.get('/get_explore_rooms/:publish/:category/:private', function (req, res) {
    var json = {};
    json.publish = req.params.publish;
    json.category = req.params.category;
    if (req.params.private !== "both") {
        json.private = req.params.private;
    }
    Roomname.find(json).sort({ date: -1 }).exec(function (err, result) {
        if (err) {
            res.json({ "status": false, "msg": err })
        } else {
            res.json({ "status": true, "data": result })
        }
    });
});

// Get my room
app.get('/get_my_rooms/:email/:category/:private', function (req, res) {
    var json = {};
    json.category = req.params.category;
    json.email = req.params.email;
    if (req.params.private !== "both") {
        json.private = req.params.private;
    }
    Roomname.find(json).exec(function (err, result) {
        if (err) {
            res.json({ "status": false, "msg": err })
        } else {
            res.json({ "status": true, "data": result })
        }
    });
});

// create room owner
app.post('/create_owner_Room', function (req, res) {
    Roomname.find({ groupName: req.body.groupName }).exec(function (err, results) {
        if (err) {
            res.json({ "status": false, "msg": err })
        } else {
            if (results.length) {
                res.json({ "status": false, "msg": "Room already exists." })
            } else {
                if ((req.body.paid == true || req.body.paid == 'true') && !req.body.alreadyAccount) {
                    User.findOne({ email: req.body.email }).exec(function (err, user) {
                        if (user) {
                            stripe.tokens.create({
                                bank_account: {
                                    country: 'US',
                                    currency: 'usd',
                                    account_holder_name: req.body.accountDetails.account_holder_name,
                                    routing_number: req.body.accountDetails.routing_number,
                                    account_number: req.body.accountDetails.account_number,
                                    //customer: user.customer_Stripe_Id
                                }
                            }, function (err, token) {
                                if (token) {
                                    stripe.accounts.create({
                                        type: 'custom',
                                        country: 'US',
                                        email: req.body.email
                                    }, function (err, account) {
                                        if (account) {
                                            stripe.accounts.createExternalAccount(
                                                account.id,
                                                { external_account: token.id },
                                                function (err, bank_account) {
                                                    if (bank_account) {
                                                        var room = new Roomname(req.body);
                                                        room.save(function (error, newgroup) {
                                                            User.findOneAndUpdate({
                                                                _id: user._id
                                                            }, { account_Stripe_Id: account.id }).exec(function (err, response) {
                                                                if (err) {
                                                                    res.json({ "status": false, "msg": err })
                                                                } else {
                                                                    res.json({ "status": true, "data": response })
                                                                }
                                                            });
                                                        })
                                                    } else {
                                                        res.json({ "status": false, "msg": err.message })
                                                    }
                                                });
                                        } else {
                                            res.json({ "status": false, "msg": err.message })
                                        }
                                    });
                                } else {
                                    res.json({ "status": false, "msg": err.message })
                                }
                            });
                        }
                    })
                } else {
                    var room = new Roomname(req.body);
                    room.save(function (error, newgroup) {
                        res.json({ "status": true, "data": newgroup })
                    })
                }
            }
        }
    })
});


app.put('/update_owner_Room', function (req, res) {
    Roomname.findOne({ groupName: req.body.groupName, email: req.body.email }).exec(function (err, results) {
        if (err) {
            res.json({ "status": false, "msg": err })
        } else {
            if (results) {
                Roomname.findOneAndUpdate({
                    _id: results._id
                }, req.body).exec(function (err, response) {
                    if (err) {
                        res.json({ "status": false, "msg": err })
                    } else {
                        res.json({ "status": true, "data": response })
                    }
                });
            } else {
                res.json({ "status": false, "msg": "No such Room exists" })
            }
        }
    })
});

// Join user in room
app.post('/join_user_in_Room', function (req, res) {
    Roomname.find({ groupName: req.body.groupName }).exec(function (err, results) {
        if (err) {
            res.json({ "status": false, "msg": err })
        } else {
            if (results.length) {
                var userArray = results[0].otherUsers;
                if (req.body.userName == results[0].userName) {
                    res.json({ "status": true, "msg": "user added." })
                } else {
                    userArray.push(req.body.userName)
                    if (req.body.password == results[0].password && results[0].private) {
                        Roomname.findOneAndUpdate({
                            _id: results[0]._id
                        }, { otherUsers: userArray }).exec(function (err, response) {
                            if (err) {
                                res.json({ "status": false, "msg": err })
                            } else {
                                res.json({ "status": true, "data": response })
                            }
                        });
                    } else if (!results[0].private) {
                        Roomname.findOneAndUpdate({
                            _id: results[0]._id
                        }, { otherUsers: userArray }).exec(function (err, response) {
                            if (err) {
                                res.json({ "status": false, "msg": err })
                            } else {
                                res.json({ "status": true, "data": response })
                            }
                        });
                    } else {
                        res.json({ "status": false, "msg": "Password donot match" })
                    }
                }
            } else {
                res.json({ "status": false, "msg": "No room exists with this name." })
            }
        }
    })
});

// payment with stripe
app.post('/join_user_in_paidRoom', function (req, res) {
    var transactionArray = [];
    Roomname.findOne({ groupName: req.body.groupName }).exec(function (err, results) {
        if (err) {
            res.json({ "status": false, "msg": err })
        } else if (results) {
            var userArray = results.otherUsers;
            transactionArray = results.transaction;
            if (userArray.includes(req.body.userName) || req.body.userName == results.userName) {
                res.json({ "status": false, "msg": "UserName already exists. Please try another name" })
            } else {
                userArray.push(req.body.userName);
                if (results.paid) {
                    var one_day = 1000 * 60 * 60 * 24;
                    var date1 = new Date(results.endDate);
                    var date2 = new Date(req.body.todayDate);

                    var date1_ms = date1.getTime();
                    var date2_ms = date2.getTime();

                    var difference_ms = date1_ms - date2_ms;
                    var diff = Math.round(difference_ms / one_day);
                    if (diff >= 0) {
                        if (results.private && req.body.password == results.password) {
                            if (req.body.existingCard && req.body.cardId) {
                                StripePaymentWithExistingCard(req, res, results, userArray, transactionArray);
                            } else {
                                StripePayment(req, res, results, userArray, transactionArray);
                            }
                        } else if (!results.private) {
                            if (req.body.existingCard) {
                                StripePaymentWithExistingCard(req, res, results, userArray, transactionArray);
                            } else {
                                StripePayment(req, res, results, userArray, transactionArray);
                            }
                        } else {
                            res.json({ "status": false, "msg": "Password donot match" })
                        }
                    } else {
                        res.json({ "status": false, "msg": "This Room has been expired." })
                    }

                } else {
                    if (results.private && req.body.password == results.password) {
                        Roomname.findOneAndUpdate({
                            _id: results._id
                        }, { otherUsers: userArray }).exec(function (err, response) {
                            if (err) {
                                res.json({ "status": false, "msg": err })
                            } else {
                                res.json({ "status": true, "data": response })
                            }
                        });
                    } else if (!results.private) {
                        Roomname.findOneAndUpdate({
                            _id: results._id
                        }, { otherUsers: userArray }).exec(function (err, response) {
                            if (err) {
                                res.json({ "status": false, "msg": err })
                            } else {
                                res.json({ "status": true, "data": response })
                            }
                        });
                    } else {
                        res.json({ "status": false, "msg": "Password donot match" })
                    }
                }
            }
        } else {
            res.json({ "status": false, "msg": "No room exists with this name." })
        }
    })
});

function StripePayment(req, res, results, userArray, transactionArray) {
    User.findOne({ email: req.body.email }).exec(function (err, user) {
        if (err) {
            res.json({ "status": false, "msg": err })
        } else if (user && user.customer_Stripe_Id) {
            stripe.tokens.create({
                card: {
                    "number": req.body.card_number,
                    "exp_month": parseInt(req.body.exp_month),
                    "exp_year": parseInt(req.body.exp_year),
                    "cvc": req.body.cvc
                }
            }, function (err, token) {
                if (err) {
                    res.json({ "status": false, "msg": err.message })
                } else {
                    var amount = parseInt(results.roomAmount) * 100;
                    var precentage = (2 / 100) * amount;
                    stripe.customers.createSource(user.customer_Stripe_Id, { source: token.id }, function (err, card) {
                        if (err) {
                            res.json({ "status": false, "msg": err.message })
                        } else {
                            User.findOne({ email: results.email }).exec(function (err, owner) {
                                if (err) {
                                    res.json({ "status": false, "msg": err })
                                } else if (owner && owner.account_Stripe_Id) {
                                    stripe.charges.create({
                                        amount: amount,
                                        currency: "usd",
                                        customer: user.customer_Stripe_Id,
                                        destination: {
                                            amount: (amount - precentage),
                                            account: owner.account_Stripe_Id
                                        }
                                    }, function (err, charge) {
                                        if (err) {
                                            res.json({ "status": false, "msg": err.message })
                                        } else {
                                            var transJson = {};
                                            transJson.username = req.body.userName;
                                            transJson.transId = charge.id;
                                            transJson.email = req.body.email;
                                            transactionArray.push(transJson);
                                            Roomname.findOneAndUpdate({
                                                _id: results._id
                                            }, { otherUsers: userArray, transaction: transactionArray }).exec(function (err, response) {
                                                if (err) {
                                                    res.json({ "status": false, "msg": err })
                                                } else {
                                                    res.json({ "status": true, "data": response })
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    res.json({ "status": false, "msg": "Something went wrong" })
                                }
                            })
                        }
                    });
                }
            });
        } else {
            res.json({ "status": false, "msg": "Register your self to continue." })
        }
    })
}

function StripePaymentWithExistingCard(req, res, results, userArray, transactionArray) {
    User.findOne({ email: req.body.email }).exec(function (err, user) {
        if (err) {
            res.json({ "status": false, "msg": err })
        } else if (user && user.customer_Stripe_Id) {
            var amount = parseInt(results.roomAmount) * 100;
            var precentage = (2 / 100) * amount;
            User.findOne({ email: results.email }).exec(function (err, owner) {
                if (err) {
                    res.json({ "status": false, "msg": err })
                } else if (owner && owner.account_Stripe_Id) {
                    stripe.charges.create({
                        amount: amount,
                        currency: "usd",
                        customer: user.customer_Stripe_Id,
                        destination: {
                            amount: (amount - precentage),
                            account: owner.account_Stripe_Id
                        }
                    }, function (err, charge) {
                        if (err) {
                            res.json({ "status": false, "msg": err.message })
                        } else {
                            var transJson = {};
                            transJson.username = req.body.userName;
                            transJson.transId = charge.id;
                            transJson.email = req.body.email;
                            transactionArray.push(transJson);
                            Roomname.findOneAndUpdate({
                                _id: results._id
                            }, { otherUsers: userArray, transaction: transactionArray }).exec(function (err, response) {
                                if (err) {
                                    res.json({ "status": false, "msg": err })
                                } else {
                                    res.json({ "status": true, "data": response })
                                }
                            });
                        }
                    });
                } else {
                    res.json({ "status": false, "msg": "Something went wrong" })
                }
            })
        } else {
            res.json({ "status": false, "msg": "Register your self to continue." })
        }
    })
}

// get Room info 

app.get('/roomInfo/:room/:email', function (req, res) {
    var json = {};
    User.findOne({ email: req.params.email }).exec(function (err, user) {
        if (err) {
            res.json({ "status": false, "msg": err });
        } else if (user) {
            json.user = user;
            Roomname.findOne({ email: req.params.email, groupName: req.params.room }).exec(function (err, room) {
                if (err) {
                    res.json({ "status": false, "msg": err });
                } else if (room) {
                    json.room = room;
                    if (user.account_Stripe_Id) {
                        stripe.accounts.retrieve(user.account_Stripe_Id, function (err, account) {
                            if (err) {
                                res.json({ "status": false, "msg": err });
                            } else {
                                json.account = account;
                                res.json({ "status": true, "data": json });
                            }
                        });
                    } else {
                        res.json({ "status": true, "data": json });
                    }
                } else {
                    res.json({ "status": false, "msg": "No Room exists with this roomname." });
                }
            })
        } else {
            res.json({ "status": false, "msg": "Please login to continue." });
        }
    })
});

// sending text message
app.post('/send_text_message', function (req, res) {
    // console.log('seidng message***********',req.body);
    Roomname.findOne({ groupName: req.body.room }).exec(function (err, room) {
        if (err) {
            res.json({ "status": false, "data": err });
        } else {
            // console.log('seidng room***********',room);
            var msg;
            if (room) {
                if (room.private && !room.paid) {
                    msg = "Join me for a video call. Must use a chrome browser.\n" +
                        "Url: " + req.body.url + "\n" +
                        "Password: " + room.password;
                } else if (room.paid && !room.private) {
                    msg = "Join me for a video call. Must use a chrome browser.\n" +
                        "Url: " + req.body.url + "\n" +
                        "Entrance fee: " + room.roomAmount + '$';

                } else if (room.private && room.paid) {
                    msg = "Join me for a video call. Must use a chrome browser.\n" +
                        "Url: " + req.body.url + "\n" +
                        "Password: " + room.password + "\n" +
                        "Entrance fee: " + room.roomAmount + '$';
                } else {
                    msg = "Join me for a video call. Must use a chrome browser.\n" +
                        "Url: " + req.body.url + "\n";
                }


            } else {
                msg = "Join me for a video call. Must use a chrome browser.\n" +
                    "Url: " + req.body.url + "\n";
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
                        var url = "https://www.callfire.com/v2/texts/broadcasts/" + response.obj.id + "/start"
                        var auth = 'Basic ' + Buffer.from("92ac652696d9" + ':' + "d597041cf1d27b90").toString('base64');
                        var authjson = {};
                        authjson.Authorization = auth
                        request.post({ url: url, headers: authjson }, function (e, r, body) {
                            console.log("body in message response", body);
                            res.json({ "status": true, "data": response });
                        });
                    })
                    .catch((err) => {
                        console.log('request error ' + err);
                        res.json({ "status": false, "data": err });
                    });
            },
                (clientError) => {
                    res.json({ "status": false, "data": clientError });
                });
        }

    });
})

// send Email
app.post('/sendEmail', function (req, res) {
    Roomname.findOne({ groupName: req.body.room }).exec(function (err, room) {
        if (err) {
            res.json({ "status": false, "data": err });
        } else {
            if (room) {

                var mailOptions = {
                    to: req.body.email,
                    //from: appSMTP.auth.user,
                    from: 'customerservice@taylorrobinsonmusic.com',
                    cc: 'customerservice@taylorrobinsonmusic.com',
                    subject: 'Join TRMC Webcam room',
                    html: '<p>Join me in the Taylor Robinson Music Webclassroom by clicking on the link below. (must use a Chrome browser)</p><a href="' + req.body.url + '">' + req.body.room + '</a> <p>Password:  ' + room.password + '</p><br/><br/><br/><p>Please feel free to call or email our office with any questions or concerns.</p><p>Customer Service</p><p>Taylor Robinson Music</p><p>www.TaylorRobinsonMusic.com</p><p>CustomerService@TaylorRobinsonMusic.com</p><p>1 (877) I-TEACH-U ext 2</p><p>1 (877) 483-2248 ext 2</p>',
                    tls: { rejectUnauthorized: false },
                    strictSSL: false
                };
            } else {
                var mailOptions = {
                    to: req.body.email,
                    //from: appSMTP.auth.user,
                    from: 'customerservice@taylorrobinsonmusic.com',
                    cc: 'customerservice@taylorrobinsonmusic.com',
                    subject: 'Join TRMC Webcam room',
                    html: '<p>Join me in the Taylor Robinson Music Webclassroom by clicking on the link below. (must use a Chrome browser)</p><a href="' + req.body.url + '">' + req.body.room + '</a><br/><br/><br/><p>Please feel free to call or email our office with any questions or concerns.</p><p>Customer Service</p><p>Taylor Robinson Music</p><p>www.TaylorRobinsonMusic.com</p><p>CustomerService@TaylorRobinsonMusic.com</p><p>1 (877) I-TEACH-U ext 2</p><p>1 (877) 483-2248 ext 2</p>',
                    tls: { rejectUnauthorized: false },
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
    var participantName = userSession.name;
    if (!room) {
        return;
    }
    var usersInRoom = room.participants;
    delete usersInRoom[userSession.id];
    userSession.outgoingMedia.release();
    for (var i in userSession.incomingMedia) {
        userSession.incomingMedia[i].release();
        delete userSession.incomingMedia[i];
    }


    Roomname.findOne({ groupName: participantRoom }).exec(function (err, results) {
        if (!err && results) {

            if (participantName !== results.userName) {

                //remove username from otherUser array    
                var userArray = results.otherUsers;
                var indexOfUser = userArray.indexOf(participantName);

                if (indexOfUser > -1) {
                    userArray.splice(indexOfUser, 1);
                }

                Roomname.findOneAndUpdate({
                    _id: results._id
                }, { otherUsers: userArray }).exec(function (err, response) {

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
        if (user.incomingMedia[userSession.id]) {
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

app.get('/ipList', function (req, res) {

    var result = ["151.139.47.25", "151.139.43.8", "151.139.51.11", "151.139.51.11", "151.139.71.11", "151.139.55.27", "151.139.31.16", "151.139.55.40", "151.139.55.31", "151.139.55.8", "151.139.124.1", "204.16.245.209", "23.146.144.11", "151.139.31.47", "34.106.81.216", "3.22.180.157", "35.174.212.160", "151.139.55.29", "151.139.191.63", "151.139.63.61", "151.139.51.90", "151.139.47.70", "44.236.95.215", "151.139.43.33", "151.139.71.6", "184.169.240.22"];
    let response = {
        data: result
    };
    res.status(200).send(response);
});

// socket code
io.on('connection', function (socket) {
    console.log("connected")
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
        console.log('************************disconnect******event*****************************', socket.id);
        leaveRoom(socket.id, function () {
            console.log('************************disconnect*****************************', socket.id);
            var userSession = userRegistry.getById(socket.id);
            stop(userSession.id);
        });
        // leave room sor on socket disconnect
        if (socket.sorRoom) {
            SorRooms.findOne({ name: socket.sorRoom, school_id: socket.schoolId }).lean().exec(function (err, sorRoom) {
                if (sorRoom) {
                    SorClasses.findOne({ room_id: new ObjectID(sorRoom._id), completed_at: null }).lean().exec(function (err, sorClass) {
                        if (sorClass) {
                            if (sorClass.teacher_id == socket.sorUserId) {
                                SorRoomParticipants.updateMany({
                                    class_id: new ObjectID(sorClass._id),
                                    room_id: new ObjectID(sorRoom._id),
                                    left_at: null
                                }, {
                                    left_at: new Date()
                                }).exec();

                                SorClasses.updateOne({
                                    _id: new ObjectID(sorClass._id)
                                }, {
                                    completed_at: new Date()
                                }).exec();
                                io.emit('teacher_disconnected', { roomname: socket.sorRoom })
                            } else {

                                getUserId(socket.sorUserId, socket.sorRoom, function (result) {
                                    // Room exist  update room participant left at
                                    SorRoomParticipants.updateMany({
                                        // class_id: new ObjectID(sorClass._id),
                                        room_id: new ObjectID(sorRoom._id),
                                        user_id: result,          //fxn for getting id
                                        left_at: null
                                    }, {
                                        left_at: new Date()
                                    }).exec();
                                });
                            }
                        }
                    })

                }
            });
        }
    });
    socket.on('manual_disconnect', function (data) {
        console.log('------------------------', data)
        leaveRoom(data.id, function () {
            console.log('************************disconnect*****************************', socket.id);
            var userSession = userRegistry.getById(socket.id);
            stop(userSession.id);
        });
    });

    //event to store sor data in socket to handle leaveRoom on socket disconnect
    socket.on('sor_data', function (data) {
        socket.sorRoom = data.sorRoom;
        socket.sorUserId = data.sorUserId;
        socket.student = data.student;
        socket.teacher = data.teacher;
        socket.jitsiUserId = data.jitsiUserId;
        socket.schoolId = data.schoolId;
        var response = [
            {
                userId: data.sorUserId,
                role: data.student == true ? 2 : 1,             // 1 - teacher, 2 - student
                jitsiUserId: data.jitsiUserId,
                secondaryModerator: false,
                isTeacher: false
            }
        ]
        SorRooms.findOne({ name: data.sorRoom, school_id: socket.schoolId }).lean().exec(async (err, result) => {
            if (result) {
                SorClasses.findOne({ room_id: new ObjectID(result._id), completed_at: null }).lean().exec(async (err, sorClass) => {
                    if (sorClass) {
                        SorRoomParticipants.find({
                            class_id: new ObjectID(sorClass._id),
                            room_id: new ObjectID(result._id),
                            left_at: null
                        }).lean().exec(async (err, sessions) => {
                            if (sessions.length > 0) {
                                await Promise.all(sessions.map(async (x) => {
                                    var user = await SorUsers.findById(x.user_id);
                                    if (user.id != data.sorUserId) {
                                        var obj = {
                                            userId: user.id,
                                            role: user.student == true ? 2 : 1,
                                            jitsiUserId: user.jitsi_user_id,
                                            secondaryModerator: x.secondary_moderator,
                                            isTeacher: false
                                        }
                                        if (user.id == sorClass.teacher_id) {
                                            obj.isTeacher = true
                                        }
                                        await response.push(obj);
                                    }
                                })).then(() => {
                                    io.emit('sor_data_return', { sorRoom: data.sorRoom, users: response })
                                });
                            } else {
                                response[0].isTeacher = true;
                                io.emit('sor_data_return', { sorRoom: data.sorRoom, users: response })
                            }
                        })
                    } else {
                        response[0].isTeacher = true;
                        io.emit('sor_data_return', { sorRoom: data.sorRoom, users: response })
                    }
                })

            } else {
                response[0].isTeacher = true;
                io.emit('sor_data_return', { sorRoom: data.sorRoom, users: response })
            }
        })
    });

    //secondary moderator
    socket.on('secondary_moderator', async (data) => {
        var response = [];
        if (data.sorRoom) {
            SorRooms.findOne({ name: data.sorRoom, school_id: data.schoolId }).lean().exec(async (err, result) => {
                if (result) {
                    SorClasses.findOne({ room_id: new ObjectID(result._id), completed_at: null }).lean().exec(async (err, sorClass) => {
                        if (sorClass) {
                            await SorUsers.findOne({ jitsi_user_id: data.jitsiUserId, oneclick_room_id: data.sorRoom }).exec(async (err, user) => {
                                // Room exist  update secondary moderator true
                                await SorRoomParticipants.updateOne({
                                    class_id: new ObjectID(sorClass._id),
                                    room_id: new ObjectID(result._id),
                                    user_id: new ObjectID(user._id),              //fxn for getting id
                                    left_at: null,
                                    secondary_moderator: false
                                }, {
                                    secondary_moderator: true
                                }).exec(async (err, resdata) => {
                                    if (!err) {
                                        SorRoomParticipants.find({
                                            class_id: new ObjectID(sorClass._id),
                                            room_id: new ObjectID(result._id),
                                            left_at: null
                                        }).lean().exec(async (err, sessions) => {
                                            if (sessions.length > 0) {
                                                await Promise.all(sessions.map(async (x) => {
                                                    var user = await SorUsers.findById(x.user_id);
                                                    if (user.id != data.sorUserId) {
                                                        var obj = {
                                                            userId: user.id,
                                                            role: user.student == true ? 2 : 1,
                                                            jitsiUserId: user.jitsi_user_id,
                                                            secondaryModerator: x.secondary_moderator,
                                                            isTeacher: false
                                                        }
                                                        if (user.id == sorClass.teacher_id) {
                                                            obj.isTeacher = true
                                                        }
                                                        await response.push(obj);
                                                    }
                                                })).then(() => {
                                                    data.users = response;
                                                    io.emit('secondary_moderator_return', data)
                                                });
                                            } else {
                                                data.users = response;
                                                io.emit('secondary_moderator_return', data)
                                            }
                                        })
                                    }
                                });
                            });
                        } else {
                            data.users = response;
                            io.emit('secondary_moderator_return', data)
                        }
                    })
                } else {
                    data.users = response;
                    io.emit('secondary_moderator_return', data)
                }
            })
        } else {
            io.emit('secondary_moderator_return', data)
        }


    })

    //secondary moderator
    socket.on('remove_secondary_moderator', async (data) => {
        var response = [];
        if (data.sorRoom) {
            SorRooms.findOne({ name: data.sorRoom, school_id: data.schoolId }).lean().exec(async (err, result) => {
                if (result) {
                    SorClasses.findOne({ room_id: new ObjectID(result._id), completed_at: null }).lean().exec(async (err, sorClass) => {
                        if (sorClass) {
                            await SorUsers.findOne({ jitsi_user_id: data.jitsiUserId, oneclick_room_id: data.sorRoom }).exec(async (err, user) => {
                                // Room exist  update secondary moderator true
                                await SorRoomParticipants.updateOne({
                                    class_id: new ObjectID(sorClass._id),
                                    room_id: new ObjectID(result._id),
                                    user_id: new ObjectID(user._id),              //fxn for getting id
                                    left_at: null,
                                    secondary_moderator: true
                                }, {
                                    secondary_moderator: false
                                }).exec(async (err, resdata) => {
                                    if (!err) {
                                        SorRoomParticipants.find({
                                            class_id: new ObjectID(sorClass._id),
                                            room_id: new ObjectID(result._id),
                                            left_at: null
                                        }).lean().exec(async (err, sessions) => {
                                            if (sessions.length > 0) {
                                                await Promise.all(sessions.map(async (x) => {
                                                    var user = await SorUsers.findById(x.user_id);
                                                    if (user.id != data.sorUserId) {
                                                        var obj = {
                                                            userId: user.id,
                                                            role: user.student == true ? 2 : 1,
                                                            jitsiUserId: user.jitsi_user_id,
                                                            secondaryModerator: x.secondary_moderator,
                                                            isTeacher: false
                                                        }
                                                        if (user.id == sorClass.teacher_id) {
                                                            obj.isTeacher = true
                                                        }
                                                        await response.push(obj);
                                                    }
                                                })).then(() => {
                                                    data.users = response;
                                                    io.emit('remove_secondary_moderator_return', data)
                                                });
                                            } else {
                                                data.users = response;
                                                io.emit('remove_secondary_moderator_return', data)
                                            }
                                        })
                                    }
                                });
                            });
                        } else {
                            data.users = response;
                            io.emit('remove_secondary_moderator_return', data)
                        }
                    })
                } else {
                    data.users = response;
                    io.emit('remove_secondary_moderator_return', data)
                }
            })
        } else {
            io.emit('remove_secondary_moderator_return', data)
        }


    })

    // //lobby events
    // socket.on('start_lobby', function (data) {
    //     //----------------------set lobby true in db
    //     SorRooms.updateOne({
    //         name: data.roomname
    //     }, {
    //         lobby: true
    //     }).exec();
    //     io.emit('start_lobby_return', data);
    // })

    // socket.on('stop_lobby', function (data) {
    //     //----------------------set lobby false in db
    //     SorRooms.updateOne({
    //         name: data.roomname
    //     }, {
    //         lobby: false
    //     }).exec();
    //     io.emit('stop_lobby_return', data);
    // })

    // socket.on('room_lobby_status', async (data) => {
    //     //----------------------get room status from db nd return with data
    //     SorRooms.findOne({ name: data.roomname }, function (err, room) {
    //         if (room && room.lobby == true) {
    //             data.lobby = true
    //         } else {
    //             data.lobby = false
    //         }
    //         io.emit('room_lobby_status_return', data);
    //     })

    // })

    // socket.on('join_request', function (data) {
    //     io.emit('join_request_return', data);
    // })

    // socket.on('accept_request', function (data) {
    //     io.emit('accept_request_return', data);
    // })

    // socket.on('reject_request', function (data) {
    //     io.emit('reject_request_return', data);
    // })

    socket.on('join_explore_user', function (data) {
        // console.log('********incomming*=================================================***********',data);
        socket.broadcast.emit('join_explore_user_resp', data);
    });
    socket.on('showchat', function (data) {
        socket.broadcast.emit('showchatdiv', data)
    })

    socket.on('domiantUrl', function (data) {
        console.log('data', data);

        socket.broadcast.emit('domiantUrl_return', data)
    })

    socket.on('file_share', function (data) {
        socket.broadcast.emit('file_share_broad', data)
    });

    socket.on('send_video', function (data) {
        socket.broadcast.emit('send_video_return', data)
    });

    socket.on('openTools', function (data) {
        socket.sender = true;
        socket.type = data.openTool;
        socket.room = data.location;
        socket.emit('openTools_return', data);
    });

    socket.on('closetool', function (data) {
        socket.broadcast.emit('closetool_return', data);
    });

    socket.on('openTools_fromtool', function (data) {
        socket.sender = true;
        socket.type = data.openTool;
        socket.room = data.location;
        socket.broadcast.emit('openTools_return', data);
    });

    socket.on('guitar_tuner', function (data) {
        socket.sender = true;
        socket.type = "guitar";
        socket.room = data.room;
        socket.broadcast.emit('guitar_tuner_return', data);
    });

    socket.on('disconnect_guitar', function (data) {
        socket.broadcast.emit('disconnect_guitar_all', data)
    });

    socket.on('metronomestart', function (data) {
        socket.sender = true;
        socket.type = "metronome";
        socket.room = data.room;
        socket.broadcast.emit('metroreturn', data)
    })

    socket.on('disconnectmetronome', function (data) {
        socket.broadcast.emit('disconnectmetronomeclient', data)
    })

    socket.on('voicepitch', function (data) {
        socket.room = data.room;
        socket.broadcast.emit('openTools_return', data);
        socket.broadcast.emit('voicereturn', data);
    });

    socket.on('disconnectvoicePitch', function (data) {
        socket.broadcast.emit('disconnectvoicePitchClient', data);
    });
    socket.on('send_chord_data', function (data) {
        socket.sender = true;
        socket.type = "voice-chord";
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

    socket.on('textconversion', function (data) {
        socket.broadcast.emit('textconversionreturn', data);
    })

    socket.on('disconnectspeaker', function (data) {
        socket.broadcast.emit('disconnect_speakers', data)
    })

    socket.on('delete_owner_Room', function (data) {
        //Roomname.findOne({})
        Roomname.findOneAndRemove(data, function (err, room) {
            if (!err) {
                io.sockets.emit('deleteroom', room);
            }
        });
    });

    socket.on('roomClaimed', function (data) {
        socket.broadcast.emit('receiveRoomClaimed', data)
    })
});

//SOR API's
async function getUserId(sor_id, room, callback) {
    var user = await SorUsers.findOne({ id: sor_id, oneclick_room_id: room });
    if (user) {
        return callback(user._id);
    }

}


async function validateToken(token, callback) {
    jwt.verify(token, Buffer.from(config[enviourment].JWTsecret, 'hex'), { algorithms: ['HS256'] }, function (err, decoded) {
        if (err) {
            return callback({ "status": false, "msg": err.message });
        }
        else {
            return callback({ "status": true, "msg": "Token Verified" });
        }

    });
}

app.get('/verify-token/:token', function (req, res) {
    var token = req.params.token;

    var secret = Buffer.from(config[enviourment].JWTsecret, 'hex');

    jwt.verify(token, secret, { algorithms: ['HS256'] }, function (err, decoded) {
        if (err) {
            res.json({ "status": false, "msg": err });
        }
        else {
            console.log("decoded")
            console.log(decoded)
            if (decoded && decoded.student == true) {
                SorRooms.findOne({ name: decoded.oneclick_room_id, school_id: decoded.school_id }).exec(function (err, sorRoom) {
                    if (sorRoom) {
                        SorClasses.findOne({ room_id: new ObjectID(sorRoom._id), completed_at: null }).exec(function (err, sorClass) {
                            if (sorClass) {
                                SorRoomParticipants.findOne({
                                    room_id: new ObjectID(sorRoom._id),
                                    class_id: new ObjectID(sorClass._id),
                                    left_at: null
                                }).exec(function (err, participant) {
                                    if (participant) {
                                        res.json({ "status": true, "msg": "Token Verified", "join_status": true });
                                    } else {

                                        SorClasses.updateOne({
                                            _id: new ObjectID(sorClass._id)
                                        }, {
                                            completed_at: new Date()
                                        }).exec();
                                        res.json({ "status": true, "msg": "Token Verified", "join_status": false });
                                    }
                                })

                            } else {
                                res.json({ "status": true, "msg": "Token Verified", "join_status": false });
                            }
                        })
                    } else {
                        res.json({ "status": true, "msg": "Token Verified", "join_status": false });
                    }
                })
            } else {
                res.json({ "status": true, "msg": "Token Verified", "join_status": true });
            }

        }

    });
});


app.post('/add-user', function (req, res) {
    if (!req.body.email || !req.body.email.trim() || !emailRegexp.test(req.body.email)) {
        return res.json({ "status": false, "msg": "Please enter valid Email" })
    }
    if (!req.body.oneclick_room_id || !req.body.oneclick_room_id.trim()) {
        return res.json({ "status": false, "msg": "one click room id is required field." })
    }
    if (!req.body.school_id || !req.body.school_id.trim()) {
        return res.json({ "status": false, "msg": "school id is required field." })
    }
    if (!req.body.jitsi_user_id) {
        return res.json({ "status": false, "msg": "Jitsi User id is required field." })
    }

    SorUsers.findOne({ id: req.body.id, oneclick_room_id: req.body.oneclick_room_id }).exec(function (err, sorUser) {
        if (sorUser) {
            SorUsers.updateOne({
                id: req.body.id, oneclick_room_id: req.body.oneclick_room_id
            }, {
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                pike13_id: req.body.pike13_id,
                school_id: req.body.school_id,
                admin: req.body.admin,
                student: req.body.student,
                teacher: req.body.teacher,
                oneclick_room_id: req.body.oneclick_room_id,
                iat: req.body.iat,
                blacklist: req.body.blacklist,
                jitsi_user_id: req.body.jitsi_user_id
            }).exec();
        }
        else if (!sorUser) {
            // add user to db
            var sorUser = new SorUsers({
                id: req.body.id,
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                pike13_id: req.body.pike13_id,
                school_id: req.body.school_id,
                admin: req.body.admin,
                student: req.body.student,
                teacher: req.body.teacher,
                oneclick_room_id: req.body.oneclick_room_id,
                iat: req.body.iat,
                blacklist: req.body.blacklist,
                jitsi_user_id: req.body.jitsi_user_id,
                created_at: new Date()
            })
            sorUser.save();
        }
        else if (err) {
            res.json({ "status": false, "msg": err })
        }
        SorRooms.findOne({ name: req.body.oneclick_room_id, school_id: req.body.school_id }).exec(function (err, sorRoom) {
            if (err) {
                res.json({ "status": false, "msg": err })
            } else if (sorRoom) {
                // SorClasses
                SorClasses.findOne({ room_id: new ObjectID(sorRoom._id), completed_at: null }).exec(function (err, sorClass) {
                    if (sorClass) {
                        getUserId(req.body.id, req.body.oneclick_room_id, function (result) {
                            //insert Room participant
                            var participant = new SorRoomParticipants({
                                class_id: sorClass._id,
                                user_id: result,
                                room_id: sorRoom._id,
                                moderator: false,
                                joined_at: new Date(),
                                created_at: new Date(),
                                left_at: null,
                                secondary_moderator: false,
                                webjam_connected: false,
                                user_ip: req.body.user_ip
                            })
                            participant.save();
                            res.json({ "status": true, "msg": "Added" })
                        });
                    } else {
                        getUserId(req.body.id, req.body.oneclick_room_id, function (result) {

                            //insert sor class
                            var newClass = new SorClasses({
                                room_id: sorRoom._id,
                                teacher_id: req.body.id,
                                teacher_name: req.body.firstname + " " + req.body.lastname,
                                started_at: new Date(),
                                created_at: new Date(),
                                completed_at: null
                            })
                            newClass.save(function (err, savedClass) {
                                if (!err && savedClass) {
                                    //insert Room participant
                                    var participant = new SorRoomParticipants({
                                        class_id: savedClass._id,
                                        user_id: result,
                                        room_id: sorRoom._id,
                                        moderator: true,
                                        joined_at: new Date(),
                                        created_at: new Date(),
                                        left_at: null,
                                        secondary_moderator: false,
                                        webjam_connected: false,
                                        user_ip: req.body.user_ip
                                    })
                                    participant.save();
                                    io.emit('teacher_connected', { roomname: req.body.oneclick_room_id })
                                    res.json({ "status": true, "msg": "Added" })
                                }
                            });

                        });
                    }

                })
            } else {
                getUserId(req.body.id, req.body.oneclick_room_id, function (result) {
                    // insert room then room participant
                    var room = new SorRooms({
                        name: req.body.oneclick_room_id,
                        school_id: req.body.school_id,
                        lobby: false,
                        created_at: new Date()
                    })
                    room.save(function (err, newRoom) {
                        if (!err && newRoom) {
                            var newClass = new SorClasses({
                                room_id: newRoom._id,
                                teacher_id: req.body.id,
                                teacher_name: req.body.firstname + " " + req.body.lastname,
                                started_at: new Date(),
                                created_at: new Date(),
                                completed_at: null
                            })
                            newClass.save(function (err, savedClass) {
                                if (!err && savedClass) {
                                    //insert Room participant
                                    var participant = new SorRoomParticipants({
                                        class_id: savedClass._id,
                                        user_id: result,
                                        room_id: newRoom._id,
                                        moderator: true,
                                        joined_at: new Date(),
                                        created_at: new Date(),
                                        left_at: null,
                                        secondary_moderator: false,
                                        webjam_connected: false,
                                        user_ip: req.body.user_ip
                                    })
                                    participant.save();
                                    io.emit('teacher_connected', { roomname: req.body.oneclick_room_id })
                                    res.json({ "status": true, "msg": "Added" })

                                } else {
                                    res.json({ "status": false, "msg": err })
                                }
                            });

                        } else {
                            res.json({ "status": false, "msg": err })
                        }

                    });
                });
            }
        });
    });
});

app.post('/webjam-connected', function (req, res) {
    if (!req.body.roomname || !req.body.roomname.trim()) {
        return res.json({ "status": false, "msg": "Roomname is required field." })
    }
    if (!req.body.school_id || !req.body.school_id.trim()) {
        return res.json({ "status": false, "msg": "School id is required field." })
    }
    if (!req.body.user_id) {
        return res.json({ "status": false, "msg": "User Id is required field." })
    }

    SorRooms.findOne({ name: req.body.roomname, school_id: req.body.school_id }).exec(function (err, sorRoom) {
        if (err) {
            res.json({ "status": false, "msg": err })
        } else if (sorRoom) {
            SorClasses.findOne({ room_id: new ObjectID(sorRoom._id), completed_at: null }).exec(function (err, sorClass) {
                if (sorClass) {
                    getUserId(req.body.user_id, req.body.roomname, function (result) {
                        console.log("res", result)
                        // Room exist  update webjam connected for session
                        SorRoomParticipants.updateOne({
                            class_id: new ObjectID(sorClass._id),
                            room_id: new ObjectID(sorRoom._id),
                            user_id: result,              //fxn for getting id
                            left_at: null,
                            webjam_connected: false
                        }, {
                            webjam_connected: true
                        }).exec();
                        res.json({ "status": true, "msg": "Webjam Connected" })
                    });
                }
            })

        } else {
            res.json({ "status": false, "msg": "Room Not Found" })
        }
    });

});

// session api
app.get('/session-report', async (req, res) => {
    if (req.headers.authorization) {
        validateToken(req.headers.authorization, function (result) {
            if (result.status == true) {
                var userparams = {};
                var params = {};
                var conditions = [
                    { user: { $ne: [] } },
                    { room: { $ne: [] } },
                    { class: { $ne: [] } }
                ];
                var sessionparams = {};
                var json = {};
                var sort_order = 1;
                var sortby = { "created_at": -1 }
                var skip = 0;
                var limit = 20;

                // session params
                if (req.query.start_date && req.query.end_date) {
                    if (req.query.end_date < req.query.start_date) {
                        return res.status(400).json({ "status": false, "msg": "end date should be greater than start date." })
                    }
                    sessionparams.created_at = { $gt: new Date(new Date(req.query.start_date).setHours(00, 00, 00)), $lt: new Date(new Date(req.query.end_date).setHours(23, 59, 59)) }
                }
                if (req.query.end_date && !req.query.start_date) {
                    return res.status(400).json({ "status": false, "msg": "start date is required with end date." })
                }
                if (req.query.start_date && !req.query.end_date) {

                    sessionparams.created_at = { $gt: new Date(new Date(req.query.start_date).setHours(00, 00, 00)), $lt: new Date(new Date().setHours(23, 59, 59)) }
                }
                if (req.query.oneclick_room_id && req.query.oneclick_room_id.length > 0) {
                    conditions.push({ "room.name": { $in: JSON.parse(req.query.oneclick_room_id) } })
                }

                if (req.query.school_id && req.query.school_id.length > 0) {
                    conditions.push({ "room.school_id": { $in: JSON.parse(req.query.school_id) } })
                }

                if (req.query.user_id && req.query.user_id.length > 0) {
                    conditions.push({ "user.id": { $in: JSON.parse(req.query.user_id) } })
                }

                if (req.query.user_group && req.query.user_group.length > 0) {
                    var or = [];
                    if (req.query.user_group.includes("T")) {
                        or.push({ "user.teacher": true })
                    }
                    if (req.query.user_group.includes("S")) {
                        or.push({ "user.student": true })
                    }
                    if (req.query.user_group.includes("A")) {
                        or.push({ "user.admin": true })
                    }
                    conditions.push({ $or: or })
                }

                if (req.query.sort_by) {

                    if (req.query.sort_order && req.query.sort_order == 2) {
                        var sort_order = -1;
                    }

                    if (req.query.sort_by == 1) {            //session_start_time
                        var sortby = { "joined_at": sort_order };
                    } else if (req.query.sort_by == 2) {     //session_end_time
                        var sortby = { "left_at": sort_order };
                    } else if (req.query.sort_by == 3) {     //class_start_time
                        var sortby = { "class.started_at": sort_order };
                    } else if (req.query.sort_by == 4) {     //class_end_time
                        var sortby = { "class.completed_at": sort_order };
                    } else if (req.query.sort_by == 5) {     //class_teacher_id
                        var sortby = { "class.teacher_id": sort_order };
                    } else if (req.query.sort_by == 6) {     //class_teacher_name
                        var sortby = { "class.teacher_name": sort_order };
                    } else if (req.query.sort_by == 7) {     //oneclick_room_id
                        var sortby = { "room.name": sort_order };
                    } else if (req.query.sort_by == 8) {     //school_id
                        var sortby = { "room.school_id": sort_order };
                    } else if (req.query.sort_by == 9) {     //user_email
                        var sortby = { "user.email": sort_order };
                    } else if (req.query.sort_by == 10) {     //user_name
                        var sortby = { "user.firstname": sort_order };
                    } else if (req.query.sort_by == 11) {     //user_id
                        var sortby = { "user.id": sort_order };
                    } else if (req.query.sort_by == 12) {     //created_at
                        var sortby = { "created_at": sort_order };
                    }
                }

                if (req.query.page) {
                    skip = req.query.page * 20 - 20;
                }

                SorRoomParticipants.aggregate([
                    { $match: sessionparams },
                    {
                        $lookup: {
                            "from": "sorusers",
                            "localField": "user_id",
                            "foreignField": "_id",
                            // "pipeline": [{ "$match": userparams }],
                            "as": "user"
                        }
                    },
                    {
                        $lookup: {
                            "from": "sorrooms",
                            "localField": "room_id",
                            "foreignField": "_id",
                            // "pipeline": [{ "$match": roomparams }],
                            "as": "room"
                        }
                    },
                    {
                        $lookup: {
                            "from": "sorclasses",
                            "localField": "class_id",
                            "foreignField": "_id",
                            // "pipeline": [{ "$match": roomparams }],
                            "as": "class"
                        }
                    },
                    {
                        $match: {
                            $and: conditions
                        }
                    },
                    {
                        $facet: {
                            metadata: [
                                {
                                    $group: {
                                        _id: null,
                                        total: { $sum: 1 }
                                    }
                                },
                            ],
                            data: [
                                { $sort: sortby },
                                { $skip: skip },
                                { $limit: limit },
                            ]
                        }
                    }

                ]).exec(async (err, sessionlogs) => {
                    if (sessionlogs && sessionlogs[0].metadata && sessionlogs[0].metadata[0]) {
                        json.total = sessionlogs[0].metadata[0].total;
                        json.pages = Math.ceil(sessionlogs[0].metadata[0].total / 20);
                        var final_data = [];
                        await Promise.all(sessionlogs[0].data.map(async (x, key) => {
                            var obj = {
                                session_id: x._id,
                                session_start_time: x.joined_at,
                                session_end_time: x.left_at,
                                class_start_time: x.class[0].started_at,
                                class_end_time: x.class[0].completed_at,
                                class_teacher_id: x.class[0].teacher_id,
                                class_teacher_name: x.class[0].teacher_name,
                                student: x.user[0].student,
                                teacher: x.user[0].teacher,
                                admin: x.user[0].admin,
                                oneclick_room_id: x.room[0].name,
                                school_id: x.room[0].school_id,
                                user_email: x.user[0].email,
                                user_name: x.user[0].firstname + " " + x.user[0].lastname,
                                user_ip: x.user_ip,
                                user_id: x.user[0].id
                            }
                            final_data.push(obj);
                            return x;
                        })).then(() => {
                            json.data = final_data;
                            res.json({ "status": true, data: json });
                        });

                    } else {
                        res.json({ "status": false, "msg": "No Sessions Found" })
                    }

                });
            } else {
                res.status(403).json(result);
            }
        })
    } else {
        res.status(401).json({ "status": false, "msg": "Unauthorized" });
    }
});

//room list
app.get('/rooms', function (req, res) {
    if (req.headers.authorization) {
        validateToken(req.headers.authorization, function (result) {
            if (result.status == true) {
                var query = {};
                var json = {};
                var skip = 0;
                var limit = 20;
                if (req.query.oneclick_room_id) {
                    query.name = req.query.oneclick_room_id
                }
                if (req.query.page) {
                    skip = req.query.page * 20 - 20;
                }
                SorRooms.aggregate([
                    { $match: query },
                    {
                        $facet: {
                            metadata: [
                                {
                                    $group: {
                                        _id: null,
                                        total: { $sum: 1 }
                                    }
                                },
                            ],
                            data: [
                                { $skip: skip },
                                { $limit: limit },
                                { $sort: { "created_at": -1 } },
                                {
                                    "$project": {
                                        "_id": 1,
                                        "oneclick_room_id": "$name",
                                        "created_at": 1
                                    }
                                },
                            ]
                        }
                    },

                ]).exec(function (err, response) {
                    if (response && response[0].metadata && response[0].metadata[0]) {
                        json.total = response[0].metadata[0].total;
                        json.pages = Math.ceil(response[0].metadata[0].total / 10);
                        json.data = response[0].data;
                        res.json({ "status": true, "data": json });
                    } else {
                        res.status(404).json({ "status": false, "msg": "Room not Found" });
                    }
                })
            } else {
                res.status(403).json(result);
            }
        })
    } else {
        res.status(401).json({ "status": false, "msg": "Unauthorized" });
    }


});

//SOR chat apis
//send message api
app.post('/send-message', function (req, res) {
    if (!req.body.roomname || !req.body.roomname.trim()) {
        return res.json({ "status": false, "msg": "Roomname is required field." })
    }
    if (!req.body.school_id || !req.body.school_id.trim()) {
        return res.json({ "status": false, "msg": "School id is required field." })
    }
    if (!req.body.user_id) {
        return res.json({ "status": false, "msg": "User Id is required field." })
    }
    if (!req.body.message || !req.body.message.trim()) {
        return res.json({ "status": false, "msg": "Message is required field." })
    }
    if (!req.body.message_type) {
        return res.json({ "status": false, "msg": "Message type is required field." })
    }
    SorRooms.findOne({ name: req.body.roomname, school_id: req.body.school_id }).lean().exec(function (err, sorRoom) {
        if (sorRoom) {
            SorClasses.findOne({ room_id: new ObjectID(sorRoom._id), completed_at: null }).lean().exec(function (err, sorClass) {
                if (sorClass) {
                    getUserId(req.body.user_id, req.body.roomname, function (result) {
                        SorRoomParticipants.findOne({
                            room_id: new ObjectID(sorRoom._id),
                            class_id: new ObjectID(sorClass._id),
                            left_at: null,
                            user_id: result
                        }).lean().exec(function (err, session) {
                            if (session) {
                                SorUsers.findOne({ jitsi_user_id: req.body.receiver_id }).lean().exec(function (err, sorUser) {
                                    SorRoomParticipants.find({
                                        room_id: new ObjectID(sorRoom._id),
                                        class_id: new ObjectID(sorClass._id),
                                        left_at: null,
                                    }).lean().exec(async (err, sessionlogs) => {
                                        var receivers = [];
                                        if (req.body.isPrivate == "true" && sorUser) {
                                            var obj = {
                                                id: sorUser.id,
                                                name: sorUser.firstname + " " + sorUser.lastname,
                                                student: sorUser.student,
                                                teacher: sorUser.teacher,
                                                admin: sorUser.admin
                                            }
                                            receivers.push(obj);

                                        }
                                        await Promise.all(sessionlogs.map(async (x, key) => {
                                            // if (x.user_id != result) {
                                            var user = await SorUsers.findOne({ _id: x.user_id });
                                            if (user.id != req.body.user_id) {
                                                var obj = {
                                                    id: user.id,
                                                    name: user.firstname + " " + user.lastname,
                                                    student: user.student,
                                                    teacher: user.teacher,
                                                    admin: user.admin
                                                }
                                                if (req.body.isPrivate != "true") {
                                                    receivers.push(obj);
                                                }
                                            }
                                            return x;
                                        })).then(() => {
                                            var message = new SorMessages({
                                                class_id: sorClass._id,
                                                room_id: sorRoom._id,
                                                session_id: session._id,
                                                sender_id: result,         //fxn for getting id
                                                message: req.body.message,
                                                message_type: req.body.message_type,
                                                is_private: req.body.isPrivate == "true" ? true : false,
                                                receivers: receivers,
                                                user_ip: req.body.user_ip,
                                                created_at: new Date()
                                            })
                                            message.save(function (err, newMessage) {
                                                if (err) {
                                                    res.json({ "status": false, "msg": err })
                                                }
                                                else {
                                                    res.json({ "status": true, "msg": "Message Sent" })
                                                }
                                            });
                                        });
                                    })
                                })
                            }
                        })
                    })

                }
            })
        }
        else {
            res.json({ "status": true, "msg": "Room Not Found" })
        }
    });


});

//messages
app.get('/messages', async (req, res) => {
    if (req.headers.authorization) {
        validateToken(req.headers.authorization, function (result) {
            if (result.status == true) {
                var conditions = [
                    { user: { $ne: [] } },
                    { room: { $ne: [] } },
                    { class: { $ne: [] } },
                    { session: { $ne: [] } }
                ];
                var chatparams = {};
                var json = {};
                var sort_order = 1;
                var sortby = { "created_at": -1 }
                var skip = 0;
                var limit = 20;

                // session params
                if (req.query.start_date && req.query.end_date) {
                    if (req.query.end_date < req.query.start_date) {
                        return res.status(400).json({ "status": false, "msg": "end date should be greater than start date." })
                    }
                    chatparams.created_at = { $gt: new Date(new Date(req.query.start_date)), $lt: new Date(new Date(req.query.end_date)) }
                }
                if (req.query.end_date && !req.query.start_date) {
                    return res.status(400).json({ "status": false, "msg": "start date is required with end date." })
                }
                if (req.query.start_date && !req.query.end_date) {

                    chatparams.created_at = { $gt: new Date(new Date(req.query.start_date)), $lt: new Date(new Date()) }
                }
                if (req.query.oneclick_room_id && req.query.oneclick_room_id.length > 0) {
                    conditions.push({ "room.name": { $in: JSON.parse(req.query.oneclick_room_id) } })
                }

                if (req.query.school_id && req.query.school_id.length > 0) {
                    conditions.push({ "room.school_id": { $in: JSON.parse(req.query.school_id) } })
                }

                if (req.query.user_id && req.query.user_id.length > 0) {
                    conditions.push({ "user.id": { $in: JSON.parse(req.query.user_id) } })
                }

                if (req.query.user_group && req.query.user_group.length > 0) {
                    var or = [];
                    if (req.query.user_group.includes("T")) {
                        or.push({ "user.teacher": true })
                    }
                    if (req.query.user_group.includes("S")) {
                        or.push({ "user.student": true })
                    }
                    if (req.query.user_group.includes("A")) {
                        or.push({ "user.admin": true })
                    }
                    conditions.push({ $or: or })
                }

                if (req.query.sort_by) {

                    if (req.query.sort_order && req.query.sort_order == 2) {
                        var sort_order = -1;
                    }

                    if (req.query.sort_by == 1) {            //session_start_time
                        var sortby = { "session.joined_at": sort_order };
                    } else if (req.query.sort_by == 2) {     //session_end_time
                        var sortby = { "session.left_at": sort_order };
                    } else if (req.query.sort_by == 3) {     //class_start_time
                        var sortby = { "class.started_at": sort_order };
                    } else if (req.query.sort_by == 4) {     //class_end_time
                        var sortby = { "class.completed_at": sort_order };
                    } else if (req.query.sort_by == 5) {     //class_teacher_id
                        var sortby = { "class.teacher_id": sort_order };
                    } else if (req.query.sort_by == 6) {     //class_teacher_name
                        var sortby = { "class.teacher_name": sort_order };
                    } else if (req.query.sort_by == 7) {     //oneclick_room_id
                        var sortby = { "room.name": sort_order };
                    } else if (req.query.sort_by == 8) {     //school_id
                        var sortby = { "room.school_id": sort_order };
                    } else if (req.query.sort_by == 9) {     //message
                        var sortby = { "message": sort_order };
                    } else if (req.query.sort_by == 10) {     //sender_name
                        var sortby = { "user.firstname": sort_order };
                    } else if (req.query.sort_by == 11) {     //sender_id
                        var sortby = { "user.id": sort_order };
                    } else if (req.query.sort_by == 12) {     //created_at
                        var sortby = { "created_at": sort_order };
                    }
                }

                if (req.query.page) {
                    skip = req.query.page * 20 - 20;
                }

                SorMessages.aggregate([
                    { $match: chatparams },
                    {
                        $lookup: {
                            "from": "sorusers",
                            "localField": "sender_id",
                            "foreignField": "_id",
                            "as": "user"
                        }
                    },
                    {
                        $lookup: {
                            "from": "sorrooms",
                            "localField": "room_id",
                            "foreignField": "_id",
                            "as": "room"
                        }
                    },
                    {
                        $lookup: {
                            "from": "sorclasses",
                            "localField": "class_id",
                            "foreignField": "_id",
                            "as": "class"
                        }
                    },
                    {
                        $lookup: {
                            "from": "sorroomparticipants",
                            "localField": "session_id",
                            "foreignField": "_id",
                            "as": "session"
                        }
                    },
                    {
                        $match: {
                            $and: conditions
                        }
                    },
                    {
                        $facet: {
                            metadata: [
                                {
                                    $group: {
                                        _id: null,
                                        total: { $sum: 1 }
                                    }
                                },
                            ],
                            data: [
                                { $sort: sortby },
                                { $skip: skip },
                                { $limit: limit },
                            ]
                        }
                    }

                ]).exec(async (err, chats) => {

                    if (chats && chats[0].metadata && chats[0].metadata[0]) {
                        json.total = chats[0].metadata[0].total;
                        json.pages = Math.ceil(chats[0].metadata[0].total / 20);
                        var final_data = [];
                        await Promise.all(chats[0].data.map(async (x, key) => {
                            var obj = {
                                chat_id: x._id,
                                chat_time: x.created_at,
                                message: x.message,
                                message_type: x.message_type,
                                sender_id: x.user[0].id,
                                sender_name: x.user[0].firstname + " " + x.user[0].lastname,
                                sender_student: x.user[0].student,
                                sender_teacher: x.user[0].teacher,
                                sender_admin: x.user[0].admin,
                                is_private: x.is_private,
                                session_id: x.session[0]._id,
                                session_start_time: x.session[0].joined_at,
                                session_end_time: x.session[0].left_at,
                                class_id: x.class[0]._id,
                                class_start_time: x.class[0].started_at,
                                class_end_time: x.class[0].completed_at,
                                class_teacher_id: x.class[0].teacher_id,
                                class_teacher_name: x.class[0].teacher_name,
                                oneclick_room_id: x.room[0].name,
                                school_id: x.room[0].school_id,
                                user_ip: x.user_ip,
                                receivers: x.receivers
                            }
                            final_data.push(obj);
                            return x;
                        })).then(() => {
                            json.data = final_data;
                            res.json({ "status": true, data: json });
                        });

                    } else {
                        res.json({ "status": false, "msg": "No Messages Found" })
                    }

                });
            } else {
                res.status(403).json(result);
            }
        })
    } else {
        res.status(401).json({ "status": false, "msg": "Unauthorized" });
    }
});

// websocket code
ws.onopen = () => {
    var connected = [];
    console.log("Websocket Connected")
    function sendDevices(ip) {

        var publicIp = ip;
        var deviceList = {
            action: {
                publicIp: publicIp
            },
            content: 'devices',
            isBroadcast: true,
            sender: 'server'
        }
        if (publicIp == "" || publicIp == null) {
            var device_arr = [];
            deviceList.action.device_arr = device_arr;
            deviceList = JSON.stringify(deviceList);
            ws.send(deviceList);
        }
        else {
            db.collection("notification").find({ publicIp: publicIp }).toArray(function (err, devices) {
                var device_arr = [];
                for (j = 0; j < devices.length; j++) {
                    if (devices[j].roomName == "") {
                        device_arr.push(devices[j].uniqueId);
                    }
                }
                deviceList.action.device_arr = device_arr;
                deviceList = JSON.stringify(deviceList);
                ws.send(deviceList);
            });
        }
    }

    function storeLogs(uniqueID, publicIP, event, sender, data) {
        var log = {};
        log.uniqueID = uniqueID;
        log.publicIP = publicIP;
        log.event = event;
        log.sender = sender;
        log.data = data;
        log.createdAt = new Date();
        db.collection("logs").insertOne(log);
    }
    // var list = [];

    // recieved data from websocket
    ws.onmessage = (message) => {
        //room-not-found, connecting-with-hosted-room, connecting-with-ip, hosting-new-server, host-exist-err, room-self-hosted, unique-check-true, start-hosting-room, already-hosted-room, unique-check-false, join-already-hosted-room
        var data = JSON.parse(message.data);
        var res = data;
        if (data.content == "token-connect") {
            const check = connected.includes(data.action.uniqueID);
            if (check == false) {
                connected.push(data.action.token);
            }
            if (data.action.publicIp) {
                db.collection("notification").findOne({ uniqueId: data.action.uniqueID }, function (err, device) {
                    if (device) {
                        db.collection("notification").findOneAndUpdate({
                            uniqueId: data.action.uniqueID
                        }, {
                            $set: {
                                uniqueId: device.uniqueId,
                                publicIp: data.action.publicIp,
                                isHost: device.isHost,
                                roomName: "",
                                socketID: data.action.socket_id,
                                protocolId: device.protocolId,
                                fcmId: device.fcmId
                            }
                        }, function (err, res) {
                            sendDevices(data.action.publicIp);
                        });
                    } else {
                        var json = {};
                        json.uniqueId = data.action.uniqueID;
                        json.publicIp = data.action.publicIp;
                        json.socketID = data.action.socket_id;
                        json.roomName = "";
                        db.collection("notification").insertOne(json, function (err, res) {
                            sendDevices(data.action.publicIp);
                        });
                    }
                    // sendDevices(data.action.publicIp);
                });
            }
            storeLogs(data.action.uniqueID, data.action.publicIp, "device-started", data.sender, data);
            console.log(connected);
        }
        else if (data.content == "token-disconnect") {
            for (i = 0; i < connected.length; i++) {
                if (connected[i] == data.action.token) {
                    connected.splice(i, 1);
                }
            }
            // if(data.action.publicIp) {
            db.collection("notification").deleteOne({ uniqueId: data.action.uniqueID });
            // }

            sendDevices(data.action.publicIp);
        }
        else if (data.content == "unique_check") {
            const check = connected.includes(data.action.uniqueID);
            data.action.check = check;
            data = JSON.stringify(data);
            ws.send(data);
        }
        else if (data.content == "device-list") {
            storeLogs("", data.action.publicIp, data.content, data.sender, data);
            var deviceList = {
                action: {
                    publicIp: data.action.publicIp,
                    socket_id: data.action.socket_id
                },
                content: 'device-list',
                isBroadcast: false,
                sender: 'server'
            }
            if (data.action.publicIp == "" || data.action.publicIp == null) {
                var device_arr = [];
                deviceList.action.device_arr = device_arr;
                deviceList = JSON.stringify(deviceList);
                ws.send(deviceList);
            }
            else {
                db.collection("notification").find({ publicIp: data.action.publicIp }).toArray(function (err, devices) {
                    var device_arr = [];
                    for (j = 0; j < devices.length; j++) {
                        if (devices[j].roomName == "") {
                            device_arr.push(devices[j].uniqueId);
                        }
                    }
                    deviceList.action.device_arr = device_arr;
                    // deviceList = JSON.stringify(deviceList);
                    ws.send(JSON.stringify(deviceList));
                    // storeLogs("", data.action.publicIp, deviceList.content, deviceList.sender, deviceList);
                });
            }



        }
        else if (data.content == "server-connect") {
            if (data.sender == "mobile" || data.sender == "web") {
                db.collection("notification").findOne({ uniqueId: data.action.uniqueID }, function (err, notification) {
                    if (notification) {
                        db.collection("notification").findOneAndUpdate({
                            uniqueId: data.action.uniqueID
                        }, {
                            $set: {
                                fcmId: data.action.fcm_id ? data.action.fcm_id : notification.fcmId,
                                protocolId: data.action.protocolId,
                                uniqueId: notification.uniqueId,
                                publicIp: notification.publicIp,
                                isHost: notification.isHost,
                                roomName: notification.roomName,
                                socketID: notification.socketID
                            }
                        });
                    } else {
                        var json = {};
                        json.uniqueId = data.action.uniqueID;
                        json.fcmId = data.action.fcm_id;
                        json.protocolId = data.action.protocolId;
                        db.collection("notification").insertOne(json);
                    }
                });
            } else if (data.sender == "jamulus") {
                db.collection("notification").findOne({ uniqueId: data.action.uniqueID }, function (err, notification) {
                    if (notification) {
                        db.collection("notification").findOneAndUpdate({
                            uniqueId: data.action.uniqueID
                        }, {
                            $set: {
                                isHost: data.action.isHost,
                                roomName: data.action.isHost ? data.action.hostedRoom : data.action.hostAddress,
                                socketID: data.action.socket_id,
                                uniqueId: notification.uniqueId,
                                protocolId: notification.protocolId,
                                fcmId: notification.fcmId,
                                publicIp: notification.publicIp
                            }
                        }, function (err, res) {
                            sendDevices(notification.publicIp);
                        });
                    }
                });

                storeLogs(data.action.uniqueID, "", data.content, data.sender, data);

            }

        }
        else if (data.content == "disconnect-user") {
            db.collection("notification").findOne({ protocolId: data.action.protocolId }, function (err, notification) {
                if (notification && notification.isHost == true) {

                    // sending push notif
                    var notifMsg = {
                        to: notification.fcmId,
                        // collapse_key: 'your_collapse_key',

                        notification: {
                            title: 'WebJam',
                            body: "You put the Webjam app in the background but your room is still running. Did you want to end the session for everyone, keep it running for others, or keep it running and join back in yourself?"
                        }
                    };
                    fcm.send(notifMsg, function (err, response) {
                        if (err) {
                            console.log("Something has gone wrong!");
                        } else {
                            console.log("Successfully sent with response: ", response);
                        }
                    });

                }

            });

            db.collection("notification").findOne({ socketID: data.action.socket_id }, function (err, device) {
                if (device && device.roomName != "") {

                    if (device.isHost == true) {
                        var killRoom = {
                            action: {
                                uniqueID: device.uniqueId,
                                ipAddress: device.roomName
                            },
                            content: 'room-disconnect',
                            isBroadcast: true,
                            sender: 'server'
                        }
                        ws.send(JSON.stringify(killRoom));

                    }

                    var dis = {
                        action: {
                            uniqueID: device.uniqueId,
                            ipAddress: device.roomName,
                            protocolID: device.protocolId,
                            msg: "You've been removed from this room because your device temporarily lost internet connection. Check your Ethernet cable then reboot your device.",
                        },
                        content: 'device-disconnect',
                        isBroadcast: true,
                        sender: 'server'
                    }
                    ws.send(JSON.stringify(dis));

                    var reset = {
                        action: {
                            uniqueID: device.uniqueId,
                        },
                        content: 'reset-server-list',
                        isBroadcast: true,
                        sender: 'server'
                    }
                    ws.send(JSON.stringify(reset));

                }
                if (device) {
                    db.collection("notification").deleteOne({ uniqueId: device.uniqueId }, function (err, res) {
                        sendDevices(device.publicIp);
                    });
                }
            });

        } else if (data.content == "kill-room") {
            db.collection("notification").findOne({ uniqueId: data.action.uniqueID }, function (err, device) {
                if (device && device.roomName != "") {

                    db.collection("notification").findOneAndUpdate({
                        uniqueId: device.uniqueId
                    }, {
                        $set: {
                            isHost: false,
                            roomName: "",
                            uniqueId: device.uniqueId,
                            protocolId: device.protocolId,
                            fcmId: device.fcmId,
                            publicIp: device.publicIp,
                            socketID: device.socketID
                        }
                    });

                    var reset = {
                        action: {
                            uniqueID: device.uniqueId,
                        },
                        content: 'reset-server-list',
                        isBroadcast: true,
                        sender: 'server'
                    }
                    ws.send(JSON.stringify(reset));



                }

            });
        } else if (data.content == "room-ended") {
            db.collection("notification").findOne({ uniqueId: data.action.uniqueID }, function (err, device) {
                if (device && device.roomName != "") {

                    db.collection("notification").findOneAndUpdate({
                        uniqueId: device.uniqueId
                    }, {
                        $set: {
                            isHost: device.isHost,
                            roomName: "",
                            uniqueId: device.uniqueId,
                            protocolId: device.protocolId,
                            fcmId: device.fcmId,
                            publicIp: device.publicIp,
                            socketID: device.socketID
                        }
                    });

                }

            });
        } else if (data.content == "server-disconnect" && data.sender == "jamulus") {
            db.collection("notification").findOne({ uniqueId: data.action.uniqueID }, function (err, device) {
                if (device && device.roomName != "") {

                    db.collection("notification").findOneAndUpdate({
                        uniqueId: device.uniqueId
                    }, {
                        $set: {
                            isHost: device.isHost,
                            roomName: "",
                            uniqueId: device.uniqueId,
                            protocolId: device.protocolId,
                            fcmId: device.fcmId,
                            publicIp: device.publicIp,
                            socketID: device.socketID
                        }
                    });

                }
                if (device) {
                    sendDevices(device.publicIp);
                }


            });
            // storeLogs(data.action.uniqueID, "", data.content, data.sender, data);
        } else if (data.content == "room-not-found" || data.content == "connecting-with-hosted-room" || data.content == "connecting-with-ip" || data.content == "hosting-new-server" || data.content == "host-exist-err" || data.content == "room-self-hosted" || data.content == "unique-check-true" || data.content == "check-room-status" || data.content == "already-hosted-room" || data.content == "unique-check-false" || data.content == "join-already-hosted-room" || data.content == "ip-case") {
            storeLogs(data.action.uniqueID, "", data.content, data.sender, data);
        }

        //room-not-found, connecting-with-hosted-room, connecting-with-ip, hosting-new-server, host-exist-err, room-self-hosted, unique-check-true, start-hosting-room, already-hosted-room, unique-check-false, join-already-hosted-room

    };

};

