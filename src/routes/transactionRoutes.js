const express = require('express');

const {
  getTransactions,
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');

const router = express.Router();

// GET ALL
router.get('/', getTransactions);

// CREATE
router.post('/', createTransaction);

// GET SINGLE
router.get('/:id', getTransaction);

// UPDATE
router.put('/:id', updateTransaction);

// DELETE
router.delete('/:id', deleteTransaction);

module.exports = router;