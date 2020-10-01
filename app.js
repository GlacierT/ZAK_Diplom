const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const staticAsset = require('static-asset');
const mongoose = require('mongoose');
const session = require('express-session');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const MongoStore = require('connect-mongo')(session);

const config = require('./config');
const routes = require('./routes');

// database
mongoose.Promise = global.Promise;
mongoose.set('debug', config.IS_PRODUCTION);
mongoose.connection
  .on('error', error => console.log(error))
  .on('close', () => console.log('Database connection closed.'))
  .once('open', () => {
    const info = mongoose.connections[0];
    console.log(`Connected to ${info.host}:${info.port}/${info.name}`);
    // require('./mocks')();
  });
mongoose.connect(
  config.MONGO_URL,
  { useMongoClient: true }
);

// express
const app = express();

// sessions
app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: mongoose.connection
    })
  })
);

// sets and uses
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(staticAsset(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, config.DESTINATION)));
app.use(
  '/javascripts',
  express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist'))
);
app.use(methodOverride('_method'));

// routes
app.use('/', routes.archive);
app.use('/api/auth', routes.auth)
app.use('/post', routes.post);
app.use('/comment', routes.comment);
app.use('/upload', routes.upload);

const mongoURI = 'mongodb://localhost/users_test';

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve) => {
      
        const filename =file.originalname;
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    
  }
});
const upload = multer({ storage });

app.get('/search', async (req, res) => {
  const userId = req.session.userId; 
  const userLogin = req.session.userLogin;
  
  if (!userId || !userLogin) {
    res.redirect('/');
  } else{
    gfs.files.find().toArray((err, files) => {
      // Check if files
      if (!files || files.length === 0) {
        res.render('search', { files: false });
      } else {
        files.map(file => {
          if (
            file.contentType === 'image/jpeg' ||
            file.contentType === 'image/png'
          ) {
            file.isImage = true;
          } else {
            file.isImage = false;
          }
        });
        res.render('search', { files: files });
      }
    });
  }
});

// @route GET /
// @desc Loads form
app.get('/file', async (req, res) => {
  const userId = req.session.userId; 
  const userLogin = req.session.userLogin;
  
  if (!userId || !userLogin) {
    res.redirect('/');
  } else {
    gfs.files.find().toArray((err, files) => {
      // Check if files
      if (!files || files.length === 0) {
        res.render('save', { files: false });
      } else {
        files.map(file => {
          if (
            file.contentType === 'image/jpeg' ||
            file.contentType === 'image/png'
          ) {
            file.isImage = true;
          } else {
            file.isImage = false;
          }
        });
        res.render('save', { files: files });
      }
    });
  }
});

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload', upload.single('file'), async(req, res) => {
  // res.json({ file: req.file });
  const userId = req.session.userId; 
  const userLogin = req.session.userLogin;
  
  if (!userId || !userLogin) {
    res.redirect('/');
  } else {
    res.redirect('/file');
  }
});

// @route GET /files
// @desc  Display all files in JSON
app.get('/files', async(req, res) => {
  const userId = req.session.userId; 
  const userLogin = req.session.userLogin;
  
  if (!userId || !userLogin) {
    res.redirect('/');
  } else {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files);
  });
}
});

// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', async(req, res) => {
  const userId = req.session.userId; 
  const userLogin = req.session.userLogin;
  
  if (!userId || !userLogin) {
    res.redirect('/');
  } else {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
  });
}
});

// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename', async(req, res) => {
  const userId = req.session.userId; 
  const userLogin = req.session.userLogin;
  
  if (!userId || !userLogin) {
    res.redirect('/');
  } else {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
}
});

app.get('/read/:filename', async(req, res) => {
  const userId = req.session.userId; 
  const userLogin = req.session.userLogin;
  
  if (!userId || !userLogin) {
    res.redirect('/');
  } else {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
  });
}
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect('/file');
  });
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.render('error', {
    message: error.message,
    error: !config.IS_PRODUCTION ? error : {}
  });
});

app.listen(config.PORT, () =>
  console.log(`Example app listening on port ${config.PORT}!`)
);