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
    logger.info('Cron job started', { currentTime: now });

    const schedules = await Schedule.find();
    if (schedules.length === 0) {
      logger.warn('No schedules found');
    }
    
    await Promise.all(
      schedules.map(async (schedule) => {
        try {
          const arrivalTime = new Date(schedule.arrivalTime);
          const closeTime = new Date(
            arrivalTime.getTime() - RESERVATION_CLOSE_HOURS
          );

          if (now >= closeTime && now < arrivalTime) {
            await closeReservations(schedule._id);
            logger.info('Closed reservations for schedule', { scheduleId: schedule._id });
          }

          await checkAndConfirmWaitingReservations(schedule._id);
          logger.info('Checked and confirmed waiting reservations for schedule', { scheduleId: schedule._id });
        } catch (error) {
          logger.error('Error processing schedule', { scheduleId: schedule._id, error: error.message });
        }
      })
    );
  } catch (error) {
    logger.error('Error running scheduled tasks', { error: error.message });
  }
});
