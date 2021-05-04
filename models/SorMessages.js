var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SorMessages = new Schema({
    class_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SorClasses'
    },
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SorRooms'
    },
    session_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SorRoomParticipants'
    },
    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SorUsers'
    },
    // sender_id: Number,
    message: String,
    message_type: Number,
    is_private: Boolean,
    receivers: [Object],
    user_ip: String,
    created_at: Date
}, {});

mongoose.model('SorMessages', SorMessages);