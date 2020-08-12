const Helper = require('../utils/helper');
const _ = require('lodash');

class User {
    constructor(database) {
        this.database = database;
        this.model = database.getModelInstance();
        this.helper = new Helper();
    }

    async createAuthUser(userData) {
        console.log("00000 ", userData)
        userData.contact = userData.contact.trim();

        const saveAuth = await this.database.create('Authentications', {
            id: this.helper.createUUID(),
            email: userData.email,
            password: this.helper.hashPassword(userData.password),
            accesstoken: this.helper.createToken(userData.contact)
        });
        const { dataValues: { id: authId, isverified: isverified, accesstoken: accesstoken }, } = saveAuth;

        const saveUser = await this.database.create('Users', {
            ...userData,
            id: this.helper.createUUID(),
            authId: authId
        });
        const { dataValues: { id: userId }, } = saveUser;

        const userDetail = {
            user: userId,
            authId: authId,
            isverified: isverified,
            accesstoken: userData.accesstoken,
        };
        return userDetail;
    }

    async updateAuthUser(query, userData) {
        // userData.token = this.helper.createToken(userData.provider);

        const updateAuth = await this.database.update('Authentications', query, {
            ...userData,
            otp: '1111', // Math.floor(1000 + Math.random() * 9000);
            isverified: false
        });

        const findAuth = await this.database.getSingleRow('Authentications', query);
        const { dataValues: { id: authId, token: token, otp: otp, isverified: isverified }, } = findAuth;

        const user = await this.database.getSingleRow('Users', { where: { authId: authId } });
        const { dataValues: { id: userId }, } = user;

        const userDetail = {
            otp: otp,
            user: userId,
            authId: authId,
            isverified: isverified,
            token: token,
        };
        return userDetail;
    }

    async updateToken(authdata) {
        let { provider, contact, otp, id } = authdata;
        const token = this.helper.createToken(provider);

        const updatedVerified = await this.database.update('Authentications', { where: { id } }, { token: token, isverified: true });
        const user = await this.database.getSingleRow('Users', { where: { authId: id } });
        const { dataValues: { id: userId }, } = user;

        const userDetail = {
            otp: otp,
            user: userId,
            authId: id,
            isverified: true,
            token: token,
        };
        return userDetail;
    }

    async login(query, userData) {
        userData.token = this.helper.createToken(userData.provider);

        const updateAuth = await this.database.update('Authentications', query, {
            ...userData,
            isverified: true
        });

        const findAuth = await this.database.getSingleRow('Authentications', query);
        const { dataValues: { id: authId, isverified: isverified }, } = findAuth;

        const user = await this.database.getSingleRow('Users', { where: { authId: authId } });
        const { dataValues: { id: userId }, } = user;

        const userDetail = {
            user: userId,
            authId: authId,
            isverified: isverified,
            token: userData.token,
        };
        return userDetail;
    }

    async userDetail(id) {
        const user = await this.database.getSingleRow('Users', {
            where: { id: id },
            include: [{
                    model: this.model.Authentications,
                    attributes: ['type', 'protocol', 'role', 'isverified', 'isdelete', 'isactive']
                },
                { model: this.model.Categories }
            ],
        });

        return user;
    }

    async getUserWithAuthentication(condition, attributes, foreignKeyAttributes) {
        const user = await this.database.getSingleRow('Users', {
            where: condition,
            attributes,
            include: [{
                model: this.model.Authentications,
                attributes: foreignKeyAttributes,
            }],
        });

        return user;
    }

    async checkRole(id, userRole) {
        const user = await this.database.getSingleRow('Authentications', {
            where: { id },
        });

        const {
            dataValues: { role },
        } = user;

        if (role === userRole) {
            return true;
        }

        return false;
    }

    async isUserExist(id) {
        const user = await this.database.getSingleRow('Users', {
            where: { id },
        });

        return user;
    }

    async userLikeName(query) {
        const usersArray = await this.database.getAllRows('Users', query);
        let userIdsArray = [];

        if (usersArray.length) {
            await _.forEach(usersArray, function(value) {
                if (value != undefined && value != null) userIdsArray.push(value.id);
            });
        }
        return userIdsArray;
    }

    async userList() {
        const user = await this.database.getAllRows('Users', {
            where: { isdelete: false },
            include: [{
                model: this.model.Authentications,
                attributes: ['role', 'protocol', 'isdelete', 'isactive'],
                where: { "role": "user" }
            }, ],
        });

        return user;
    }

    async isUserBlockExist(userBy, userTo) {
        const user = await this.database.getSingleRow('UserBlockUsers', {
            where: { userBy, userTo, isBlocked: true },
        });

        return user;
    }

    async addToBlock(data) {
        const addBlock = await this.database.create('UserBlockUsers', {
            ...data,
            id: this.helper.createUUID(),
        });

        return addBlock;
    }

    async updateBlockUnblock(isBlocked, id) {
        const updateBlock = await this.database.update('UserBlockUsers', { where: { id } }, { isBlocked });

        return updateBlock;
    }

    async userDeviceId(id) {
        const user = await this.database.getSingleRow('Users', {
            where: { id, tonotify: true },
            attributes: ['deviceId']
        });

        return user;
    }

    async userHasBlocked(userBy) {
        const usersArray = await this.database.getAllRows('UserBlockUsers', {
            where: { userBy, isBlocked: true },
            attributes: ['userTo'],
            include: [{
                model: this.model.Users,
                attributes: ['name', 'picture', 'contact', 'email']
            }, ]
        });
        return usersArray;
    }

}

module.exports = User;