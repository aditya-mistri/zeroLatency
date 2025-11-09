const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: 'cmhqkir0t0003lcx8ii8ubi67' }
    });
    if (!appt) { console.log('Appointment not found'); process.exit(); }
    const now = new Date();
    console.log('Now:', now.toISOString());
    const scheduledTime = new Date(appt.scheduledAt);
    const endTime = new Date(scheduledTime.getTime() + appt.duration * 60000);
    const bufferStartTime = new Date(scheduledTime.getTime() - 5 * 60000);
    const bufferEndTime = new Date(endTime.getTime() + 5 * 60000);
    console.log('scheduledTime', scheduledTime.toISOString());
    console.log('endTime', endTime.toISOString());
    console.log('bufferStartTime', bufferStartTime.toISOString());
    console.log('bufferEndTime', bufferEndTime.toISOString());

    const users = [appt.patientId, appt.doctorId];
    for (const u of users) {
      let reason = null;
      if (!['CONFIRMED','IN_PROGRESS'].includes(appt.status)) {
        reason = `Appointment is ${appt.status}.`;
      } else if (u !== appt.patientId && u !== appt.doctorId) {
        reason = 'You are not a participant';
      } else if (now < bufferStartTime) {
        const timeUntilStart = Math.ceil((bufferStartTime.getTime()-now.getTime())/60000);
        reason = `Too early. Can join in ${timeUntilStart} minute(s)`;
      } else if (now > bufferEndTime) {
        reason = 'Appointment has ended';
      }

      // doctor busy check
      if (!reason && appt.doctorId === u) {
        const other = await prisma.appointment.findFirst({
          where: { doctorId: u, id: { not: appt.id }, status: 'IN_PROGRESS' }
        });
        if (other) reason = 'Doctor in other meeting';
      }

      console.log('\nUser:', u);
      if (reason) console.log('canJoin: false, reason:', reason);
      else {
        const timeUntilStart = now < scheduledTime ? Math.ceil((scheduledTime.getTime()-now.getTime())/60000) : 0;
        const timeUntilEnd = Math.ceil((bufferEndTime.getTime() - now.getTime())/60000);
        console.log('canJoin: true, timeUntilStart:', timeUntilStart, 'timeUntilEnd:', timeUntilEnd);
      }
    }
  } catch (err) { console.error(err); }
  finally { process.exit(); }
})();
