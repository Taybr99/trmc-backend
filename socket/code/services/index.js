const S3 = require('./s3');
const Email = require('./email');
const Generic = require('./generic');
const Admin = require('./admin');
const User = require('./users');
const Banners = require('./banners');

class Service {
  constructor(database) {
    this.database = database;
  }

  register() {
    return {
      s3: new S3(),
      email: new Email(),
      generic: new Generic(this.database),
      admin: new Admin(this.database),
      users: new User(this.database),
      banners: new Banners(this.database)
    };
  }
}

module.exports = Service;
