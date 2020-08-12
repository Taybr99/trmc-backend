/* eslint-disable class-methods-use-this */
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

let fs = require('fs');

const {
    AWS_ACCESS_KEY,
    AWS_SECRET_KEY,
    BUCKET_NAME,
    REGION,
} = require('../config');

const s3 = new AWS.S3({
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
    region: REGION,
});

class S3 {

    uploadFile(req, res, folder, fileName) {
        const currentTime = new Date().getTime();

        return new Promise((resolve, reject) => {
            const upload = multer({
                storage: multerS3({
                    s3,
                    bucket: BUCKET_NAME,
                    contentType: multerS3.AUTO_CONTENT_TYPE,
                    acl: 'public-read',
                    metadata(req, { fieldname }, cb) {
                        cb(null, { fieldName: fieldname });
                    },
                    key(req, { originalname }, cb) {
                        const filePath = `${folder}/${currentTime}_${originalname}`;
                        cb(null, filePath);
                    },
                }),
            });

            const uploadingImage = upload.single(fileName);

            uploadingImage(req, res, (uploadError) => {
                if (uploadError) {
                    console.log(' file uploading error---------');
                    reject(uploadError);
                }

                resolve(req.file);
            });
        });
    }

}

module.exports = S3;