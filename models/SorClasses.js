var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SorClasses = new Schema({
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SorRooms'
    },
    teacher_id: Number,
    teacher_name: String,
    started_at: Date,
    completed_at: Date,
    created_at: Date
}, {});

mongoose.model('SorClasses', SorClasses);
