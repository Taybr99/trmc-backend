const Helper = require('../utils/helper');

class Banner {
  constructor(database) {
    this.database = database;
    this.model = database.getModelInstance();
    this.helper = new Helper();
  }

  async addBanner(body) {
    const addBanner = await this.database.create('Banners', {
      ...body,
      id: this.helper.createUUID(),
    });

    const { id: bannerId } = addBanner;

    return addBanner;
  }

  async updateBanner(body, id) {
    const updateBanner = await this.database.update('Banners', {
      where: { id },
    }, body, );

    const banner = await this.database.getSingleRow('Banners', {
      where: { id },
    });

    return banner;
  }

  async getBannerListing() {
    const getListing = await this.database.getAllRows('Banners', { 
      where: { isactive: true } 
    });

    return getListing;
  }

  async isBannerExist(id) {
    const banner = await this.database.getSingleRow('Banners', {
      where: { id },
    });

    return banner;
  }

}
module.exports = Banner;
