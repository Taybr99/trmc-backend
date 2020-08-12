/* eslint-disable class-methods-use-this */
const AWS = require('aws-sdk');
const path = require('path');
const ejs = require('ejs');
const {
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY, 
  SENDER_EMAIL, 
  REGION_FOR_EMAIL, 
  HOST,
} = require('../config');

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  region: REGION_FOR_EMAIL,
});

const ses = new AWS.SES();

class Email {

  sendEmail(email, filename, data, subject) {
    return new Promise((resolve, reject) => {
      ejs.renderFile(path.resolve(`${__dirname}/../assets/templates/${filename}.ejs`), { ...data, host: HOST }, global, (err, template) => {
        const arr = [];

        arr.push(email);

        const emailParam = {
          Destination: {
            ToAddresses: arr,
          },
          Message: {
            Body: {
              Html: {
                Data: template,
              },
              Text: {
                Data: subject,
              },
            },
            Subject: {
              Data: subject,
            },
          },
          Source: SENDER_EMAIL,
        };

        ses.sendEmail(emailParam, (error) => {
          if (error) {
            reject(error);
          }
          
          resolve({ message: 'Email successfully send' });
        });
      });
    });
  }
}

module.exports = Email;
