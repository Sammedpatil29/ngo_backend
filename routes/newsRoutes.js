const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

router.post('/', newsController.createNews);
router.get('/', newsController.getAllNews);
router.get('/:id', newsController.getNewsById);
router.put('/:id', newsController.updateNews);
router.delete('/:id', newsController.deleteNews);

module.exports = router;