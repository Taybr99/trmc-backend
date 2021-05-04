var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SorUsers = new Schema({
    id: Number,
    firstname: String,
    lastname: String,
    email: String,
    pike13_id: Number,
    school_id: String,
    // role: Number,       // 1 - teacher, 2 - student
    admin: Boolean,
    student: Boolean,
    teacher: Boolean,
    oneclick_room_id: String,
    iat: Number,
    blacklist: String,
    jitsi_user_id: String,
    created_at: Date
}, {});

mongoose.model('SorUsers', SorUsers);
