var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SorRooms = new Schema({
    name: String,
    school_id: String,
    lobby: Boolean,
    created_at: Date
}, {});

mongoose.model('SorRooms', SorRooms);
