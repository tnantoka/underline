/*
 * underline: book journal
 */


// Constants
var USER = 'user';
var PASS = 'pass';

/**
 * Module dependencies.
 */

var express = require('express'),
	join = require('path').join,
	fs = require('fs')
	crypto = require('crypto');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyDecoder());
  app.use(express.methodOverride());
  app.use(express.cookieDecoder());
  app.use(express.session({ secret: 'your secret here' }));
  app.use(app.router);
  app.use(express.staticProvider(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Init books data
var Books = (function() {

	var books = [];
	var dict = {};
	
	var files = fs.readdirSync(join(__dirname, 'books'));
	var jsonFiles = [];

	// Select only .json files
	for (i = 0; i < files.length; i++) {
		if (/[_.]json$/.test(files[i])) {
			jsonFiles.push(files[i]);
		}
	}

	for (i = 0; i < jsonFiles.length; i++) {
		var book = JSON.parse(fs.readFileSync(join(__dirname, 'books', jsonFiles[i])));
		book.id = jsonFiles[i].replace('.json', '');
		books.push(book);
		dict[book.id] = i;
	}
	
	function getAll() {
		return books;
	}
	
	function getList(offset, limit) {
		offset = offset || 0;
		limit = limit || 10;
		var a = [];
		for (var i = 0; i < books.length; i++) {
			a.push(books[i]);
		}
		return a;
	}
	
	function index(index) {
		var book = books[index];
		return book || -1;
	}

	function id(id) {
		var book = books[dict[id]];
		return book || -1;
	}
	
	function add(book) {
		dict[book.id] = books.length - 1;
		books.push(book);
	}
	
	function set(id, book) {
		books[dict[id]] = book;
	}
	
	var that = {};
	
	that.getAll = getAll;
	that.getList = getList;
	that.index = index;
	that.id = id;
	that.add = add;
	that.set = set;
	
	return that;
})();

// Functions

function isLogin(req) {
	// Can't user "session.id"
	return req.session && req.session.user == USER;
}

function setLocals(locals, req) {
	locals.session = req.session;
	return locals;
}

function sha1(s) {
	var hash = crypto.createHash('sha1')
	hash.update(s);
	return hash.digest('hex')
}

// Routes

/*
app.get('/', function(req, res){
  res.render('index', {
    locals: {
      title: 'Express'
    }
  });
});
*/

// root
app.get('/', function(req, res) {
	if (isLogin(req)) {
		res.redirect('/home');
	} else {
		res.redirect('/login');
	}
});

// login form
app.get('/login', function(req, res) {
	if (isLogin(req)) {
		res.redirect('/home');
	} else {
		res.render('login', {
			locals: setLocals({
				title: 'Login'
			}, req)
		});
	}
});
// do login
app.post('/login', function(req, res) {
	var user = req.body.user;
	var pass = req.body.pass;
	if (user == USER && pass == PASS) {
		req.session.regenerate(function() {
			req.session.user = user;
			res.redirect('/home');		
		});
	} else {
		res.redirect('/login');
	}
});
// logout
app.get('/logout', function(req, res) {
	req.session.destroy(function() {
		res.redirect('/login');
	});
});

// home(book list)
app.get('/home', function(req, res) {
	if (!isLogin(req)) {
		res.redirect('/login');
	} else {
		res.render('home', {
			locals: setLocals({
				title: 'Home',
				list: Books.getList(),
			}, req)
		});
	}
});

// add form
app.get('/add', function(req, res) {
	if (!isLogin(req)) {
		res.redirect('/login');
	} else {
		res.render('add', {
			locals: setLocals({
				title: 'Add'
			}, req)
		});
	}
});
app.post('/add', function(req, res) {
	if (!isLogin(req)) {
		res.redirect('/login');
	} else {
		// TODO: Auto complete with session
		var read = req.session.read = req.body.read;
		var title = req.session.title = req.body.title;
		var edition = req.session.edition = req.body.edition;
		var published = req.session.published = req.body.published;
		var author = req.session.author = req.body.author;
		var publisher = req.session.publisher = req.body.publisher;
		var amazon = req.session.amazon = req.body.amazon;
		var support = req.session.support = req.body.support;
	
		var id = sha1(title)
		
		var book = {
			id: id,
			read: read, 
			title: title, 
			edition: edition, 
			published: published, 
			author: author, 
			publisher: publisher, 
			amazon: amazon, 
			support: support,
			marks: []
		};
		
		Books.add(book);
		
		fs.writeFile(join(__dirname, 'books', id + '.json'), JSON.stringify(book), 'utf8', function(err) {
			if (err) {
				throw err;
			}
			res.redirect('/home');
		})
	}
});

// book page
app.get('/book/:id/', function(req, res) {
	if (!isLogin(req)) {
		res.redirect('/login');
	} else {
	
		var id = req.params.id;
		var book = Books.id(id);
	
		res.render('book', {
			locals: setLocals({
				title: book.title,
				book: book
			}, req)
		});
	}
});

// update marks
app.post('/marks/:id/', function(req, res) {
	if (!isLogin(req)) {
		res.redirect('/login');
	} else {
		
		var id = req.params.id;
		var data = decodeURIComponent(req.body.data);
	
		var book = Books.id(id);
		book.marks = JSON.parse(data);
		Books.set(id, book);

		fs.writeFile(join(__dirname, 'books', id + '.json'), JSON.stringify(book), 'utf8', function(err) {
			if (err) {
				throw err;
			}
			res.send('OK');
		})

	}
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(1985);
  console.log("Express server listening on port %d", app.address().port)
}
