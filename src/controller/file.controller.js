const fileService = require('../services/file.service');
const userService = require('../services/user.service');
const Formidable = require('formidable');

module.exports = {
    updateUserAvatar: async req => {
        try {
            const form = new Formidable.IncomingForm();
            const {openedFiles} = await form.parse(req);
            // upload the image on cloudinary using fileService with predefined image format
            // putting the '?' to fix the undefined error 
            // which would be caught by the fileService
            const fileToUpload = openedFiles[0]?.filepath
            const {status, message, data} = await fileService.uploadImage(fileToUpload);
            if (status !== 200 || !data) return {status, message}

            // update the user's avatar
            return await userService.update({_id: req.user.id}, {avatar:data});
        } catch (error) {
            console.log(error);
            return { status: 500,  message: `server error: ${error.message}`}
        }
    }
}