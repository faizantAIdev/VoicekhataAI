const express = require('express');

const {
  getCustomers,
  createCustomer,
  getCustomer,
  deleteCustomer,
  updateCustomer,
  getCustomerLedger,

} = require('../controllers/customerController');

const router = express.Router();


// GET all customers
router.get('/', getCustomers);


// CREATE customer
router.post('/', createCustomer);


// GET single customer
router.get('/:id', getCustomer);


// DELETE customer
router.delete('/:id', deleteCustomer);

router.put('/:id', updateCustomer);

router.get('/:id/transactions', getCustomerLedger);


module.exports = router;