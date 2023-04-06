import { promises } from 'fs';
import { ObjectID } from 'mongodb';
import { v4 } from 'uuid';
import mime from 'mime-types';

const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    const users = dbClient.database.collections('users');
    const files = dbClient.database.collections('files');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const id = new ObjectID(userId);
    const user = await users.findOne({ _id: id });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const {
      name, type, parentId, data,
    } = req.body;
    const isPublic = req.body.isPublic || false;
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }
    if (parentId) {
      const id = new ObjectID(parentId);
      const out = await files.findOne({ _id: id, userId: user._id });
      if (!out) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (out.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (type === 'folder') {
      files
        .insertOne(
          {
            userId: user._id,
            name,
            type,
            isPublic,
            parentId: parentId || 0,
          },
        )
        .then((output) => {
          res.status(201).json({
            id: output.insertedId,
            userId: user._id,
            name,
            isPublic,
            parentId: parentId || 0,
            type,
          });
        });
    } else {
      const path = process.env.FOLDER_PATH || '/tmp/files_manager';
      const fname = `${path}/${v4()}`;
      const decodedData = Buffer.from(data, 'base64');
      try {
        await promises.mkdir(path);
      } catch (err) {
        // pass
      }
      await promises.writeFile(fname, decodedData, 'utf-8');

      files
        .insertOne(
          {
            userId: user._id,
            name,
            type,
            isPublic,
            localPath: fname,
            parentId: parentId || 0,
          },
        )
        .then((output) => {
          res.status(201).json({
            id: output.insertedId,
            userId: user._id,
            name,
            isPublic,
            parentId: parentId || 0,
            type,
          });
        });
    }
    return null;
  }

  static async getShow(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    const fileId = req.params.id;
    const users = dbClient.database.collections('users');
    const files = dbClient.database.collections('files');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const uid = new ObjectID(userId);
    const user = await users.findOne({ _id: uid });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fid = new ObjectID(fileId);
    const out = await files
      .findOne({ _id: fid, userId: user._id });
    if (!out) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json(out);
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    const users = dbClient.database.collections('users');
    const files = dbClient.database.collections('files');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const uid = new ObjectID(userId);
    const user = await users.findOne({ _id: uid });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = req.query;
    const { page } = req.query || 0;
    let check;
    if (parentId) {
      check = { userId: user._id, parentId: ObjectID(parentId) };
    } else {
      check = { userId: user._id };
    }

    files
      .aggregate([
        { $match: check },
        { $sort: { _id: -1 } },
        {
          $facet: {
            metadata: [{ $count: 'total' }, { $addFields: { page: parseInt(page, 10) } }],
            data: [{ $skip: 20 * parseInt(page, 10) }, { $limit: 20 }],
          },
        },
      ])
      .toArray((err, out) => {
        if (out) {
          const last = out[0].data.map((file) => {
            const tmp = {
              ...file,
              id: file._id,
            };
            delete tmp.localPath;
            delete tmp._id;
            return tmp;
          });
          return res.status(200).json(last);
        }
        return res.status(404).json({ error: 'Not found' });
      });
    return null;
  }

  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    const fileId = req.params.id;
    const users = dbClient.database.collections('users');
    const files = dbClient.database.collections('files');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const uid = new ObjectID(userId);
    const user = await users.findOne({ _id: uid });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    files.findOneAndUpdate(
      { _id: new ObjectID(fileId), userId: user._id },
      { $set: { isPublic: true } },
      { returnOriginal: false },
      (err, out) => {
        if (!out.lastErrorObject.updatedExisting) {
          return res.status(404).json({ error: 'Not found' });
        }
        return res.status(200).json(out.value);
      },
    );
    return null;
  }

  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    const fileId = req.params.id;
    const users = dbClient.database.collections('users');
    const files = dbClient.database.collections('files');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const uid = new ObjectID(userId);
    const user = await users.findOne({ _id: uid });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    files.findOneAndUpdate(
      { _id: new ObjectID(fileId), userId: user._id },
      { $set: { isPublic: false } },
      { returnOriginal: false },
      (err, out) => {
        if (!out.lastErrorObject.updatedExisting) {
          return res.status(404).json({ error: 'Not found' });
        }
        return res.status(200).json(out.value);
      },
    );
    return null;
  }

  static async getFile(req, res) {
    const files = dbClient.database.collections('files');
    const { id, size } = req.params;
    const fid = new ObjectID(id);
    files.findOne({ _id: fid }, async (err, out) => {
      if (!out) {
        return res.status(404).json({ error: 'Not found' });
      }
      console.log(out.localPath);
      if (out.isPublic) {
        if (out.type === 'folder') {
          return res.status(400).json({ error: "A folder doesn't have content" });
        }
        try {
          let fname = out.localPath;
          if (size) {
            fname = `${out.localPath}_${size}`;
          }
          const data = await promises.readFile(fname);
          const contentType = mime.contentType(out.name);
          return res.header('Content-Type', contentType).status(200).send(data);
        } catch (err) {
          console.log(err);
          return res.status(404).json({ error: 'Not found' });
        }
      } else {
        const token = req.header('X-Token');
        const userId = await redisClient.get(`auth_${token}`);
        const users = dbClient.database.collections('users');
        if (!userId) {
          return res.status(401).json({ error: 'Not found' });
        }
        const uid = new ObjectID(userId);
        const user = await users.findOne({ _id: uid });
        if (!user) {
          return res.status(401).json({ error: 'Not found' });
        }

        if (out.userId.toString() === user._id.toString()) {
          if (out.type === 'folder') {
            return res.status(400).json({ error: "A folder doesn't have content" });
          }
          try {
            let fname = out.localPath;
            if (size) {
              fname = `${out.localPath}_${size}`;
            }
            const data = await promises.readFile(fname);
            const contentType = mime.contentType(out.name);
            return res.header('Content-Type', contentType).status(200).send(data);
          } catch (err) {
            console.log(err);
            return res.status(404).json({ error: 'Not found' });
          }
        } else {
          console.log(`Wrong user: out.userId=${out.userId}; userId=${user._id}`);
          return res.status(404).json({ error: 'Not found' });
        }
      }
    });
  }
}

module.exports = FilesController;
