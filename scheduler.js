const cron = require('node-cron');
const { checkAndConfirmWaitingReservations, closeReservations } = require('./function');
const Schedule = require('./Models/scheduleSchema');
const RESERVATION_CLOSE_HOURS = 3 * 60 * 60 * 1000;

cron.schedule('*/30 * * * * *', async () => { // Runs every 30 seconds
    try {
        const now = new Date();
        
        // Fetch all schedules
        const schedules = await Schedule.find();

        for (const schedule of schedules) {
            const arrivalTime = new Date(schedule.arrival);
            const closeTime = new Date(arrivalTime - RESERVATION_CLOSE_HOURS);
            
            // Check and close reservations if the reservation close time has passed
            if (now >= closeTime && now < arrivalTime) {
                await closeReservations(schedule._id);
            }

            // Check and confirm waiting reservations
            await checkAndConfirmWaitingReservations(schedule._id);
        }

        console.log('Scheduler ran successfully');
    } catch (error) {
        console.error('Error running scheduled tasks:', error);
    }
});
