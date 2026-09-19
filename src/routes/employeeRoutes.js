const express = require('express');

const {
  getEmployees,
  inviteEmployee,
  removeEmployee,
} = require('../controllers/employeeController');

const router = express.Router();

// GET all employees
router.get('/', getEmployees);

// INVITE employee
router.post('/invite', inviteEmployee);

// REMOVE employee
router.delete('/:id', removeEmployee);

module.exports = router;