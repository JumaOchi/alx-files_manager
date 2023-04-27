const express = require('express');
const AppController = require('../controllers/AppController');
const {
  UsersController,
  UserController,
} = require('../controllers/UsersController');
const AuthController = require('../controllers/AuthController');
const FilesController = require('../controllers/FilesController');

const router = express.Router();

// Getting Connection Information
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// Getting usersUsers
router.post('/users', UsersController.postNew);

// Handling Authentication
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UserController.getMe);

// Handling Files
router.get('/files', FilesController.getIndex);
router.get('/files/:id', FilesController.getShow);
router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnPublish);
router.get('/files/:id/data', FilesController.getFile);
router.post('/files', FilesController.postUpload);

module.exports = router;
