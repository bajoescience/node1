const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const fileController = require('../../controller/file.controller')

router.put('/avatar', auth(), async (req, res) => {
    try {
        const {status, message, data} = await fileController.updateUserAvatar(req);
        return res.status(status).json({status, message, data});
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `error at route: ${error.message}` })  
    }
});


module.exports = router;