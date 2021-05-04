var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SorRoomParticipants = new Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SorUsers'
    },
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SorRooms'
    },
    class_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SorClasses'
    },
    moderator: Boolean,
    secondary_moderator: Boolean,
    webjam_connected: Boolean,
    user_ip: String,
    joined_at: Date,
    left_at: Date,
    created_at: Date
}, {});

mongoose.model('SorRoomParticipants', SorRoomParticipants);
