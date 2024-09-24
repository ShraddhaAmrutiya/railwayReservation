const cron = require("node-cron");
const {
  checkAndConfirmWaitingReservations,
  closeReservations
} = require("./function");
const Schedule = require("./Models/scheduleSchema");
const RESERVATION_CLOSE_HOURS = 3 * 60 * 60 * 1000;
const logger = require('./logger');

cron.schedule("*/10 * * * * * ", async () => {
  const now = new Date();
  logger.info('Cron job started', { currentTime: now });

  try {
    const schedules = await Schedule.find();
    if (schedules.length === 0) {
      // logger.warn('No schedules found');
      return;
    }

    const processSchedule = async (index) => {
      if (index >= schedules.length) return;

      const schedule = schedules[index];
      try {
        const arrivalTime = new Date(schedule.arrivalTime);
        const closeTime = new Date(arrivalTime.getTime() - RESERVATION_CLOSE_HOURS);

        if (now >= closeTime && now < arrivalTime) {
          await closeReservations(schedule._id);
          // logger.info('Closed reservations for schedule', { scheduleId: schedule._id });
        }

        await checkAndConfirmWaitingReservations(schedule._id);
        // logger.info('Checked and confirmed waiting reservations for schedule', { scheduleId: schedule._id });

    

      } catch (error) {
        logger.error('Error processing schedule', { scheduleId: schedule._id, error: error.message });
      }

      processSchedule(index + 1);
    };

    await processSchedule(0);
  } catch (error) {
    logger.error('Error running scheduled tasks', { error: error.message });
  }
});
