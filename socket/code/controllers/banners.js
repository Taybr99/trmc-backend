const Services = require('../services');
const Helper = require('../utils/helper');
const Validator = require('../utils/validator');
const message = require('../services/messages');

class Banner {
    constructor(database) {
        this.services = new Services(database).register();
        this.helper = new Helper();
        this.validator = new Validator();
    }

    async uploadImg(req, res) {
        try {
            const response = await this.services.s3.uploadFile(req, res, 'banners', 'bannerImg');
            return res.success(response);
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

    async addBanner({body}, res) {
        try {
            const requiredFields = ['name', 'link', 'imgurl'];
            const isValidated = this.validator.validateFields(body, requiredFields);
            if (isValidated.length) {
                return res.badRequest(isValidated);
            }

            const checkTags = ['name'];
            const tagExists = this.validator.validateTags(body, checkTags);
            if (tagExists.length) {
                return res.badRequest(tagExists);
            }

            const { id, name } = body;
            let foundID, response = {}, msgtext = message.bannerAdded;
            const nameAlreadyExist = await this.services.generic.findOne('Banners', { name: name });
            
            if(id) {
                if (!this.validator.validateByRegex('guid', id)) {
                    return res.badRequest(message.invalidId);
                }

                if (nameAlreadyExist) {
                    foundID = nameAlreadyExist.dataValues.id;
                }

                if (nameAlreadyExist && (foundID != id)) {
                    return res.badRequest(message.bannerAlreadyExist);
                }

                const bannerExist = await this.services.generic.findOne('Banners', { id: id });
                if (!bannerExist) {
                    return res.badRequest(message.bannerNotExists);
                }

                delete body.id;
                response = await this.services.banners.updateBanner(body, id);
                msgtext = message.bannerUpdated;
            } else {
                if (nameAlreadyExist) {
                    return res.badRequest(message.bannerAlreadyExist);
                }

                response = await this.services.banners.addBanner(body);
            }

            return res.success(response, msgtext);
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

    async listBanners(req, res) {
        try {
            const response = await this.services.banners.getBannerListing({});

            return res.success(response, '');
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

    async getBannerById({ params: { id }, }, res, ) {
        try {
            if (!this.validator.validateByRegex('guid', id)) {
                return res.badRequest(message.invalidId);
            }
            
            const bannerExist = await this.services.banners.isBannerExist(id);

            if (!bannerExist) {
                return res.badRequest(message.bannerNotExists);
            }
            const response = await this.services.generic.findOne('Banners', { id });

            return res.success(response, '');
        } catch (e) {
            return res.serverError(message.serverErr);
        }
    }

}

module.exports = Banner;