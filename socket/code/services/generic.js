/* eslint-disable class-methods-use-this */

class Generic {
    constructor(database) {
      this.database = database;
    }

    async save(model, data) {
      const response = await this.database.create(model, data);
      return response;
    }

    async remove(model, query) {
      const response = await this.database.delete(model, { where: query });
      return response;
    }

    async findDuplicate(model, query) {
        const response = await this.database.getSingleRow(model, { where: query });
        return !!response;
    }

    async findAll(model, where, offset, limit, include, order, attributes) {
      const query = {
        where,
        offset: limit * offset,
        limit,
        include,
        order,
        attributes,
      };

      const response = await this.database.getAllRows(model, query);
      return response;
    }

    async findOne(model, where, include, attributes) {
      const query = {
        where,
        include,
        attributes,
      };

      const response = await this.database.getSingleRow(model, query);
      return response;
    }

    async update(model, where, data) {
      const query = { where };
      const response = await this.database.update(model, query, data);
      return response;
    }

    async count(model, where, include) {
      const query = { where, include };
      const response = await this.database.count(model, query);
      return response;
    }

    async groupAll(model, where, attributes, include, group) {
      const query = {
        where,
        attributes,
        include,
        group,
      };

      const response = await this.database.getAllRows(model, query);
      return response;
    }

    async checkFakeEmail(email) {
      const req_body = 'https://apilayer.net/api/check?access_key=bbe79e7fc3eb76cce96d94a7538cbd12&email=' + email + '&smtp=1&format=1';
      let request = require('async-request'),response;

      try {
        response = await request(req_body);
        return JSON.parse(response.body);;
      } catch (e) {
        return response;
      }
    }

    async getTableColumns(model) {
      const response = await this.database.getModelFields(model);
      return response;
    }

    async createAdmin() {
      const Helper = require('../utils/helper');
      this.helper = new Helper();

      //create admin array 
      const adminArray = [
        { name: 'admin1', email: 'admin1@talentika.com', password: this.helper.hashPassword('Admin111#') },
        { name: 'admin2', email: 'admin2@talentika.com', password: this.helper.hashPassword('Admin222#') },
        { name: 'admin3', email: 'admin3@talentika.com', password: this.helper.hashPassword('Admin333#') }
      ];

      await Promise.all(adminArray.map(async (each) => {
        const adminFound = await this.database.getSingleRow('Authentications', { where: { role: 'admin', provider: each.email } });
        
        // console.log("if ADMIN ", adminFound);
        if (!adminFound) {
          const userId = this.helper.createUUID();
          const authId = this.helper.createUUID();

          const adminAuth = {
              id: authId,
              role: 'admin',
              type: 'email',
              protocol: 'local',
              provider: each.email,
              password: each.password,
              token: this.helper.createToken(each.email),
              isverified: true,
          }

          let adminUser = {
              id: userId,
              name: each.name,
              email: each.email,
              device: 'web',
              isactive: true,
          };
          // CREATE ADMIN AUTH + USER IN DB
          const auth = await this.database.create('Authentications', adminAuth);
          // BIND authId in User object
          const { id } = auth;
          adminUser = { ...adminUser, authId: id };
          const user = this.database.create('Users', adminUser);
        }

        return true;
      }));
    }

}

module.exports = Generic;