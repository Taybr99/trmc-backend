const User = require('./users');
const Room = require('./room');

class Route {
  constructor(router, database, authentication) {
    this.router = router;
    this.database = database;
    this.authentication = authentication;
    //  console.log("this.database >>>>>>>>>>>>>>>>>>>..", this.database)
  }

  register() {
    new User(this.router, this.database, this.authentication).routes();
    new Room(this.router, this.database, this.authentication).routes();
    
    return this.router;
  }
}

module.exports = Route;
