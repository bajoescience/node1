const { sendGrid } = require('../config');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(sendGrid.api_key);

async function sendEmail({ to, subject, html }) {
   const response = await sgMail.send({to, subject, html, from: "Symble <no-reply@symble.live>" });
   console.log({response});

}

module.exports = {sendEmail}