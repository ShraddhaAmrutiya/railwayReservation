const {
  addSchedule,
  listSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  getSchedulesByTrain,
} = require("../Controllers/scheduleController");

const express = require("express");
const router = express.Router();

router.post("/", addSchedule);
router.get("/", listSchedules);
router.get("/:id", getScheduleById);
router.put("/:id", updateSchedule);
router.delete("/:id", deleteSchedule);
router.get('/by-train/:trainName',getSchedulesByTrain)
module.exports = router;
