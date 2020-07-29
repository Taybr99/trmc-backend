var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Transaction = new Schema({
  UserId:[{ type:String, ref: 'User'}],
  JoinieName:String,
  RoomId:[{ type:String, ref: 'Roomname'}],
  // groupName:String,
  // publish:Boolean,
  // otherUsers:Array,
  // category:String,
  // private:Boolean,
  // //adminIp:String,
  // showchord:Boolean,
  // showfret:Boolean,
  // showchordUser:String,
  // showfretUser:String,
  // email:String
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

mongoose.model('Transaction', Transaction);
