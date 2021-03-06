var express = require('express'),
  mongoose = require('mongoose'),
  Article = mongoose.model('Article'),
  User = mongoose.model('User'),
  Found = mongoose.model('Found'),
  Response = mongoose.model('Response'),
  LostResponse = mongoose.model('LostResponse'),
  sendgrid = require('../util/sendgrid.js'),
  Lost = mongoose.model('Lost'),
  nlp = require('../util/nlp.js');

module.exports = function (app) {

  app.route('/')
  .get(function (req, res, next) {
    res.render('index', {

    });
  });

  app.route('/found')
  .get(function(req, res, next){
    if(req.user){
      var foundList = Found.find({}, function(err, foundList){
        res.render('found_list', {
          foundlist: foundList
        })
      });

    }
  });

  app.route('/lost')
  .get(function(req, res, next){
    if(req.user){
      var lostList = Lost.find({}, function(err, lostList){
        res.render('lost_list', {
          lostlist: lostList
        })
      });

    }
  });

  app.route('/lost/:id')
  .get(function(req, res, next) {
    if(req.user) {
      Lost.findOne({_id:req.params.id}, function(err, _lost) {
        if(!_lost) res.redirect('/lost');
        else{
          LostResponse.find({lostId: _lost._id}, function(err, _responses) {
            console.log("_lost: " + _lost)
            // var _ownsThis = (_lost.userId.equals(req.user._id));
            res.render('lost_specific', {
              lost: _lost,
              responses: _responses,
              // ownsThis: _ownsThis
            })
          })
        }
      })
    } else res.redirect('/login');
  })

  app.route('/found/:id')
  .get(function(req, res, next){
    if(req.user){
      Found.findOne({_id: req.params.id}, function(err, _found){
        if(!_found) res.redirect('/found');
        else{
          Response.find({foundId: _found._id}, function(err, _responses){
            var _ownsThis = (_found.userId.equals(req.user._id));
            res.render('found_specific', {
              found: _found,
              responses: _responses,
              ownsThis: _ownsThis
            });
          });
        }
      });
    } else res.redirect('/login');
  });

  app.route('/this-is-mine')
  .post(function(req, res, next){
    if(req.user){
      var newResponse = new Response({
        userId: req.user._id,
        foundId: req.body.id,
        description: req.body.description,
        email: req.body.email
      });

      newResponse.save(function(err){
        if(err){
          console.log(err);
        } else {
          res.redirect('/found');
        }
      });

    }
  });

  // get id from req.session
  app.route('/i-found-something')
  .post(function(req, res, next){
    if(req.user){
      console.log(req.user._id);
      var newFound = new Found({
        userId: req.user._id,
        title: req.body.title,
        description: req.body.description
      });

      // NLP check distance so we can estimate whether or not to send it
      // to you
      newFound.save(function(err, doc){
        if(err){
          console.log(err);
        } else {
          Lost.find({}, function(err, losts){
            losts.forEach(function(lost, index){
              if(nlp.isSimilar(req.body.description, lost.description)){
                User.findOne({_id: lost.userId}, function(err, user){
                  if(doc)
                    sendgrid.sendWeThink(email, req.body.description, req.body.title, doc._id);
                })
              }
            });
          });

          res.redirect('/')
        }
      })
    } else {
      res.redirect('/login');
    }
  })
  .get(function(req, res, next){

    res.render('found_form', {

    });
  });

  // lost submission
  app.route('/i-lost-something')
  .post(function(req, res, next){
    if(req.user){
      var newLost = new Lost({
        userId: req.user._id,
        title: req.body.title,
        description: req.body.description
      });

      newLost.save(function(err){
        if(err){
          console.log(err);
        } else {
          res.redirect('/')
        }
      });
    } else {
      res.redirect('/login');
    }
  })
  .get(function(req, res, next){
    if(req.user){
      res.render('lost_form', {

      });
    }
  });

  app.route('/this-is-it')
  .post(function(req, res, next){
    console.log(req.body);
    User.findOne({_id: req.user._id}, function(err, user){
      console.log(err);
      console.log(user);
      sendgrid.sendLost(req.body.email,
        req.body.description,
        req.body.title,
        user);
      res.redirect('/found');
    });
  });
};
