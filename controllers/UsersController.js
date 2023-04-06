import sha1 from 'sha1';
import { ObjectID } from 'mongodb';

const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class UsersController {
  static postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }
    const users = dbClient.database.collections('users');
    users.findOne({ email }, (err, out) => {
      if (out) {
        res.status(400).json({ error: 'Already exist' });
      }
      const hPassword = sha1(password);
      users.insertOne(
        {
          email,
          password: hPassword,
        },
      )
        .then((newUser) => {
          res.status(201).json({ id: newUser.insertedId, email });
        })
        .catch((err) => {
          console.log(err);
        });
    });
  }

  static async getMe(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (userId) {
      const users = dbClient.database.collections('users');
      const id = new ObjectID(userId);
      users.findOne({ _id: id }, (err, out) => {
        if (out) {
          res.status(200).json({ email: out.email, id: userId });
        } else {
          res.status(404).json({ error: 'Not found' });
        }
      });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  }
}

module.exports = UsersController;
