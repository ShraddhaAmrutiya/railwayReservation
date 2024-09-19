const cron = require("node-cron");
const {
  checkAndConfirmWaitingReservations,
  closeReservations,
} = require("./function");
const Schedule = require("./Models/scheduleSchema");
const RESERVATION_CLOSE_HOURS = 3 * 60 * 60 * 1000;

cron.schedule("*/10 * * * * *", async () => {
  try {
    const now = new Date();
    const schedules = await Schedule.find();

    await Promise.all(
      schedules.map(async (schedule) => {
        const arrivalTime = new Date(schedule.arrivalTime);
        const closeTime = new Date(
          arrivalTime.getTime() - RESERVATION_CLOSE_HOURS
        );

        if (now >= closeTime && now < arrivalTime) {
          await closeReservations(schedule._id);
        }

        await checkAndConfirmWaitingReservations(schedule._id);
      })
    );
  } catch (error) {
    console.error("Error running scheduled tasks:", error);
  }
});
