export const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  callback: Function,
) => {
  if (!file) return callback(new Error('No file provided.'), false);

  const fileExtensions = file.mimetype.split('/')[1];
  const validExtensions = ['jpeg', 'jpg', 'png'];

  if (validExtensions.includes(fileExtensions)) {
    return callback(null, true);
  }

  callback(null, false);
};
