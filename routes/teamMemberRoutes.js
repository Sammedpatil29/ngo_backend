const express = require('express');
const router = express.Router();
const teamMemberController = require('../controllers/teamMemberController');

router.post('/', teamMemberController.createTeamMember);
router.get('/', teamMemberController.getAllTeamMembers);
router.get('/:id', teamMemberController.getTeamMemberById);
router.put('/:id', teamMemberController.updateTeamMember);
router.delete('/:id', teamMemberController.deleteTeamMember);

module.exports = router;