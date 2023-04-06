import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import { promises } from 'fs';
import { ObjectID } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue', 'http://0.0.0.0:6379');

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;
  if (!fileId) {
    done(new Error('Missing fileId'));
  }
  if (!userId) {
    done(new Error('Missing userId'));
  }

  const files = dbClient.database.collections('files');
  const uid = new ObjectID(userId);
  const fid = new ObjectID(fileId);
  const out = await files
    .findOne({ _id: fid, userId: uid });
  if (!out) {
    done(new Error('File Not found'));
  }
  const thumb500 = await imageThumbnail(out.localPath, 500);
  const thumb250 = await imageThumbnail(out.localPath, 250);
  const thumb100 = await imageThumbnail(out.localPath, 100);

  await promises.writeFile(`${out.localPath}_500`, thumb500);
  await promises.writeFile(`${out.localPath}_250`, thumb250);
  await promises.writeFile(`${out.localPath}_100`, thumb100);
  done();
});
