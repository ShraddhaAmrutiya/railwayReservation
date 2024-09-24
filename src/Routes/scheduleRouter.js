const {
  addSchedule,
  listSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
} = require("../Controllers/scheduleController");
const {authMiddleware,isAdmin}=require('../middleware/jwt')

const express = require("express");
const router = express.Router();

router.post("/addSchedule",authMiddleware,isAdmin, addSchedule);
router.get("/list", listSchedules);
router.get("/:id", getScheduleById);
router.put("/:id",authMiddleware,isAdmin, updateSchedule);
router.delete("/:id",authMiddleware, isAdmin,deleteSchedule);
module.exports = router;
