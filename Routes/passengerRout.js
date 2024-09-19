const {  addPassengers, loginpassenger,listPassenger,deletepassenger,updatePassenger }=require('../Controllers/passengerController')
const {authMiddleware,isAdmin}=require('../middleware/jwt')
const express=require('express')
const router=express.Router()
const logger = require('../logger');


// router.post('/register',addPassengers)
// router.post('/login',loginpassenger)
// router.get('/',authMiddleware,isAdmin,listPassenger)
// router.delete('/:id',authMiddleware,deletepassenger)
// router.put('/:id',authMiddleware,updatePassenger)


// module.exports=router 

// Middleware to log request details
router.use((req, res, next) => {
    logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, { body: req.body, query: req.query, params: req.params });
    res.on('finish', () => {
      logger.info(`Response status: ${res.statusCode}`, { body: res.body });
    });
    next();
  });
  
  router.post('/register', (req, res, next) => {
    addPassengers(req, res).catch(next); 
  });
  
  router.post('/login', (req, res, next) => {
    loginpassenger(req, res).catch(next); 
  });
  
  router.get('/', authMiddleware, isAdmin, (req, res, next) => {
    listPassenger(req, res).catch(next); 
  });
  
  router.delete('/:id', authMiddleware, (req, res, next) => {
    deletepassenger(req, res).catch(next); 
  });
  
  router.put('/:id', authMiddleware, (req, res, next) => {
    updatePassenger(req, res).catch(next); 
  });
  
  module.exports = router;