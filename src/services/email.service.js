const ejs = require("ejs");
const { url, client_url } = require('../config');
const path = require('path');
const {sendEmail} = require('../utils/send-email');
const {transaction: { transaction_type } } = require('../utils/helpers');
const {emailSubjects} = require('../utils/helpers');

const renderEmailTemplate =  async (templateName, data = {}) => {
	const template = path.join(__dirname, `../views/emailTemplates/${templateName}.ejs`)
	return await ejs.renderFile(template, data);
}

module.exports = {
	sendWelcomeEmail: async ({email, username}) => {
		const WelcomeEmailTemplate = await renderEmailTemplate("WelcomeEmail", {username})
		const mailInfo = {
			to: email, 
			subject: `Welcome ${username}`, 
			html: WelcomeEmailTemplate,
		}
		await sendEmail(mailInfo)
	}, 
	/**
	 * 
	 * @param {*} data 
	 */
	
	sendAccountVerificationEmail: async ({ email, username, confirmation_code }) => {
		//const hashedConfirmationCode = await bcrypt.hash(confirmation_code, 10);
		const verificationUrl = `${url}/api/auth/verify-email/?token=${confirmation_code}`;
        const verificationSlug = `/api/auth/verify-email/?token=${confirmation_code}`
		const AccountVerificationEmailTemplate = await renderEmailTemplate("AccountVerificationEmail", {username, verificationUrl});

		const mailInfo = {
			to: email, 
			subject: `Registration`, 
			html: AccountVerificationEmailTemplate,
		}
		await sendEmail(mailInfo)

        return verificationSlug
	},

	sendResetPasswordEmail: async ({email, confirmation_code}) => { 
		// const hashedConfirmationCode = await bcrypt.hash(confirmation_code, 10);

		const resetPasswordUrl = `${client_url}/reset-password?token=${confirmation_code}`;
		const resetPasswordSlug = `${url}/api/auth/reset-password?token=${confirmation_code}`
		const ResetPasswordEmailTemplate = await renderEmailTemplate("ResetPasswordEmail", {resetPasswordUrl});

		const mailInfo = {
			to: email, 
			subject: `Reset password`,
			html: ResetPasswordEmailTemplate,
		}

		await sendEmail(mailInfo)

        return resetPasswordSlug
	},
    

	sendTransactionInfoEmail: async (body, type) => {
		// this one should send to two different people
		if(type == transaction_type.SEND.name) {
			const {sender, recipient} = body;

			const TransactionInfoTemplateSender = await renderEmailTemplate("TransactionInfoEmail", {...body, isRecipient: false, type})
			const TransactionInfoTemplateReceiver = await renderEmailTemplate("TransactionInfoEmail", {...body, isRecipient: true, type})
			
			const senderMailInfo = {
				to: sender.email, 
				subject: emailSubjects.DEBIT,
				html: TransactionInfoTemplateSender,
			}
	
			const recipientMailInfo = {
				to: recipient.email, 
				subject: emailSubjects.CREDIT,
				html: TransactionInfoTemplateReceiver,
			}
	
			await Promise.all([
				sendEmail(senderMailInfo),
				sendEmail(recipientMailInfo),
			])
		}

		if (type == transaction_type.ACCESS_FEE.name || type == transaction_type.CLOSE_EVENT.name) {
			const {recipient} = body;

			const Template = await renderEmailTemplate('TransactionInfoEmail', {...body, type});

			const mailInfo = {
				to: recipient.email, 
				subject: type == transaction_type.ACCESS_FEE.name ? emailSubjects.PARTICIPATION : emailSubjects.COMPLETED_EVENT,
				html: Template
			}

			sendEmail(mailInfo);
		}
	}
}