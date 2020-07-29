
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Metronome = new Schema({
  	room:String,
  	metronomeValue:Boolean,
  	oneMin:String,
	bpm:String,
	beatCount:String,
	bpb:String,
}, {
  versionKey: false,
  
  toJSON: {
    virtuals: true,
    transform: function(doc, ret, options) {
      ret.id = ret._id.toHexString();
      delete ret._id;
    }
  },
  
  toObject: {
    virtuals: true
  }
});

mongoose.model('Metronome', Metronome);