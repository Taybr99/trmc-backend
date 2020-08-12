var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
  username:String,
  password:String,
  email:String,
  customer_Stripe_Id:String,
  account_Stripe_Id:String
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

mongoose.model('User', User);
