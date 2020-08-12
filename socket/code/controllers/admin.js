const Services = require('../services');
const Helper = require('../utils/helper');
const Validator = require('../utils/validator');
const message = require('../services/admintext');
const _ = require('lodash');
const { ADMIN_BASE_PATH, HOST, PORT } = require('../config')

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

class Admin {
    constructor(database) {
        this.services = new Services(database).register();
        this.helper = new Helper();
        this.validator = new Validator();
    }

    async login({ body }, res) {
        try {
            const requiredFields = ['email', 'password', 'role'];

            const isValidated = this.validator.validateFields(body, requiredFields);

            if (isValidated.length) {
                return res.badRequest(isValidated);
            }

            const { email, password, role } = body;

            if (!this.validator.validateByRegex('email', email)) {
                return res.badRequest(message.invalidEmailorPassword);
            }

            const existingData = await this.services.generic.findOne('Authentications', { provider: email });

            if (!existingData) {
                return res.badRequest(message.invalidEmailorPassword);
            }

            let { dataValues } = existingData;

            const userData = await this.services.generic.findOne('Users', { authId: dataValues.id });

            if (userData.isdelete) {
                return res.badRequest(message.userDeletedByAdmin);
            }

            if (!userData.isactive) {
                return res.badRequest(message.userDeactivatedByAdmin);
            }

            const encryptPassword = this.helper.hashPassword(password);

            if (encryptPassword !== dataValues.password) {
                return res.badRequest(message.invalidEmailorPassword);
            }

            if (role !== dataValues.role) {
                return res.forbidden(message.notAuthenticated);
            }

            const token = this.helper.createToken(dataValues.email);
            dataValues = { ...dataValues, token };

            await this.services.generic.update('Authentications', { id: dataValues.id }, dataValues);

            const result = {
                email: email,
                userId: userData.id,
                authId: dataValues.id,
                token: token,
            };

            return res.success(result, message.successfulLogin);
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }


    async forgotPassword({ body }, res) {
        try {
            const requiredFields = ['email'];
            const isValidated = this.validator.validateFields(body, requiredFields);
            if (isValidated.length) {
                return res.badRequest(isValidated);
            }

            const { email } = body;
            if (!this.validator.validateByRegex('email', email)) {
                return res.badRequest(message.invalidEmail);
            }

            const authentication = await this.services.generic.findOne('Authentications', { provider: email, role: 'admin' });
            if (!authentication) {
                return res.badRequest(message.userNotExists);
            }

            const { id } = authentication;
            const user = await this.services.generic.findOne('Users', { authId: id });
            const resetPasswordToken = await this.services.admin.updateResetPasswordToken(id);
            const data = {
                name: 'User',
                logo: `${ADMIN_BASE_PATH}/static/media/logo-icon.png`,
                pageLink: `${ADMIN_BASE_PATH}/ForgotPassword?id=${id}&token=${resetPasswordToken}`,
                //pageLink: `${ADMIN_BASE_PATH}/ForgotPassword/${id}/${resetPasswordToken}`,
            };

            await this.services.email.sendEmail(email, 'forgotPassword', data, 'Forgot Password');
            return res.success({}, message.resetPassword);
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

    async resetPassword({ body, }, res, ) {
        try {
            const { authId, token, password } = body;
            delete body.confirmPassword;

            // check auth id pattern
            if (!this.validator.validateByRegex('guid', authId)) {
                return res.badRequest(message.invalidId);
            }

            const requiredFields = ['password', 'authId', 'token'];
            // check required fields
            const isValidated = this.validator.validateFields(body, requiredFields);

            if (isValidated.length) {
                return res.badRequest(isValidated);
            }

            if (password.length < 7) {
                return res.badRequest(message.minPassword);
            }

            // check if user exists
            const userExists = await this.services.generic.findOne('Authentications', { id: authId });
            if (!userExists) {
                return res.badRequest(message.userNotExists);
            }

            const {
                dataValues: { isVerified },
            } = userExists;

            // check if reset Token exists
            const resetTokenExists = await this.services.generic.findOne('Authentications', { id: authId, resetPasswordToken: token });
            if (!resetTokenExists || resetTokenExists == null) {
                return res.badRequest(message.resetTokenExpired);
            }

            // encrypt new password
            const updatedNewPassword = this.helper.hashPassword(password);
            await this.services.generic.update('Authentications', { id: authId }, { password: updatedNewPassword, resetPasswordToken: '' });
            return res.success({}, message.updatePassword);
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

    async logout({ headers: { authid, authorization }, }, res, ) {
        try {
            let jwtToken = '';

            if (!this.validator.validateByRegex('guid', authid)) {
                return res.badRequest(message.invalidId);
            }

            const checkUser = await this.services.generic.findOne('Authentications', { id: authid });

            if (!checkUser) {
                return res.unAuthorized(message.unauthorized);
            }

            if (authorization.startsWith('Bearer ')) {
                jwtToken = authorization.slice(7, authorization.length);
            }

            if (jwtToken === checkUser.token) {
                await this.services.generic.update('Authentications', { id: authid }, { token: null });
            }

            return res.success(null, message.successLogout);
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

    async getUserById({ params: { id }, }, res, ) {
        try {
            if (!this.validator.validateByRegex('guid', id)) {
                return res.badRequest(message.invalidId);
            }

            const response = await this.services.users.userDetail(id);

            return res.success(response, '');
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

    async updatePassword({ params, body }, res) {
        const { authId } = params;
        const { oldPassword, newPassword } = body;

        // check auth id pattern
        if (!this.validator.validateByRegex('guid', authId)) {
            return res.badRequest(message.invalidId);
        }

        const requiredFields = ['oldPassword', 'newPassword'];

        // check required fields
        const isValidated = this.validator.validateFields(body, requiredFields);

        if (isValidated.length) {
            return res.badRequest(isValidated);
        }

        // check if tags exists in fields
        const checkTags = ['oldPassword', 'newPassword'];
        const tagExists = this.validator.validateTags(body, checkTags);

        if (tagExists.length) {
            return res.badRequest(tagExists);
        }

        if (newPassword.length < 7) {
            return res.badRequest(message.minPassword);
        }

        // check if user exists
        const userExists = await this.services.generic.findOne('Authentications', { id: authId });

        if (!userExists) {
            return res.badRequest(message.userNotExists);
        }

        const {
            dataValues: { isVerified, password },
        } = userExists;

        const encryptOldPassword = this.helper.hashPassword(oldPassword);

        // compare old password
        if (encryptOldPassword !== password) {
            return res.badRequest(message.noOldPasswordMatch);
        }

        // encrypt new password
        const updatedNewPassword = this.helper.hashPassword(newPassword);

        await this.services.generic.update('Authentications', { id: authId }, { password: updatedNewPassword, updatedAt: new Date() });

        return res.success({}, message.updatePassword);
    }

    async updateProfile({ params: { id }, body, }, res, ) {
        const { email, newPassword, oldPassword } = body;
        if (!this.validator.validateByRegex('guid', id)) {
            return res.badRequest(message.invalidId);
        }

        // check if user exists
        const userExists = await this.services.generic.findOne('Users', { id });
        if (!userExists) {
            return res.badRequest(message.userNotExists);
        }

        const { dataValues: { authId },} = userExists;

        const authExists = await this.services.generic.findOne('Authentications', { id: authId });

        const {
            dataValues: { isVerified, password },
        } = authExists;

        if (newPassword && newPassword !== "") {
            const { email, oldPassword, newPassword } = body;
            const requiredFields = ['email', 'oldPassword', 'newPassword'];

            // check required fields
            const isValidated = this.validator.validateFields(body, requiredFields);
            if (isValidated.length) {
                return res.badRequest(isValidated);
            }

            if (!this.validator.validateByRegex('email', email)) {
                return res.badRequest(messages.invalidEmail);
            }

            // check if tags exists in fields
            const checkTags = ['oldPassword', 'newPassword'];
            const tagExists = this.validator.validateTags(body, checkTags);
            if (tagExists.length) {
                return res.badRequest(tagExists);
            }

            if (newPassword.length < 7) {
                return res.badRequest(message.minPassword);
            }

            const encryptOldPassword = this.helper.hashPassword(oldPassword);

            // compare old password
            if (encryptOldPassword !== password) {
                return res.badRequest(message.noOldPasswordMatch);
            }

            // encrypt new password
            const updatedNewPassword = this.helper.hashPassword(newPassword);

            const respond = await this.services.generic.update('Users', { id }, {email});
            const response = await this.services.generic.update('Authentications', { id: authId }, { provider: email, password: updatedNewPassword, updatedAt: new Date() });
            return res.success(respond, message.updateUser);
        } else {
            const requiredFields = ['email'];
            const isValidated = this.validator.validateFields(body, requiredFields);
            if (isValidated.length) {
                return res.badRequest(isValidated);
            }

            if (!this.validator.validateByRegex('email', email)) {
                return res.badRequest(messages.invalidEmail);
            }

            const respond = await this.services.generic.update('Users', { id }, {email});
            const response = await this.services.generic.update('Authentications', { id: authId }, { provider: email});
            return res.success(respond, message.updateUser);
        }
    }

    async totalUsers(req, res, ) {
        try {
            const response = await this.services.generic.count('Authentications', { role: 'user' });

            return res.success(response, '');
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

    async userList({ query }, res) {
        try {
            const { pageNo, limit, status, search } = query;
            let whereCondition = { isdelete: false };

            const requiredFields = ['pageNo', 'limit'];
            const requiredBody = { pageNo, limit };
            const isValidated = this.validator.validateFields(requiredBody, requiredFields);
            if (isValidated.length) {
                return res.badRequest(isValidated);
            }

            if (status && status != 'null' && status != "") {
                const booleanStatus = this.helper.getBoolean(status);
                whereCondition = { ...whereCondition, isactive: booleanStatus };
            }

            const requestmain1 = {
                name: {
                    [Op.iLike]: `%${search}%`
                }
            };
            const requestmain2 = {
                email: {
                    [Op.iLike]: `%${search}%`
                }
            };
            if (search && search != "") {
                whereCondition = { ...whereCondition,
                    [Op.or]: [requestmain1, requestmain2]
                };
            }

            let response = await this.services.admin.userListWithPagination(query, whereCondition);
            const totalCount = await this.services.generic.count('Users', whereCondition);

            response = { records: response, totalCount: totalCount };
            return res.success(response, '');
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

    async updateStatus({ params, query }, res) {
        try {
            const { status } = query;
            const booleanStatus = this.helper.getBoolean(status);
            const response = await this.services.admin.updateStatus(params, booleanStatus);
            return res.success(response, '');
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

    async deleteUser({ params }, res) {
        try {
            const { id } = params;
            params = { ...params, model: 'Users' }
            const response = await this.services.admin.deleteRecord(params);

            const user = await this.services.users.userDetail(id);
            let { authId } = user;
            let data = { id: authId, model: 'Authentications' }
            const respond = await this.services.admin.deleteRecord(data);

            return res.success(response, '');
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

    async deleteRecord({ params }, res) {
        try {
            const response = await this.services.admin.deleteRecord(params);
            return res.success(response, '');
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

}

module.exports = Admin;