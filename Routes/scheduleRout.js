const {
  addSchedule,
  listSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  // getSchedulesByTrain,
} = require("../Controllers/scheduleController");
const {authMiddleware,isAdmin}=require('../middleware/jwt')

const express = require("express");
const router = express.Router();

router.post("/",authMiddleware,isAdmin, addSchedule);
router.get("/", listSchedules);
router.get("/:id", getScheduleById);
router.put("/:id",authMiddleware,isAdmin, updateSchedule);
router.delete("/:id",authMiddleware, isAdmin,deleteSchedule);
// router.get('/by-train/:trainName',getSchedulesByTrain)
module.exports = router;
